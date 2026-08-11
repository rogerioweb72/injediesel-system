# KICKOFF — Auditoria + Correções Promax Tuner (modo loop)

Cole isto no novo agente (VSCode/Claude Code) aberto no repositório do **Promax Tuner**.
Roda em loop, autônomo, até resolver tudo — deixando SÓ o crítico/irreversível/dado-manual
para o Rogério no FINAL.

> ⚠️ **Contexto:** o repo do Promax era idêntico ao Injediesel até ~25/06 ("Ativa consulta de
> placa") e **NÃO recebeu nenhum dos fixes posteriores** (convite, financeiro, RLS 075–101,
> Bug F/G/H, e-mail, etc.). Portanto **quase TODO o checklist aplica** — auditoria maior que a
> do EvoPro. Espere muito trabalho de código + uma lista longa de migrations pro Rogério.

---

Você é o agente de código do sistema **Promax Tuner**. Meta: **encontrar e CORRIGIR no Promax todo
problema que já foi resolvido e aprovado no Injediesel**, de forma autônoma, em loop, até acabar —
deixando **apenas** itens críticos/irreversíveis/de dado-manual para o Rogério **no final, juntos**.

## 1. LEIA PRIMEIRO (verdade estabelecida — não re-investigar do zero)
1. `/Users/rogeriolima/Documents/projetos lovable/HANDOFF-AUDITORIA-CLONES.md` — **checklist principal** (~55 itens P0/P1/P2, cada um com SQL/grep de verificação). É o seu roteiro.
2. `/Users/rogeriolima/Documents/projetos lovable/CHECKLIST-AUDITORIA-SISTEMAS.md` — playbook Fases 0→8 (o Promax é o alvo original deste doc — ver "Inteligência já coletada sobre o PROMAX").
3. `/Users/rogeriolima/Documents/projetos lovable/INJEDIESEL/DADOS/injediesel-system/INJEDIESEL-PROJECT-MEMORY.md` — §5 padrões, §8 migrations, regras de negócio.
4. O `CLAUDE.md` do repo do Promax — identidade.

## 2. IDENTIDADE PROMAX (nunca misturar com injediesel/evopro)
- Repo: `github.com/rogerioweb72/promax-tuner` — **local confirmado: `/Users/rogeriolima/Desktop/promax-tuner`** (branch `main`, remote conferido).
- Supabase produção: `myjrylmxzertrbwuosrv` — ⚠️ **confirmar na Fase 0.3** (a CLI "promax-vendas" já enxergou `jewabvdguhughyvfbxkx`). **O Promax NÃO tem `supabase/.temp/project-ref`** → a fonte de verdade aqui é SÓ o Network do site em produção (filtrar `supabase.co`) ou o GitHub Secret `VITE_SUPABASE_URL`. **Nunca** o `.env.local`.
- Cloudflare/R2: worker `promax-tuner-r2-prod.promaxtunermatriz.workers.dev`; buckets `promax-ecu-originals`, `promax-ecu-delivered`, `promax-firmware`, `promax-support-attachments` (conta a confirmar com `wrangler whoami`).
- **Diferencial próprio:** desconto de franquia — **confirmar como funciona, NÃO remover**.
- **Marca É do Promax:** tokens `--pm-*`, vermelho `#E72B2B`, prefixo de protocolo `PT-` são NATIVOS do Promax — **não tratar como resíduo, não trocar**.
- **NÃO portar** a fila de aprovação de edição de valor (exclusiva do Injediesel — migrations 073/078 + UI da fila; se o clone trouxe, avaliar remoção/desativação).
- **Dados únicos** (domínio, e-mail, contatos, WhatsApp, PIX, refs, keys) — nunca copiar do Injediesel; usar os do Promax. Substituir, não herdar.

## 3. ⚠️ RISCO ESPECÍFICO DO PROMAX — vazamento de catálogo de marca
Migrations `014_products_catalog` e `032_product_images` **contêm o catálogo da INJEDIESEL**
(≈539 produtos, bonés/adesivos Injediesel da Tray). **Se rodaram no banco de produção do Promax,
há produto da outra marca à venda.** Verificar CEDO (Fase 5):
```sql
SELECT count(*) FROM products;                      -- volume esperado?
SELECT sku, name FROM products ORDER BY created_at LIMIT 30;  -- marca correta?
```
Se contaminado → é **decisão do Rogério** (não apagar silencioso); documentar na entrega.

## 4. MÉTODO (inegociável)
- Você escreve código e **commita SEM push**.
- Você **NUNCA**: toca o banco (`supabase link`/`db push`/`db reset` proibidos), seta secret, deploya function, mexe em R2/wrangler, nem dá `git push`. **Tudo isso é do Rogério.**
- Migration/SQL: escreve como **arquivo no repo** + adiciona à lista de pendências. Não aplica.
- `.env.local` mente. Fonte de verdade = `supabase/.temp/project-ref` + GitHub Secrets. Confirmar que o cliente aponta pro banco/R2 do Promax antes de operar dados.
- Trocar de conta antes de qualquer CLI: `supabase logout && supabase login`; `wrangler whoami` (a máquina acumula sessões de várias contas).

## 5. LOOP (repetir até esgotar o checklist)
Para cada item do HANDOFF §5, na ordem do §6:
1. **Verificar** se existe no Promax (grep/read; pra RLS/DB, escrever a query de verificação pro Rogério rodar — não rode você).
2. Se é correção de **CÓDIGO** (front/edge/worker) e não-irreversível → **aplicar o fix**, validar com `npm run build` / `tsc --noEmit`, **commit sem push**.
3. Se precisa **banco / secret / deploy / R2 / decisão de produto / dado manual** → **não executar**; escrever o artefato (migration `.sql`, nota) e jogar na **"PENDÊNCIAS DO ROGÉRIO"**.
4. Marcar o item: ✅ corrigido · ⏳ pendente-Rogério · ⚪ não se aplica.
5. Não pedir confirmação item a item. Só parar quando o checklist acabar.

**Ordem:** Fase 0 (identidade — confirmar o Supabase de produção + corrigir `.env` cross-tenant **PRIMEIRO**) → **P0 segurança** (top 5: `ecu-jobs-rls-unit`, `support-msg-rls-gap`, `report-rpc-noop-tenant`, `caixa-clientside-money`, `env-cross-tenant`) → **cherry-picks obrigatórios herdados** (migrations 081/082/083/084/085 + fixes das functions de convite — o Promax não tem NENHUM) → convite/auth/e-mail → fluxo ECU → financeiro (080/089/098 sincronizar policies) → higiene (resíduo de marca INJEDIESEL dentro do Promax) → correções 11/08.

## 6. ENTREGA (no FINAL, tudo junto)
Um único bloco **"PENDÊNCIAS DO ROGÉRIO"**, em ordem de execução:
1. **Migrations `.sql`** a aplicar (na ordem certa, cada uma com o SQL de verificação). Provavelmente MUITAS (o Promax está atrás desde 25/06).
2. **Secrets** a setar / **functions** a deployar (o `deploy.yml` não deploya functions — todas na mão) / **wrangler** deploy do worker R2.
3. **R2** (buckets, deletes).
4. **Decisões de produto / dados manuais** (catálogo contaminado, marca, domínio, WhatsApp, PIX, remetente Resend, desconto de franquia).
5. **Aprovação de push** — listar os commits locais criados.

Também: resumo final ✅/⏳/⚪ e o que divergiu do Injediesel — anotar no `CHECKLIST-AUDITORIA-SISTEMAS.md` (doc vivo).
