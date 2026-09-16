# Adendo 15/09/2026 (2) — Fluxo de arquivo ECU, financeiro, tags

> Cobre o período 04/09 → 15/09/2026 no Injediesel. Ver regra de tamanho e
> índice em [`README.md`](./README.md).

---

## 1. Download de ECU trocava o nome do arquivo — quebrava o software de remap

**Problema:** ao baixar um arquivo ORIGINAL ou MODIFICADO, o nome baixado
vinha com um prefixo de timestamp (`1788531623462-nome_do_arquivo.fpf`) em
vez do nome exato enviado. Isso **quebrava a ativação do arquivo no módulo
ECU/software de remap** do cliente — causa relatada como "dano e falha".

**Causa:** a edge function `ecu-download-url` gerava a presigned URL do R2
sem `ResponseContentDisposition`. Sem isso, o navegador usa o **basename da
r2_key** (que tem prefixo de timestamp pra evitar colisão no bucket) como
nome de download, ignorando o `file_name` original salvo no banco.

**Fix (herdado do clone-base — PORTAR, prioridade ALTA):** a
`GetObjectCommand` passa a incluir
`ResponseContentDisposition: 'attachment; filename="..."; filename*=UTF-8...'`
com o `file_name` original (ASCII + UTF-8 pra acentos). Nome do arquivo
baixado agora é **idêntico** ao enviado.

**Commit:** `dacdd33`.

**Ação Promax/EvoPro:** se a `ecu-download-url` (ou equivalente) não seta
`ResponseContentDisposition`, é o MESMO bug — qualquer arquivo baixado tem
o nome errado. Fix de poucas linhas, sem migration.

---

## 2. Limite de upload — 10MB rejeitava arquivo legítimo

**Problema:** cliente reportou que arquivos de até 10MB (dentro do limite
"oficial") não carregavam.

**Causa/Fix:** teto sincronizado em dois lugares (front `EcuJobForm.tsx` +
edge `scan-ecu-file/index.ts`, `MAX_BYTES`) — se um só dos dois for
atualizado, arquivo passa por um lado e falha silenciosamente no outro.
Ambos elevados de 10MB → **50MB**.

**Ação Promax/EvoPro:** conferir se o limite está sincronizado nos DOIS
pontos (front + edge). Se só um foi alterado no passado, há uma faixa de
tamanho que passa no front e falha no back sem aviso claro.

---

## 3. Apagar/substituir/inutilizar arquivo ECU — evita "4 arquivos" no job

**Problema de produto:** franquia enviava arquivo errado; não havia como
corrigir sem virar bagunça de múltiplos arquivos no mesmo job (nenhum jeito
de saber qual é o certo).

**Fluxo implementado:**
- **Franquia, ANTES do aceite** (`status='recebido'`): substitui em 1 clique
  (sobe o novo + apaga o antigo na mesma ação) ou exclui o original.
- **Franquia, DEPOIS do aceite:** só pode **avisar a matriz** que está
  errado (`reported_wrong` + motivo).
- **Matriz, a qualquer momento:** **inutiliza** (`invalidated=true` — fica
  cinza/riscado com nota "arquivo errado" na UI, mas mantém o histórico) ou
  **exclui de vez** (remove linha + objeto R2).

**Migration:** `120_ecu_file_invalidation.sql` (colunas + 4 RPCs
`SECURITY DEFINER`: `franchise_delete_ecu_file`,
`franchise_report_wrong_file`, `matrix_invalidate_ecu_file`,
`matrix_delete_ecu_file`). Requer rota nova no worker R2
(`/r2-ecu-delete`, ver `workers/r2-presign.ts`).

**Ação Promax/EvoPro:** feature de produto — **avaliar se o dono de cada
sistema quer o mesmo fluxo** antes de portar. Mas o PADRÃO técnico (RPC que
valida status/role antes de deletar, nunca DELETE direto do client) vale a
pena adotar independente da feature completa.

---

## 4. Financeiro — job criado pela matriz não exigia mais "cobrado do cliente"

**Problema de produto:** ao concluir um remap criado PELA MATRIZ em nome
de uma unidade (`created_by_matrix=true`), o botão "Enviar para o
Financeiro" ficava travado se o campo "Valor cobrado do cliente" estivesse
vazio — mesmo com "Valor cobrado pela matriz" (repasse, o que realmente
importa pro financeiro) preenchido.

**Fix:** o cálculo de `financeEntries` passou a exigir só
`amount_charged_by_matrix`; `amount_charged_to_customer` entra no envio
**se preenchido**, mas nunca bloqueia. Ver `EcuJobDetail.tsx`.

**Ação Promax/EvoPro:** regra de negócio específica do fluxo
`created_by_matrix` — só se aplica a sistemas que têm esse mesmo conceito
(matriz cria job em nome de uma franquia). Avaliar antes de portar.

---

## 5. Tags de serviço — de hardcoded pra editável pelo gestor

**Problema de produto:** as tags do formulário de arquivo ECU (Potência,
EGR, DPF etc.) eram um array fixo no código — só mudava com deploy.

**Fix:** tabela `ecu_service_tags` (slug, label, ordem, `ativo`) com RLS
(leitura livre, escrita só `company_admin`/`operations_admin`/`system_ti`).
Painel em Configurações → aba "Serviços (ECU)": reordenar, **ocultar** (não
apaga — preserva o vínculo histórico dos jobs que já usam a tag) e
adicionar tag nova. As tags agora aparecem também na lista de arquivos
(coluna "Tipo de Serviço", matriz) e dentro do detalhe do job.

**Migration:** `129_ecu_service_tags.sql`.

**Ação Promax/EvoPro:** feature de produto — portar só se o dono quiser a
mesma flexibilidade de tags sem deploy. Requer regenerar tipos do Supabase
ou usar cast `any` como neste repo (tabela nova ainda não nos tipos
gerados).

---

## 6. `unit_code` — identidade única por unidade

**Problema de produto/dado:** unidade identificada só por nome — duas
franquias cadastradas com o **mesmo nome** (erro operacional) geraram
ambiguidade real (qual delas tinha dívida, qual apagar).

**Fix:** coluna `unit_code` (formato `SAM-CAS-01` = 3 letras do nome + 3
da cidade + sequencial), única, gerada por trigger em todo INSERT novo +
backfill das existentes. Exibido na lista, ficha e perfil da unidade;
pesquisável.

**Migration:** `124_franchise_unit_code.sql` (inclui recriar a view
`v_franchise_units` — `CREATE OR REPLACE VIEW` não deixa adicionar coluna
no meio do `fu.*` sem dar erro de "cannot change name of view column";
precisa `DROP VIEW` + `CREATE VIEW`).

**Ação Promax/EvoPro:** boa prática de dados — portar se houver risco real
de nome de unidade duplicado (cadastro manual sem validação de unicidade).
