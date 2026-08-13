# INJEDIESEL — Memória do Projeto (documento durável)

**Última atualização:** 12/08/2026 (fix QR PIX status aprovado + vídeo de boas-vindas editável pela matriz, mig 102)
**HEAD:** `af99734` — checado nesta sessão (12/08): `origin/main` == `HEAD` local, 0 ahead / 0 behind. Ou seja, **tudo que estava "local, sem push" em sessões anteriores (04/08, fluxo de correção, sessão 11/08) já está em produção.** Não confiar em anotações antigas de "push a confirmar" neste documento sem checar `git log origin/main..HEAD` de novo.
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
| **RBAC operations_admin** | Renan (operations_admin) travado em quase tudo. 5 frentes: mig 081 (profiles.email — coluna nunca existiu, functions de convite faziam upsert nela); fixes em `invite-user`/`invite-franchisee` (allowlists sem operations_admin + profileErr fatal abortando vínculo `user_unit_roles`); mig 082 (`profiles_update_admin` com operations_admin + `id <> auth.uid()`); mig 083 (`franchise_units_admin_all`); mig 084 (**21 policies** em 13 tabelas que usavam `is_matrix_admin()`); mig 085 (`marketing_materials` sem system_ti); Worker R2 `isMatrixAdmin()` consultava profiles com anon key → 403 pra TODOS os roles; fix 22P02 (string vazia em campo integer no wizard); guarda `isEditingSelf` no UsersTab | ✅ Produção — 20/07/2026 |
| **Grupo C (evolução JOB)** | Item 13: whitelist de extensões ECU 9 → 42 formatos (`a281261`). Item 14: remoção definitiva do bloqueio por `scan_status` no download — VirusTotal OFF de ponta a ponta (`433e708`). Limite de arquivo alinhado em 10MB front+backend (`118c3e2`). Item 12 investigado: sem bug ativo, mas limitação conhecida — `.single()` em `useMyUnit` quebra se um usuário tiver 2+ unidades. Item 15 (autofill CNPJ via BrasilAPI) reportado como já em produção | ✅ Código pronto — 04/08/2026, **push a confirmar** |
| **Sessão 11/08 (finalização + segurança)** | Remoção de mock mode (`src/mocks/`, branches `IS_MOCK`); dashboard do franqueado com filtro de período (novo hook `useFranchiseDashboard` escopado a `unit_id`, sem cap); **toggles de permissão = realidade** — `PermMatrix` (UsersTab) trava Criar/Editar/Excluir acima de `ROLE_DEFAULT_PERMISSIONS[role]` + `ModuleGuard` de rota + Sidebar da matriz gateada por módulo (fecha A.7); menu **"Atualizações"** (firmware) na Sidebar da matriz; **Bug H corrigido** — `checkFirmwareAcceptance` no `workers/r2-presign.ts` passa o JWT do usuário (não anon key), `wrangler deploy` feito; **e-mail transacional oficial** — Resend + domínio `inje.tech` verificado + DMARC + SMTP custom no Supabase Auth + rate limit elevado + 4 templates PT-BR (`docs/email-templates/`); **WhatsApp de suporte via banco** (mig 101 + RPC `get_support_whatsapp()` SECURITY DEFINER, número nunca no front); **reset do banco** (só web72web=master + renan=ops; catálogo/tabela-remap preservados); identidade + `.env.local` mentiroso documentados no CLAUDE.md | ✅ Produção — 11/08/2026 (`593cba8` RBAC + `a445e6d` templates pushados; 1 commit de doc sem push) |
| **Sessão 12/08 (RBAC dono + QR PIX + vídeo boas-vindas)** | **RBAC — custom bloqueando dono:** conta `franchise_manager` (rogeriolimadesigner) com `permissions` custom (`ecu_arquivos` tudo `false`) → acesso negado a Enviar Arquivo + sidebar incompleta. Fix: `permissions = NULL` volta ao padrão do role. Blindagem aplicada: `UPDATE profiles SET permissions = NULL WHERE role IN ('company_admin','franchise_manager') AND permissions IS NOT NULL`. UsersTab/invite-franchisee criam admin com acesso total por padrão — **não é bug sistêmico**, foi redução manual das caixinhas. **Aprendizado:** o painel de permissões no convite (52 caixinhas) grava `custom` que SUBSTITUI o padrão do role — pra manter o acesso padrão do cargo, não tocar nas caixinhas. **QR PIX sumido** — 2 achados: (a) painel PIX só renderizava com `order.status === 'aguardando_pagamento'`, não `'aprovado'` (o stepper já tratava os dois como equivalentes; `needsPay`/`needsPix` não) — corrigido em `FranqueadoPedidosPage.tsx`; (b) secret `VITE_PIX_KEY` nunca tinha sido criado no GitHub → "Chave Pix não configurada". Criados `VITE_PIX_KEY=15154660000102` (CNPJ), `VITE_PIX_NAME=INJEDIESEL POWER CHIP`, `VITE_PIX_CITY=CASCAVEL PR`. **Vídeo de boas-vindas editável:** era hardcoded (`WELCOME_VIDEO_ID='dQw4w9WgXcQ'`, placeholder Rick Roll) — agora vem de `company_settings.welcome_video_url`, lido via RPC `get_welcome_video_url()` SECURITY DEFINER (mesmo padrão do `support_whatsapp`, franquia não tem SELECT direto na tabela), editável pela matriz em `MatrizAjudaPage.tsx` (**migration 102**, não 101 — 101 já era `support_whatsapp` quando a numeração foi definida). ⚠️ **CHERRY-PICK Promax/EvoPro:** `VITE_PIX_KEY`/`NAME`/`CITY` precisam ser criados no GitHub de CADA clone, com o CNPJ da respectiva empresa — sem isso a loja não mostra QR. Fix do `needsPay`/`needsPix` e a migration do vídeo de boas-vindas também são portáveis. | 🟡 Parcial — RBAC fix e secrets PIX já aplicados por Rogério direto no banco/GitHub; código (fix PIX + vídeo) e migration 102 prontos, aguardando commit + push + Rogério aplicar mig 102 |

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

### 5.13 — Helper functions de role em policies são armadilha silenciosa
**Sintoma:** `is_matrix_admin()` e `is_matrix_user()` parecem intercambiáveis mas têm escopos diferentes — a primeira só cobre `system_ti` + `company_admin`. Toda policy de ESCRITA que usava `is_matrix_admin()` excluía `operations_admin` sem nenhum aviso: o usuário via os dados (SELECT passava por outra policy) mas o INSERT/UPDATE voltava 42501. Descoberto em 20/07 com 21 policies afetadas em 13 tabelas de uma vez.
**Agravante:** o padrão INVERSO também existe — `marketing_materials` usava inline check com `ARRAY['company_admin','operations_admin']` e esquecia `system_ti`, quebrando pro usuário master.
**Fix:** não confiar em helper nenhuma para policies novas. Inline check explícito com a lista completa de roles.
**Verificação nos clones:**
```sql
SELECT c.relname AS tabela, pol.polname, pol.polcmd,
       pg_get_expr(pol.polqual, pol.polrelid) AS using_expr
FROM pg_policy pol
JOIN pg_class c ON c.oid = pol.polrelid
WHERE pg_get_expr(pol.polqual, pol.polrelid) LIKE '%is_matrix_admin%'
   OR pg_get_expr(pol.polwithcheck, pol.polrelid) LIKE '%is_matrix_admin%'
ORDER BY c.relname, pol.polname;
```

### 5.14 — Worker Cloudflare consultando Supabase com anon key
**Sintoma:** Worker faz `SELECT` em `profiles` com `Authorization: Bearer ${env.SUPABASE_ANON_KEY}`. A RLS de `profiles_read` exige `auth.uid()` — anon key não tem uid → query volta vazia → o Worker conclui que ninguém é admin → **403 pra todos os roles**. Upload/delete de marketing e firmware ficaram 100% quebrados sem ninguém perceber.
**Fix:** `verifyToken` retorna `{ userId, token }` e a checagem de role usa o **JWT do usuário**, não a anon key.
**Ainda pendente no Injediesel:** `checkFirmwareAcceptance` no mesmo `r2-presign.ts` tem o mesmo padrão (Bug H, não corrigido).

---

## 6. BACKLOG PRIORIZADO

**Em andamento agora:** Fluxo de Correção integrado ao Job está **✅ CONCLUÍDO E EM PRODUÇÃO** (fases 1-4, commits `4c8a4ec` + `ead4fed` — confirmado via `origin/main`==`HEAD` em 12/08). Item 1 da fila abaixo fica como registro histórico do desenho, não como pendência. Trabalho novo em andamento: sessão 12/08 (RBAC dono + QR PIX + vídeo boas-vindas) — ver linha na tabela de sprints acima; falta commit+push do código e Rogério aplicar a migration 102.

**A.11 bug 1.1 — RESOLVIDO.** Em 04/08 o `SupportTicketDetail.tsx` foi lido do disco e já renderiza estado de erro real, com o join `requester:profiles!support_tickets_created_by_fkey(...)` funcionando. Sai da fila.

**Fila (próxima ordem sugerida):**
1. **✅ CONCLUÍDO (04-05/08, confirmado em produção 12/08) — Fluxo de Correção integrado ao Job** — hoje o ticket de correção (`support_tickets` com `ecu_job_id`) é um chat paralelo: arquivo anexado vai pra `support_messages.attachment_r2_key` e NUNCA aparece em `ecu_job_files`; o job não sabe que existe ticket aberto. 4 fases especificadas:
   - **Fase 1 (mig 100) — ✅ APLICADA 04/08.** `file_type` era `text` com CHECK inline SEM nome (`006_ecu.sql:24`), não enum. A migration descobre o nome real via `pg_constraint` antes de dropar, em vez de assumir o default. Constraint aceita agora `('original','entrega','correcao')`. Nenhuma das 3 policies ativas de `ecu_job_files` filtra por `file_type` (todas FOR ALL) — nada a alterar.
   - **Fase 2:** bloco "Enviar Correção" no `SupportTicketDetail` (só matriz, só ticket ativo, só se `ecu_job_id != null`), espelhando o "Enviar Arquivo Pronto". No `EcuJobDetail`, terceira variante na lista: rótulo **CORREÇÃO**, ícone `ArrowDown` âmbar, fundo `bg-amber-500/[0.06]`.
   - **Fase 3:** visibilidade bidirecional — `useEcuJob` traz tickets vinculados; banner âmbar "CORREÇÃO SOLICITADA — ticket {protocol} em aberto" no topo do job + bloco "Tickets" no painel lateral. Visível pra matriz E franquia. (Isso absorve o item "badge CORREÇÃO" que estava em A.11 feature 4.)
   - **Fase 4:** anexo do chat aceita **qualquer** tipo de arquivo até **100MB** (hoje tem whitelist antiga hardcoded `image/*,.pdf,.txt,.bin,.hex,.ori,.ori2,.csv`, defasada em relação às 42 extensões da `ecuFileTypes.ts`).
   - **BUCKET R2 — resolvido na prática:** implementado reaproveitando `ECU_DELIVERED` (correção no mesmo bucket dos modificados, diferenciada por `file_type` no banco). Sem bucket novo, sem binding no `wrangler.toml`, sem rota nova no worker. `resolveBucket()` de `scan-ecu-file` e `ecu-download-url` corrigido pra tratar `'correcao'` como `'entrega'`. **PENDENTE:** `workers/r2-presign.ts` não entrou no diff da Fase 2 — confirmar que o upload cai no bucket certo.
2. **Grupo B restante da evolução do JOB:**
   - **Item 9 — Arquivo extra com tags:** até 3 arquivos extras com tag descritiva (ex: "Correção Arla"), aparecendo um de cada vez. **Decisão do Rogério: mesma tabela** (`ecu_job_files` + coluna de tag), não tabela separada.
   - **Item 10 — Reabrir job concluído:** adicionar novo arquivo + novo valor somando à OS + motivo da reabertura. Modelo de dado ainda não decidido (status "Reaberto" no pipeline vs volta pra "Processamento"; como soma sem sobrescrever).
   - Itens 6, 7 e 8 do Grupo B **já estão em produção** (tags Arquivo Complexo/Contatar Financeiro via mig 087; Técnico Responsável via B.3; `service_notes` via mig 091).
3. **FIN.1** — Parcelamento cartão (1-12x) e boleto (1-5x). Modal com select "Nx de R$ Y,YY". Campo `parcelas` em `financial_entries` (migration nova). PIX/Débito sem parcelamento.
4. **FIN.4** — Redesign do painel Caixa. Manter abas (Aberto, Franquias, Inter-Franquias, Lançamentos, Histórico). Na aba Aberto (principal): cobranças em ordem de chegada (produção), sem discriminar tipo. Cards mostram cliente, serviço, valor, técnico. Financeiro clica → forma de pagamento → finaliza → some.
5. **A.10 item 2 refino** — badge Aberto/Pago com `min-w-[72px]` estimado. Rogério vai conferir visualmente e reportar ajuste.
6. **Autofill do veículo** — no `EcuJobForm` ao selecionar veículo cadastrado, autofill de marca/modelo/ano/categoria/transmissão. Km/horas editável.
7. **Autofill do técnico** — no `EcuJobForm`, `technician_id` vem pré-selecionado com user_id do logado (se matriz). Editável.
8. **B.2** — Substituir arquivo enviado errado. Decisão de arquitetura pendente:
   - INSERT novo + histórico via `ecu_job_events` vs UPDATE in-place (webhook não dispara em UPDATE, precisaria compensar)
   - Sem coluna nova em `ecu_job_files` (deleted_at / uploaded_by ficam pra escopo maior)
9. **A.7** — Matriz de permissões granulares (`profiles.permissions`) hoje decorativa. Fazer as caixinhas do cadastro valerem no ECU.
10. **A.11 features restantes:**
    - Hook `useNewOpenTicketsCount` pro sino do header
    - Dot verde no NavItem de Suporte

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
| 081 | `profiles.email` (coluna nunca existiu; backfill + trigger `handle_new_user` reescrito) | **Sim, crítico** |
| 082 | `profiles_update_admin` com operations_admin + `id <> auth.uid()` | Sim |
| 083 | `franchise_units_admin_all` com operations_admin | Sim |
| 084 | **21 policies** em 13 tabelas que usavam `is_matrix_admin()` — inline check com os 3 roles | **Sim, crítico** |
| 085 | `marketing_materials` insert/update/delete com system_ti | Sim |
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
| 100 | Fluxo de Correção Fase 1 — `file_type` aceita `'correcao'` (descobre nome do CHECK via `pg_constraint` antes de dropar) | Sim |
| 101 | `company_settings.support_whatsapp` + RPC `get_support_whatsapp()` SECURITY DEFINER (GRANT só authenticated) | Sim (padrão portável; **número é dado único por empresa**) |
| 102 | `company_settings.welcome_video_url` + RPC `get_welcome_video_url()` SECURITY DEFINER — mesmo padrão da 101. **Escrita pela matriz** via `useUpdateCompanySettings()` genérico (`MatrizAjudaPage.tsx`), sem RPC de escrita dedicada. **NÃO aplicada ainda** (12/08) — Rogério aplica via SQL Editor | Sim (padrão portável; URL do vídeo é dado único por empresa) |

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

- **Data do último fechamento:** 12/08/2026 (sessão RBAC dono + QR PIX + vídeo de boas-vindas)
- **Sessão 11/08 entregue:** mocks removidos; dashboard do franqueado por período; RBAC toggles reais (ModuleGuard + teto por cargo); menu Atualizações; Bug H do worker corrigido + deployado; e-mail oficial `inje.tech` (domínio + DMARC + SMTP + 4 templates); WhatsApp de suporte via banco (mig 101 aplicada); banco resetado (2 users). Tudo confirmado em produção em 12/08 (ver linha "HEAD" abaixo).
- **Sessão 12/08 entregue (código, aguardando commit+push):** fix `needsPay`/`needsPix` em `FranqueadoPedidosPage.tsx` (QR PIX some com status `'aprovado'`); vídeo de boas-vindas editável (mig 102 + RPC `get_welcome_video_url()` + hook `useWelcomeVideoUrl` + bloco de edição em `MatrizAjudaPage.tsx`). Fora do código: RBAC do dono (`permissions=NULL`) e secrets `VITE_PIX_*` já aplicados por Rogério diretamente.
- **Documentação de replicação:** `~/Documents/projetos lovable/HANDOFF-AUDITORIA-CLONES.md` (consolidado p/ auditar Promax/EvoPro) + adendo 11/08 no `CHECKLIST-AUDITORIA-SISTEMAS.md`. **Nota 12/08:** apareceram no `git log` commits de kickoff Promax/EvoPro (`af99734`, `3669d8c`, `6e704c9`) — sessões separadas rodando no mesmo repo/doc. Confirmar com Rogério se há sobreposição antes de assumir que a fila da seção 6 está atualizada por essas sessões.
- **HEAD:** `af99734` — confirmado igual a `origin/main` em 12/08 (0 ahead/0 behind). Todos os commits até aqui (fluxo de correção, sessão 11/08, kickoffs) **já estão em produção**. Ao abrir uma sessão nova: rodar `git log origin/main..HEAD` de novo antes de confiar neste documento — várias sessões estão tocando o mesmo main.
- **FIN.5:** dado como validado (as sprints seguintes andaram por cima). Se houver dúvida, o teste dos 7 passos continua descrito no histórico.
- **Trabalho em andamento:** sessão RBAC+PIX+vídeo (12/08) — código pronto (ver acima), falta: (1) commit local sem push, (2) Rogério aplicar mig 102 no SQL Editor, (3) validar `SELECT proname FROM pg_proc WHERE proname='get_welcome_video_url'`, (4) teste de ponta (matriz salva vídeo → franquia vê banner; pedido PIX aprovado → QR aparece), (5) agente pusha.
- **Ação imediata do Rogério:** aplicar mig 102 + validar a função + rodar o teste de ponta.
- **Ação imediata do agente:** após teste passar, `git push`.
- **Numeração de migrations:** a última aplicada é a **101** (support_whatsapp, 11/08). A **102** (welcome_video_url) está escrita mas **NÃO aplicada** — próxima livre após aplicá-la é a **103**.

---

*Fim do documento. Se algo aqui ficou desatualizado, corrige com data e mantém histórico da mudança.*
