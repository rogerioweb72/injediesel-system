# Handoff — Módulo Catálogo ECU (2026-05-16)

## O que foi construído

Módulo completo de **Gerenciamento e Consulta de Arquivos de ECU** — 5 interfaces integradas ao Promax Tuner.

---

## Interfaces entregues

### 1. Backoffice Matriz — `/matriz/tabela-remap`
Arquivo: `src/pages/app/tabela-remap/TabelaRemapPage.tsx`

- Accordion 3 níveis: Marca → Modelo/Seção → Motorização
- Filtros: categoria, marca, modelo, ano, status ativo/inativo
- Edição inline de `preco_franqueado` e `preco_cliente_final` (debounce 800ms)
- Regra "CONSULTAR": valor null/0 exibe badge âmbar, nunca "R$ 0,00"
- Toggle `ativo` (remove de todas as views) e `ativo_ecommerce` (oculta só do público)
- Delete com trava: usuário digita `"EXCLUIR"` (case-sensitive, sem trim) para habilitar
- Bulk Actions: alvo (franqueado/cliente_final) + categoria + % acréscimo ou desconto

### 2. Vista Franqueado — `/franqueado/tabela-remap`
Arquivo: `src/pages/app/franqueados/FranqueadoCatalogPage.tsx`

- Lista densa com virtual scroll (`@tanstack/react-virtual`)
- Read-only — franqueado não edita preços
- Mostra `preco_franqueado`, oculta `preco_cliente_final` (via view RLS `ecu_catalog_franqueado`)
- "CONSULTAR" em âmbar quando preço é null/0

### 3. Catálogo Cliente Público — `/veiculos/:slug`
Arquivos: `src/pages/VehicleDetailPage.tsx` + `src/components/catalogo/Catalogo*.tsx`

- Accordion 2 níveis: Marca (logo Wikimedia + linha separadora) → Motorização
- Painel de ganhos por motorização: CV Original vs CV Reprogramado (dot vermelho pulsante)
- Torque quando disponível; fallback para texto raw de ganho
- Botão WhatsApp monta mensagem com dados do veículo (`VITE_WHATSAPP_NUMBER`)
- Slug mapping: `carros → carros-e-suvs`, `pickups → pickups`, etc.
- `CONSULTAR` em âmbar quando `preco_cliente_final` é null/0

### 4. Loja Virtual Estática — `public/loja-virtual.html`
- Macro-abas **PRODUTOS** / **REMAP** acima da navegação existente
- Aba REMAP: sub-navegação por categoria + cards dinâmicos via fetch da Edge Function
- Cards: imagem de categoria, chips de ganho (+CV / +KGFM), preço ou "CONSULTAR", botão WhatsApp
- Cache em memória por sessão (sem refetch ao trocar categoria)

---

## Arquitetura de dados

### Tabela principal
```sql
ecu_catalog (supabase/migrations/016_ecu_catalog.sql)
```
24 colunas — campos chave: `categoria_slug`, `marca`, `secao_original`, `modelo_descricao`, `ano`, `ganho`, `cv_original`, `cv_tuned`, `preco_franqueado`, `preco_cliente_final`, `ativo`, `ativo_ecommerce`.

### Views com isolamento por role
- `ecu_catalog_franqueado` — oculta `preco_cliente_final`
- `ecu_catalog_public` — oculta `preco_franqueado`, filtra `ativo=true AND ativo_ecommerce=true`

### RLS
- `company_admin` / `operations_admin` → tabela completa
- `franchise_manager` / `unit_operator` → view `ecu_catalog_franqueado` (só registros ativos)
- Público → view `ecu_catalog_public` via Edge Function (sem auth)

---

## Arquivos criados (branch `feat/catalogo-ecu`)

```
supabase/
  migrations/016_ecu_catalog.sql          tabela + views + RLS
  functions/ecu-catalog-public/index.ts   Edge Function Deno pública

scripts/
  parse-catalog.ts                        parser xlsx → tipos (testável)
  import-catalog.ts                       seed script (--reset flag)

src/
  types/ecu-catalog.ts                    EcuCatalogRow, EcuMarca, EcuModelo, etc.
  data/brand-logos.ts                     16 logos Wikimedia Commons
  hooks/useEcuCatalog.ts                  7 hooks TanStack Query + mock data
  components/catalogo/
    CatalogoFiltros.tsx                   barra de filtros compartilhada
    DeleteConfirmModal.tsx                modal trava "EXCLUIR"
    BulkActionsPanel.tsx                  bulk price update
    MotorizacaoCard.tsx                   ficha backoffice com edição inline
    ModeloAccordion.tsx                   accordion nível 2 backoffice
    MarcaAccordion.tsx                    accordion nível 1 backoffice
    GainsPanel.tsx                        painel CV original vs reprogramado
    MotorizacaoRow.tsx                    expansível nível 2 cliente
    ModeloRow.tsx                         expansível nível 1 cliente
    MarcaSection.tsx                      separador marca com logo
    CatalogoCliente.tsx                   wrapper catálogo público
  pages/
    VehicleDetailPage.tsx                 página pública por categoria
    app/tabela-remap/TabelaRemapPage.tsx  backoffice matriz
    app/franqueados/FranqueadoCatalogPage.tsx  vista franqueado
```

---

## Script de importação dos xlsx

```bash
# Importar dados dos 6 xlsx para Supabase (primeira vez)
SUPABASE_URL=https://xxx.supabase.co \
SUPABASE_SERVICE_ROLE_KEY=xxx \
npm run catalog:import

# Reimportar do zero (apaga tudo e reimporta)
npm run catalog:reset
```

Os xlsx devem estar em `../../../categorias_site_veiculos_xlsx/` (3 níveis acima de `scripts/`).

---

## Regras de negócio críticas

| Regra | Implementação |
|-------|---------------|
| "CONSULTAR" em vez de R$ 0,00 | `preco === null \|\| preco === 0` → exibe badge âmbar |
| Nunca calcular preço no frontend | Só exibe valores persistidos no banco |
| Delete seguro | Modal exige digitação exata de `"EXCLUIR"` (sem `trim()`) |
| Bulk price | Fórmula: `valor * (1 + pct/100)`, arredonda 2 casas, pula null/0 |
| Isolamento franqueado | View `ecu_catalog_franqueado` nunca expõe `preco_cliente_final` |
| Cache loja virtual | `remapCache[slug]` em memória — fetch só na primeira visita da sessão |

---

## Pendências para produção

| Item | Motivo pendente | O que fazer |
|------|-----------------|-------------|
| Migration 016 não aplicada | Docker não disponível localmente | `supabase db reset` quando Docker disponível, ou rodar SQL diretamente no Supabase Dashboard |
| Edge Function não deployada | Requer `supabase functions deploy ecu-catalog-public` | Fazer após migration aplicada |
| Importação dos xlsx | Depende de credenciais reais + migration aplicada | Rodar `npm run catalog:import` com vars reais |
| Merge da worktree | Branch `feat/catalogo-ecu` não mergeada em `main` | `git merge feat/catalogo-ecu` quando pronto |
| `preco_cliente_final` todos null | Importação não preenche esse campo (vem do xlsx zerado) | Preencher manualmente via backoffice ou bulk update |
| Imagens de categoria na loja | `/images/cat-carros.jpg` etc. não existem no `public/` | Copiar assets de `src/assets/` para `public/images/` |

---

## Mock mode (desenvolvimento sem Supabase)

O hook `src/hooks/useEcuCatalog.ts` detecta `VITE_MOCK=true` e retorna 14 registros fake cobrindo:
- Carros & SUVs: VW Golf, Polo, Tiguan / BMW 320i, 330i / Audi A3 / Honda Civic / Hyundai Creta
- Pickups: VW Amarok / Toyota Hilux / Ford Ranger / Chevrolet S10
- Motos: Honda CB 650R / Kawasaki Z900

```bash
# Rodar com mock
VITE_MOCK=true npm run dev
```

---

## Design aprovado

**Referência visual canônica:** `src/pages/LandingV2.tsx` (rota `/v2`)  
**Landing.tsx** (rota `/`) — descartada, não usar como referência.

Tokens obrigatórios:
- Fundo: `#141416` = `hsl(var(--pm-gray-950))`
- Vermelho: `hsl(var(--pm-red-500))` = `#E72B2B`
- Display: Barlow Condensed (bold, uppercase)
- Body: DM Sans
- Mono: JetBrains Mono

---

## Worktree

Todo o código do módulo foi desenvolvido em isolamento:

```
Branch: feat/catalogo-ecu
Worktree: .worktrees/feat/catalogo-ecu/
```

Para continuar o desenvolvimento nessa branch:

```bash
cd "/Volumes/Web72-HD/projetos lovable/promax tuner/promax-tuner/.worktrees/feat/catalogo-ecu"
npm run dev
```
