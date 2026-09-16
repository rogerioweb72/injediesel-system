# Adendo 15/09/2026 (1) — Segurança e integridade de dados

> Cobre o período 04/09 → 15/09/2026 no Injediesel. Ver regra de tamanho e
> índice em [`README.md`](./README.md).

---

## 1. Login "conta não vinculada" — race condition no 1º acesso

**Problema:** franqueado novo (via convite) criava senha, mas caía em
"Sua conta ainda não está vinculada a uma unidade" e era deslogado — mesmo
com o vínculo (`user_unit_roles`) já existindo no banco, confirmado por SQL.

**Causa:** `useMyUnit()` fazia `if (error) return null`. No 1º acesso, o
handoff do token de convite pode gerar um 401/403 **transitório** enquanto a
sessão ainda não propagou pro PostgREST. Esse erro virava `null`, e o
react-query **cacheava esse null por 5 min** — o login lia "sem unidade" e
derrubava a sessão. Só um re-login manual (cache limpo) resolvia.

**Fix (herdado do clone-base — PORTAR):**
- `useMyUnit`: `throw error` em vez de `return null` (não cachear erro
  transitório como estado final) + `retry: 4` com backoff.
- `LoginParceiro.tsx`: nos dois pontos que resolvem a unidade (useEffect
  pós-sessão e `onSubmit`), antes de desistir faz `refreshSession()` +
  refetch ~4x (900ms) em vez de derrubar na 1ª tentativa vazia.

**Commits:** `93e6b35` (useMyUnit), `0b04374` (LoginParceiro retry).

**Ação Promax/EvoPro:** se usam o mesmo padrão de `useMyUnit`/hook
equivalente com `return null` em erro, é o MESMO bug — franqueado novo vai
travar no 1º acesso. Portar as duas mudanças juntas (hook + fluxo de login).

---

## 2. `profiles.name` vazio ao vincular franqueado — trigger corrige na raiz

**Problema:** franqueado novo às vezes nascia com `profiles.name` vazio.
Efeito em cascata: slug da URL colapsava (`toSlug('')` = vazio) →
`/unidade//dashboard` virava 2 segmentos → casava no layout da MATRIZ →
`RoleGuard` rejeitava a franquia → **ACESSO NEGADO**. Também aparecia como
"Logado como —" na UI.

**Causa:** o convite (edge function) grava `profiles.name`, mas o trigger
`handle_new_user` (dispara ao inserir em `auth.users`) roda **depois** e
sobrescreve com vazio — corrida entre os dois. Backfill manual resolvia o
caso, mas voltava no próximo convite.

**Fix (herdado do clone-base — PORTAR):** trigger `AFTER INSERT ON
user_unit_roles` que preenche `profiles.name` (pelo `responsavel_legal_nome`
da unidade, ou o nome da unidade) sempre que o profile do vinculado estiver
vazio. Atômico, sem corrida — cobre todo convite futuro. Migration inclui
backfill dos já quebrados.

**Migration:** `127_fill_franchise_profile_name.sql`.

**Ação Promax/EvoPro:** portar a migration inteira (trigger + backfill) se
o fluxo de convite (`invite-franchisee` ou equivalente) seguir o mesmo
padrão de upsert em `profiles` + `handle_new_user`.

---

## 3. RLS `ecu_jobs` — envio de arquivo com `unit_id` null

**Problema:** upload de arquivo ECU falhava com `new row violates row-level
security policy for table "ecu_jobs"`, mesmo com o usuário corretamente
vinculado à unidade (confirmado simulando `my_unit_ids()` como o usuário).

**Causa:** o formulário usa `unit_id = myUnit?.unit_id ?? null`. Se
`myUnit` ainda não resolveu (mesma corrida do item 1, ou só timing normal de
carregamento), o insert manda `unit_id: null` → `null IN
(my_unit_ids())` é `false` → RLS rejeita. A policy estava correta; o front
é quem mandava dado inválido.

**Fix:** guarda no `onSubmit` — se `!isMatrix && !effectiveUnitId`, barra
com mensagem clara ("recarregue a página") em vez de deixar seguir com
`unit_id` null.

**Commit:** `bc8c163`.

**Ação Promax/EvoPro:** procurar todo formulário que usa `myUnit?.unit_id`
(ou hook equivalente) direto num insert **sem checar se já resolveu** —
esse é o padrão de bug a caçar, não um arquivo específico.

---

## 4. Protocolo de ticket de suporte — `duplicate key` por concorrência

**Problema:** `duplicate key value violates unique constraint
"support_tickets_protocol_key"` — repetido, várias unidades/horários.

**Causa:** `generate_ticket_protocol()` (trigger, migration `010_support.sql`
do clone-base) calcula `max(seq)+1` **sem lock**. O contador é **global do
mês** (`PT-AAAAMM-%`, todas as unidades competem pelo mesmo intervalo) — dois
inserts de unidades diferentes quase simultâneos leem o mesmo `max` e geram
o mesmo protocolo. O 2º insert viola a unique.

**Fix (herdado do clone-base — PORTAR, alta prioridade):**
`pg_advisory_xact_lock(hashtext('ticket_protocol_' || mês))` no início do
trigger — serializa só a geração do protocolo; a transação libera o lock
sozinha no commit/rollback. Front já tinha guarda de double-submit (botão
`disabled` durante o envio) — a causa era concorrência ENTRE unidades
diferentes, não double-click.

**Migration:** `128_ticket_protocol_concurrency_safe.sql`.

**Ação Promax/EvoPro:** se o trigger de protocolo de ticket vier do mesmo
`010_support.sql`, é o MESMO bug — mais visível quanto mais franquias ativas
simultâneas. Portar o `CREATE OR REPLACE FUNCTION` inteiro.

---

## 5. Overflow numérico — trava o preço da matriz em jobs com valor baixo

**Problema:** matriz não conseguia definir "cobrado pela matriz" (repasse)
quando o "cobrado do cliente" (preenchido pelo franqueado) era muito baixo
(ex.: R$ 2 vs matriz R$ 1.000) — UPDATE falhava com `numeric field
overflow`, sem mensagem clara na tela.

**Causa:** trigger `fn_calc_franchise_margin` (migration `036`) calcula
`franchise_margin_percentage = (cliente - matriz) / cliente * 100`. Com
cliente=2 e matriz=1000 → **-49900%** → estoura `numeric(5,2)` (máx
±999,99). Com cliente NULL o trigger pulava o cálculo — por isso "deixar
zerado" enganosamente funcionava.

**Fix:** alargar a coluna pra `numeric(12,2)` — a matriz sempre pode
definir o valor dela, mesmo que a margem fique muito negativa (aceito:
dashboard do franqueado pode acusar negativo).

**Migration:** `125_franchise_margin_pct_widen.sql`.

**Ação Promax/EvoPro:** se `ecu_jobs.franchise_margin_percentage` for
`numeric(5,2)` e existir o mesmo trigger de margem, alargar a coluna.

---

## 6. Overflow numérico — view de saldo de franquias

**Problema:** mesmo overflow, sabor diferente — a view `vw_saldo_franquias`
(soma de dívidas em aberto por unidade) quebrava ao ler quando a SOMA de uma
unidade passava do teto de `numeric(12,2)` — derrubava a página financeiro
inteira que lia a view, não só um job.

**Fix:** trocar o cast `::NUMERIC(12,2)` por `::NUMERIC` (sem precisão) no
`SUM()` da view. Leitura nunca mais estoura; o teto de valor individual fica
garantido no client (ver `MAX_MONEY` no adendo de UX/produto).

**Migration:** `121_vw_saldo_franquias_no_overflow.sql`.

**Ação Promax/EvoPro:** procurar qualquer view com `SUM(...)::NUMERIC(N,2)`
sobre valores financeiros agregados — o mesmo padrão estoura assim que a
soma de uma unidade passa do teto.

---

## 7. `financial_entries` — lançamento "Ajuste" sempre falhava

**Problema:** `new row for relation "financial_entries" violates check
constraint "financial_entries_type_check"` ao criar lançamento tipo
"Ajuste" — tanto franquia quanto matriz.

**Causa:** a UI trata `'ajuste'` como tipo de 1ª classe (criar, exibir,
filtrar), mas a check constraint da coluna `type` só permitia
`('receita','despesa')` — nunca foi atualizada quando o "Ajuste" foi
adicionado à UI. Descompasso UI↔banco desde o clone-base.

**Fix:** `DROP CONSTRAINT` + `ADD CONSTRAINT ... CHECK (type IN
('receita','despesa','ajuste'))`.

**Migration:** `122_financial_entries_allow_ajuste.sql`.

**Ação Promax/EvoPro:** rodar um insert de teste com `type='ajuste'` em
`financial_entries` — se a UI oferece essa opção mas a constraint não
inclui, é o mesmo bug. Fix de 2 linhas de SQL.

---

## 8. Exclusão de unidade — sucesso falso silencioso

**Problema:** TI tentava excluir uma unidade duplicada/vazia e "nada
acontecia" — sem erro visível, sem exclusão de fato.

**Causa:** o delete era feito direto do client (`franchise_units.delete()`)
sem checar `error` nem linhas afetadas. RLS bloqueava silenciosamente (0
linhas, erro `null`) e o front seguia como se tivesse dado certo.

**Fix:** RPC `admin_delete_franchise_unit` (SECURITY DEFINER): valida role
(`system_ti`/`company_admin`), **bloqueia exclusão se a unidade tiver
histórico** (customers/ecu_jobs/financial_entries/orders > 0 — protege
dado real) e só então deleta — erro real e explicável em qualquer caso de
falha (`forbidden`, `unit_has_history`, `unit_not_found`).

**Migration:** `123_admin_delete_franchise_unit.sql`.

**Ação Promax/EvoPro:** se exclusão de unidade for feita direto do client
(sem RPC), é o mesmo risco — trocar por RPC com guarda de histórico é boa
prática de segurança independente de ter o mesmo bug visível.

---

## 9. Antivírus/blocklist — desativado por decisão do dono (NÃO portar sem confirmar)

No Injediesel, blocklist de extensão + magic-bytes + VirusTotal foram
**desativados por completo** (08/09/2026) — decisão do dono: rede interna,
só franqueados têm acesso, R2 é armazenamento inerte (não executa nada).
Ver `src/lib/ecuFileTypes.ts` e `scan-ecu-file/index.ts` (blocos comentados,
não apagados — fácil reativar).

**⚠️ Isso é decisão de negócio, não bug.** Promax e EvoPro podem ter
contexto de rede/acesso diferente — **não replicar sem o dono de cada
sistema decidir isso separadamente.**
