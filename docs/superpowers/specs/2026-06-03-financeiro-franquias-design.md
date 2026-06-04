# Financeiro — Aba Franquias + Conta Corrente por Unidade

**Projeto:** Promax Tuner  
**Data:** 2026-06-03  
**Status:** Aprovado

---

## Contexto

O sistema é multi-tenant de gestão de franquias. A matriz processa arquivos ECU
cobrados às unidades via `amount_charged_by_matrix` em `ecu_jobs`. Atualmente
não há separação por unidade nem controle de pagamento desses valores.

---

## Decisões de Design

- **Abordagem:** C — converter FinanceiroPage para abas; conteúdo existente migra
  intacto para "Em Aberto"; aba "Franquias" entra funcional e completa.
- **Badge de alerta:** polling React Query 60s + `localStorage.franquias_last_seen`;
  sem Realtime/WebSocket.
- **Botão "Agrupar e Enviar ao Caixa"** removido do FranchiseeDetail — fluxo já
  ocorre automaticamente quando a matriz informa `amount_charged_by_matrix`.

---

## Arquitetura

```
DB (migration 070)
  ├── ecu_jobs: + matrix_payment_status, matrix_paid_at, matrix_paid_by, matrix_payment_id
  ├── financeiro_pagamentos (nova tabela)
  └── vw_saldo_franquias (view)

Hooks
  └── src/hooks/useFranquiasFinanceiro.ts
      ├── useSaldoFranquias()         — polling 60s, lista de cards por unidade
      ├── useUnseenFranchiseCount()   — badge: jobs novos vs last_seen
      ├── usePayFranchiseJobs()       — mutation: quita N jobs, registra pagamento
      └── useFranchiseJobHistory()    — histórico de cobranças por unidade

UI
  ├── src/pages/app/financeiro/FinanceiroPage.tsx  (refactor: abas)
  ├── src/pages/app/financeiro/FranquiasTab.tsx    (novo)
  └── src/pages/app/franqueados/FranchiseeDetail.tsx + CobrancasEcuTab.tsx (novo)
```

---

## Banco de Dados

### Migration 070 — ecu_jobs: campos de pagamento matriz

```sql
ALTER TABLE public.ecu_jobs
  ADD COLUMN IF NOT EXISTS matrix_payment_status TEXT NOT NULL DEFAULT 'em_aberto'
    CHECK (matrix_payment_status IN ('em_aberto', 'pago')),
  ADD COLUMN IF NOT EXISTS matrix_paid_at        TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS matrix_paid_by        UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS matrix_payment_id     UUID;
```

### Migration 070 — financeiro_pagamentos

```sql
CREATE TABLE public.financeiro_pagamentos (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id       UUID NOT NULL REFERENCES public.franchise_units(id),
  realizado_por UUID NOT NULL REFERENCES auth.users(id),
  realizado_em  TIMESTAMPTZ NOT NULL DEFAULT now(),
  total_valor   NUMERIC(12,2) NOT NULL,
  qtd_arquivos  INTEGER NOT NULL,
  observacao    TEXT,
  created_at    TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.financeiro_pagamentos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "matrix_only" ON public.financeiro_pagamentos
  USING (is_matrix_user());

ALTER TABLE public.ecu_jobs
  ADD CONSTRAINT fk_matrix_payment
  FOREIGN KEY (matrix_payment_id) REFERENCES public.financeiro_pagamentos(id);
```

### Migration 070 — view vw_saldo_franquias

```sql
CREATE OR REPLACE VIEW public.vw_saldo_franquias AS
SELECT
  fu.id              AS unit_id,
  fu.name            AS nome,
  fu.city            AS cidade,
  fu.state           AS uf,
  COUNT(j.id)        AS qtd_abertos,
  SUM(j.amount_charged_by_matrix) AS total_em_aberto,
  MIN(j.created_at)  AS data_mais_antiga
FROM public.franchise_units fu
JOIN public.ecu_jobs j ON j.unit_id = fu.id
WHERE j.matrix_payment_status = 'em_aberto'
  AND j.amount_charged_by_matrix IS NOT NULL
GROUP BY fu.id, fu.name, fu.city, fu.state;
```

---

## UI — FinanceiroPage (abas)

### Estrutura de abas

```
[ Em Aberto ] [ Franquias ●N ] [ Inter-Franquias ] [ Lançamentos ] [ Histórico* ]
```

- `●N` = badge com count de jobs `created_at > localStorage.franquias_last_seen`
- Aba padrão: "Em Aberto" (comportamento inalterado)
- Histórico* = placeholder vazio, implementação futura

### Aba Franquias — lista collapsed

Cards ordenados por maior saldo. Só unidades com saldo > 0.

Cada card:
- Nome + Cidade/UF
- Total em aberto + qtd arquivos
- Idade do débito mais antigo — verde < 5d, amarelo 5–15d, vermelho > 15d
- Chevron de expansão

Filtros: busca por nome/cidade · período de origem · toggle "atraso > 15 dias"

### Card expandido (accordion)

Tabela com colunas: checkbox · Arquivo · Tipo · Veículo · Data · Valor · Dias em aberto

Rodapé: "Selecionar todos / Desmarcar todos" · total dos selecionados ·
botão "Exportar CSV" · botão "Pagar Selecionados" (habilitado se ≥1 selecionado)

### Modal de pagamento

1. Nome da unidade + lista resumida + total
2. Campo opcional: observação/referência
3. Confirmar → mutação atômica:
   - INSERT `financeiro_pagamentos`
   - UPDATE `ecu_jobs` SET matrix_payment_status='pago', matrix_paid_at, matrix_paid_by, matrix_payment_id
4. Feedback: fade-out dos itens pagos · atualiza saldo · remove card se saldo zerar
5. Toast: "5 arquivos quitados — R$ 4.500,00 registrados para PROMAX-CASCAVEL"

### Estado vazio

"Nenhuma unidade com saldo em aberto 🎉"

---

## UI — FranchiseeDetail: Aba "Cobranças ECU"

**Posição:** nova aba ao lado de "Dados da Unidade".

**Filtros:** período (mês/ano) · status (Todos / Em Aberto / Pagos)

**Tabela:** Arquivo · Tipo · Veículo · Data Envio · Valor · Status · Pago em

**Rodapé:** Total período · Total pago · Total em aberto

**Botão:** "Exportar Relatório" (CSV)

**RLS:** franqueado logado vê apenas sua própria unidade — herdado do RLS existente.

---

## Regras de Negócio

1. Pagamento parcial sempre válido — sem mínimo.
2. `PAGO` é imutável pela interface — sem "desfazer".
3. `matrix_payment_id` obrigatório junto com status `pago` — FK garante integridade.
4. Unidades com saldo zero não aparecem na aba Franquias.
5. Dentro do card expandido, arquivos ordenados do mais antigo para o mais recente.
6. Badge some ao abrir a aba — `localStorage.franquias_last_seen = now()`.

---

## Arquivos a Criar / Modificar

| Ação | Arquivo |
|------|---------|
| CRIAR | `supabase/migrations/070_financeiro_franquias.sql` |
| CRIAR | `src/hooks/useFranquiasFinanceiro.ts` |
| CRIAR | `src/pages/app/financeiro/FranquiasTab.tsx` |
| CRIAR | `src/pages/app/franqueados/CobrancasEcuTab.tsx` |
| EDITAR | `src/pages/app/financeiro/FinanceiroPage.tsx` |
| EDITAR | `src/pages/app/franqueados/FranchiseeDetail.tsx` |

---

## Fora do Escopo (esta iteração)

- Aba "Histórico" de pagamentos
- Notificações push / Realtime
- Exportação XML (só CSV)
- Reversão de pagamentos
- EvoPro (implementação separada, mesma lógica)
