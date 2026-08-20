# CHECKLIST DE AUDITORIA — Sistemas da Categoria (Injediesel / Promax Tuner / EvoPro)

> **Origem:** auditoria completa executada no Injediesel System em 15–17/07/2026,
> incluindo o destravamento total do fluxo de arquivos ECU (upload → scan → download).
> Os três sistemas são espelhos estruturais (mesma base de código clonada), cada um
> com **Supabase, GitHub, Cloudflare/R2 e hospedagem próprios e independentes**.
> Este documento reproduz todas as verificações feitas, os problemas encontrados
> e as soluções aplicadas — para rodar o mesmo processo nos outros sistemas.

---

## 🚦 PAINEL DE PARTIDA (para um chat/sessão nova começar daqui)

### As 3 empresas — o que já se sabe

| | **Injediesel** | **Promax Tuner** | **EvoPro** |
|---|---|---|---|
| Status | ✅ AUDITADO E ENTREGUE (17/07/2026) | ⏳ próximo | ⏳ pendente |
| Repo local | `~/Documents/projetos lovable/INJEDIESEL/DADOS/injediesel-system` | `~/Desktop/promax-tuner` | **A LOCALIZAR** (pode nem estar nesta máquina) |
| GitHub | rogerioweb72/injediesel-system | a confirmar na Fase 0 | a confirmar |
| Domínio | inje.tech | a confirmar | a confirmar |
| Supabase ref | ttnmvheptxedwninjedv (org do Rogério) | conta CLI "promax-vendas" enxergava `jewabvdguhughyvfbxkx` — CONFIRMAR se é o de produção via Fase 0.3 | a descobrir |
| Cloudflare | Mkt.injediesel@gmail.com | worker `promax-tuner-r2-prod.promaxtunermatriz.workers.dev` existe e responde — conta a confirmar | a descobrir |
| Master pós-wipe | web72web@gmail.com | definir antes do wipe | definir antes do wipe |

### Inteligência já coletada sobre o PROMAX (da auditoria do Injediesel)
- Repo estava **idêntico ao Injediesel até o commit de 25/06** ("Ativa consulta de placa") —
  migrations e functions iguais em nome/quantidade na época. O Injediesel evoluiu muito
  desde então (075–080, fixes de convite/financeiro/recovery); o Promax NÃO recebeu nada
  disso — avaliar cherry-pick dos fixes genéricos (lista nas Fases 2, 4B.5, 4C, 4D).
- ⚠️ **Migrations `014_products_catalog` e `032_product_images` do Promax contêm o
  catálogo da INJEDIESEL** (539 produtos, bonés/adesivos Injediesel da Tray) — se o banco
  de produção do Promax rodou essas migrations, há produto da outra marca à venda.
  Verificar cedo na auditoria.
- O `deploy.yml` do Promax é o mesmo (build+FTP, SEM deploy de functions) — esperar o
  mesmo padrão de functions nunca deployadas.
- A máquina do Rogério acumula sessões de várias contas (Supabase, Cloudflare — já
  apareceu até uma 3ª conta "recuarjamaismotors"). `supabase logout/login` e
  `wrangler whoami` ANTES de qualquer operação, sempre.
- A fila de aprovação de edição de valor é EXCLUSIVA do Injediesel — no Promax/EvoPro,
  se o código/migrations (073/078) vieram no clone, avaliar desativação.

### Método de trabalho (consolidado em 3 dias de auditoria real)
- **Claude (chat):** orquestra, lê arquivos do disco, revisa scripts/migrations linha a
  linha, valida counts, escreve os prompts dos agentes, dá vereditos. Não executa nada
  irreversível.
- **Agente do VSCode (Claude Code):** escreve código, migrations e scripts; commit SEM
  push até validação; roda CLIs (supabase/wrangler) com `--project-ref`; NUNCA toca no
  banco nem dá `supabase link`.
- **Agente do Chrome:** navega Dashboards (Supabase/Cloudflare), cola/roda queries de
  leitura, reporta telas; NUNCA digita COMMIT/ROLLBACK nem manuseia senhas.
- **Rogério:** todo passo irreversível — SQL Editor, COMMIT, secrets, deletes R2,
  logins, decisões de negócio.
- **Prompts para agentes** sempre com: contexto consolidado ("verdade estabelecida, não
  re-investigue"), tarefa em fases com CHECKPOINT antes de escrita, seção PROIBIDO
  explícita, e exigência de declarar o que não conseguiu determinar.

### Ordem de leitura das fases (a ordem física neste arquivo difere por histórico de appends)
**0 → 1 → 2 → 3 → 4 → 4B → 4C → 4D → 5 → 6 → 7 → 8 (wipe/entrega, só no final).**

---

## COMO USAR

1. Preencha a tabela de identidade (Fase 0) antes de tudo.
2. Execute as fases em ordem. Cada uma tem: comando → resultado esperado → o que fazer se falhar.
3. **Regras de ouro (aprendidas na prática):**
   - Fonte autoritativa sempre. NUNCA inferir estado por código HTTP quando existe
     comando/dashboard que responde direto (um agente perdeu horas com isso).
   - `.env.local` MENTE. O que vale é o secret do GitHub Actions e o bundle em produção.
   - Levantamento primeiro, conserto depois. Checkpoint antes de qualquer escrita.
   - Ao usar agente de IA: dê contexto consolidado, liste o que é PROIBIDO,
     exija reporte do que ele NÃO conseguiu determinar (sem preencher com suposição).

## TRAVAS DE SEGURANÇA — valem para TODA a auditoria

- ❌ `supabase link` — deixa `db push`/`db reset` a um comando do banco de produção. Use `--project-ref` ou `--db-url` pontual.
- ❌ `db push`, `db reset`, `db pull`, aplicar migrations — até decisão explícita.
- ❌ Alterar/deletar secrets existentes — só ADICIONAR os que faltam, com aprovação.
- ❌ Tocar em projetos Supabase que não pertencem à empresa auditada (ex.: projetos residuais do Lovable).
- ❌ Deployar função cujos secrets não existem (404 honesto é melhor que erro de runtime misterioso).
- ⚠️ Cada sistema tem conta Supabase própria → `supabase logout && supabase login` no INÍCIO da sessão de cada sistema. Confirme com `supabase projects list` antes de qualquer outro comando.

---

## FASE 0 — Identidade do sistema (preencher antes de começar)

| Campo | Valor |
|---|---|
| Empresa / sistema | |
| Pasta local do repo | |
| Remote GitHub (`cat .git/config`) | |
| Domínio de produção | |
| Supabase project-ref REAL (ver 0.3) | |
| Org Supabase / conta de login | |
| Data de criação do projeto Supabase | |
| Worker R2 / Cloudflare | |
| E-mail remetente (Resend) | |

### 0.1 — Repo certo?
Pode existir mais de um repo por empresa (ex.: resíduo do Lovable). O oficial é o que tem
`.github/workflows/deploy.yml` com FTP/lftp para a hospedagem. Confirme o remote:
```bash
cat .git/config | grep url
```

### 0.2 — A armadilha do .env.local
```bash
grep VITE_SUPABASE_URL .env.local .env.staging 2>/dev/null
```
⚠️ **NÃO confie nesse valor.** No Injediesel, o `.env.local` apontava para o Supabase
do Lovable (que nem pertencia à empresa) — meses de dev local contra o banco errado.
O build de produção usa `VITE_SUPABASE_URL` dos **GitHub Secrets**, nunca do `.env.local`.

### 0.3 — Qual Supabase a PRODUÇÃO usa (fonte da verdade)
No site em produção: DevTools → Network → filtrar `supabase.co` → o subdomínio é o project-ref real.
Alternativa: GitHub → repo → Settings → Secrets and variables → Actions → conferir `VITE_SUPABASE_URL`.

### 0.4 — Login na conta Supabase certa
```bash
supabase logout && supabase login   # conta da empresa auditada
supabase projects list              # o project-ref da 0.3 TEM que aparecer
```
Se não aparecer: conta errada, ou o projeto não pertence à empresa (🚩 risco grave de
propriedade — resolver antes de continuar). A saída também mostra a data de criação
e se está LINKED (deve estar VAZIO).

### 0.5 — Cadeia fechada
Anote a cadeia confirmada: `repo X → GitHub Actions → hospedagem → domínio Y → Supabase Z`.
Sem essa cadeia fechada, qualquer teste pode estar batendo no alvo errado.

---

## FASE 1 — Edge Functions

### 1.1 — Inventário autoritativo
```bash
supabase functions list --project-ref <REF>
ls supabase/functions/            # pastas no repo (ignorar _shared e .env)
```
Monte a tabela: função | no repo | deployada | versão | data.

**Achado no Injediesel:** 12 pastas no repo, **1 deployada** (só `plate-lookup`, subida
manualmente). O `deploy.yml` desses sistemas NÃO tem passo de deploy de function —
tudo que existe em produção foi na mão. Espere o mesmo padrão nos outros.

### 1.2 — Secrets exigidos vs existentes
```bash
supabase secrets list --project-ref <REF>
grep -rh "Deno.env.get" supabase/functions/*/index.ts | sort -u
```
Ignore os 7 automáticos (`SUPABASE_*`). Compare o resto.

**Faltavam no Injediesel:** `SITE_URL` (→ e-mails de convite apontavam para
`localhost:5173`), `RESEND_API_KEY`, `CRON_SECRET`, `WEBHOOK_SECRET`,
`VIRUSTOTAL_API_KEY`, `MELHOR_ENVIO_TOKEN`, `MELHOR_ENVIO_ORIGIN_CEP`,
`CF_API_TOKEN`, `CF_ACCOUNT_ID`.

⚠️ `CRON_SECRET`/`WEBHOOK_SECRET`: antes de gerar valor novo, verificar se algo já
chama a função com um valor antigo (cron externo, webhook do VirusTotal) — o valor
tem que bater dos dois lados.

### 1.3 — Deploy (só após secrets resolvidos)
```bash
supabase secrets set SITE_URL=https://<dominio> --project-ref <REF>
supabase functions deploy <nome> --project-ref <REF>   # uma por vez, validar cada uma
curl -s -o /dev/null -w '%{http_code}' -X OPTIONS https://<REF>.supabase.co/functions/v1/<nome>
# esperado: qualquer coisa EXCETO 404
```
Ordem de prioridade de negócio: invites → catálogo/downloads ECU → suporte → frete → telemetria.
**Não deployar** as que dependem de secrets ainda inexistentes.
Conferir antes: `supabase/functions/.env` local existe? Nunca usar `--env-file` com ele
sem revisar — pode sobrescrever secrets de produção.

---

## FASE 2 — Fluxo de convite e autenticação (bugs confirmados no clone-base)

Estes bugs existiam no código-base e portanto **provavelmente existem nos espelhos**:

### 2.1 — redirectTo errado por role
`invite-user/index.ts`: `redirectTo` fixo em `/login` (área do parceiro) para TODOS os
roles → convidado de matriz caía em "Acesso Negado" (autenticado, mas na área errada).
**Fix aplicado:** redirect por role — matriz → rota de login interna (`/appinjediesel`
no Injediesel; conferir a equivalente local), franquia → `/login`.
```bash
grep -n "redirectTo" supabase/functions/invite-user/index.ts supabase/functions/invite-franchisee/index.ts
```
No `invite-franchisee`, o redirect original apontava para `/admin-staging` — **rota que não existe**.

### 2.2 — Login da matriz não trata type=invite
`src/pages/Login.tsx` detectava só `type=recovery`; convite chega como `type=invite`
→ usuário entrava sem nunca ver o formulário de definir senha.
```bash
grep -n "type=" src/pages/Login.tsx src/pages/LoginParceiro.tsx
```
Esperado após fix: ambos detectam `invite` E `recovery`.

### 2.3 — "Convite enviado!" mentiroso
Caminho "already registered sem profile" na `invite-user` retornava `ok:true` **sem enviar
e-mail nenhum**. **Fix:** fallback com link de recovery + flag `email_sent:false` na resposta
+ aviso na UI (`UsersTab`) quando o e-mail não sai.

### 2.4 — Usuário criado à mão no Dashboard
Criar user direto em Auth → Users NÃO cria a linha em `profiles` → login autentica mas
sistema rejeita ("profile missing"). Convite posterior para o mesmo e-mail não envia nada (2.3).
**Destravamento:** Dashboard → user → *Send password recovery*; a pessoa entra pelo link
e define senha (pelo fluxo de recovery ou pelo ProfileDialog dentro do app).

### 2.5 — URL Configuration
Dashboard → Authentication → URL Configuration:
- Site URL = `https://<dominio>`
- Redirect URLs: `https://<dominio>/*` (cobre tudo; sem isso o Supabase IGNORA o
  redirectTo silenciosamente e manda todo mundo para o Site URL)

### 2.6 — Teste de ponta (fecha a fase)
Convidar usuário de matriz NOVO (e-mail nunca usado):
e-mail chega → link abre a rota de login da matriz → formulário de senha aparece →
define → cai no dashboard correto. 5 passos, todos verdes.

---

## FASE 3 — E-mails (templates + SMTP)

- Plano free do Supabase: templates padrão **em inglês**, remetente `noreply@mail.app.supabase.io`,
  **limite baixo de envios/hora**, e a edição de templates fica TRANCADA até configurar SMTP próprio.
- **Solução:** SMTP do Resend — Dashboard → Authentication → Emails → SMTP Settings:
  host `smtp.resend.com`, porta `465`, user `resend` (literal), senha = API key `re_...`,
  sender = e-mail de domínio verificado no Resend.
- A MESMA key vira o secret `RESEND_API_KEY` da invite-user (lida em runtime, sem redeploy).
- Depois do SMTP: colar os templates PT-BR com botão (arquivos `template-convite.html` e
  `template-recuperacao.html` — gerados na auditoria do Injediesel; adaptar marca/cores
  de cada empresa). Nunca alterar a variável `{{ .ConfirmationURL }}`.
- Cada empresa: gerar **API key separada** no Resend (revogável de forma independente),
  mesmo que a conta/domínio remetente seja compartilhado. Migração futura para o domínio
  próprio da empresa = verificar o domínio no Resend + trocar o sender.

---

## FASE 4 — Migrations: repo vs produção

```bash
ls supabase/migrations | wc -l
# connection string: Dashboard → Settings → Database → URI (senha percent-encoded)
 supabase migration list --db-url "postgresql://...."   # espaço inicial = fora do histórico
```
Comparar. Divergência = **reportar, não aplicar**. Use `--db-url` e não `--linked`
(link engatilha db push/reset acidental). Nunca colar a connection string em chat/log/commit.

**Status Injediesel:** 80 migrations no repo (001–080; 075–080 aplicadas manualmente via
SQL Editor durante a auditoria, protocolo da Fase 4D); comparação formal migration list
vs produção segue PENDENTE (baixa prioridade — todas as recentes foram aplicadas e
testadas uma a uma).

---

## FASE 4B — Fluxo de arquivos ECU (upload → scan → download)

> Aprendido no destravamento do Injediesel (16–17/07). O fluxo tem 6 elos e CADA UM
> pode estar desligado de fábrica no clone. Verificar em ordem:

### 4B.1 — Worker R2 (o presign de upload)
- `wrangler.toml` existe preparado no repo, mas o worker pode NUNCA ter sido deployado
  (no Injediesel: buckets criados, worker inexistente — Workers & Pages vazio).
- Sintoma clássico: upload retorna `{"error":"Unauthorized"}` — significa que o front
  aponta para o worker de OUTRA empresa (GitHub Secret `VITE_R2_PRESIGN_URL` herdado
  do clone), que valida o JWT contra o Supabase errado.
- Correção: preencher `SUPABASE_URL` no wrangler.toml (os DOIS lugares: [vars] e
  [env.production.vars]) → `npx wrangler login` na conta Cloudflare DA EMPRESA
  (conferir `npx wrangler whoami` ANTES do deploy — no Injediesel a máquina estava
  logada numa 3ª conta) → `npx wrangler deploy --env production` → secrets do worker:
  `SUPABASE_ANON_KEY` e `ALLOWED_ORIGIN` via `wrangler secret put --env production`
  → atualizar o GitHub Secret `VITE_R2_PRESIGN_URL` com a URL nova → push/rebuild.

### 4B.2 — Secrets R2 das Edge Functions (o mapeamento incompleto)
As functions que tocam R2 (scan-ecu-file, ecu-download-url, support-*-url) leem:
`R2_BUCKET_ECU`, `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`
(+ `R2_BUCKET_SUPPORT` nas de suporte). Grep confiável: `grep -rn 'Deno.env.get' supabase/functions/*/index.ts`.
Credenciais: Cloudflare → R2 → Account Details → API Tokens → Manage → Create,
permissão **Object Read & Write** (Read-only quebra o delete de arquivos bloqueados),
TTL Forever. O Secret Access Key só aparece UMA vez.
⚠️ Env é lida no TOP-LEVEL do módulo → depois de setar secrets, REDEPLOYAR a function.
Function deployada ANTES dos secrets = roda cega e dá 500 "educado" sem stack trace.

### 4B.3 — Database Webhook (o gatilho que só existe como comentário)
O disparo da scan-ecu-file (INSERT em ecu_job_files) e o cron da poll-ecu-scans
existem nas migrations APENAS COMO COMENTÁRIO — nunca foram criados de verdade.
Criar manualmente: Dashboard → Integrations → All → Database Webhooks → Enable →
Create: Table `ecu_job_files`, evento INSERT, tipo **Supabase Edge Functions**,
function scan-ecu-file, POST, timeout 5000ms. Headers: `Content-type: application/json`,
`x-supabase-signature: <valor do WEBHOOK_SECRET>` (o VALOR, não o nome!),
`Authorization: Bearer <anon key>` (blinda o gateway JWT).
Webhook só dispara em INSERT NOVO — arquivos enviados antes dele ficam presos em
"Analisando" para sempre (não é bug; teste sempre com upload novo).

### 4B.4 — Modo skipped (sem VirusTotal, fase de teste)
- Enum `scan_status` é fechado: pending/clean/infected/blocked. Adicionar 'skipped':
  `ALTER TYPE public.scan_status ADD VALUE IF NOT EXISTS 'skipped';` (SQL Editor,
  aditivo, seguro) + migration de registro no repo.
- O fallback sem-VT original marcava **'clean' falso** — corrigir para 'skipped'.
  NUNCA registrar como analisado o que não foi.
- Gates que precisam aprender o 'skipped': ecu-download-url (`!== 'clean'` → negava
  com "Arquivo não aprovado para download"). O dedup por hash deve continuar
  EXCLUINDO skipped (veredito inexistente não se reaproveita).
- sha256_hex é calculado sempre (independe do VT) — conferir que o update grava.
- PENDÊNCIA DE SEGURANÇA permanente: antes de franqueado/cliente real, criar conta
  VirusTotal, setar VIRUSTOTAL_API_KEY, deployar poll-ecu-scans + agendar o cron,
  e validar o fluxo de scan real.

### 4B.5 — Bugs de código herdados do clone (corrigir via cherry-pick/porte)
- `.catch()` encadeado em query do supabase-js (PostgrestBuilder é thenable, não
  Promise) → TypeError 500. Corrigido em scan-ecu-file e ecu-download-url (commit
  adafd37 do Injediesel). Grep: `grep -rn '\.catch(' supabase/functions/`.
- `useDownloadEcuFile`: useMutation SEM onError → clique falha em silêncio absoluto.
  Adicionar toast de erro (commit d672428).
- UI não faz auto-refresh do status do scan — badge só atualiza ao recarregar/agir
  (polimento pendente).

### 4B.6 — Teste de ponta do módulo
Upload novo → "Analisando" → (segundos) → botão Baixar → arquivo baixa → objeto
visível no bucket `<empresa>-ecu-originals`. Cache do front atrapalha os testes:
sempre Cmd+Shift+R ou janela anônima após cada deploy.

---

## FASE 4C — Financeiro do fluxo ECU (valores de cobrança)

> Aprendido no Injediesel (17/07). Bug de REGRA DE NEGÓCIO herdado do clone: tudo
> funciona, número errado — o caixa da matriz nasce contaminado. O mesmo padrão
> estava COPIADO em 5 arquivos; corrigir um só não resolve.

### A regra de negócio (o que é certo)
- `amount_charged_to_customer` = o que a FRANQUIA cobra do cliente final dela.
  NUNCA passa pelo caixa da matriz. Uso legítimo: exibição rotulada e dashboards
  de receita da própria franquia.
- `amount_charged_by_matrix` = o que a MATRIZ cobra da franquia. É O ÚNICO valor
  que entra em cobrança, pagamento, caixa e comissão da matriz.

### Os 7 pontos do bug (commit 7e99538 do Injediesel — conferir equivalentes)
1. EcuJobDetail → sendToFinance: criava a cobrança com amount_charged_to_customer.
2. **O pior**: useRegisterPayment (EcuPaymentSheet) sobrescrevia com o valor do cliente
   na hora de MARCAR COMO PAGO — contaminava até cobrança criada correta.
3. commission_entries: gross/commission derivavam do valor errado em cascata.
4–6. Displays de "Cobranças pendentes" em CaixaPage, FinanceiroPage e PdvPage —
   mesmo padrão `X.ecu_jobs?.amount_charged_to_customer ?? X.amount` copiado.
7. Guarda do botão "Enviar Financeiro" checava o campo errado.
Grep de caça: `grep -rn 'amount_charged_to_customer' src/` e revisar cada uso fora
de exibição rotulada/dashboard de franquia.

### Guarda obrigatória
Sem `amount_charged_by_matrix` informado → botão "Enviar para o Financeiro"
desabilitado com aviso ("Informe o valor cobrado pela matriz antes de enviar") +
early-return no handler. NUNCA deixar o fallback `?? 0` criar cobrança de R$ 0.

### Diagnóstico de dados contaminados (SELECT puro, seguro)
```sql
SELECT fe.id, fe.amount AS cobrado, ej.amount_charged_by_matrix AS correto,
       ej.amount_charged_to_customer AS valor_cliente, fe.created_at, ej.id AS job_id
FROM financial_entries fe JOIN ecu_jobs ej ON ej.id = fe.ecu_job_id
WHERE fe.ecu_job_id IS NOT NULL
  AND fe.amount != COALESCE(ej.amount_charged_by_matrix, 0)
ORDER BY fe.created_at DESC;
```
(análogo para commission_entries via gross_amount). Dados de teste: ignorar/zerar
antes da operação real. Dados reais: decisão de negócio, nunca correção silenciosa.

### Decisão de produto pendente (não corrigir sem o dono decidir)
KPI "Receita Bruta" do Command Center da matriz soma amount_charged_to_customer
(receita das franquias com os clientes delas) — número inflado. Opções: trocar para
amount_charged_by_matrix (+ vendas diretas) ou renomear para "Volume da rede".

### Teste de ponta da fase
Job concluído SEM valor da matriz → botão travado com aviso. Informar valor → enviar →
cobrança pendente = valor da matriz → registrar pagamento → modal e lançamento no
caixa = MESMO valor da matriz (o passo do pagamento testa o bug #2).
⚠️ Testado apenas MATRIZ→MATRIZ no Injediesel — o fluxo vindo de unidade franqueada
real (outro usuário, RLS) segue como teste pendente em todos os sistemas.

---

## FASE 5 — Resíduos de clone (vazamento de marca entre empresas)

Como os sistemas são clones, procurar as OUTRAS marcas dentro de cada um:
```bash
grep -rin "promax\|injediesel\|evopro" src supabase workers wrangler.toml public index.html \
  --exclude-dir=node_modules 2>/dev/null | grep -iv "<marca-do-proprio-sistema>"
```
**Encontrado no Injediesel (corrigir equivalentes nos espelhos):**
- 🔴 `invite-franchisee`: e-mail com `from`/assunto/corpo da OUTRA marca (visível para cliente!)
- 🟡 `calculate-shipping`: User-Agent da outra marca
- 🟡 `cart.ts`: chave localStorage da outra marca; exports do catálogo ECU com prefixo da outra marca
- 🟡 Migrations `014`/`032`: catálogo de produtos com dados da outra empresa —
  **verificar em cada sistema se o catálogo em produção é da empresa certa**
- 🟡 `.env.local`/`VITE_R2_PRESIGN_URL`: worker R2 apontando para a infra da outra empresa
- Lixo: arquivos `.bak`, comentários com domínios da outra marca

Também: `CLAUDE.md`, `PRODUCT.md`, `README.md` desatualizados/da outra marca →
agentes de IA leem isso e **geram código errado**. Atualizar cedo.

---

## FASE 6 — Pipeline e higiene de repo

- `deploy.yml`: hoje só build + FTP. **Falta passo de deploy de Edge Functions** (causa raiz
  de quase tudo acima). Adicionar `supabase functions deploy` no CI é a correção estrutural
  (requer `SUPABASE_ACCESS_TOKEN` como GitHub Secret — token da conta da empresa certa!).
- `.gitignore`: conferir se artefatos de agentes (`.claude-flow/`, `data/`, `*.db`,
  `claude-flow.config.json`) estão ignorados antes que entrem num commit.
- `git status` limpo e sincronizado com origin ao final.

---

## FASE 7 — Registro final por sistema

| Item | Status | Observação |
|---|---|---|
| Cadeia repo→site→Supabase confirmada | | |
| Owner do Supabase = empresa | | |
| Functions: __/__ deployadas | | |
| Secrets faltantes | | |
| Fluxo de convite (teste de ponta 2.6) | | |
| SMTP + templates PT-BR | | |
| Migrations repo vs produção | | |
| Resíduos de marca | | |
| deploy.yml com deploy de functions | | |
| Docs (CLAUDE.md/PRODUCT.md) atualizados | | |

---

*Gerado a partir da auditoria real do Injediesel System (15/07/2026). Ao auditar Promax
Tuner e EvoPro, atualize este documento com o que divergir — ele é vivo.*

---

## FASE 8 — Entrega ao cliente (17/07, marco final da jornada Injediesel)

### Protocolo de wipe pré-entrega (estreado no Injediesel, portar para os espelhos)
Esta é a operação MAIS IRREVERSÍVEL de toda a auditoria. Rigor máximo:

1. **Backup ANTES de tudo.** No Injediesel usamos export CSV por tabela via Dashboard
   (49 tabelas, ~2.2 MB) porque `pg_dump` não estava instalado no Mac. Se `pg_dump`
   estiver disponível, use ele com `--data-only --no-owner` — mais fiel. Salvar fora
   do repo (ex.: `~/Documents/.../BACKUP-TABELAS/`). Sem backup salvo em disco com
   tamanho > 0, NÃO RODAR o wipe.

2. **Escopo do wipe (apagar):** todos os dados transacionais e de teste — jobs ECU,
   arquivos, eventos, histórico de edições, cobranças, pagamentos, comissões,
   clientes, veículos, unidades, vínculos, auditoria de teste, e `auth.users` WHERE
   email != usuário-master.

3. **NÃO apagar (preservar):**
   - Catálogos: `products`, `product_prices`, `ecu_catalog`, `ecu_categories`
   - Configuração: `company_settings`, `financial_categories`, `franchise_levels`,
     `permission_profiles`, `permission_entries`
   - Conteúdo: `help_articles`, `marketing_materials`, `firmware_updates`/`_files`,
     `equipment_types`
   - Cadastros base: `fornecedores`, `formas_pagamento`, `servicos` — mesmo se
     estiverem vazias hoje, NÃO deletar como tabela; o sistema precisa delas para o
     dropdown de serviços e a lista de formas de pagamento obrigatória funcionarem.
     Se tiverem itens de teste misturados, remoção linha a linha pela UI.
   - Usuário master + seu profile
   - Schema, policies, functions, triggers, migrations — nada.

4. **Ordem de FKs é mortal.** Duas armadilhas confirmadas no Injediesel:
   - **FKs circulares** → precisam de `UPDATE ... SET x = NULL` em FASE 1 antes
     dos DELETEs. Casos: `ecu_jobs.edicao_valor_historico_id → historico_edicoes_valor`
     e `profiles.unit_id → franchise_units`.
   - **FKs com CASCADE indesejado** → tabelas preservadas (fornecedores/formas/serviços)
     tinham `ON DELETE CASCADE` para `franchise_units`; sem `UPDATE unit_id = NULL`
     antes do wipe de franquias, a cascata varreria as linhas mesmo sem DELETE.
   - **Ordem entre jobs, cobranças e pagamentos:** `financial_entries → ecu_jobs →
     financeiro_pagamentos` (financial_entries aponta pra ecu_jobs via ecu_job_id;
     ecu_jobs aponta pra financeiro_pagamentos via matrix_payment_id).
   - **Auditar TODO REFERENCES do schema** contra a ordem do script, associando cada
     FK à tabela real via `ALTER/CREATE TABLE` imediatamente acima (grep sozinho
     induz a erro em multi-linha).

5. **Executar o wipe com `COMMIT;` no MESMO texto colado.** O SQL Editor do Supabase
   não segura transação entre execuções (autocommit por Run) — rodar o script sem
   COMMIT no fim e depois digitar `COMMIT;` num Run separado = **rollback automático**
   silencioso. No Injediesel isso aconteceu na primeira tentativa (banco intacto de
   novo por sorte). O `COMMIT;` deve ser a Última linha do texto colado no editor.

6. **Resíduo esperado em `audit_logs`/`audit_events` após o wipe** — os gatilhos de
   auditoria gravam os próprios DELETEs de franquias/usuários que rolam depois deles.
   Zerar com um `DELETE FROM public.audit_logs; DELETE FROM public.audit_events;` em
   query separada após o COMMIT — nada é gravado dessa segunda passada (nenhuma
   tabela auditada está sendo tocada).

7. **R2 (Cloudflare):** apagar os objetos sob `jobs/` nos buckets `<empresa>-ecu-
   originals` e `<empresa>-ecu-delivered`. Buckets em si permanecem — só objetos.

8. **Teste de nascimento:** janela anônima → login do master → passeio pelas telas
   principais. Todas devem exibir empty states ("Ainda sem dados" / "Nenhum X" /
   totais em zero). QUALQUER quebra ou tela muda = ajustar antes de entregar.

### Divisão de trabalho (o que estreamos no wipe do Injediesel)
- **Agente do VSCode:** escreve o script, mapeia o grafo de FKs, comita sem push.
  Nunca executa no banco.
- **Agente do Chrome:** navega Dashboard/R2, cola e roda o script no SQL Editor,
  lista objetos R2, passeia pelas telas no teste de nascimento. NUNCA digita
  `COMMIT;`/`ROLLBACK;` — essa linha é do Rogério.
- **Rogério:** faz o backup, digita o `COMMIT;`, confere counts, autoriza deletes
  no R2. Última palavra em cada etapa irreversível.
- **Claude (esta conversa):** lê o script do disco linha a linha, revisa a ordem
  de FKs contra o schema, valida os counts contra o backup, dá o veredito.

### Estado final do Injediesel na entrega (17/07/2026)

**Funcionando em produção, validado com usuários reais:**
- Convite/acesso (criação de unidade → convite automático → senha obrigatória no
  1º acesso → recuperação de senha unificada nos dois lados)
- Consulta de placa
- Fluxo ECU ponta a ponta: franquia envia → scan (modo skipped) → matriz processa
  → devolve → franquia baixa, com status ao vivo (realtime + polling fallback)
- Financeiro ECU: cobrança bifurcada por tipo de job, guardas de valor null,
  fila de aprovação de edição de valor (feature-assinatura), propagação de valor
  aprovado, pagamento em lote com forma obrigatória, policies pra todos os roles.

**Backlog conhecido, sem fantasmas:**
- Resend/SMTP + templates PT-BR (rate limit do SMTP embutido travou testes; é o
  único item de alta severidade pendente antes de tráfego real)
- VirusTotal (destravar scan real quando houver decisão de conta)
- ErrorBoundary com auto-reload para chunks .js antigos (o "text/html is not a
  valid JavaScript MIME type" vai morder usuários com aba aberta durante deploy)
- KPI Receita Bruta (decisão de produto), docs do repo (CLAUDE.md/PRODUCT.md),
  higiene de branding no src, `deploy.yml` com deploy de functions no CI, `.env.local`
  apontando pro Supabase certo.

### Nota para Promax e EvoPro
A fila de aprovação de edição de valor (Fase 4C/D) é EXCLUSIVA do Injediesel —
não portar. Todo o resto (RLS, realtime, financeiro, convite, wipe) vale para
os três. Quando abrir a auditoria de um dos espelhos, começar SEMPRE pela Fase 0
(identidade); os aprendizados posteriores encurtam o caminho mas não o pulam.

---

## FASE 4D — Aprendizados finais do Injediesel (17/07, sessão de fechamento)

### Protocolo de migration sem risco (estreado nas 075–079, usar sempre)
1. Agente escreve a migration como ARQUIVO no repo, commita SEM push.
2. Rogério lê o arquivo, aplica o SQL via SQL Editor do Dashboard.
3. Testa em produção. Passou → agente pusha (main e banco sincronizam juntos).
Nunca: supabase link, db push, db reset. O agente jamais toca o banco.

### As 5 migrations do dia (portar equivalentes nos espelhos)
- **075**: RLS unit-scoped em ecu_jobs/ecu_job_files — policy por VÍNCULO
  (user_unit_roles via my_unit_ids()), não por lista de cargo. Cargo novo já nasce
  funcionando. Antes: 5 dos 7 roles de unidade 100% bloqueados, franchise_manager
  só leitura — nenhum franqueado conseguia enviar arquivo.
- **076**: ALTER PUBLICATION supabase_realtime ADD TABLE ecu_job_files (status ao vivo).
- **077**: my_unit_ids() null-safe — auth.jwt() nulo no contexto Realtime fazia a policy
  negar silenciosamente só pra franquia (matriz nunca dependeu de JWT). UNION com
  fallback pra user_unit_roles + SECURITY DEFINER.
- **078**: FKs de historico_edicoes_valor (solicitado_por/aprovado_por) apontavam para
  auth.users — o embed do PostgREST exige FK direta com profiles; sem ela a fila de
  aprovação SEMPRE veio vazia (erro mascarado como []). Padrão da casa: FK de "quem
  fez" aponta para public.profiles(id).
- **079**: forma_pagamento em financeiro_pagamentos — NULLABLE SEM DEFAULT (regra do
  dado honesto: pagamento antigo mostra "—", nunca valor inventado).

### Armadilhas de diagnóstico que custaram rodadas (reconhecer rápido)
- PGRST201 "more than one relationship": duas FKs entre as mesmas tabelas → embed
  precisa ser desambiguado (`tabela!nome_da_fk`). Vale para ecu_jobs E para
  solicitado_por/aprovado_por (duas FKs pra profiles).
- Após mudar FK: `NOTIFY pgrst, 'reload schema';` (cache de schema do PostgREST).
- Erros de query NUNCA mascarados como lista vazia — sempre banner visível. Foi o
  que transformou "fila não aparece" de mistério em diagnóstico de uma olhada.
- Realtime + RLS: policies que leem JWT precisam de fallback pra contexto sem claims.

### Regras de negócio consolidadas (financeiro ECU)

> ⚠️ **ESCOPO POR EMPRESA (decisão do Rogério, 17/07):** o fluxo de EDIÇÃO DE VALOR
> COM APROVAÇÃO DO FINANCEIRO (historico_edicoes_valor, fila em FinanceiroPage,
> migrations 073/078, badge "Edição pendente", propagação pós-aprovação) é
> **EXCLUSIVO DO INJEDIESEL** — é a funcionalidade diferencial da marca.
> No Promax Tuner e no EvoPro esse fluxo NÃO deve existir: edição de valor é direta,
> sem fila. Ao auditar os espelhos: NÃO portar 073/078 nem a UI da fila; se o clone
> trouxe esse código junto, avaliar remoção/desativação. Todo o RESTO desta seção
> (bifurcação de valores, guardas, canSendToFinance, forma de pagamento) VALE para
> as três empresas.
- Job de franquia: cobrança = amount_charged_by_matrix; "Marcar Concluído" e
  "Enviar Financeiro" bloqueados sem esse valor. Job direto de matriz: cobrança =
  amount_charged_to_customer. Bifurcação em TODO ponto do fluxo.
- canSendToFinance: matriz TAMBÉM vê/envia em job de franquia (o gate errado
  escondia o card inteiro e deixava dinheiro invisível).
- Fila de aprovação de edição de valor: FinanceiroPage → Em Aberto, contador no
  sidebar. Alerta de job novo de franquia: banner dashboard + footer + sidebar.
- Pagamento em lote de franquia: forma de pagamento obrigatória (PIX/Boleto/
  Cartão/Dinheiro) gravada no lançamento.

### Fix pós-entrega: profiles sem coluna email (17/07/2026, chat pós-entrega)

**Bug:** `public.profiles` nunca teve coluna `email` — nenhuma migration a criava.
As Edge Functions `invite-user` e `invite-franchisee` faziam upsert com campo `email`
e lookup `.eq('email', ...)` → PGRST204 "Could not find the 'email' column" em
produção. No `invite-user`, o early-return no erro de profile abortava ANTES do
upsert em `user_unit_roles` — convite de franquia ficava sem vínculo de unidade
(login autenticava mas acesso era negado). No `invite-franchisee`, caminho de sucesso
tinha `ignoreDuplicates: true` — o upsert nunca sobrescrevia o name do trigger.

**Fix (commit 3faf4d1, branch fix/profiles-email → main):**
- Migration `081_profiles_email.sql`: `ADD COLUMN email`, índice, backfill de
  `auth.users`, `handle_new_user()` reescrito com `new.email`, `NOTIFY pgrst`.
- `invite-user`: profileErr virou não-fatal (log + `profile_warning` na resposta);
  vínculo `user_unit_roles` agora roda INDEPENDENTE do resultado do upsert de
  profile; erro de vínculo retorna 500 visível.
- `invite-franchisee`: caminho de sucesso com `ignoreDuplicates: false` (upsert
  enriquece name corretamente); erro de profile capturado e logado.

**⚠️ CHERRY-PICK OBRIGATÓRIO para Promax e EvoPro:** o bug é herdado do clone-base.
A 081 e os fixes das duas functions devem ser portados na auditoria de cada espelho.
A coluna `email` em `profiles` é pré-requisito para o fluxo de convite funcionar.

**Lição:** o trigger `handle_new_user` (002) mascara bugs nas functions de convite
porque cria o profile antes — o sistema "funciona" com 500 silencioso, e o dano
(vínculo perdido, name errado) só aparece quando o usuário real tenta acessar.

### Fix pós-entrega: operations_admin bloqueado + auto-edição de role (20/07/2026, chat pós-entrega)

**4 bugs encontrados em produção** após o Renan (operations_admin) começar a operar:

**Bug A — INSERT franchise_units falha com 22P02:** campos numéricos opcionais
(`limite_colaboradores`, `raio_atendimento_km`) chegavam como string vazia `""`
do form quando o usuário tocava no campo e apagava. O payload usava `?? null`
que NÃO substitui `""`. Postgres rejeita `""` para colunas integer/numeric.
**Fix (commit ce20cf9):** helpers `toIntOrNull`/`toNumOrNull` no `ConfirmSummaryDialog`.

**Bug B — invite-franchisee bloqueava operations_admin:** allowlist do guard
`['company_admin', 'system_ti']` não incluía `operations_admin` → 403 ao criar
unidade com convite automático.
**Fix (commit ce20cf9):** `operations_admin` adicionado à allowlist.

**Bug C — invite-user bloqueava operations_admin:** `canManageMatrix` e
`canManageFranchise` não incluíam `operations_admin` → impossível convidar
qualquer tipo de usuário.
**Fix (commit ce20cf9):** `operations_admin` adicionado às duas allowlists.

**Bug D — qualquer usuário editava a própria role (FURO DE SEGURANÇA):**
Migration 066 já havia fechado o auto-update de role/permissions/salary etc.
via `profiles_update_own` com WITH CHECK. O gap real era: `profiles_update_admin`
usava `is_matrix_admin()` (só system_ti/company_admin), excluindo operations_admin
de editar outros perfis; e não tinha `id <> auth.uid()`, permitindo que admins
alterassem a própria role pela policy de admin.
**Fix:** Migration `082_profiles_operations_admin_update.sql` — recria
`profiles_update_admin` com operations_admin no escopo + `id <> auth.uid()`.
Front: `isEditingSelf` no UsersTab desabilita campo de cargo, permissões e comissão
com mensagem "Você não pode alterar seu próprio cargo".

**Bug E — RLS de franchise_units bloqueava INSERT para operations_admin:**
`franchise_units_admin_all` usava `is_matrix_admin()` (só system_ti/company_admin)
→ 42501 no INSERT mesmo com o 22P02 corrigido.
**Fix:** Migration `083_franchise_units_operations_admin.sql` — recria a policy
com inline check incluindo operations_admin.

**⚠️ CHERRY-PICK OBRIGATÓRIO para Promax e EvoPro:** migrations 082, 083 e
fixes das functions (allowlists) são herdados do clone-base. Portar junto com a 081.

**Padrão identificado:** toda tabela cuja policy de escrita usa `is_matrix_admin()`
exclui `operations_admin`. Varrer TODAS as policies que usam essa function e
avaliar se operations_admin deveria estar incluído. Tabela conhecida pendente:
`audit_logs` (INSERT retorna 403 para operations_admin — não bloqueia fluxo
mas perde registro de auditoria).

**Lição:** `is_matrix_admin()` e `is_matrix_user()` parecem iguais mas têm
escopos diferentes. Ao criar policy de escrita, verificar qual das duas é
usada e se o role desejado está no conjunto certo. O padrão mais seguro
(adotado na 082 e 083) é inline check sem depender das helpers, para não
afetar outras policies que as usam.

### Fix pós-entrega: varredura completa de RLS + Worker R2 (20/07/2026, continuação)

**Após os fixes pontuais (082/083), varredura revelou 21 policies com
`is_matrix_admin()` + bugs no Worker R2 + marketing_materials:**

**Bug F — Worker R2 `isMatrixAdmin()` sempre retornava false:**
`workers/r2-presign.ts`: function `isMatrixAdmin()` consultava profiles via
`Authorization: Bearer ${env.SUPABASE_ANON_KEY}`. A RLS de profiles_read exige
`auth.uid()` — anon key não tem uid → query vazia → 403 para TODOS os roles.
Upload/delete de marketing e firmware estavam 100% quebrados.
**Fix (commits 34f62a1, 9231aff):** `verifyToken` retorna `{ userId, token }`,
`isMatrixAdmin` usa o JWT do usuário. `system_ti` adicionado à constante
`MATRIX_ADMIN_ROLES`. Worker redeployado via `wrangler deploy`.

**Bug G — 21 policies com `is_matrix_admin()` excluindo operations_admin:**
13 tabelas afetadas: company_settings, equipment_types, firmware_updates,
firmware_update_files, firmware_update_acceptances, formas_pagamento,
fornecedores, franchise_levels, profiles (delete/insert), servicos,
unit_employee_costs, unit_employees, user_unit_roles.
**Fix:** Migration `084_operations_admin_all_policies.sql` — DROP+CREATE de
todas as 21 policies com inline check incluindo operations_admin.

**Bug H (identificado, NÃO fixado):** `checkFirmwareAcceptance` no Worker
também usa `Bearer ${env.SUPABASE_ANON_KEY}` — mesmo padrão do Bug F.
Não bloqueia fluxo crítico; fix no próximo ciclo.

**Bug I — marketing_materials sem system_ti:**
mkt_materials_insert/update/delete (migration 044) tinham
`role IN ('company_admin','operations_admin')` sem `system_ti`.
Upload de marketing falhava para system_ti com 42501.
**Fix:** Migration `085_marketing_materials_system_ti.sql`.

**⚠️ CHERRY-PICK para Promax/EvoPro:** 084, 085 e o fix do Worker
devem ser portados. O Worker do Promax provavelmente tem o mesmo bug.

**Padrão consolidado após esta varredura:** não confiar em nenhuma
helper function (`is_matrix_admin`, `is_matrix_user`, `is_system_ti`)
para policies novas. Usar inline check explícito com a lista completa
de roles. Antes de criar qualquer policy de escrita, verificar se o
role desejado está no conjunto.

### Fluxo de convite/1º acesso (fechado nesta sessão)
- Criar unidade → convite automático ao responsável (falha de convite NÃO desfaz
  a criação; botão do header vira reenvio).
- user_metadata.must_set_password=true no convite → modal de senha OBRIGATÓRIO
  (overlay via createPortal no body — backdrop-filter no header cria containing
  block e quebra position:fixed; focus-trap deve FILTRAR elementos disabled) →
  updateUser({password, data:{must_set_password:false}}) libera.
- Login lazy-loaded + token no hash = corrida: mostrar "Entrando..." até a sessão
  estabelecer, timeout ~8s → aviso de link expirado.

### Sprint bugs financeiros pós-A.11 (27/07/2026)

**Bug J — FIN.3: cobrança não sai da lista de pendentes após "confirmar
pagamento":** `financial_admin_mark_paid` (financial_entries) e
`financial_admin_update_commissions` (commission_entries) — ambas de
`080_financial_entries_admin_update_pending.sql` — tinham lista de role mais
curta que `financial_admin_write` (`089_financial_entries_franchise_send.sql`,
quem ENVIA a cobrança pro financeiro). `finance_staff, operations_admin,
franchise_manager, unit_manager` conseguiam criar a cobrança mas não
conseguiam quitá-la — RLS bloqueava o UPDATE pendente→pago silenciosamente
(0 linhas afetadas, SEM erro), a mutation do front reportava sucesso, o
banco nunca mudava de status. Mesma classe de bug do "Bug G" acima
(policies do mesmo domínio com listas de role divergentes), aplicada agora
a financial_entries/commission_entries em vez das 21 tabelas com
`is_matrix_admin()`.
**Fix:** Migration `098_financial_entries_mark_paid_roles.sql` (Injediesel) —
DROP+CREATE das duas policies, agora com os mesmos 6 roles de
`financial_admin_write` + `seller` (mantido de propósito nas duas —
PDV abre "Registrar Pagamento ECU" pra seller sem guarda de rota, motivo
documentado na 080 original; seller NUNCA entra em `financial_admin_write`,
não é typo).

**⚠️ CHERRY-PICK a verificar em Promax Tuner e EvoPro:** mesma origem de
código, mesmo padrão de risco (policies do mesmo domínio evoluindo em
migrations separadas ao longo do tempo). Rodar nos dois clones:

```sql
SELECT tablename, policyname, cmd, qual, with_check
FROM pg_policies
WHERE tablename IN ('financial_entries','commission_entries')
  AND policyname IN (
    'financial_admin_write',
    'financial_admin_mark_paid',
    'financial_admin_update_commissions'
  )
ORDER BY tablename, policyname;
```
Comparar as listas de role de cada linha — se divergirem (fora do `seller`
intencional em mark_paid/update_commissions), aplicar o mesmo fix.

**Padrão reforçado:** ao adicionar um role numa policy de criação/escrita de
um domínio, checar TODAS as outras policies do mesmo domínio (atualizar,
quitar, cancelar, etc.) e sincronizar as listas — não assumir que "escrever"
implica "consegue completar o ciclo de vida do dado".

---

## ADENDO — Sessão 11/08/2026 (Injediesel) — novos cherry-picks p/ Promax/EvoPro

Correções feitas no Injediesel nesta sessão. Cada uma é candidata a replicar nos
clones (código idêntico na base). **Dados únicos por empresa (banco, R2, WhatsApp,
PIX, endereço) NUNCA se copiam** — cada sistema tem os seus (Injediesel=`ttnmvheptxedwninjedv`,
Promax=`myjrylmxzertrbwuosrv`, EvoPro=`sumlatisdadarivujabm`).

1. **Remoção de mock mode** — deletar `src/mocks/`, `src/data/ecu-catalog-mock.json`;
   tirar guard `VITE_MOCK`/`setupMocks` do `main.tsx`; remover branches `IS_MOCK` de
   `useEcuCatalog`/`useEcuFiles` (e demais hooks se houver). Verificar:
   `grep -rn "IS_MOCK\|isMock\|VITE_MOCK\|@/mocks\|MOCK_ROWS\|DEMO_USERS" src/`.

2. **Dashboard do franqueado com filtro de período** — novo hook `useFranchiseDashboard`
   (agregação escopada ao `unit_id` da unidade, sem cap) + toggle Hoje/7dias/Mês/Tudo.
   Antes era `useEcuJobs({pageSize:200})` sem período.

3. **Toggles de permissão = realidade (Opção 1)** — o banco (RLS) grava por ROLE, não
   pelos toggles (`profiles.permissions`). `PermMatrix` (UsersTab) agora TRAVA as caixas
   Criar/Editar/Excluir acima de `ROLE_DEFAULT_PERMISSIONS[role]` — não deixa marcar o que
   o banco nega (ex.: support_agent + "criar franqueados" → dava 42501 "Erro ao salvar
   unidade"). + `ModuleGuard` de rota (bloqueia URL sem `can_view`) + Sidebar da matriz
   gateada por módulo. (Enforcement de verdade dos toggles; ver também A.7 do memory.)

4. **Bug H — Worker Cloudflare consultando Supabase com anon key** (mesma classe do §5.14
   do memory). Em `workers/r2-presign.ts`, `checkFirmwareAcceptance` usava
   `Authorization: Bearer <ANON_KEY>` → RLS `auth.uid()=user_id` voltava vazio → download
   de firmware dava 403 pra todos. Fix: passar o **JWT do usuário** (como `isMatrixAdmin`
   já fazia). Precisa `wrangler deploy`. Verificar nos clones: grep por `SUPABASE_ANON_KEY`
   usada como `Authorization` em qualquer checagem de aceite/role no worker.

5. **Menu "Atualizações" na matriz** — a rota `/atualizacoes` (upload de firmware) existia
   mas faltava o item no `Sidebar` da matriz (só a franquia tinha). Adicionado.

6. **E-mail transacional profissional** — migrar do SMTP padrão do Supabase (limite baixo,
   cai em spam) para **Resend com domínio próprio verificado** + SMTP custom no Supabase
   Auth + rate limit elevado + **4 templates HTML PT-BR** (Invite/Reset/Confirm/Magic) com
   a marca. Remetente/domínio/chave = **dados únicos por empresa**. Templates de referência:
   `docs/email-templates/` (trocar a marca por sistema).

7. **WhatsApp de suporte interno via banco** (não expor no front) — coluna
   `company_settings.support_whatsapp` + função SECURITY DEFINER `get_support_whatsapp()`
   (GRANT só authenticated) + hook `useSupportWhatsapp` + card na AjudaPage. Número fica só
   no banco (nunca no bundle). Migration nova por sistema; o número é dado único.

8. **`.env.local` mente (reforço):** nos clones o `.env.local` veio apontando pro banco/R2
   do Promax. Confirmar sempre pelo `supabase/.temp/project-ref` e pelos GitHub Secrets.
   Produção usa GitHub Secrets, não o `.env.local`.

*Registro em `INJEDIESEL-PROJECT-MEMORY.md` (§4/§8/§10) pendente de atualização.*

---

## ADENDO — Sessão 19/08/2026 (Injediesel) — melhorias de visibilidade/relatórios

Três **pontos cegos de visibilidade** (não eram bugs — o dado já existia no banco, faltava
expor/cruzar). Corrigidos no Injediesel; candidatos a portar nos clones (código-base comum).
**Dados únicos por empresa nunca se copiam.** Migration aplicada pelo Rogério no SQL Editor;
última antes desta sessão = 102, esta usou a **103**.

Status do levantamento: *cadastro de usuários não mostrava a unidade; franqueados não era
buscável por gestor; faltava relatório comparativo entre unidades na matriz.*

1. **Cadastro de usuários não mostrava a unidade** — a lista (Config → Usuários) não exibia
   a que unidade cada usuário pertencia (vínculo em `user_unit_roles`, invisível na tela).
   `useUsers` passou a trazer as unidades via embed `user_unit_roles → franchise_units`; o
   card mostra a unidade ao lado do cargo (ou "Matriz" sem vínculo, ou "N unidades" com
   tooltip). **Sem migration.**
   Arquivos: `src/hooks/useUsers.ts`, `src/pages/app/configuracoes/UsersTab.tsx`.

2. **Franqueados não era buscável por gestor** — a busca só casava o nome da unidade; buscar
   o nome do gestor não retornava nada, e a tabela não mostrava quem era o gestor.
   **Migration 103**: view `v_franchise_units` (`security_invoker = on`) = `franchise_units.*`
   + `manager_name` (join pelo `manager_id → profiles`). A lista passou a ler a view; a busca
   casa nome da unidade OU do gestor (ilike, com sanitização de `,()` do `.or`), e ganhou
   coluna "Gestor". ⚠️ **Dependência:** aplicar a migration ANTES do deploy — senão a lista
   quebra (`relation "v_franchise_units" does not exist`).
   Arquivos: `src/hooks/useFranchiseUnits.ts`, `src/pages/app/franqueados/FranchiseesPage.tsx`,
   `supabase/migrations/103_franchise_units_manager_view.sql`.

3. **Faltava relatório comparativo entre unidades na matriz** — só existiam relatórios de UMA
   unidade (`RelatoriosPage`, escopo `useMyUnit`). Não dava pra responder "qual unidade
   faturou/gastou/gerou mais arquivos". Novos `useRelatoriosComparativo` + `RelatoriosMatrizPage`:
   ranking ordenável (arquivos ECU, faturamento = `amount_charged_to_customer`, gasto c/ matriz =
   `amount_charged_by_matrix`, margem, ticket médio, clientes, vendedores), breakdown por tipo de
   serviço e por UF, export CSV/XLSX com seleção de campos (respeita período + ordenação).
   **Sem RPC nem migration** — o admin matriz já lê `ecu_jobs` de todas as unidades (mesmo acesso
   provado pelo `useMatrixDashboard`). Rota `/relatorios` guardada a
   `company_admin`/`operations_admin`/`system_ti` + item no menu Gestão (só matriz;
   `FranqueadoShell` usa sidebar própria). **Esta frente é genérica e vale para os três sistemas.**
   ⚠️ Regra de negócio: `amount_charged_by_matrix` = gasto da unidade COM a matriz;
   `amount_charged_to_customer` = faturamento da unidade. Rotular separado — nunca somar como
   se fosse a mesma coisa.
   Arquivos: `src/hooks/useRelatoriosComparativo.ts`, `src/pages/app/relatorios/RelatoriosMatrizPage.tsx`,
   `src/router/index.tsx`, `src/components/layout/Sidebar.tsx`.

**Nota de porte (Promax/EvoPro):** Frente 3 assume que o admin matriz lê `ecu_jobs`
cross-unidade (como no `useMatrixDashboard`). Antes de portar, confirmar que a RLS do clone
permite esse SELECT agregado; se não, aí sim avaliar RPC `SECURITY DEFINER` no padrão da
migration 072. Frentes 1 e 2 são diretas (2 exige a view — migration própria por sistema).
