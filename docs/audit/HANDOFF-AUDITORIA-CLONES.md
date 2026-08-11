# HANDOFF — Auditoria de Clones (Promax Tuner + EvoPro)

> **Para o próximo agente/chat.** Este documento é auto-contido: reúne **tudo** que foi
> feito e descoberto no **Injediesel** (em sessões que atuei e nas que não atuei) e
> transforma em um **checklist de auditoria** para os dois sistemas-irmãos, **Promax Tuner**
> e **EvoPro**.
>
> Os três são **clones da mesma base de código**, cada um com **Supabase, GitHub,
> Cloudflare/R2 e domínio PRÓPRIOS e independentes**. Portanto: **todo bug corrigido no
> Injediesel quase certamente existe nos outros dois** — mas **nenhum dado de uma empresa
> pode tocar na outra, jamais**.
>
> **Data de consolidação:** 11/08/2026. Fonte: `CHECKLIST-AUDITORIA-SISTEMAS.md`,
> `INJEDIESEL-PROJECT-MEMORY.md`, `docs/superpowers/plans/*` e `specs/*`, `AUDIT_GUIDE.md`,
> `docs/qa-report-2026-05-26.md`, `ESLINT_RESOLUTION_REPORT.md`, `CLAUDE.md` dos repos.

---

## 0. COMO O PRÓXIMO AGENTE USA ISTO

1. Ler os **documentos-fonte** (§0.1) — este handoff é o índice; eles têm o detalhe.
2. Preencher a **identidade** do sistema alvo (§1) antes de qualquer coisa.
3. Ler o **método inegociável** (§2). Nada irreversível sem o Rogério.
4. **Trocar os dados únicos** (§3) — nunca copiar valor de empresa entre sistemas.
5. **Não portar** o que é exclusivo do Injediesel (§4).
6. Rodar o **checklist de replicação** (§5), na ordem de prioridade (§6). Cada item traz
   sintoma → correção → **como verificar** (SQL/grep/passo de UI).
7. Wipe pré-entrega só no final (§7), se for o caso.

### 0.1 — Documentos-fonte (no repo do Injediesel, salvo indicado)
| Doc | O que tem |
|---|---|
| `~/Documents/projetos lovable/CHECKLIST-AUDITORIA-SISTEMAS.md` | **Playbook mestre** Fases 0→8 (identidade, functions, convite, e-mail, migrations, fluxo ECU, financeiro, resíduos de marca, pipeline, wipe). Vivo — datado por fase. |
| `INJEDIESEL-PROJECT-MEMORY.md` | Memória durável: §5 (14 padrões portáveis), §8 (migrations), histórico de sprints, regras de negócio. |
| `docs/superpowers/plans/*` e `specs/*` | Histórico feature-a-feature (cada um documenta o bug/segurança corrigido ao construir). |
| `AUDIT_GUIDE.md`, `docs/qa-report-2026-05-26.md`, `ESLINT_RESOLUTION_REPORT.md` | QA, lint, achados de acessibilidade/perf. |

---

## 1. REGRA DE OURO — ISOLAMENTO ABSOLUTO

**Cada sistema tem banco, repo, R2 e domínio próprios. Nenhum toca no outro. Nunca.**
O gate de isolamento de franquia é **SEMPRE RLS no banco** — filtro no front (`.eq('unit_id')`,
`.filter()`) **nunca** é o gate real.

| | **Injediesel** | **Promax Tuner** | **EvoPro** |
|---|---|---|---|
| Status | ✅ auditado + corrigido | ⏳ auditar | ⏳ auditar |
| Repo GitHub | rogerioweb72/injediesel-system | rogerioweb72/promax-tuner | rogerioweb72/evopro |
| Repo local | `~/Documents/projetos lovable/INJEDIESEL/DADOS/injediesel-system` | `~/Desktop/promax-tuner` | a localizar (pode não estar na máquina) |
| Supabase ref | `ttnmvheptxedwninjedv` | `myjrylmxzertrbwuosrv` | `sumlatisdadarivujabm` |
| Domínio | inje.tech | a confirmar | a confirmar |
| Cloudflare/R2 | conta Mkt.injediesel@gmail.com · acct `63504ee600b4c431cb74cfd54dcbc164` | worker `promax-tuner-r2-prod.promaxtunermatriz.workers.dev` · conta a confirmar | a descobrir |
| Diferencial | fila de aprovação de edição de valor | desconto de franquia | a descobrir na Fase 0 |

> ⚠️ **Fonte da verdade do ref = `supabase/.temp/project-ref`, NUNCA o `.env.local`.**

---

## 2. MÉTODO INEGOCIÁVEL

- **Claude (chat) orquestra e revisa.** Lê arquivos do disco, revisa migrations/scripts
  linha a linha, valida counts, dá vereditos. **Não executa nada irreversível.**
- **Agente do VSCode** escreve código/migrations/scripts, **commita SEM push** até aprovação;
  roda CLIs com `--project-ref`. **NUNCA** `supabase link`, `db push`, `db reset`, nem toca o banco.
- **Agente do Chrome** navega Dashboards, cola/roda queries de **leitura**, reporta telas.
  **NUNCA** digita `COMMIT`/`ROLLBACK` nem manuseia senhas.
- **Rogério** faz todo passo irreversível: SQL Editor, `COMMIT`, secrets, deletes R2, logins,
  `functions deploy`, `git push`, decisões de negócio.
- **`.env.local` MENTE.** Produção usa **GitHub Secrets**. Confirmar o banco de produção pelo
  bundle/Network do site ou pelos Secrets — nunca pelo `.env.local`.
- **Auditoria de verdade, não de fé:** exigir `git show <sha>` completo antes de aprovar.
- **Migrations sem risco:** arquivo no repo (commit sem push) → Rogério aplica via SQL Editor
  → testa em produção → aí sim push (main e banco sincronizam juntos).
- **Trocar de conta a cada sistema:** `supabase logout && supabase login`; `wrangler whoami`
  ANTES de qualquer deploy (a máquina acumula sessões de várias contas).

---

## 3. DADOS ÚNICOS POR EMPRESA — SUBSTITUIR, NUNCA COPIAR

Copiar qualquer um destes entre sistemas = vazamento cross-tenant. O agente **troca cada um
pelo valor do sistema alvo** (ou remove, se for da outra marca).

- **Supabase:** project-ref, URL, `VITE_SUPABASE_PUBLISHABLE_KEY`/anon key, `VITE_SUPABASE_PROJECT_ID`, `SUPABASE_SERVICE_ROLE_KEY`.
- **Cloudflare R2:** `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `VITE_R2_PRESIGN_URL`, nomes de bucket (`<empresa>-ecu-originals/-delivered/-firmware/-mkt-materials`, `-support-attachments`).
- **GitHub:** repositório.
- **Domínio + e-mail:** domínio de produção; remetente Resend + **API key Resend separada por empresa** (revogável independente); domínio verificado no Resend.
- **Contato:** `VITE_WHATSAPP_NUMBER` (público) e **WhatsApp de suporte** (interno — só no banco, nunca no front); **chave PIX**; endereço.
- **Marca:** cor primária, nome, prefixo de protocolo de ticket (Promax usa `PT-YYYYMM-NNNNNN` — não deixar `PT-` vazar nos outros), tokens de design (`--pm-*`), fontes, splash/branding.
- **Usuários de teste/master:** e-mails de teste e usuário master são por banco. Definir o master ANTES do wipe. Não semear e-mail de teste de uma empresa no banco de outra.
- **Catálogos:** `products`/`product_prices`/`ecu_catalog` — cada empresa importa os SEUS. ⚠️ migrations `014_products_catalog` e `032_product_images` do Promax **contêm catálogo da Injediesel** (bonés/adesivos) — se rodaram em produção, há produto da outra marca à venda. Verificar cedo.

**Compartilhado e seguro (pode reusar):** `apiplacas.com.br` (lookup de placa), logos Wikimedia Commons / `brand-logos.ts`.

---

## 4. NÃO PORTAR — exclusivo do Injediesel

- **Fila de aprovação de edição de valor** (feature-assinatura do Injediesel): tabela
  `historico_edicoes_valor`, migrations **073/078**, UI da fila em `FinanceiroPage`, badge
  "Edição pendente", propagação pós-aprovação. No Promax/EvoPro a edição de valor é **direta,
  sem fila**. Se o clone trouxe esse código, avaliar **remoção/desativação**.
  *(O padrão técnico da 078 — FK apontando para `profiles`, não `auth.users` — é genérico e
  vale para todos; a FEATURE da fila é que não se porta.)*
- Qualquer **dado único** do §3.

---

## 5. CHECKLIST DE REPLICAÇÃO (bugs de clone — replicar em Promax/EvoPro)

Legenda de prioridade: **P0** fura segurança/isolamento (fazer primeiro) · **P1** quebra fluxo
de negócio · **P2** higiene/qualidade.

### 5.A — SEGURANÇA / ISOLAMENTO DE FRANQUIA (P0)

| ID | Sintoma | Correção | Como verificar no clone |
|---|---|---|---|
| `env-cross-tenant` **P0** | `.env.local` aponta para o Supabase/R2 do **Promax** (`myjrylmxzertrbwuosrv`, `promax-tuner-r2-prod`). Dev local grava no banco/R2 da OUTRA empresa. | Trocar URL, anon key, project id e R2 para o do sistema alvo, ANTES de qualquer operação de dados. | `grep -n VITE_SUPABASE_URL .env.local` vs `supabase/.temp/project-ref`; `grep -rin "promax" .env.local wrangler.toml` → nada deve sobrar (no clone certo). |
| `ecu-jobs-rls-unit` **P0** | Dashboard/faturas/cobranças da franquia filtram `unit_id` no **cliente**. Se `ecu_jobs` não tem RLS escopando franquia por `unit_id`, franqueado lê jobs (preço, cliente, placa) de todas as unidades via API. | RLS SELECT de `ecu_jobs` escopada por vínculo (`user_unit_roles`/`my_unit_ids()`), não por lista de cargo (padrão da mig 075). | `select polname,qual from pg_policies where tablename='ecu_jobs';` · Sessão de franquia: `GET /rest/v1/ecu_jobs?unit_id=eq.<OUTRA_UNIDADE>` deve voltar `[]`. |
| `support-msg-rls-gap` **P0** | `franchise_messages_select` filtra só `is_internal=false` — **não** escopa à unidade do ticket. `messages_insert` só checa `author_id=auth.uid()`. Franquia lê/injeta mensagem em ticket de **outra** unidade por `ticket_id`. | Ambas as policies devem exigir `ticket.unit_id = profile.unit_id` (ou role de matriz). Migration `038_support_b2b.sql`. | `select polname,qual,with_check from pg_policies where tablename='support_messages';` · Franquia A tenta inserir msg com `ticket_id` de outra unidade → rejeitar. |
| `report-rpc-noop-tenant` **P0** | `exportar_relatorio_ecu/_financeiro/_franquia` são `SECURITY DEFINER` + `GRANT EXECUTE ... authenticated`; check de tenant é cartesiano (só prova que a unidade existe) ou inexistente. Franquia com flag `relatorio_*` exporta **qualquer** unidade. | Excluir roles de franquia OU escopar `p_unidade_id` à unidade do chamador. Migration `072_relatorio_permissions.sql`. | Ler mig 072. Como franquia com flag, chamar `exportar_relatorio_ecu('<outra-unidade>')` → deve negar (hoje retorna linhas). |
| `caixa-clientside-money` **P0** | `useRegisterPayment` calcula `discount/net/commission` no browser e faz UPDATE/INSERT direto. Teto `max_discount_pct` só desabilita botão. API direta burla teto e forja comissão. | Desconto + comissão **server-side** (Edge Function/RPC), teto validado contra `franchise_units.max_discount_pct`. (`useCaixa.ts`, mig 055.) | `grep -rn "commission\|discount" src/hooks/useCaixa.ts` · Como franquia, POST pagamento com desconto > teto direto na API → deve rejeitar. |
| `support-attach-idor` **P0** | `support-download-url`/upload verificam acesso ao `ticketId` via RLS mas **não** que o `r2Key` pertence ao ticket. Acesso ao ticket X + `r2Key=support/<ticketY>/...` → baixa arquivo do ticket Y. | Assertar `r2Key.startsWith('support/' + ticketId)`. (`supabase/functions/support-download-url/index.ts`.) | Ler a function; procurar o guard de prefixo. Testar com `r2Key`/`ticketId` cruzados. |
| `firmware-worker-idor` **P0** | (a) `checkFirmwareAcceptance` no worker usa `Bearer <ANON_KEY>` → `auth.uid()` nulo → aceite volta vazio → download **403 pra todos** (Bug H, já corrigido no Injediesel). (b) `r2Key` não amarrado ao `updateId`. | Passar o **JWT do usuário** (como `isMatrixAdmin` faz). Validar `r2Key`↔`updateId`. Requer `wrangler deploy`. (`workers/r2-presign.ts`.) | `grep -n "ANON_KEY" workers/r2-presign.ts` em qualquer checagem de aceite/role. Testar download após aceitar termos. |
| `avatar-rls-commented` **P0** | Policies do bucket `avatars` (`storage.objects`, pasta = `auth.uid()`) ficaram **comentadas**; dependem de passo manual. Se pulado, qualquer usuário sobrescreve avatar de qualquer um. | Criar a policy `avatars` com `(storage.foldername(name))[1]=auth.uid()::text`. | `select polname,qual from pg_policies where tablename='objects' and schemaname='storage';` |
| `vw-saldo-definer` **P0** | `vw_saldo_franquias` é view simples sobre `ecu_jobs`; comentário assume "RLS de ecu_jobs protege", mas view sem `security_invoker` roda como owner → vaza todas as unidades. | View com `security_invoker=on` (PG15+) ou leitura só matriz. (mig 070.) | `select relname,reloptions from pg_class where relname='vw_saldo_franquias';` |
| `unitguard-defense-depth` **P0** | `UnitGuard` (client-side) redireciona no mismatch de slug — bom, mas é só front e valida só `unitSlug`. Proteção real = RLS. | Confirmar `UnitGuard` montado no `FranqueadoLayout` **E** que `ecu-jobs-rls-unit` vale (RLS é o gate). | Ler `router/index.tsx` + `UnitGuard.tsx`; validar RLS. |
| `no-frontend-pricing` **P0** | Preço/desconto/comissão/total calculados no front = adulteração. | Tudo via Edge Function / coluna gerada (`order_items.total = generated ... stored`). | `grep -rn` por matemática de preço/comissão no front; confirmar tier do PDV e totais vêm do servidor. |

### 5.B — RLS / POLICIES: padrões-armadilha (P0/P1)

| ID | Sintoma | Correção | Verificar |
|---|---|---|---|
| `is-matrix-admin-excludes-ops` **P0** | Toda policy de ESCRITA que usa `is_matrix_admin()` exclui `operations_admin` (só cobre system_ti+company_admin). Usuário VÊ o dado (SELECT passa) mas INSERT/UPDATE volta 42501 silencioso. 21 policies em 13 tabelas no Injediesel. | Inline check explícito com a lista completa de roles. Migrations **082, 083, 084, 085** (portar). | `SELECT c.relname,pol.polname FROM pg_policy pol JOIN pg_class c ON c.oid=pol.polrelid WHERE pg_get_expr(pol.polqual,pol.polrelid) LIKE '%is_matrix_admin%' OR pg_get_expr(pol.polwithcheck,pol.polrelid) LIKE '%is_matrix_admin%';` |
| `divergent-role-lists` **P0** | Policies do mesmo domínio com listas de role divergentes: quem CRIA a cobrança não consegue QUITAR. UPDATE de 0 linhas, 42501 engolido, front reporta sucesso. (mig 080 vs 089 vs 098 em `financial_entries`/`commission_entries`.) | Sincronizar listas de role entre write/mark_paid/update do mesmo domínio. Migration **098**. ⚠️ `seller` em mark_paid mas não em write é **intencional** (PDV), não typo. | `SELECT tablename,policyname,cmd,qual,with_check FROM pg_policies WHERE tablename IN ('financial_entries','commission_entries') ORDER BY 1,2;` — comparar as listas. |
| `commission-insert-blocked` **P1** | Única write policy de `commission_entries` é `service_role FOR ALL`, mas `useRegisterPayment` INSERE do cliente autenticado → RLS bloqueia (falha silenciosa de comissão). | Policy de INSERT autenticado OU rotear via Edge Function. (mig 055 vs `useCaixa.ts`.) | Com RLS on, rodar Caixa como franquia → confirmar se a linha de comissão é criada. |
| `fk-to-profiles-not-auth` **P1** | FK de "quem fez" apontando para `auth.users` quebra o embed do PostgREST → lista SEMPRE vem vazia (`[]`, erro mascarado). (mig 078: `historico_edicoes_valor`.) | FK de autor aponta para `public.profiles(id)`. Após mudar FK: `NOTIFY pgrst,'reload schema';`. | `PGRST201`/lista vazia em telas de aprovação/autoria. Conferir FKs → profiles. |
| `my-unit-ids-null-jwt` **P1** | `my_unit_ids()` lê `auth.jwt()`, nulo no contexto **Realtime** → policy nega só pra franquia (matriz nunca dependeu de JWT). (mig 077.) | `my_unit_ids()` null-safe: UNION com fallback `user_unit_roles` + `SECURITY DEFINER`. | Realtime de `ecu_job_files` chega pra franquia? Testar status ao vivo com sessão de franquia. |
| `unit-scoped-by-vinculo` **P1** | RLS por **lista de cargo** trava cargo novo (5 de 7 roles de unidade bloqueados; franquia não enviava arquivo). (mig 075.) | Policy por VÍNCULO (`user_unit_roles` via `my_unit_ids()`), não por lista de cargo. Template correto: `is_matrix_admin() OR EXISTS(user_unit_roles WHERE unit_id=row.unit_id AND user_id=auth.uid())`. | Conferir `cadastros-base`/`relatorios-franqueado` usam esse template idêntico. |
| `security-definer-rule` **P0** | `SECURITY DEFINER` contorna RLS. Usar SÓ pra cruzar isolamento de propósito, com RETURN limitado (sem IDs/dados sensíveis). Ex.: `lookup_customer_by_document` retorna só name/email/phone. | RPC de busca sobre tabela com `unit_id` → **SECURITY INVOKER** (preserva RLS). | Listar funções `SECURITY DEFINER`; conferir cada uma tem RETURN limitado e escopo justificado. |
| `catalog-rls-views` **P1** | Views de catálogo por role: `ecu_catalog_franqueado` esconde `preco_cliente_final`; `ecu_catalog_public` esconde `preco_franqueado`. (mig 016.) | Views + RLS: admin→tabela; franquia→view franqueado; público→view public via Edge Function `service_role` só tier `cliente_final`. | Confirmar as 2 views existem; como franquia, `preco_cliente_final` ausente; Edge public sem `preco_franqueado`. |
| `product-prices-tier-rls` **P1** | Franqueado deve ver só o tier do seu contrato; público só `cliente_final`. | RLS em `product_prices` bloqueia anon/franquia de ler outros tiers. | Query anon/franquia em `product_prices` → só o tier permitido. |
| `audit-log-append-only` **P1** | `audit_logs` deve ser append-only. Gap conhecido: INSERT não abre pra roles fora de system_ti (perde narrativa; dado bruto de trigger OK). | INSERT só `service_role`; SELECT `company_admin`/`auditor`; nunca UPDATE/DELETE. Observabilidade = SECURITY DEFINER por entidade (não policy de INSERT genérica). | `pg_policies` em `audit_logs`: sem UPDATE/DELETE; tentar UPDATE como role normal → falha. |

### 5.C — CONVITE / AUTH / E-MAIL (P0/P1)

| ID | Sintoma | Correção | Verificar |
|---|---|---|---|
| `profiles-email-column` **P0 (cherry-pick obrigatório)** | `public.profiles` **nunca teve coluna `email`**; `invite-user`/`invite-franchisee` faziam upsert/`.eq('email')` → PGRST204. No `invite-user` o early-return abortava o vínculo `user_unit_roles` (login autentica, acesso negado). | Migration **081** (`ADD COLUMN email`, índice, backfill de `auth.users`, `handle_new_user()` reescrito, `NOTIFY pgrst`) + `profileErr` não-fatal + vínculo independente do upsert. | Conferir coluna `email` em `profiles` e a 081 no histórico. Convidar usuário novo ponta a ponta. |
| `invite-redirect-by-role` **P1** | `invite-user` com `redirectTo` fixo em `/login` pra todos → convidado de matriz cai em "Acesso Negado". `invite-franchisee` apontava `/admin-staging` (rota inexistente). | Redirect por role: matriz → rota interna (`/appinjediesel` no Injediesel, **`/appmax` no Promax — re-badge por clone**); franquia → `/login`. | `grep -n redirectTo supabase/functions/invite-*/index.ts` |
| `login-handles-invite` **P1** | `Login.tsx` detectava só `type=recovery`; convite chega `type=invite` → usuário entra sem definir senha. | Detectar `invite` E `recovery` nos dois logins. | `grep -n "type=" src/pages/Login.tsx src/pages/LoginParceiro.tsx` |
| `invite-sent-lie` **P1** | Caminho "already registered sem profile" retornava `ok:true` **sem enviar e-mail**. | Fallback com link de recovery + flag `email_sent:false` + aviso na UI. | Testar convite pra e-mail já existente sem profile. |
| `login-reject-matrix` **P1** | `/login` (área parceiro) deve `signOut()` + "Acesso Negado" pra não-franquia; e franquia sem unidade vinculada → erro amigável, não crash. | `LoginParceiro` filtra `FRANCHISE_ROLES` + trata unidade ausente. | Logar `/login` como company_admin → card de rejeição. Franquia sem `user_unit_roles` → erro amigável. |
| `forced-password` **P1** | 1º acesso deve exigir senha (modal não-dispensável). Detalhes: overlay via `createPortal` no body (backdrop-filter no header quebra `position:fixed`); focus-trap filtra elementos `disabled`. | `user_metadata.must_set_password=true` no convite → `ProfileDialog(forced)` → `updateUser({password, data:{must_set_password:false}})`. Min 6 chars. | Modal não fecha por ESC/click-fora; limpa `must_set_password` no sucesso. |
| `url-configuration` **P1** | Sem Redirect URLs no Supabase, o `redirectTo` é ignorado silenciosamente. | Dashboard → Auth → URL Configuration: Site URL = domínio; Redirect URLs = `https://<dominio>/*`. | Conferir no Dashboard de cada projeto. |
| `smtp-resend-templates` **P1** | Plano free do Supabase: templates em inglês, remetente genérico, limite baixo, edição travada até SMTP próprio. | SMTP Resend (host `smtp.resend.com`, porta 465, user `resend`, senha = API key) + domínio verificado + **rate limit elevado** + **4 templates PT-BR** (Invite/Reset/Confirm/Magic). A mesma key vira secret `RESEND_API_KEY`. **Nunca alterar `{{ .ConfirmationURL }}`.** Templates de referência em `docs/email-templates/`. | Remetente/domínio/key = **dado único** (§3). Testar convite → chega na inbox, em PT-BR, do domínio próprio. |

### 5.D — FLUXO ECU (upload → scan → download) (P1)

| ID | Sintoma | Correção | Verificar |
|---|---|---|---|
| `r2-worker-not-deployed` **P1** | Worker de presign nunca deployado, ou o front aponta pro worker de OUTRA empresa (`VITE_R2_PRESIGN_URL` herdado). Sintoma: upload `{"error":"Unauthorized"}` (valida JWT contra o Supabase errado). | Preencher `SUPABASE_URL` no `wrangler.toml` (os 2 lugares) → `wrangler login` na conta certa (`wrangler whoami` antes) → `wrangler deploy --env production` → secrets do worker → atualizar GitHub Secret `VITE_R2_PRESIGN_URL` → rebuild. | `wrangler whoami`; Workers & Pages da conta; testar upload real. |
| `r2-secrets-per-bucket` **P1** | Function lê `R2_BUCKET_ECU` único, mas há N buckets por `file_type` → 500 silencioso. Env lida no top-level → precisa **redeploy** após setar secret. | Escolher bucket por `file_type`; secrets `R2_BUCKET_ECU_ORIGINALS/DELIVERED`. Token R2 **Object Read & Write** (read-only quebra delete). | `grep -rn 'Deno.env.get' supabase/functions/*/index.ts`; conferir secrets vs uso. |
| `webhook-only-comment` **P1** | Database Webhook (INSERT `ecu_job_files` → `scan-ecu-file`) e cron (`poll-ecu-scans`) existem nas migrations **só como comentário** — nunca criados. | Criar Webhook no Dashboard: header `x-supabase-signature: <VALOR do WEBHOOK_SECRET>` (o valor, não o nome) + `Authorization: Bearer <anon key>`. Agendar cron via `cron.schedule()`. | `SELECT * FROM cron.job;` (vazio = não agendado); Dashboard → Integrations → Webhooks. Testar sempre com upload NOVO. |
| `scan-skipped-mode` **P1** | Fallback sem VirusTotal marcava **'clean' falso**. Enum `scan_status` fechado. | `ALTER TYPE scan_status ADD VALUE IF NOT EXISTS 'skipped'`; gates (`ecu-download-url`) aprendem 'skipped'; dedup por hash exclui skipped; `sha256_hex` sempre gravado. **Pendência de segurança:** ativar VirusTotal antes de tráfego real. | Upload novo → 'skipped' → download libera. |
| `postgrest-thenable-catch` **P1** | `.catch()` encadeado em query supabase-js (PostgrestBuilder é thenable, não Promise) → TypeError 500. | Remover `.catch()`; tratar erro pelo `{data,error}`. (commit adafd37.) | `grep -rn '\.catch(' supabase/functions/` |
| `mutation-no-onerror` **P2** | `useDownloadEcuFile` (e afins) sem `onError` → clique falha em silêncio. | Adicionar toast de erro. (commit d672428.) | `grep -rn "useMutation" src/hooks/` sem `onError`. |
| `whitelist-front-vs-backend` **P1** | Front aceita extensão que a edge function rejeita (ou vice-versa) → upload falha silencioso. | Lista canônica em `src/lib/ecuFileTypes.ts` (42 formatos); backend Deno mantém cópia manual documentada. | Comparar whitelist front vs `scan-ecu-file`. |
| `ecu-validation-serverside` **P1** | `validateEcuFile` (formato+tamanho) só no browser. | Validar também no worker/edge (`support-upload-url` já valida ext/mime/10MB — bom padrão). | Conferir checagem server-side de tamanho/tipo no presign ECU. |
| `migration-016-catalog` **P1** | Módulo catálogo em branch `feat/catalogo-ecu`: mig 016 não aplicada, `ecu-catalog-public` não deployada, branch não mergeada. | Aplicar SQL + `functions deploy ecu-catalog-public` + merge — **cada clone independente**. | Conferir tabela+views `ecu_catalog`, function deployada, branch mergeada. |

### 5.E — FINANCEIRO (regra de negócio) (P1)

| ID | Sintoma | Correção | Verificar |
|---|---|---|---|
| `amount-charged-bug` **P1** | `amount_charged_to_customer` (o que a franquia cobra do cliente dela) contamina o caixa da matriz. Padrão COPIADO em ~7 pontos (o pior: `useRegisterPayment` sobrescrevia no "marcar pago"). | `amount_charged_by_matrix` é o ÚNICO valor que entra em cobrança/pagamento/comissão da matriz. Bifurcar em todo ponto. (commit 7e99538.) | `grep -rn 'amount_charged_to_customer' src/` — revisar cada uso fora de exibição/dashboard de franquia. SELECT de diagnóstico no CHECKLIST §Fase 4C. |
| `send-to-finance-guard` **P1** | Botão "Enviar Financeiro" sem valor da matriz → cria cobrança R$ 0 (`?? 0`). Gate errado escondia card e deixava dinheiro invisível pra matriz. | Sem `amount_charged_by_matrix` → botão desabilitado + early-return. `canSendToFinance`: matriz também vê/envia job de franquia. | Job sem valor da matriz → botão travado com aviso. |
| `forma-pagamento-obrigatoria` **P1** | Pagamento em lote sem forma → dado desonesto. | Forma obrigatória (PIX/Boleto/Cartão/Dinheiro) gravada; `forma_pagamento` NULLABLE sem default (antigo mostra "—"). (mig 079.) | Fechar pagamento sem forma → bloqueado. |
| `monthly-closing-lock` **P1** | Mês fechado deve bloquear mutação do período. | `monthly_closings.closed=true` bloqueia via Edge Function; `financial_entries` imutável pra não-admin. | Fechar mês teste → mutação no período → bloqueada server-side. |
| `mig-070-invalid-syntax` **P1** | Migration 070 usa `CREATE POLICY IF NOT EXISTS` e `ADD CONSTRAINT IF NOT EXISTS` — **inválido no Postgres** → erra ao aplicar. Se remendada num clone, FK/RLS pode faltar em outro. | Reescrever sem `IF NOT EXISTS` nesses statements. | Conferir constraint `fk_matrix_payment_id` e policies `matrix_read/insert_pagamentos` existem; histórico aplicou limpo. |
| `financial-immutable-conflict` **P1** | Caixa faz UPDATE em `financial_entries.status='pago'`, mas CLAUDE.md diz imutável pra não-admin. Conflito: ou o UPDATE da franquia é bloqueado, ou a imutabilidade foi afrouxada em silêncio. | Reconciliar: decidir e alinhar policy vs regra nos 3 clones. | `pg_policies` em `financial_entries` — quem tem UPDATE? |

### 5.F — CONFIG / DEPLOY / HIGIENE (P2)

| ID | Sintoma | Correção | Verificar |
|---|---|---|---|
| `hardcoded-promax-literals` **P1** | Buckets `promax-*`, rotas `/appmax`, strings "PROMAX Tuner", prefixo `PT-`, `siteUrl` da outra marca baked no código/plans. | Trocar por literais do sistema alvo (bucket, rota interna, nome, prefixo, domínio). | `grep -rin "promax\|appmax\|injediesel\|evopro" src supabase workers wrangler.toml public index.html` grep -iv da própria marca. |
| `brand-residue` **P1** | `invite-franchisee` com from/assunto/corpo da OUTRA marca (visível ao cliente!); `calculate-shipping` User-Agent; `cart.ts` chave localStorage; catálogo com prefixo da outra marca; `.env.local`/`VITE_R2_PRESIGN_URL` da outra infra; `.bak`; `CLAUDE.md`/`PRODUCT.md`/`README.md` da outra marca (agentes leem e geram código errado). | Corrigir cada equivalente; atualizar docs cedo. | Grep de marca (acima). |
| `deploy-no-functions` **P1** | `deploy.yml` só build + FTP — **sem passo de deploy de Edge Functions** (causa raiz de "function nunca deployada"). | Adicionar `supabase functions deploy` no CI (`SUPABASE_ACCESS_TOKEN` como Secret da conta certa). | Ler `.github/workflows/deploy.yml`. |
| `apiplacas-hook` **P2** | `useBrasilAPI.ts` chama `brasilapi.com.br`; correto é `apiplacas.com.br`. | Trocar endpoint. | `grep -rn "brasilapi" src/` |
| `eslint-blocking` **P2** | 19 erros ESLint travavam CI (react-refresh, hooks, no-unused, no-explicit-any). Build/TS passavam, gate de lint não. | 18/19 corrigidos (`3d233e7`, `09cad38`); split de constantes em `*.utils.ts` (`badge/button/form`) pro Fast Refresh; 1 restante é falso-positivo de parsing. | `npm run lint`; se o clone foi ramificado antes, mostra os ~19. |
| `setstate-in-effect` **P2** | setState síncrono no corpo de `useEffect` (`LandingV2.tsx` +2) → cascata de re-render no strict mode. | Reordenar setState após setup do timeout. | Grep setState em corpo de effect. |
| `useauth-closure` **P2** | `fetchProfile` usado antes de declarar no effect (stale-closure). | `useCallback` + dep no array. | Ler `src/hooks/useAuth.ts`. |
| `e2e-route-drift` **P2** | Specs E2E antigos usam `/login`,`/matriz/dashboard`; login moveu pra rota dinâmica `/{slug}/dashboard`. `page.goto()` força reload e corre com o restore de sessão (Zustand efêmero) → redirect pro login. | Reescrever specs (`01-auth.spec.ts`); navegar por `navigateTo()` (clicks client-side), não `page.goto()`. | `grep -rn "page.goto(" tests/`; rotas reais do clone. |
| `xlsx-import-path` **P2** | `import-catalog.ts` lê xlsx de path relativo frágil `../../../categorias_site_veiculos_xlsx/`. | Confirmar pasta antes do `catalog:import`; cada empresa importa o SEU. | Conferir path/pasta. |
| `category-images-missing` **P2** | `/images/cat-*.jpg` referenciadas mas ausentes em `public/`. | Copiar assets de `src/assets/` (imagens podem ser branding único). | `ls public/images/cat-*.jpg`. |
| `design-ref` **P2** | Duas landings; `Landing.tsx` (`/`) descartada, `LandingV2.tsx` (`/v2`) é a canônica. | Nova UI segue LandingV2. | Não reusar `Landing.tsx` de base. |

### 5.G — DATA-INTEGRITY / UX (P2)

| ID | Sintoma | Correção | Verificar |
|---|---|---|---|
| `dashboard-400` **P1** | 2 requests Supabase retornam **HTTP 400** no load do dashboard (não diagnosticado; pode estar mascarado pelo env errado). | Investigar no Network quais queries são. | DevTools → Network no dashboard; achar os 2 400. |
| `consultar-not-zero` **P2** | `preco===null||0` deve mostrar badge âmbar "CONSULTAR", nunca "R$ 0,00". | Implementado nas 3 superfícies de catálogo. | Preço null/0 → "CONSULTAR". |
| `delete-exact-word` **P2** | Delete destrutivo só habilita ao digitar `EXCLUIR` exato (case-sensitive, sem `trim()`). | `DeleteConfirmModal.tsx` compara exato. | ` excluir ` (com espaço/minúscula) mantém botão desabilitado. |
| `r2-key-not-url` **P2** | Salvar URL direta do R2 em `ecu_job_files` (deve ser só `r2_key`). | Persistir só a chave do objeto. | Inspecionar linhas de `ecu_job_files`. |
| `modal-not-dialog` / `tabs-not-radix` **P2** | `NovoLancamentoModal` é `div.fixed` cru (sem focus-trap/ESC/role); tabs de config são `<button>` (sem role/teclado). | Migrar pra shadcn `Dialog`/`Tabs`. | Inspecionar os componentes. |
| `cnpj-cpf-validators` **P2** | Validadores CNPJ/CPF do wizard de franquia. | `validarCNPJ`/`validarCPF` com testes. | `tests/unit/lib/validators.test.ts`. |

### 5.H — CORREÇÕES DA SESSÃO 11/08/2026 (novas — replicar)

| ID | Sintoma | Correção | Verificar |
|---|---|---|---|
| `remove-mock-mode` **P2** | `VITE_MOCK`/`setupMocks`/branches `IS_MOCK` em hooks. | Deletar `src/mocks/`, `ecu-catalog-mock.json`; tirar guard do `main.tsx`; remover branches. | `grep -rn "IS_MOCK\|isMock\|VITE_MOCK\|@/mocks\|MOCK_ROWS\|DEMO_USERS" src/` |
| `dashboard-franqueado-periodo` **P1** | Dashboard da franquia sem período, `useEcuJobs({pageSize:200})` sem cap correto. | Hook `useFranchiseDashboard` (agregação escopada ao `unit_id`, sem cap) + toggle Hoje/7dias/Mês/Tudo. | Conferir hook + toggle na tela do franqueado. |
| `toggles-reality` **P1** | Toggles de permissão do cadastro eram **decorativos** — banco grava por ROLE (RLS), não pelos toggles. Marcar "criar franqueado" pra support_agent dava 42501 "Erro ao salvar unidade". | `PermMatrix` (UsersTab) TRAVA Criar/Editar/Excluir acima de `ROLE_DEFAULT_PERMISSIONS[role]` + `ModuleGuard` de rota + Sidebar gateada por módulo. | Marcar toggle acima do teto do cargo → bloqueado; URL sem `can_view` → `/acesso-negado`. |
| `menu-atualizacoes` **P2** | Rota `/atualizacoes` (firmware) existia mas faltava item no Sidebar da matriz. | Adicionar `NavItem` Atualizações. | Ver Sidebar da matriz. |
| `whatsapp-suporte-db` **P1** | WhatsApp de suporte não pode ir no front (`VITE_` = bundle público). | Coluna `company_settings.support_whatsapp` + RPC `get_support_whatsapp()` SECURITY DEFINER (GRANT só authenticated) + hook `useSupportWhatsapp` + card na AjudaPage. **Número = dado único.** | Número só no banco; nunca no bundle. Migration nova por sistema. |

---

## 6. ORDEM DE EXECUÇÃO

1. **Fase 0 — Identidade** (§1). Fechar a cadeia `repo → Actions → hospedagem → domínio → Supabase`. Sem isso, todo teste pode bater no alvo errado.
2. **Corrigir env cross-tenant** (`env-cross-tenant`) — antes de qualquer operação de dados.
3. **Segurança/isolamento P0** (§5.A + §5.B P0): rodar os `pg_policies` e os testes manuais de franquia. **Top 5 primeiro:** `ecu-jobs-rls-unit`, `support-msg-rls-gap`, `report-rpc-noop-tenant`, `caixa-clientside-money`, `env-cross-tenant`.
4. **Convite/Auth/E-mail** (§5.C) — `profiles-email-column` é cherry-pick obrigatório.
5. **Fluxo ECU** (§5.D) e **Financeiro** (§5.E).
6. **Config/higiene/qualidade** (§5.F/G) e **correções 11/08** (§5.H).
7. **Registrar** o que divergir no `CHECKLIST-AUDITORIA-SISTEMAS.md` (doc vivo) e atualizar a tabela de identidade.
8. **Wipe pré-entrega** (§7) — só no final, se for entregar.

---

## 7. WIPE PRÉ-ENTREGA (resumo — detalhe na Fase 8 do CHECKLIST)

Operação **mais irreversível** da auditoria. Só o Rogério digita `COMMIT;`.
- **Backup ANTES** (CSV por tabela ou `pg_dump --data-only --no-owner`), salvo fora do repo, tamanho > 0. Sem backup, não roda.
- **Apagar:** dados transacionais/teste (jobs, arquivos, eventos, cobranças, pagamentos, comissões, clientes, veículos, unidades, vínculos, auditoria de teste, `auth.users` != master).
- **Preservar:** catálogos, config, conteúdo (help/marketing/firmware), cadastros-base (fornecedores/formas/serviços), usuário master, schema/policies/functions/triggers/migrations.
- **FKs são mortais:** circulares (`ecu_jobs.edicao_valor_historico_id`, `profiles.unit_id`) precisam `UPDATE ... SET NULL` antes dos DELETEs; CASCADE indesejado em fornecedores/formas/serviços. Auditar TODO `REFERENCES` contra a ordem do script.
- **`COMMIT;` na última linha do MESMO texto colado** (SQL Editor tem autocommit por Run; COMMIT em Run separado = rollback silencioso).
- **R2:** apagar objetos sob `jobs/` nos buckets `<empresa>-ecu-originals/-delivered`. Buckets ficam.
- **Teste de nascimento:** janela anônima → login master → todas as telas em empty state.

---

## 8. RESUMO — o que replicar × o que não

- **REPLICAR (bug/correção de clone):** tudo em §5 (segurança, RLS, convite, e-mail, fluxo ECU, financeiro, higiene, correções 11/08). Verificar antes de aplicar — cada item traz o SQL/grep.
- **NÃO PORTAR:** fila de aprovação de edição de valor (§4) + todo dado único (§3).
- **SUBSTITUIR sempre:** Supabase ref/keys, R2 conta/buckets/keys, domínio, remetente/Resend key, WhatsApp (público e suporte), PIX, endereço, prefixo de protocolo, marca/cores, usuários de teste, catálogo.

> Documento vivo. Ao auditar Promax e EvoPro, anotar o que divergir aqui e no
> `CHECKLIST-AUDITORIA-SISTEMAS.md`.
