# INJEDIESEL — Memória do Projeto (documento durável)

**Última atualização:** 27/07/2026 (FIN.5 fechado em produção)
**HEAD atual em produção:** 9cf44d5 (main) — FIN.5 completo (5212bae, 259fdd7, 9cf44d5)
**Método:** Rogério orquestra via Claude; agente VSCode escreve código; Rogério executa passos irreversíveis.

---

## 1. IDENTIDADE DO SISTEMA

- **Repo:** `~/Documents/projetos lovable/INJEDIESEL/DADOS/injediesel-system` (GitHub: rogerioweb72/injediesel-system, main = produção via Actions/FTP Hostinger)
- **Site:** https://inje.tech/appinjediesel
- **Supabase:** `ttnmvheptxedwninjedv`
- **Cloudflare (conta Mkt.injediesel@gmail.com):**
  - Worker `injediesel-r2-prod`
  - Buckets R2: `injediesel-ecu-originals`, `injediesel-ecu-delivered`, `injediesel-firmware`, `injediesel-mkt-materials`
- **Usuários de referência:**
  - Master: `web72web@gmail.com` (system_ti)
  - Operacional matriz: `injedieselrenan@gmail.com` (operations_admin)
- **Playbook mestre:** `~/Documents/projetos lovable/CHECKLIST-AUDITORIA-SISTEMAS.md` (SEMPRE ler antes de auditar; toda alteração datada por fase)

**Sistemas irmãos (mesmo codebase raiz, cherry-pick esperado):**
- Promax Tuner: `~/Desktop/promax-tuner` (Supabase conta `promax-vendas`) — diferencial: sistema de desconto de franquia
- EvoPro: repo a localizar; diferenciais a descobrir na Fase 0

---

## 2. MÉTODO INEGOCIÁVEL

- **Claude orquestra e revisa.** Agente do VSCode escreve código, commita **SEM push** até aprovação.
- **Migrations:** arquivo no repo → Rogério aplica via SQL Editor → testa → push.
- **NUNCA:** `supabase link`, `db push`, `db reset`, agente tocando banco direto.
- **Todo passo irreversível é do Rogério:** git push, SQL, secrets, deletes R2, `supabase functions deploy`.
- **Fonte autoritativa sempre** (arquivos no disco, banco via SELECT). `.env.local` mente; produção usa GitHub Secrets.
- **Toda alteração no playbook mestre é datada** — outros chats precisam identificar o que é novo.
- **Auditoria de verdade, não de fé:** exigir `git show <sha>` completo antes de aprovar qualquer commit, não só resumo.

---

## 3. REGRAS DE NEGÓCIO (confirmadas com o Rogério)

- **Veículos de RUA** (carro, caminhão, moto): placa obrigatória, único no sistema pela placa.
- **Veículos agrícolas / maquinários pesados:** SEM placa (não existe emplacamento). Form não pede placa nesses casos. Identificados por marca+modelo+cliente. Não é anomalia de dado.
- **Job created_by_matrix=true** (matriz cria em nome de franquia):
  - **Matriz** cobra o cliente final direto → `amount_charged_to_customer`
  - **Franquia** paga só o repasse técnico → `amount_charged_by_matrix`
  - São **2 cobranças independentes**, fecham em momentos diferentes.
- **Renan (operations_admin) NÃO tem acesso ao Caixa** — decisão intencional do Rogério, não bug.
- **VirusTotal está desativado por decisão de produto.** Fluxo padrão de scan: `pending → skipped → download liberado`. Nada de UI de aviso de risco.

---

## 4. HISTÓRICO DAS SPRINTS FECHADAS

| Sprint | Escopo | Status |
|---|---|---|
| Grupo A | Label Modificado + ícones; form 3 tipos serviço; 9 tags fixas; transmissão obrigatória (CHECK constraint) | ✅ Produção |
| A.1 | Fix `file_type='entrega'` sempre; régua 3 estados; automação 1º download → Processamento; card Próximas Ações com STATUS/TAGS; badge Arquivo Complexo; bloco vermelho Contatar Financeiro (mig 087) | ✅ Produção |
| A.2 | Busca unificada RPC `search_ecu_jobs` SECURITY INVOKER (mig 088); coluna Financeiro valor BRL+status; policy `financial_admin_write` estendida a 6 roles (mig 089); fix sistêmico do erro silencioso (42501 sai de isAuthError); cron `poll-ecu-scans` agendado (pg_cron + pg_net ativas) | ✅ Produção |
| A.3 | Pipeline de scan corrigido (Database Webhook dispara `scan-ecu-file` no INSERT); bucket por `file_type` (secrets `R2_BUCKET_ECU_ORIGINALS/DELIVERED`); `WEBHOOK_SECRET` setado; trigger 093 sync financeiro→job; invalidations sem Cmd+R; campo Cliente clicável + Cidade; semáforo de tempo verde≤20 / amarelo 21-50 / vermelho >50 base created_at, congela em first_entrega_at (mig 090); coluna service_notes (mig 091); scan_status='error' (mig 092); auto-block de 1h corrigido; fire-and-forget do useEcuFiles removido | ✅ Produção |
| A.4 | Fix `ecu-download-url` (mesmo bug de bucket único, deployado); policy `ecu_job_files_matrix` estendida com support_agent + finance_admin (mig 094); .txt aceito + whitelist centralizada em `src/lib/ecuFileTypes.ts` (backend em `scan-ecu-file` mantém cópia manual por limitação Deno/Vite); botão download em `MateriaisMatrizPage`; dashboard matriz com 3 KPIs (venda bruta franquias, receita matriz, margem franquias) | ✅ Produção |
| A.5 | Feature "Job em nome da franquia": seletor Matriz/franquia no form; flag `created_by_matrix` (mig 095); tabela `ecu_job_price_adjustments` (ledger append-only, RLS só SELECT+INSERT); RPC `lookup_customer_by_document` SECURITY DEFINER com retorno limitado (name/email/phone); selo "Criado pela Matriz"; hook `useNewMatrixCreatedJobsCount` pro sino; franquia edita `amount_charged_to_customer` inline; regra de policy incluída `finance_admin+finance_staff` no ledger | ✅ Produção |
| A.6 | Nova tabela "Meus Arquivos": JOB \| Data/Hora \| Cliente \| Placa+Veículo empilhados \| Unidade+Cidade (só matriz) \| Serviço \| Status \| Tempo \| Valor Custo \| Valor Cliente; badge PAGO/ABERTO incorporado ao valor; alerta contact_finance = linha vermelha + AlertTriangle amarelo (prop rowClassName aditiva no DataTable); Motor e Ano obrigatórios | ✅ Produção |
| A.9 | 7 refinos: fim do aviso "Sem verificação" (VirusTotal permanente OFF); redesign bloco de arquivo (título grande ORIGINAL/MODIFICADO + separador + botão verde limpo); badges pílula → retângulo 6px hardcoded; "Em Processamento" → "Processamento", "Em Aberto" → "Aberto"; Arquivo Complexo = barra vertical LARANJA (vermelho ganha se ambos); olhinho de privacidade no Valor Custo (só franquia, borrado por default); coluna Tempo escondida da franquia; **BUG CRÍTICO CORRIGIDO:** veículo agora vincula ao cliente na criação do job (backfill de 8 veículos órfãos via mig 096) | ✅ Produção |
| A.10 | Bloco de arquivo com alinhamento fixo (`min-w-[160px]` medido ao vivo); badges Aberto/Pago com `min-w-[72px]` estimado (Rogério vai calibrar); olhinho não borra mais o badge de pagamento; filtro de unidade na listagem (RPC search_ecu_jobs ganhou params `p_unit_id` + `p_matrix_only`, mig 097) | ✅ Produção |
| B.3 | Campo Técnico Responsável no job (dropdown com técnicos da matriz) | ✅ Produção |
| Sprint bugs financeiros | FIN.3 — policies `financial_admin_mark_paid` + `financial_admin_update_commissions` estendidas pra 7 roles (mig 098). A.11 bug 1 — SupportTicketDetail renderiza estado de erro real em vez de skeleton infinito | ✅ Produção |
| **FIN.5** | Cliente final órfão em job created_by_matrix. Trigger 093 aggregate check (mig 099), useSendToFinance com lista de entries, useEcuJobFinancialEntries plural, EcuJobDetail 3 casos com 2 linhas de Status Financeiro | ✅ Produção — 5212bae, 259fdd7, 9cf44d5 (27/07/2026) |

---

## 5. APRENDIZADOS PORTÁVEIS (cherry-pick candidates pros clones)

Cada padrão abaixo é um bug **arquitetural** que provavelmente existe nos clones. Verificar antes de aplicar fix.

### 5.1 — Policies de mesmo domínio com listas de roles divergentes
**Sintoma:** UPDATE silencioso de 0 linhas; erro 42501 engolido; feature "funciona" pra alguns roles e falha invisível pra outros. Migration 080 corrigiu uma vez; migração 098 corrigiu de novo (`financial_admin_write` vs `mark_paid` vs `update_commissions`).
**Fix:** sincronizar listas de roles entre policies do mesmo domínio (write/update/mark_paid). **Cuidado com exceções intencionais** (ex: `seller` em `mark_paid` mas não em `write` no contexto PDV — não é typo).
**Verificação nos clones:**
```sql
SELECT policyname, cmd, qual FROM pg_policies
WHERE tablename IN ('financial_entries', 'commission_entries')
ORDER BY tablename, policyname;
```

### 5.2 — Erros de RLS (42501) tratados como erros de autenticação
**Sintoma:** UPDATE/INSERT falha por RLS, o handler global classifica como auth error, redireciona pro login OU engole silencioso. Descoberto em `main.tsx` no A.2.
**Fix:** distinguir tipos de erro no handler global. 42501 vira toast "Sem permissão para esta ação", NÃO logout.

### 5.3 — Buckets únicos hardcoded em edge functions
**Sintoma:** função lê `R2_BUCKET_ECU` (secret único) mas o sistema tem N buckets por tipo de arquivo. Falha silenciosa em 500 sem mensagem clara. Descoberto em `scan-ecu-file` (A.3) e `ecu-download-url` (A.4).
**Fix:** escolher bucket por `file_type` recebido no payload; secrets separados (`R2_BUCKET_ECU_ORIGINALS`, `R2_BUCKET_ECU_DELIVERED`).
**Cuidado:** `.env.example` do repo raiz pode listar nomes de bucket do outro sistema (Promax) — SEMPRE confirmar no Cloudflare antes de setar secrets.

### 5.4 — Fire-and-forget engolindo erros importantes
**Sintoma:** `.catch(() => null)` no fetch de edge function. Erros de auth/rede nunca aparecem. Bug do scan pending eterno (A.3).
**Fix:** remover fire-and-forget onde o resultado importa; usar Database Webhook em vez de chamada client-side.

### 5.5 — Cron não agendado apesar de código pronto
**Sintoma:** função com header `cron: "*/2 * * * *"` como comentário; `SELECT * FROM cron.job` retorna vazio.
**Fix:** agendar via SQL com `cron.schedule()`; não confiar em cabeçalho comentado.
**Verificação:**
```sql
SELECT * FROM cron.job;
```

### 5.6 — Database Webhook precisa header custom
**Sintoma:** função com `WEBHOOK_SECRET` configurado, mas o webhook nativo do Supabase manda só `Authorization: Bearer <anon key>` — a função rejeita 403.
**Fix:** header customizado no webhook (`x-supabase-signature: <valor do WEBHOOK_SECRET>`).

### 5.7 — Trigger com aggregate-check vs update direto no front
**Sintoma:** trigger `SECURITY DEFINER` marca campo como concluído; MAS front também faz update direto "best-effort". Quando o fluxo N=1 vira N=2, o update direto fecha cedo demais e ignora aggregate check do trigger. Descoberto no FIN.5.
**Fix:** **trigger é fonte única da verdade** pra campos com aggregate. Remover updates diretos no front do mesmo campo.
**Verificação:** grep por `matrix_payment_status` (ou equivalente) fora de migrations — qualquer ocorrência em hook/componente é candidata a remover.

### 5.8 — SECURITY INVOKER vs DEFINER — regra de ouro
- **SECURITY INVOKER (default):** preserva RLS. Use em RPCs de busca sobre tabelas com isolamento por `unit_id`.
- **SECURITY DEFINER:** contorna RLS. Use SÓ quando precisar cruzar isolamento intencionalmente E com **RETURN limitado** que não vaze IDs/dados sensíveis. Ex: `lookup_customer_by_document` retorna só name/email/phone, nunca `id/unit_id/document`.

### 5.9 — Whitelist de extensões divergente entre front e edge function
**Sintoma:** front aceita, edge function rejeita, upload falha silencioso. Descoberto no A.4 (`.hex` no front, ausente no backend).
**Fix:** centralizar lista canônica em `src/lib/*.ts`. Backend em Deno mantém cópia manual (limitação: Deno não importa de Vite). Documentar no cabeçalho da edge function que a sync é manual.

### 5.10 — RPC de busca com filtros combinados
**Sintoma:** filtro "unidade + status" retorna união (OR) em vez de interseção (AND). Bug clássico de sentinelas.
**Fix:** parâmetros tipados independentes no `WHERE`, cada um com cláusula própria encadeada com AND. Nunca reusar `NULL` pra significar "não filtrar" E "só matriz".

### 5.11 — Padrão de rowClassName aditivo no DataTable
Feature aditiva sem quebrar consumidores: prop opcional `rowClassName?: (row: T) => string` no componente compartilhado. Múltiplos alertas convivem por precedência (vermelho > laranja > neutro). Reusar padrão pra qualquer nova sinalização de linha.

### 5.12 — Autoria em audit_logs
**Achado sistêmico:** `audit_logs` sem policy de INSERT pra roles fora de `system_ti`. Hook `useAuditLog()` do front engole erro silenciosamente. 235+ registros de triggers do banco (dado bruto OK), ~30 registros semânticos (só de system_ti).
**Não é blackout, é gap:** dado bruto preservado, narrativa humana perdida pra roles não-master.
**Fix correto:** SECURITY DEFINER por entidade (padrão da 093), sessão dedicada de observabilidade. NÃO abrir policy de INSERT genérica (perde tamper-resistance).

---

## 6. BACKLOG PRIORIZADO

**Em andamento agora:** nenhum. FIN.5 fechado (5212bae, 259fdd7, 9cf44d5), migration 099 aplicada e deploy validado — falta só Rogério validar o fluxo end-to-end em produção (teste dos 7 passos, ver seção 10) antes de abrir o próximo item.

**Fila (próxima ordem sugerida, após validação do FIN.5):**
1. **A.11 bug 1.1** — Página `/suporte/:id` mostra "Erro ao carregar chamado — Falha na consulta" após criar ticket. RLS de `support_tickets` confirmadamente OK (6 policies inspecionadas). Suspeitas: (a) hook `useSupportTicket` montando query com campo/relação inexistente; (b) join com tabela com RLS bloqueando (profiles/ecu_jobs); (c) throw error escondendo erro real.
2. **FIN.1** — Parcelamento cartão (1-12x) e boleto (1-5x). Modal mostra select "Nx de R$ Y,YY" (número + valor por parcela). Campo `parcelas` em `financial_entries` (migration nova). PIX/Débito sem parcelamento.
3. **A.11 features 2, 3, 4:**
   - Hook `useNewOpenTicketsCount` pro sino do header
   - Dot verde no NavItem de Suporte
   - Badge "CORREÇÃO" na listagem ECU (migration adiciona `LEFT JOIN LATERAL` em `support_tickets` à RPC `search_ecu_jobs`)
4. **FIN.4** — Redesign do painel Caixa. Manter abas (Aberto, Franquias, Inter-Franquias, Lançamentos, Histórico). Na aba Aberto (principal): cobranças em ordem de chegada (produção), sem discriminar tipo. Cards mostram cliente, serviço, valor, técnico. Financeiro clica → forma de pagamento → finaliza → some.
5. **A.10 item 2 refino** — badge Aberto/Pago com `min-w-[72px]` estimado. Rogério vai conferir visualmente e reportar ajuste.
6. **Autofill do veículo** — no `EcuJobForm` ao selecionar veículo cadastrado, autofill de marca/modelo/ano/categoria/transmissão. Km/horas editável.
7. **Autofill do técnico** — no `EcuJobForm`, `technician_id` vem pré-selecionado com user_id do logado (se matriz). Editável.
8. **B.2** — Substituir arquivo enviado errado. Decisão de arquitetura pendente:
   - INSERT novo + histórico via `ecu_job_events` vs UPDATE in-place (webhook não dispara em UPDATE, precisaria compensar)
   - Sem coluna nova em `ecu_job_files` (deleted_at / uploaded_by ficam pra escopo maior)
9. **A.7** — Matriz de permissões granulares (`profiles.permissions`) hoje decorativa. Fazer as caixinhas do cadastro valerem no ECU.

**Backlog técnico (débito registrado, sem urgência operacional):**
- **audit_logs** — SECURITY DEFINER por entidade em sessão dedicada de observabilidade.
- **Housekeeping:**
  - Node 20 deprecated no runner do Actions
  - `bulk-replace-ecu-catalog.sql` solto em `supabase/functions/` (fora do lugar)
- **checkFirmwareAcceptance** no Cloudflare Worker ainda usa padrão anon key (mesma classe do `r2-presign.ts` já corrigido).

---

## 7. INFRA E SECRETS (referência rápida)

- **Supabase Edge Functions ativas:** `scan-ecu-file`, `poll-ecu-scans`, `ecu-download-url`, `_shared`, `admin-telemetry`, `calculate-shipping`, `ecu-catalog-public`, `invite-franchisee`, `invite-user`, `plate-lookup`, `support-download-url`, `support-upload-url`. Arquivo solto: `bulk-replace-ecu-catalog.sql` (fora do lugar).
- **Secrets configurados no Supabase:**
  - `R2_BUCKET_ECU_ORIGINALS=injediesel-ecu-originals`
  - `R2_BUCKET_ECU_DELIVERED=injediesel-ecu-delivered`
  - `WEBHOOK_SECRET=injediesel-scan-2026-x7k9`
  - `VIRUSTOTAL_API_KEY` NÃO configurado (por decisão de produto)
  - Vários outros (financial, resend etc — total ~15 secrets, list completa via `supabase secrets list`)
- **Cron ativo:** `poll-ecu-scans` schedule `*/2 * * * *` (via pg_cron + pg_net)
- **Database Webhook ativo:** `ecu_job_files` INSERT → `scan-ecu-file` com header `x-supabase-signature`
- **Extensões pg_cron e pg_net:** ambas ATIVAS

---

## 8. MIGRATIONS APLICADAS (histórico rápido, últimas 15)

| Migration | Descrição | Portável? |
|---|---|---|
| 080 | financial_admin_mark_paid estendida (contexto histórico) | Sim |
| 087 | `is_complex_file` + `contact_finance` em ecu_jobs | Sim |
| 088 | RPC search_ecu_jobs SECURITY INVOKER com busca unificada | Sim |
| 089 | financial_admin_write estendida a 6 roles | Sim |
| 090 | RPC search_ecu_jobs + first_entrega_at (semáforo) | Sim |
| 091 | Coluna service_notes em ecu_jobs | Sim |
| 092 | scan_status enum ganha 'error' | Sim |
| 093 | Trigger fn_sync_ecu_job_payment_status | ⚠️ Ver 099 antes |
| 094 | Policy ecu_job_files_matrix estendida | Sim |
| 095 | created_by_matrix + ecu_job_price_adjustments + lookup_customer_by_document | Sim (regra específica) |
| 096 | Backfill de veículos órfãos (aplicada, ficou como registro) | Não (dados) |
| 097 | RPC search_ecu_jobs com filtros p_unit_id + p_matrix_only | Sim |
| 098 | financial_admin_mark_paid + update_commissions estendidas a 7 roles | **Sim, verificar clones** |
| 099 | fn_sync_ecu_job_payment_status com aggregate check (FIN.5) | Sim |

---

## 9. LIÇÕES DE PROCESSO (auto-crítica)

- **Contexto muito longo faz o agente perder detalhes.** Fazer `/clear` a cada 2-3 sprints, com cofre atualizado.
- **Repasse de instrução falha entre Claude e agente.** Registrar decisões em bloco de código no chat, não em prosa.
- **Auditar diff cru, não resumo.** Exigir `git show <sha>` completo antes de aprovar.
- **Contra-argumentação do agente é sinal positivo.** Quando ele pergunta "topa esse escopo?", é hora de parar e pensar — significa que ele detectou complexidade além do combinado.
- **Migrations sempre com cabeçalho documentado.** Padrão do bug + fix + candidato de cherry-pick + SQL de verificação nos clones.
- **Testes em produção antes de encadear próximo sprint.** Cada fix precisa ser validado pelo Rogério antes de virar dependência de outro.
- **Deadlocks do Postgres acontecem** (dashboard concorrente). Rodar SQL de novo é comportamento correto.

---

## 10. ESTADO ATUAL LITERAL

**Ao carregar este documento, o próximo Claude deve saber:**

- HEAD em produção: `9cf44d5` (main) — FIN.5 completo, 3 commits (`5212bae`, `259fdd7`, `9cf44d5`), migration 099 aplicada, deploy Actions/FTP concluído com sucesso (27/07/2026)
- Trabalho em andamento: NENHUM
- Ação imediata do Rogério: validar FIN.5 em produção — teste dos 7 passos: (1) matriz cria job `created_by_matrix=true` pra franquia Cascavel, (2) preenche `amount_charged_to_customer` E `amount_charged_by_matrix`, (3) conclui o job, (4) envia pro financeiro, (5) confirma 2 entries geradas (cliente final `unit_id=null` no Caixa da matriz + repasse `unit_id=Cascavel` no Caixa da franquia), (6) quita uma isolada e confirma que `matrix_payment_status` continua pendente, (7) quita a outra e confirma que só aí o job fecha
- Ação imediata do agente: aguardar Rogério validar; depois disso, abrir **A.11 bug 1.1** (próximo item da fila, seção 6)

---

*Fim do documento. Se algo aqui ficou desatualizado, corrige com data e mantém histórico da mudança.*
