# Injediesel System

Plataforma multi-tenant (matriz + franquias) para performance automotiva, remapeamento e ECU.
Front React 19 + Vite + TypeScript + Tailwind/shadcn; backend Supabase (Postgres + Auth + Edge
Functions) e Cloudflare R2 para arquivos ECU/firmware. Produção: **https://inje.tech/appinjediesel**.

> ⚠️ **Sistema independente.** Injediesel, Promax Tuner e EvoPro são clones da mesma base, mas cada
> um tem **repositório, banco Supabase e R2 PRÓPRIOS**. Nenhum toca nos dados do outro — jamais.
> Identidade completa (refs, buckets, `.env.local` mentiroso) em **[`CLAUDE.md`](./CLAUDE.md)**.

## Comandos

```bash
npm run dev       # dev server (Vite)
npm run build     # tsc -b && vite build
npm run lint      # ESLint
npm run test      # Vitest (unit)
npx playwright test  # E2E
./scripts/full-audit.sh   # auditoria completa (lint + tsc + build + npm audit) — ver AUDIT_GUIDE.md
```

## Documentação

| Doc | O que é |
|-----|---------|
| [`CLAUDE.md`](./CLAUDE.md) | Guia do sistema: identidade, stack, RBAC, RLS, anti-patterns, convenções. **Ler antes de operar dados.** |
| [`INJEDIESEL-PROJECT-MEMORY.md`](./INJEDIESEL-PROJECT-MEMORY.md) | Memória durável: sprints, migrations, padrões portáveis, regras de negócio. |
| [`AUDIT_GUIDE.md`](./AUDIT_GUIDE.md) | Como rodar a auditoria de build/lint reutilizável. |
| [`docs/audit/`](./docs/audit/) | Playbook de auditoria de clones + handoff de replicação para Promax/EvoPro. |
| [`docs/superpowers/`](./docs/superpowers/) | Planos e specs feature-a-feature (histórico de decisões). |

## Método (inegociável)

- Agente escreve código e commita **sem push**; Rogério faz todo passo irreversível (push, SQL,
  secrets, deploy de functions, deletes R2). O agente **nunca** toca o banco (`supabase link`/`db push`/`db reset` proibidos).
- Migrations: arquivo no repo → Rogério aplica via SQL Editor → testa → push.
- `.env.local` **mente** — produção usa GitHub Secrets. Banco de produção = `ttnmvheptxedwninjedv`.
