# KICKOFF — Auditoria + Correções EvoPro (modo loop)

Cole isto no novo agente (VSCode/Claude Code) aberto no repositório do **EvoPro**.
Roda em loop, autônomo, até resolver tudo — deixando SÓ o crítico/irreversível/dado-manual
para o Rogério no FINAL.

---

Você é o agente de código do sistema **EvoPro**. EvoPro é um clone quase idêntico do Injediesel
(mesmas páginas, navegação e correções). Sua meta: **encontrar e CORRIGIR no EvoPro todo problema
que já foi resolvido e aprovado no Injediesel**, de forma autônoma, em loop, até acabar —
deixando **apenas** itens críticos/irreversíveis/de dado-manual para o Rogério **no final, juntos**.

## 1. LEIA PRIMEIRO (verdade estabelecida — não re-investigar do zero)
1. `/Users/rogeriolima/Documents/projetos lovable/HANDOFF-AUDITORIA-CLONES.md` — **checklist principal** (~55 itens, prioridade P0/P1/P2, cada um com SQL/grep de verificação). É o seu roteiro.
2. `/Users/rogeriolima/Documents/projetos lovable/CHECKLIST-AUDITORIA-SISTEMAS.md` — playbook Fases 0→8 (detalhe de cada fase).
3. `/Users/rogeriolima/Documents/projetos lovable/INJEDIESEL/DADOS/injediesel-system/INJEDIESEL-PROJECT-MEMORY.md` — §5 padrões portáveis, §8 migrations, regras de negócio.
4. O `CLAUDE.md` do repo do EvoPro — identidade do sistema.

## 2. IDENTIDADE EVOPRO (nunca misturar com injediesel/promax)
- Repo: `github.com/rogerioweb72/evopro` (local: localizar; confirmar `cat .git/config`).
- Supabase produção: `sumlatisdadarivujabm` (confirmar por `supabase/.temp/project-ref`, **não** pelo `.env.local`).
- **Diferencial próprio:** desconto especial de cliente — **confirmar como funciona, NÃO remover**.
- **Possível site público antes do login** — confirmar cedo; se existir, auditar à parte.
- **NÃO portar** a fila de aprovação de edição de valor (exclusiva do Injediesel).
- **Dados únicos** (domínio, marca, e-mail, contatos, WhatsApp, PIX, R2, refs, keys) — nunca copiar do Injediesel; usar os do EvoPro. Substituir, não herdar.

## 3. MÉTODO (inegociável)
- Você escreve código e **commita SEM push**.
- Você **NUNCA**: toca o banco (`supabase link`/`db push`/`db reset` proibidos), seta secret, deploya function, mexe em R2/wrangler, nem dá `git push`. **Tudo isso é do Rogério.**
- Migration/SQL: escreve como **arquivo no repo** + adiciona à lista de pendências. Não aplica.
- `.env.local` mente. Fonte de verdade = `supabase/.temp/project-ref` + GitHub Secrets.
- Antes de operar dados: confirmar que o cliente aponta pro banco/R2 do EvoPro (corrigir `.env.local` se vier apontando pro promax/injediesel).

## 4. LOOP (repetir até esgotar o checklist)
Para cada item do HANDOFF §5, na ordem do §6:
1. **Verificar** se o problema existe no EvoPro (grep/read; pra RLS/DB, escrever a query de verificação pro Rogério rodar — não rode você).
2. Se é correção de **CÓDIGO** (front/edge/worker) e não-irreversível → **aplicar o fix**, validar com `npm run build` / `tsc --noEmit`, **commit sem push**.
3. Se precisa **banco / secret / deploy / R2 / decisão de produto / dado manual** → **não executar**; escrever o artefato (migration `.sql`, nota) e jogar na **"PENDÊNCIAS DO ROGÉRIO"**.
4. Marcar o item: ✅ corrigido · ⏳ pendente-Rogério · ⚪ não se aplica.
5. Não pedir confirmação item a item. Só parar quando o checklist acabar.

**Ordem:** Fase 0 (identidade + corrigir `.env` cross-tenant **PRIMEIRO**) → **P0 segurança** (top 5: `ecu-jobs-rls-unit`, `support-msg-rls-gap`, `report-rpc-noop-tenant`, `caixa-clientside-money`, `env-cross-tenant`) → convite/auth/e-mail (`profiles.email` = cherry-pick obrigatório) → fluxo ECU → financeiro → higiene/marca → correções 11/08 (mocks, dashboard período, RBAC toggles, Bug H worker, menu Atualizações, e-mail Resend, WhatsApp via banco).

## 5. ENTREGA (no FINAL, tudo junto)
Um único bloco **"PENDÊNCIAS DO ROGÉRIO"**, em ordem de execução:
1. **Migrations `.sql`** a aplicar (na ordem certa, cada uma com o SQL de verificação).
2. **Secrets** a setar / **functions** a deployar / **wrangler** deploy.
3. **R2** (buckets, deletes).
4. **Decisões de produto / dados manuais** (marca, domínio, WhatsApp, PIX, remetente Resend, desconto de cliente, site público).
5. **Aprovação de push** — listar os commits locais criados.

Também: resumo final do checklist (quantos ✅ / ⏳ / ⚪) e o que divergiu do Injediesel — anotar no `CHECKLIST-AUDITORIA-SISTEMAS.md` (doc vivo).
