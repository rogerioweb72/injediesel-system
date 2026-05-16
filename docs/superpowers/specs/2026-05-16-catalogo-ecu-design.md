# Spec: Módulo Catálogo ECU — Gerenciamento e Consulta de Arquivos de Remap

**Data**: 2026-05-16  
**Status**: Aprovado — pronto para implementação  
**Abordagem escolhida**: A (Supabase como fonte de verdade, import script de xlsx)

---

## Visão Geral

Módulo completo de gerenciamento e consulta de arquivos de ECU/remap que conecta:

1. **Backoffice Matriz** (`/matriz/tabela-remap`) — painel mestre com edição, toggles, bulk pricing
2. **Vista Franqueado** (`/franqueado/tabela-remap`) — lista densa read-only, preço de custo
3. **Catálogo Cliente** (`/veiculos/:slug`) — catálogo público com painel de ganhos e WhatsApp
4. **Loja Virtual** (`public/loja-virtual.html`) — e-commerce estático via Edge Function pública

**Fonte de dados**: 6 arquivos `.xlsx` em `../categorias_site_veiculos_xlsx/` importados via script one-time para Supabase. Após import, Supabase é fonte de verdade — xlsx não são mais lidos em runtime.

---

## Arquitetura de Dados

### Fluxo

```
scripts/import-catalog.ts
  └─► xlsx parse (sheet "Dados") → upsert Supabase ecu_catalog
        │
        ├─► /matriz/tabela-remap          (matriz role — todas as rows)
        ├─► /franqueado/tabela-remap      (franqueado role — ativo=true)
        ├─► /veiculos/:slug               (público — ativo=true AND ativo_ecommerce=true)
        └─► loja-virtual.html             (Edge Function pública — mesmos filtros)
```

### Mapeamento xlsx → categoria_slug

| Arquivo | Categoria | categoria_slug |
|---|---|---|
| `categoria_carros_e_suvs.xlsx` | Carros & SUVs | `carros-e-suvs` |
| `categoria_pickups.xlsx` | Pickups | `pickups` |
| `categoria_trucks.xlsx` | Trucks | `trucks` |
| `categoria_agricola_com_marcas.xlsx` | Agrícola | `agricola` |
| `categoria_maquinas.xlsx` | Máquinas | `maquinas` |
| `categoria_motos.xlsx` | Motos | `motos` |

### Schema Supabase: `ecu_catalog`

```sql
CREATE TABLE ecu_catalog (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  categoria           text NOT NULL,
  categoria_slug      text NOT NULL,
  arquivo_origem      text,
  secao_original      text,           -- modelo/seção (ex: "A1", "A3")
  marca               text,
  tipo_registro       text,           -- 'Dados' | 'Serviço/Adicional' | 'Observação'
  modelo_descricao    text,           -- "1.4 TFSI - 122CV"
  ano                 text,
  ganho               text,           -- "ATÉ +30CV E 4,2KG"
  cv_original         integer,        -- parsed de modelo_descricao
  cv_tuned            integer,        -- cv_original + gain parsed de ganho
  kgfm_original       numeric(6,2),   -- parsed de ganho quando presente
  kgfm_tuned          numeric(6,2),
  aparelho            text,
  protocolo           text,
  cabo                text,
  preco_franqueado    numeric(10,2),  -- do xlsx "Valor a vista"
  preco_cliente_final numeric(10,2),  -- NULL inicialmente
  observacoes         text,
  ativo               boolean NOT NULL DEFAULT true,
  ativo_ecommerce     boolean NOT NULL DEFAULT true,
  created_at          timestamptz DEFAULT now(),
  updated_at          timestamptz DEFAULT now()
);

CREATE INDEX idx_ecu_catalog_slug  ON ecu_catalog(categoria_slug);
CREATE INDEX idx_ecu_catalog_marca ON ecu_catalog(marca);
CREATE INDEX idx_ecu_catalog_ativo ON ecu_catalog(ativo, ativo_ecommerce);
```

### RLS por Role

| Role | Filtro | Campos visíveis |
|---|---|---|
| `matriz` | todas as rows | todos |
| `franqueado` | `ativo = true` | sem `preco_cliente_final` |
| público | `ativo = true AND ativo_ecommerce = true` | sem `preco_franqueado`, sem campos internos |

**Implementação de column-level security**: RLS do Postgres não suporta restrição por coluna nativamente. Solução: criar duas Supabase Views com `security_definer`:
- `ecu_catalog_franqueado` — exclui `preco_cliente_final`, `arquivo_origem`, `cabo`
- `ecu_catalog_public` — exclui `preco_franqueado` e campos internos

Hooks do franqueado e Edge Function pública consultam as views, não a tabela direta.

### Regra "CONSULTAR"

Em qualquer interface, quando `preco_franqueado` ou `preco_cliente_final` for `NULL`, `0` ou `0.00`:
- Renderizar o texto **"CONSULTAR"** em `hsl(var(--pm-amber-400))` no lugar do valor monetário
- Nunca renderizar "R$ 0,00"

---

## Script de Import

**Localização**: `scripts/import-catalog.ts`  
**Runtime**: `npx tsx scripts/import-catalog.ts`  
**Dependências**: `xlsx` (npm), Supabase service role key via `.env`

### Lógica

1. Lê os 6 arquivos `.xlsx` da pasta `../../categorias_site_veiculos_xlsx/`
2. Para cada arquivo, abre sheet `Dados` (ignora sheet `Resumo`)
3. Pula rows com `tipo_registro = 'Observação'` — não são compatibilidades de veículo
4. Mantém `'Dados'` e `'Serviço/Adicional'`
5. Para cada row, tenta parse de CV e KGFM:

```ts
// CV original — extrai número antes de "CV" em modelo_descricao
const cvOrigMatch = modeloDescricao?.match(/(\d+(?:\.\d+)?)\s*CV/i)
const cvOriginal = cvOrigMatch ? parseInt(cvOrigMatch[1]) : null

// CV gain — extrai número após "+" antes de "CV" em ganho
const cvGainMatch = ganho?.match(/\+(\d+(?:\.\d+)?)\s*CV/i)
const cvGain = cvGainMatch ? parseInt(cvGainMatch[1]) : null
const cvTuned = cvOriginal && cvGain ? cvOriginal + cvGain : null

// KGFM — o xlsx contém apenas o delta ("+4,2KG"), nunca o valor original
// kgfm_original = NULL em todos os registros da carga inicial
// kgfm_tuned = NULL igualmente (sem base para calcular)
// Ambos os campos existem para preenchimento manual via backoffice no futuro
const kgfmGainMatch = ganho?.match(/\+(\d+[,.]?\d*)\s*KG/i)
// Guardado em ganho (text) para exibição raw no fallback
```

6. `preco_franqueado` = valor do campo `Valor a vista` (strip "R$", parse float)
7. `preco_cliente_final` = `NULL` (não existe no xlsx)
8. Upsert idempotente: sem chave natural confiável nos xlsx → `INSERT ... ON CONFLICT DO NOTHING` na primeira carga; reimports completos usam truncate + insert (com flag `--reset`)

### Comando

```bash
# Primeira carga
npx tsx scripts/import-catalog.ts

# Reimport completo (apaga tudo e reimporta)
npx tsx scripts/import-catalog.ts --reset
```

---

## Módulo 1 — Backoffice `/matriz/tabela-remap`

### Rota e Navegação

- Rota: `/matriz/tabela-remap` no router existente, dentro de `ProtectedLayout`
- Sidebar: link "Tabela Remap" próximo a "Arquivos ECU", visível apenas para role `matriz`

### Layout — 3 Zonas

#### Zona 1: Bulk Actions

```
Aplicar fórmula em: [FRANQUEADO ▾]  Categoria: [Todas ▾]
[ + Acréscimo %: ______ ]   [ - Desconto %: ______ ]   [APLICAR]
```

- Target: dropdown `preco_franqueado` | `preco_cliente_final`
- Categoria: "Todas as Categorias" ou categoria específica
- Ao clicar APLICAR: modal de confirmação mostrando contagem exata de registros afetados
- Fórmula: `novo_valor = ROUND(valor_atual * (1 ± pct/100), 2)`
- Registros com valor `NULL` ou `0` são ignorados (não recebem a fórmula)
- Nenhum cálculo de desconto/comissão no frontend — só valor bruto persistido

#### Zona 2: Filtros

```
[Categoria ▾]  [Marca ▾]  [Modelo 🔍__________]  [Ano 🔍_______]
[● Todos] [● Apenas Ativos] [● Desativados]        [+ Novo Registro]
```

- Filtros aplicados server-side via Supabase `.filter()`
- Campo texto: debounce 150ms
- Paginação cursor-based, 50 rows por página

#### Zona 3: Accordion

- **Nível 1**: Marca — colapsado por padrão, badge com contagem de registros
- **Nível 2**: `secao_original` (modelo) — expande com `transition: max-height 0.3s cubic-bezier(0.4,0,0.2,1)`
- **Nível 2 expandido**: cards sequenciais por motorização × aparelho

**Card de registro expandido:**

| Campo | Comportamento |
|---|---|
| `preco_franqueado` | Input numérico inline, salva debounce 800ms + ícone status |
| `preco_cliente_final` | Input numérico inline, mesmo comportamento |
| `ativo` | Switch — OFF → opacity 0.4 + badge "INATIVO", some das outras interfaces via RLS |
| `ativo_ecommerce` | Switch independente — OFF → some só da loja pública |
| Excluir | Botão → modal com confirmação digitada |

**Badge de tipo_registro:**
- `Dados`: azul sutil `pm-blue-500/20`
- `Serviço/Adicional`: âmbar `pm-amber-500/20`
- `Observação`: cinza `pm-gray-500/20`

### Modal de Exclusão (Trava de Segurança)

```
"Para confirmar a exclusão permanente, digite EXCLUIR:"
[ input texto ]
[CANCELAR]  [EXCLUIR — desabilitado]
```

- Botão confirmar habilita SOMENTE quando `input.value === 'EXCLUIR'` (case-sensitive, sem trim)
- Após delete: invalida query cache TanStack, remove row da UI sem reload de página

### Tokens Visuais

| Elemento | Token |
|---|---|
| Background accordion marca | `hsl(var(--pm-gray-900))` |
| Hover row | `hsl(var(--pm-gray-800))` |
| Border ao expandir | `1px solid hsl(var(--pm-red-500) / 0.3)` |
| Label de campo | `var(--pm-font-mono)` 10px uppercase tracking-widest |
| Valor de campo | `var(--pm-font-body)` 13px |

---

## Módulo 2 — Vista Franqueado `/franqueado/tabela-remap`

### Princípio

Read-only, sem imagens, sem bulk actions. Mostra `preco_franqueado` (custo do arquivo para a franquia). RLS filtra `ativo = true` automaticamente.

### Layout

Lista densa agrupada por Categoria → Marca → Modelo → Motorizações.

```
CARROS & SUVs
─────────────────────────────────────────────────────

AUDI
  A1
    1.4 TFSI 122CV  ·  2010–2019  ·  KESS / FAM 477      R$ 1.600,00
    1.4 TFSI 122CV  ·  2010–2019  ·  GENIUS / FLASH 482   R$ 1.600,00
    ↳ Pop & Bang                                           R$   900,00
    ↳ Pedal Booster                                       R$ 1.300,00
```

### Especificações Visuais

| Elemento | Estilo |
|---|---|
| Background | `hsl(var(--pm-gray-950))` |
| Separador de marca | `1px rgba(255,255,255,0.06)`, nome monospace 10px uppercase |
| Row motorização | 13px, `text-muted-foreground` |
| `Serviço/Adicional` | Recuado com `↳`, 12px, itálico sutil |
| Preço alinhado à direita | `var(--pm-font-mono)`, branco |
| "CONSULTAR" | `hsl(var(--pm-amber-400))`, mesma largura/posição |

### Campos Ocultos na Vista Franqueado

- `preco_cliente_final` — preço de venda ao público
- `arquivo_origem`, `cabo`, `observacoes` — campos internos operacionais

### Acesso

- Guard: `role === 'franqueado' || role === 'matriz'`
- Matriz pode acessar para verificar como franqueado vê

### Performance

- Carrega categoria inteira (máx ~1.500 rows)
- `staleTime: 5min` no TanStack Query
- Virtualização com `@tanstack/react-virtual` se > 500 rows visíveis

---

## Módulo 3 — Catálogo Cliente `/veiculos/:slug`

### Integração

Nova seção abaixo dos KPIs existentes em `VehicleDetailPage.tsx`. Slug da rota mapeia para `categoria_slug`. Query filtra `ativo=true AND ativo_ecommerce=true`.

### Título Dinâmico

```
Reprogramação Eletrônica "CARROS & SUVs"
[lista de modelos compatíveis com remap]
```

### Hierarquia de Expansão (3 Níveis)

1. **Marca** (sempre visível, separador com logo)
2. **Modelo** (`secao_original`) — clique expande lista de motorizações `[+]`/`[−]`
3. **Motorização** (`modelo_descricao + ano`) — clique abre painel de ganhos

### Separador de Marca

```css
.brand-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 2.5rem 0 1rem;
}
.brand-header::after {
  content: '';
  flex: 1;
  height: 1px;
  background: rgba(255,255,255,0.08);
}
```

Logo: mapeamento estático em `src/data/brand-logos.ts` (`Record<string, string>` com URLs SVG Wikimedia Commons). Fallback: inicial da marca em `var(--pm-font-display)` red 20px. Tamanho: 20×20px, `filter: brightness(0) invert(1)`.

### Painel de Ganhos

Container: `background: hsl(var(--pm-gray-900))`, `border: 1px solid hsl(var(--pm-red-500) / 0.2)`, `border-radius: 12px`, `padding: 24px`.

**Grid 2 colunas** (POTÊNCIA | TORQUE), separador `1px rgba(255,255,255,0.08)`:

| Elemento | Estilo |
|---|---|
| Label "ORIGINAL" / "REPROGRAMADO" | monospace 10px uppercase `text-muted-foreground` |
| Valor original | 32px bold branco |
| Valor reprogramado | 32px bold `hsl(var(--pm-red-500))` + `●` com keyframe pulse opacity 1→0.5 loop 2s |

**Fallback** (parse falhou — `cv_original null`): campo `ganho` raw centralizado em vermelho, sem grid de 2 colunas.

**Serviços/Adicionais**: chips clicáveis abaixo do painel principal. Expande descrição + `preco_cliente_final` ou "CONSULTAR".

### Botão WhatsApp

```ts
const msg = encodeURIComponent(
  `Olá, gostaria de saber mais sobre o remap de ${categoria}. ` +
  `Veículo: ${marca} ${secao} – ${modeloDescricao} (${ano})`
)
window.open(`https://wa.me/${import.meta.env.VITE_WHATSAPP_NUMBER}?text=${msg}`, '_blank')
```

---

## Módulo 4 — Loja Virtual `public/loja-virtual.html`

### Arquitetura de Dados

HTML estático sem SDK Supabase. Consume Edge Function pública:

```
loja-virtual.html
  └─► fetch('/api/ecu-catalog?categoria=carros-e-suvs')
        └─► supabase/functions/ecu-catalog-public/index.ts
              └─► SELECT (campos públicos) WHERE ativo=true AND ativo_ecommerce=true
```

Cache header na Edge Function: `Cache-Control: public, max-age=300` (5min).

### Edge Function

**Localização**: `supabase/functions/ecu-catalog-public/index.ts`  
**CORS**: aberto (`*`) — endpoint público de leitura

**Campos retornados** (sem `preco_franqueado`, sem campos internos):
```
id, categoria_slug, marca, secao_original, modelo_descricao,
ano, ganho, cv_original, cv_tuned, kgfm_original, kgfm_tuned,
preco_cliente_final
```

### Estrutura de Abas

```
[ PRODUTOS ]    [ REMAP ]
```

- Troca de aba: `display:none/block`, sem JS framework
- Aba ativa: `border-bottom: 2px solid var(--red)` + cor branca

### Sub-navegação de Categorias (Aba REMAP)

```
[ CARROS & SUVs ]  [ PICKUPS ]  [ TRUCKS ]  [ AGRÍCOLA ]  [ MÁQUINAS ]  [ MOTOS ]
```

Cada categoria carregada sob demanda via `fetch`, cached em objeto JS local. Motos exibe mensagem "Em breve" se categoria vazia.

### Cards de Modelo

```
background: linear-gradient(145deg, #1a1a1c, #0f0f11)
border: 1px solid rgba(255,255,255,0.06)
border-radius: 12px
```

**Hover**:
```css
border-color: rgba(220,38,38,0.4);
box-shadow: 0 8px 32px rgba(220,38,38,0.12);
transform: translateY(-2px);
transition: all 0.3s cubic-bezier(0.4,0,0.2,1);
```

**Anatomia do card**:
- Header: foto da categoria como background, `height: 140px`, overlay `linear-gradient(to bottom, transparent 40%, #1a1a1c)`
- Título: modelo `font-display` bold 15px
- Chips de ganho: `background: rgba(220,38,38,0.15)`, `border: 1px solid rgba(220,38,38,0.3)`, texto `#ef4444` bold monospace — ex: `+35 CV`, `+6 KGFM`
- Preço: 22px bold branco — ou "CONSULTAR" em `#f59e0b` âmbar
- Botão: `background: #dc2626`, branco uppercase, full-width, `border-radius: 4px`

**Mapeamento de fotos por categoria**:
```js
const CATEGORY_IMAGES = {
  'carros-e-suvs': '/images/cat-carros.jpg',
  'pickups':       '/images/cat-pickups.jpg',
  'trucks':        '/images/cat-trucks.jpg',
  'agricola':      '/images/cat-agricola.jpg',
  'maquinas':      '/images/cat-maquinas.jpg',
  'motos':         '/images/cat-motos.jpg',
}
```

Imagens já existem em `src/assets/` — script de build (ou `vite.config.ts` `publicDir`) copia para `public/images/`.

---

## Componentes e Hooks

### Novos Arquivos React

```
src/
├── data/
│   └── brand-logos.ts          # Record<string, string> URLs SVG logos
├── hooks/
│   └── useEcuCatalog.ts        # queries + mutations (lista, marcas, bulk, update, delete)
├── components/catalogo/
│   ├── CatalogoFiltros.tsx     # barra filtros compartilhada
│   ├── MarcaAccordion.tsx      # nível 1 backoffice
│   ├── ModeloAccordion.tsx     # nível 2 backoffice
│   ├── MotorizacaoCard.tsx     # ficha completa backoffice
│   ├── BulkActionsPanel.tsx    # zona 1 backoffice
│   ├── DeleteConfirmModal.tsx  # modal com trava "EXCLUIR"
│   ├── MarcaSection.tsx        # separador cliente (logo + linha)
│   ├── ModeloRow.tsx           # expansível nível 1 cliente
│   ├── MotorizacaoRow.tsx      # nível 2 cliente
│   └── GainsPanel.tsx          # painel potência/torque + WhatsApp
└── pages/app/
    ├── tabela-remap/
    │   └── TabelaRemapPage.tsx  # backoffice
    └── franqueados/
        └── FranqueadoCatalogPage.tsx
```

### Hook `useEcuCatalog`

```ts
// Queries
useEcuCatalogList(filters: CatalogFilters)      // lista paginada
useEcuCatalogBrands(categoriaSlug: string)      // marcas distintas para select

// Mutations
useUpdateEcuRecord()    // PATCH inline (preço, ativo, ativo_ecommerce)
useDeleteEcuRecord()    // DELETE por id
useBulkUpdatePrice()    // UPDATE em massa (target, categoria, pct)
```

---

## Novos Arquivos Não-React

```
scripts/
└── import-catalog.ts           # xlsx → Supabase (one-time import)

supabase/
├── migrations/
│   └── YYYYMMDD_create_ecu_catalog.sql
└── functions/
    └── ecu-catalog-public/
        └── index.ts            # Edge Function pública
```

---

## Regras de Negócio Críticas

1. **Nenhum cálculo de preço/desconto no frontend** — fórmula de bulk aplica e persiste valor bruto; frontend só exibe
2. **"CONSULTAR"** quando `preco_*` é `NULL`, `0` ou `0.00` — nunca "R$ 0,00"
3. **`ativo = false`** remove das 4 interfaces simultaneamente via RLS
4. **`ativo_ecommerce = false`** mantém visível para franqueado/matriz, oculta só da loja pública
5. **Delete irreversível** — exige digitação exata de `"EXCLUIR"` (case-sensitive, sem trim)
6. **Bulk price** ignora registros com valor `NULL`/`0` — não cria preços negativos
7. **Import idempotente** — flag `--reset` para reimport completo (truncate + insert)
8. **Edge Function** não expõe `preco_franqueado` nem campos internos operacionais
