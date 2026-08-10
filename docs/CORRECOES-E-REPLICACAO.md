# Correções & Guia de Replicação — Injediesel / EvoPRO / ProMax Tuner

> **Fonte da verdade das correções.** Os 3 sistemas são clones da mesma base
> (diferenças mínimas). As **correções abaixo** (código, navegação, processos,
> autorizações) devem ser replicadas nos 3. Os **dados únicos por empresa**
> (banco, R2, WhatsApp, PIX, endereço, CNPJ) **NÃO** se copiam — cada sistema
> tem os seus.
>
> Fluxo de trabalho: **1) verificar** cada sistema contra este doc → **2) achar
> as diferenças** → **3) aplicar as correções** (sem tocar nos dados únicos).

Última atualização: 2026-08-10 · Sessão de referência: Injediesel (100% aplicado).

---

## 0. Mapa dos sistemas (dados ÚNICOS — nunca cruzar)

| Sistema | Supabase (produção) | Repositório | Site | R2 (Cloudflare) |
|---------|---------------------|-------------|------|-----------------|
| **injediesel** | `ttnmvheptxedwninjedv` | rogerioweb72/injediesel-system | inje.tech (Hostinger) | account `63504ee600b4c431cb74cfd54dcbc164`, buckets `injediesel-*` |
| **promax-tuner** | `myjrylmxzertrbwuosrv` | rogerioweb72/promax-tuner | — | `promax-*` |
| **evopro** | `sumlatisdadarivujabm` | rogerioweb72/evopro | — | `evopro-*` |

⚠️ **Bug herdado do clone:** o `.env.local` de injediesel e evopro veio apontando
para o banco/R2 do **promax** (`myjrylmxzertrbwuosrv` / `promax-tuner-r2-prod`).
Corrigir o `.env.local` (URL, publishable key, R2, PIX, WhatsApp) para o projeto
correto **antes** de operar dados. (No injediesel já foi corrigido.)
Confirmação do banco correto: `supabase/.temp/project-ref`.

---

## 1. Correções a REPLICAR (código/processo/autorização)

### 1.1 Remoção de mock mode
- **Deletar:** `src/mocks/` inteiro, `src/data/ecu-catalog-mock.json`.
- **`src/main.tsx`:** remover o guard `if (import.meta.env.VITE_MOCK === 'true') { setupMocks() }` (tornar `mount()` síncrono).
- **`src/hooks/useEcuCatalog.ts`:** remover import `mockData`, const `IS_MOCK`, `mkRow`, `MOCK_ROWS` e todos os branches `if (IS_MOCK) {...}` (deixar só o caminho real Supabase).
- **`src/hooks/useEcuFiles.ts`:** remover `const isMock` e o branch mock do upload (deixar só `uploadFileToR2` real).
- **Outros hooks (se existirem no sistema):** `useProducts`, `useFinancial`, `useMatrixDashboard`, `useCompanySettings`, `useMyUnit` — remover branches `IS_MOCK` + imports de demo-data.
- **Auth (se existir isMock):** `stores/auth.ts` (flag `isMock`/`setMock`), `useSignIn` (`DEMO_USERS`/bypass), `UnitGuard`/`useAuth` (skip mock), página de login (`mockTarget`).
- **`.env.local`:** remover `VITE_MOCK=true`.
- **Verificar:** `grep -rn "IS_MOCK\|isMock\|VITE_MOCK\|@/mocks\|MOCK_ROWS\|mockData\|DEMO_USERS" src/` deve voltar vazio.

> **Nota de divergência:** cada clone tem quantidade diferente de branches mock.
> No injediesel já estavam limpos os hooks de products/financial/etc; só faltava
> main.tsx, useEcuCatalog, useEcuFiles. No evopro havia muito mais. Verificar
> caso a caso pelo grep acima.

### 1.2 Dashboard do franqueado — filtro de período + agregação por unidade
- **Novo hook** `src/hooks/useFranchiseDashboard.ts` — espelha `useMatrixDashboard`,
  mas **escopado ao `unit_id` da própria unidade** (`.eq('unit_id', unitId)`,
  unitId vem de `useMyUnit`). Busca em chunks de 1000 (**sem cap de 200**).
  Retorna: faturamento, serviços realizados, ticket médio, em andamento,
  breakdown por tipo, últimos jobs. **Isolamento:** só vê a própria unidade (RLS reforça).
- **`src/pages/app/franqueados/FranqueadoDashboard.tsx`:** trocar o `useEcuJobs({pageSize:200})`
  + filtro client-side por `useFranchiseDashboard(period)`; adicionar toggle
  **Hoje / 7 dias / Mês / Tudo** (default `month`, igual matriz).
- Ambos arquivos são **brand-neutral** (sem dado de empresa) → copiam idêntico.

### 1.3 Permissões RBAC — enforcement real (toggles deixam de ser enfeite)
Diagnóstico: os toggles do cadastro de usuário **persistiam** (coluna `profiles.permissions`
+ `useUpdateUser`/`invite-user`), mas **nada aplicava** — Sidebar da matriz só gateava
3 de ~13 módulos e **nenhuma rota** bloqueava acesso por URL.
- **Novo** `src/components/auth/ModuleGuard.tsx` — redireciona p/ `/acesso-negado`
  quando `!canView` no módulo (bypass p/ system_ti e admin da matriz via `useModulePermission`).
- **`src/router/index.tsx`:** helper `MS m="..."` (ModuleGuard + Suspense) envolvendo
  as rotas por módulo (matriz + franqueado): clientes, produtos, franqueados,
  ecu_arquivos, pdv, pedidos, suporte, financeiro, tabela_remap, relatorios,
  configuracoes, auditoria. Dashboard/cadastros/materiais/ajuda ficam abertos.
- **`src/components/layout/Sidebar.tsx` (matriz):** gatear cada item por `canView`
  do módulo (Arquivos ECU, Tabela Remap, Clientes, PDV, Pedidos, B2B, Produtos,
  Suporte + os que já tinham). `FranqueadoSidebar` já costuma estar gateado.
- Todos brand-neutral → copiam idêntico.

### 1.4 Consulta de placa (wdapi2) — se ainda não aplicado
- Edge Function `plate-lookup`: URL `https://wdapi2.com.br/consulta/{PLACA}/{TOKEN}`,
  token via `Deno.env.get('APIPLACAS_TOKEN')` (secret), normalização
  `{ marca, modelo, ano, motorSugestao, cilindradas }`.
- `useBrasilAPI.ts`: chamar `supabase.functions.invoke('plate-lookup')` (nunca fetch direto).
- Forms `EcuJobForm.tsx` / `VehicleForm.tsx`: usar `info.motorSugestao` / `info.ano`.
- Secret por sistema: `supabase secrets set APIPLACAS_TOKEN=... --project-ref <ref-do-sistema>`.

### 1.5 WhatsApp de suporte interno — via banco, nunca no front
- **Migration** `supabase/migrations/1XX_support_whatsapp.sql`: coluna
  `company_settings.support_whatsapp` + função **SECURITY DEFINER**
  `get_support_whatsapp()` (GRANT só a `authenticated`, REVOKE anon/public).
- **Hook** `src/hooks/useSupportWhatsapp.ts` (RPC `get_support_whatsapp`) + `formatBrWhatsapp`.
- **`AjudaPage.tsx`:** card "Suporte Franquias (Matriz)" que só renderiza se a RPC retorna
  (ou seja, só p/ usuário autenticado). O número **não vai no bundle**.
- ⚠️ O **valor** do número é dado único (setar via UPDATE por sistema — ver §2).

### 1.6 CI/CD — passar PIX + WhatsApp público no build
- **`.github/workflows/deploy.yml`:** no step Build, adicionar ao `env`:
  `VITE_PIX_KEY/NAME/CITY` (via secrets) e `VITE_WHATSAPP_NUMBER` (público).
- Só o **workflow** é replicável; os **valores** são únicos (§2).

---

## 2. Dados ÚNICOS por empresa — NÃO copiar (setar por sistema)

Cada sistema define os seus. Nunca reutilizar valores de outro.

| Item | Onde vive | injediesel |
|------|-----------|------------|
| Supabase URL / publishable key / project_id | GitHub Secrets + `.env.local` | `ttnmvheptxedwninjedv` / `sb_publishable_fQJ_Lq7_L7MvKXoew90oGQ_Aqt7i-wa` |
| R2 account / buckets / presign worker | `wrangler.toml` + Secret `VITE_R2_PRESIGN_URL` + Edge secrets | account `63504ee6...`, buckets `injediesel-*`, worker `injediesel-r2-prod` |
| PIX (chave/nome/cidade) | Secret `VITE_PIX_KEY` (+ code default) | chave `15154660000102` (CNPJ) |
| WhatsApp PÚBLICO (atendimento) | `VITE_WHATSAPP_NUMBER` (bundle público) | `5545999986565` |
| WhatsApp SUPORTE interno | **Banco** `company_settings.support_whatsapp` (não no front) | `5545998560159` |
| E-mail de suporte | `AjudaPage` / company_settings | `suporte@inje.tech` |
| Endereço / CNPJ / razão social | `company_settings` (banco) | — |
| Sentry DSN | Secret `VITE_SENTRY_DSN` | (definir por projeto) |
| Edge Function secrets (R2 keys, buckets, APIPLACAS_TOKEN) | Supabase → Edge Functions → Secrets | por projeto |
| FTP deploy (Hostinger) | Secrets `FTP_HOST/USERNAME/PASSWORD` | por projeto |

**Setar o WhatsApp de suporte interno (exemplo injediesel):**
```sql
UPDATE public.company_settings SET support_whatsapp = '5545998560159';
```

---

## 3. Segurança (padrão validado no injediesel)
- **RLS** protege dados sensíveis mesmo com a key pública: sem login, `customers`,
  `profiles`, `financial_entries`, `ecu_jobs`, `company_settings` retornam `[]`. ✅
- **Nenhum segredo no bundle** (sem `service_role`, `sb_secret`, R2 secret, private key).
- **Publishable key** (`sb_publishable_`/anon) é **pública por design** — segura no front.
- **Senha nunca é registrada no navegador** — Supabase guarda só o token de sessão (JWT).
- `.env*` gitignored (só `.env.example` versionado, sem segredo).
- **Verificar por sistema:** repetir a auditoria (RLS anon retorna `[]`, grep de segredos no bundle e no repo).

---

## 4. Estado por sistema (atualizar conforme avança)

| Correção | injediesel | evopro | promax |
|----------|------------|--------|--------|
| Remoção de mocks | ✅ commit | ✅ branch `chore/remove-mocks` | ⬜ verificar |
| Dashboard franqueado (período) | ✅ | ✅ (mesma branch) | ⬜ |
| Permissões RBAC (ModuleGuard) | ✅ | ✅ (mesma branch) | ⬜ |
| Placa wdapi2 | ✅ (prévio) | ✅ (prévio) | ✅ (feito p/ promax) |
| WhatsApp suporte via banco | ✅ código; ⬜ migration aplicada no banco | ⬜ | ⬜ |
| CI passa PIX/WhatsApp | ✅ | ⬜ | ⬜ |
| Reset de dados (go-live) | ✅ (só injediesel foi resetado) | ⬜ (sob demanda) | ⬜ |
| `.env.local` corrigido p/ banco/R2 certo | ✅ | ⬜ (aponta p/ promax) | ✅ (é o dono) |

---

## 5. Pendências abertas (injediesel)
1. **Aplicar migration** `101_support_whatsapp.sql` no banco `ttnmvheptxedwninjedv` +
   `UPDATE ... support_whatsapp='5545998560159'` (precisa senha nova do banco).
2. **GitHub Secrets:** adicionar `VITE_PIX_KEY=15154660000102`; re-setar
   `VITE_R2_PRESIGN_URL` p/ o worker do injediesel.
3. **Deploy:** `git push origin main` (dispara CI → build → FTP Hostinger).
4. **Segurança:** revogar credenciais expostas em chat (senha do banco/conta).

---

## 6. Como verificar um sistema (checklist de auditoria)
```bash
# 1. Confirmar banco/R2 corretos (NÃO pode ser de outro sistema)
cat supabase/.temp/project-ref
grep VITE_SUPABASE_URL .env.local

# 2. Mocks removidos?
grep -rn "IS_MOCK\|isMock\|VITE_MOCK\|@/mocks\|MOCK_ROWS\|mockData\|DEMO_USERS" src/

# 3. Dashboard franqueado tem período?
grep -c "useFranchiseDashboard\|Hoje\|7 dias" src/pages/app/franqueados/FranqueadoDashboard.tsx

# 4. Permissões: ModuleGuard existe + sidebar gateada?
ls src/components/auth/ModuleGuard.tsx; grep -c "useModulePermission" src/components/layout/Sidebar.tsx

# 5. Build/lint/tsc limpos
npx tsc --noEmit && npm run build && npm run lint

# 6. Segurança (RLS): com anon key, tabelas sensíveis devem retornar []
```
