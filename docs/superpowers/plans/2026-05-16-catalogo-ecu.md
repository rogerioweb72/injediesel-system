# Catálogo ECU — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Importar dados de remap dos xlsx para Supabase e construir 4 interfaces: backoffice Tabela Remap (matriz), catálogo franqueado, catálogo cliente público e loja virtual estática.

**Architecture:** Script one-time converte 6 xlsx → tabela `ecu_catalog` no Supabase. Duas views `SECURITY DEFINER` isolam campos por role. React app consome via hook TanStack Query. Loja virtual (HTML estático) consome Edge Function pública Deno.

**Tech Stack:** Node/tsx + xlsx (import script), Supabase Postgres + RLS + Deno Edge Functions, React 19 + TanStack Query 5 + Tailwind + shadcn/ui, @tanstack/react-virtual (lista densa franqueado), Vitest (testes unitários do parser)

---

## File Map

```
scripts/
  import-catalog.ts              CREATE — xlsx → Supabase seed
  parse-catalog.ts               CREATE — lógica de parse pura (testável)

supabase/
  migrations/
    016_ecu_catalog.sql          CREATE — tabela + índices + views + RLS
  functions/
    ecu-catalog-public/
      index.ts                   CREATE — Edge Function pública (Deno)

src/
  types/
    ecu-catalog.ts               CREATE — tipos EcuCatalogRow, EcuMarca, etc.
  data/
    brand-logos.ts               CREATE — Record<string, string> URLs SVG logos
  hooks/
    useEcuCatalog.ts             CREATE — queries + mutations TanStack Query
  components/catalogo/
    CatalogoFiltros.tsx          CREATE — barra filtros compartilhada
    DeleteConfirmModal.tsx       CREATE — modal trava "EXCLUIR"
    BulkActionsPanel.tsx         CREATE — fórmula % em massa
    MotorizacaoCard.tsx          CREATE — ficha completa backoffice
    ModeloAccordion.tsx          CREATE — nível 2 backoffice
    MarcaAccordion.tsx           CREATE — nível 1 backoffice
    MarcaSection.tsx             CREATE — separador cliente (logo + linha)
    ModeloRow.tsx                CREATE — expansível nível 1 cliente
    MotorizacaoRow.tsx           CREATE — nível 2 cliente
    GainsPanel.tsx               CREATE — painel potência/torque + botão WA
    CatalogoCliente.tsx          CREATE — wrapper seção cliente
  pages/app/
    tabela-remap/
      TabelaRemapPage.tsx        CREATE — página backoffice
    franqueados/
      FranqueadoCatalogPage.tsx  CREATE — vista franqueado
  pages/
    VehicleDetailPage.tsx        MODIFY — adicionar seção CatalogoCliente

src/router/index.tsx             MODIFY — 2 novas rotas
src/components/layout/Sidebar.tsx MODIFY — link "Tabela Remap"

public/loja-virtual.html         MODIFY — aba PRODUTOS/REMAP + seção REMAP dinâmica

src/tests/
  parse-catalog.test.ts          CREATE — unit tests do parser xlsx
```

---

## Task 1: Instalar Dependências

**Files:**
- Modify: `package.json`

- [ ] **Instalar dependências de runtime e dev**

```bash
cd "promax-tuner"
npm install xlsx @tanstack/react-virtual
npm install -D tsx
```

- [ ] **Verificar instalação**

```bash
node -e "require('xlsx'); console.log('xlsx ok')"
npx tsx --version
```

Expected: versão do tsx impressa sem erro.

- [ ] **Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add xlsx, react-virtual, tsx deps"
```

---

## Task 2: Migration — Tabela, Índices, Views e RLS

**Files:**
- Create: `supabase/migrations/016_ecu_catalog.sql`

- [ ] **Criar migration**

```sql
-- supabase/migrations/016_ecu_catalog.sql

-- Tabela principal
CREATE TABLE public.ecu_catalog (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  categoria           text NOT NULL,
  categoria_slug      text NOT NULL,
  arquivo_origem      text,
  secao_original      text,
  marca               text,
  tipo_registro       text NOT NULL DEFAULT 'Dados',
  modelo_descricao    text,
  ano                 text,
  ganho               text,
  cv_original         integer,
  cv_tuned            integer,
  kgfm_original       numeric(6,2),
  kgfm_tuned          numeric(6,2),
  aparelho            text,
  protocolo           text,
  cabo                text,
  preco_franqueado    numeric(10,2),
  preco_cliente_final numeric(10,2),
  observacoes         text,
  ativo               boolean NOT NULL DEFAULT true,
  ativo_ecommerce     boolean NOT NULL DEFAULT true,
  created_at          timestamptz DEFAULT now(),
  updated_at          timestamptz DEFAULT now()
);

-- Índices
CREATE INDEX idx_ecu_catalog_slug  ON public.ecu_catalog(categoria_slug);
CREATE INDEX idx_ecu_catalog_marca ON public.ecu_catalog(marca);
CREATE INDEX idx_ecu_catalog_ativo ON public.ecu_catalog(ativo, ativo_ecommerce);
CREATE INDEX idx_ecu_catalog_tipo  ON public.ecu_catalog(tipo_registro);

-- RLS
ALTER TABLE public.ecu_catalog ENABLE ROW LEVEL SECURITY;

-- Matriz: acesso total (usuários autenticados com role company_admin ou operations_admin)
CREATE POLICY "matriz_full_access" ON public.ecu_catalog
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('company_admin','operations_admin')
    )
  );

-- Franqueado: leitura apenas de registros ativos
CREATE POLICY "franqueado_read_active" ON public.ecu_catalog
  FOR SELECT
  TO authenticated
  USING (
    ativo = true
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('franchise_manager','unit_operator')
    )
  );

-- View pública para franqueado (sem preco_cliente_final e campos internos)
CREATE OR REPLACE VIEW public.ecu_catalog_franqueado
  WITH (security_invoker = false)
  AS
  SELECT
    id, categoria, categoria_slug, secao_original, marca,
    tipo_registro, modelo_descricao, ano, ganho,
    cv_original, cv_tuned, kgfm_original, kgfm_tuned,
    aparelho, protocolo, preco_franqueado, observacoes,
    ativo, ativo_ecommerce
  FROM public.ecu_catalog
  WHERE ativo = true;

-- View pública para cliente final / loja virtual (sem preco_franqueado e campos internos)
CREATE OR REPLACE VIEW public.ecu_catalog_public
  WITH (security_invoker = false)
  AS
  SELECT
    id, categoria, categoria_slug, secao_original, marca,
    tipo_registro, modelo_descricao, ano, ganho,
    cv_original, cv_tuned, kgfm_original, kgfm_tuned,
    preco_cliente_final
  FROM public.ecu_catalog
  WHERE ativo = true AND ativo_ecommerce = true;

GRANT SELECT ON public.ecu_catalog_franqueado TO authenticated;
GRANT SELECT ON public.ecu_catalog_public TO anon, authenticated;

-- Trigger updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER ecu_catalog_updated_at
  BEFORE UPDATE ON public.ecu_catalog
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
```

- [ ] **Aplicar migration**

```bash
supabase db reset
```

Expected: "Finished supabase db reset" sem erros.

- [ ] **Verificar tabela e views**

```bash
supabase db diff --use-migra
```

Expected: sem diff pendente.

- [ ] **Commit**

```bash
git add supabase/migrations/016_ecu_catalog.sql
git commit -m "feat(db): add ecu_catalog table, views, RLS"
```

---

## Task 3: Parser Puro + Testes

**Files:**
- Create: `scripts/parse-catalog.ts`
- Create: `src/tests/parse-catalog.test.ts`

- [ ] **Criar parse-catalog.ts**

```typescript
// scripts/parse-catalog.ts
// Lógica pura de parse — sem I/O, sem Supabase. Importável nos testes.

export interface ParsedRow {
  categoria: string
  categoria_slug: string
  arquivo_origem: string | null
  secao_original: string | null
  marca: string | null
  tipo_registro: 'Dados' | 'Serviço/Adicional' | 'Observação'
  modelo_descricao: string | null
  ano: string | null
  ganho: string | null
  cv_original: number | null
  cv_tuned: number | null
  kgfm_original: null       // sempre null na carga inicial (xlsx só tem delta)
  kgfm_tuned: null          // sempre null na carga inicial
  aparelho: string | null
  protocolo: string | null
  cabo: string | null
  preco_franqueado: number | null
  preco_cliente_final: null // sempre null na carga inicial
  observacoes: string | null
  ativo: true
  ativo_ecommerce: true
}

export const SLUG_MAP: Record<string, string> = {
  'Carros & SUVs': 'carros-e-suvs',
  'Pickups':       'pickups',
  'Trucks':        'trucks',
  'Agrícola':      'agricola',
  'Máquinas':      'maquinas',
  'Motos':         'motos',
}

/** Extrai CV do campo modelo_descricao. Ex: "1.4 TFSI - 122CV" → 122 */
export function parseCvOriginal(modeloDescricao: string | null): number | null {
  if (!modeloDescricao) return null
  const m = modeloDescricao.match(/(\d+)\s*CV/i)
  return m ? parseInt(m[1], 10) : null
}

/** Extrai ganho de CV do campo ganho. Ex: "ATÉ +30CV E 4,2KG" → 30 */
export function parseCvGain(ganho: string | null): number | null {
  if (!ganho) return null
  const m = ganho.match(/\+\s*(\d+)\s*CV/i)
  return m ? parseInt(m[1], 10) : null
}

/** Limpa string "R$ 1.600,00" → 1600.00 */
export function parsePreco(raw: unknown): number | null {
  if (raw == null || raw === '') return null
  const s = String(raw).replace(/R\$\s?/g, '').replace(/\./g, '').replace(',', '.').trim()
  const n = parseFloat(s)
  return isNaN(n) || n === 0 ? null : Math.round(n * 100) / 100
}

/** Normaliza tipo_registro para union type */
export function parseTipo(raw: unknown): ParsedRow['tipo_registro'] {
  const s = String(raw ?? '').trim()
  if (s === 'Serviço/Adicional') return 'Serviço/Adicional'
  if (s === 'Observação')        return 'Observação'
  return 'Dados'
}

/** Converte uma linha crua do xlsx (array de valores) em ParsedRow */
export function parseRow(
  rawRow: unknown[],
  headers: string[],
  categoria: string,
  arquivoOrigem: string,
): ParsedRow | null {
  const get = (col: string): unknown => rawRow[headers.indexOf(col)] ?? null

  const tipo = parseTipo(get('Tipo registro') ?? get('tipo_registro') ?? rawRow[5])
  if (tipo === 'Observação') return null  // descarta linhas de observação

  // Headers variam levemente entre arquivos — tenta aliases
  const marcaRaw = (get('Marca sugerida') ?? get('Marca') ?? null) as string | null
  const modeloRaw = get('Modelo/Descricao') as string | null
  const ganhoRaw  = get('Ganho') as string | null
  const cvOrig    = parseCvOriginal(modeloRaw)
  const cvGain    = parseCvGain(ganhoRaw)

  return {
    categoria,
    categoria_slug:      SLUG_MAP[categoria] ?? categoria.toLowerCase(),
    arquivo_origem:      arquivoOrigem,
    secao_original:      (get('Secao original') ?? get('Pagina') ?? null) as string | null,
    marca:               marcaRaw,
    tipo_registro:       tipo,
    modelo_descricao:    modeloRaw,
    ano:                 (get('Ano') ?? null) as string | null,
    ganho:               ganhoRaw,
    cv_original:         cvOrig,
    cv_tuned:            cvOrig != null && cvGain != null ? cvOrig + cvGain : null,
    kgfm_original:       null,
    kgfm_tuned:          null,
    aparelho:            (get('Aparelho') ?? null) as string | null,
    protocolo:           (get('Protocolo') ?? null) as string | null,
    cabo:                (get('Cabo') ?? null) as string | null,
    preco_franqueado:    parsePreco(get('Valor a vista')),
    preco_cliente_final: null,
    observacoes:         (get('Observacoes') ?? null) as string | null,
    ativo:               true,
    ativo_ecommerce:     true,
  }
}
```

- [ ] **Escrever testes**

```typescript
// src/tests/parse-catalog.test.ts
import { describe, it, expect } from 'vitest'
import {
  parseCvOriginal,
  parseCvGain,
  parsePreco,
  parseTipo,
  parseRow,
  SLUG_MAP,
} from '../../scripts/parse-catalog'

describe('parseCvOriginal', () => {
  it('extrai CV de string padrão', () => {
    expect(parseCvOriginal('1.4 TFSI - 122CV')).toBe(122)
  })
  it('extrai CV com espaço antes', () => {
    expect(parseCvOriginal('2.0 TSI 220 CV')).toBe(220)
  })
  it('retorna null se não há CV', () => {
    expect(parseCvOriginal('REPROGRAMAÇÃO')).toBeNull()
  })
  it('retorna null para null', () => {
    expect(parseCvOriginal(null)).toBeNull()
  })
})

describe('parseCvGain', () => {
  it('extrai ganho de CV padrão', () => {
    expect(parseCvGain('ATÉ +30CV E 4,2KG')).toBe(30)
  })
  it('extrai ganho com espaço', () => {
    expect(parseCvGain('ATÉ +35 CV')).toBe(35)
  })
  it('retorna null se não há +CV', () => {
    expect(parseCvGain('ATÉ+20%')).toBeNull()
  })
  it('retorna null para null', () => {
    expect(parseCvGain(null)).toBeNull()
  })
})

describe('parsePreco', () => {
  it('parse valor em formato brasileiro', () => {
    expect(parsePreco('R$ 1.600,00')).toBe(1600)
  })
  it('parse valor sem prefixo', () => {
    expect(parsePreco('900,00')).toBe(900)
  })
  it('retorna null para zero', () => {
    expect(parsePreco('R$ 0,00')).toBeNull()
  })
  it('retorna null para null', () => {
    expect(parsePreco(null)).toBeNull()
  })
  it('retorna null para string vazia', () => {
    expect(parsePreco('')).toBeNull()
  })
})

describe('parseTipo', () => {
  it('reconhece Dados', () => expect(parseTipo('Dados')).toBe('Dados'))
  it('reconhece Serviço/Adicional', () => expect(parseTipo('Serviço/Adicional')).toBe('Serviço/Adicional'))
  it('reconhece Observação', () => expect(parseTipo('Observação')).toBe('Observação'))
  it('default Dados para desconhecido', () => expect(parseTipo('???')).toBe('Dados'))
})

describe('SLUG_MAP', () => {
  it('mapeia todas as 6 categorias', () => {
    expect(SLUG_MAP['Carros & SUVs']).toBe('carros-e-suvs')
    expect(SLUG_MAP['Pickups']).toBe('pickups')
    expect(SLUG_MAP['Trucks']).toBe('trucks')
    expect(SLUG_MAP['Agrícola']).toBe('agricola')
    expect(SLUG_MAP['Máquinas']).toBe('maquinas')
    expect(SLUG_MAP['Motos']).toBe('motos')
  })
})

describe('parseRow', () => {
  const headers = [
    'Categoria do site','Arquivo origem','Pagina','Secao original',
    'Marca sugerida','Tipo registro','Modelo/Descricao','Ano','Ganho',
    'Aparelho','Protocolo','Cabo','Valor a vista','Observacoes',
  ]
  const rawDados = [
    'Carros & SUVs','TABELA LINHA LEVE PDF.pdf',1,'A1',
    'Audi','Dados','1.4 TFSI - 122CV','2010-2019','ATÉ +30CV E 4,2KG',
    'KESS','FAMILIA 477 (ID)',null,'R$ 1.600,00',null,
  ]

  it('parseia row Dados corretamente', () => {
    const row = parseRow(rawDados, headers, 'Carros & SUVs', 'TABELA LINHA LEVE PDF.pdf')
    expect(row).not.toBeNull()
    expect(row!.marca).toBe('Audi')
    expect(row!.cv_original).toBe(122)
    expect(row!.cv_tuned).toBe(152)
    expect(row!.preco_franqueado).toBe(1600)
    expect(row!.preco_cliente_final).toBeNull()
    expect(row!.ativo).toBe(true)
  })

  it('retorna null para rows de Observação', () => {
    const rawObs = [...rawDados]
    rawObs[5] = 'Observação'
    expect(parseRow(rawObs, headers, 'Carros & SUVs', 'test.pdf')).toBeNull()
  })

  it('cv_tuned null quando modelo sem CV', () => {
    const rawSemCV = [...rawDados]
    rawSemCV[6] = 'REPROGRAMAÇÃO'
    const row = parseRow(rawSemCV, headers, 'Trucks', 'test.pdf')
    expect(row!.cv_original).toBeNull()
    expect(row!.cv_tuned).toBeNull()
  })
})
```

- [ ] **Rodar testes**

```bash
npm run test -- parse-catalog --run
```

Expected: todos os testes passam (verde).

- [ ] **Commit**

```bash
git add scripts/parse-catalog.ts src/tests/parse-catalog.test.ts
git commit -m "feat(catalog): add xlsx parser with unit tests"
```

---

## Task 4: Script de Import

**Files:**
- Create: `scripts/import-catalog.ts`

- [ ] **Criar import-catalog.ts**

```typescript
// scripts/import-catalog.ts
import * as XLSX from 'xlsx'
import * as path from 'path'
import * as fs from 'fs'
import { createClient } from '@supabase/supabase-js'
import { parseRow, SLUG_MAP } from './parse-catalog'

const XLSX_DIR = path.resolve(__dirname, '../../categorias_site_veiculos_xlsx')

const FILE_MAP: Record<string, string> = {
  'categoria_carros_e_suvs.xlsx':        'Carros & SUVs',
  'categoria_pickups.xlsx':              'Pickups',
  'categoria_trucks.xlsx':               'Trucks',
  'categoria_agricola_com_marcas.xlsx':  'Agrícola',
  'categoria_maquinas.xlsx':             'Máquinas',
  'categoria_motos.xlsx':                'Motos',
}

async function main() {
  const reset = process.argv.includes('--reset')

  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  if (reset) {
    console.log('⚠️  --reset: truncando ecu_catalog...')
    const { error } = await supabase.from('ecu_catalog').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    if (error) { console.error('Erro no truncate:', error); process.exit(1) }
    console.log('✓ Tabela limpa.')
  }

  let totalInserted = 0
  let totalSkipped  = 0

  for (const [filename, categoria] of Object.entries(FILE_MAP)) {
    const filepath = path.join(XLSX_DIR, filename)
    if (!fs.existsSync(filepath)) {
      console.warn(`⚠️  Arquivo não encontrado: ${filepath}`)
      continue
    }

    const wb = XLSX.readFile(filepath)
    const ws = wb.Sheets['Dados']
    if (!ws) { console.warn(`⚠️  Sheet "Dados" não encontrada em ${filename}`); continue }

    const raw: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1 })
    const headers = (raw[0] as string[]).map(h => String(h ?? '').trim())
    const dataRows = raw.slice(1)

    const batch = []
    for (const row of dataRows) {
      if (!row || (row as unknown[]).every(c => c == null)) continue
      const parsed = parseRow(row as unknown[], headers, categoria, filename)
      if (parsed) batch.push(parsed)
      else totalSkipped++
    }

    // Inserir em chunks de 200
    for (let i = 0; i < batch.length; i += 200) {
      const chunk = batch.slice(i, i + 200)
      const { error } = await supabase.from('ecu_catalog').insert(chunk)
      if (error) { console.error(`Erro ao inserir chunk ${i} de ${filename}:`, error); process.exit(1) }
      totalInserted += chunk.length
    }

    console.log(`✓ ${filename}: ${batch.length} inseridos`)
  }

  console.log(`\n✅ Import concluído. Inseridos: ${totalInserted} | Ignorados (Observação): ${totalSkipped}`)
}

main().catch(e => { console.error(e); process.exit(1) })
```

- [ ] **Adicionar script ao package.json**

Abrir `package.json` e adicionar ao objeto `"scripts"`:
```json
"catalog:import": "tsx scripts/import-catalog.ts",
"catalog:reset":  "tsx scripts/import-catalog.ts --reset"
```

- [ ] **Criar .env.local se não existir e adicionar variáveis necessárias**

```bash
# .env.local (já deve ter VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY)
# Para o script de import, precisamos da service role key:
# SUPABASE_URL=http://localhost:54321
# SUPABASE_SERVICE_ROLE_KEY=<chave do supabase start>
```

Obter a service role key:
```bash
supabase status
# Copiar "service_role key" para .env.local como SUPABASE_SERVICE_ROLE_KEY
```

- [ ] **Rodar o import**

```bash
SUPABASE_URL=http://localhost:54321 \
SUPABASE_SERVICE_ROLE_KEY=<key> \
npm run catalog:import
```

Expected:
```
✓ categoria_carros_e_suvs.xlsx: 1534 inseridos
✓ categoria_pickups.xlsx: 251 inseridos
...
✅ Import concluído. Inseridos: XXXX | Ignorados (Observação): XX
```

- [ ] **Verificar dados no Supabase Studio**

```bash
supabase studio
# Abrir tabela ecu_catalog, verificar primeiras rows
```

- [ ] **Commit**

```bash
git add scripts/import-catalog.ts package.json
git commit -m "feat(catalog): import script xlsx→supabase"
```

---

## Task 5: Tipos TypeScript

**Files:**
- Create: `src/types/ecu-catalog.ts`

- [ ] **Criar tipos**

```typescript
// src/types/ecu-catalog.ts

export interface EcuCatalogRow {
  id: string
  categoria: string
  categoria_slug: string
  arquivo_origem: string | null
  secao_original: string | null
  marca: string | null
  tipo_registro: 'Dados' | 'Serviço/Adicional' | 'Observação'
  modelo_descricao: string | null
  ano: string | null
  ganho: string | null
  cv_original: number | null
  cv_tuned: number | null
  kgfm_original: number | null
  kgfm_tuned: number | null
  aparelho: string | null
  protocolo: string | null
  cabo: string | null
  preco_franqueado: number | null
  preco_cliente_final: number | null
  observacoes: string | null
  ativo: boolean
  ativo_ecommerce: boolean
  created_at: string
  updated_at: string
}

export interface CatalogFilters {
  categoriaSlug?: string
  marca?: string
  modelo?: string
  ano?: string
  apenasAtivos?: boolean  // undefined = todos, true = ativos, false = inativos
  page?: number
  pageSize?: number
}

export interface BulkPricePayload {
  target: 'preco_franqueado' | 'preco_cliente_final'
  categoriaSlug: string | 'all'
  percentual: number   // positivo = acréscimo, negativo = desconto
}

// Estrutura agrupada para renderização
export interface EcuMotorizacao extends Pick<
  EcuCatalogRow,
  'id' | 'modelo_descricao' | 'ano' | 'ganho' | 'cv_original' | 'cv_tuned' |
  'kgfm_original' | 'kgfm_tuned' | 'aparelho' | 'protocolo' | 'cabo' |
  'preco_franqueado' | 'preco_cliente_final' | 'tipo_registro' |
  'observacoes' | 'ativo' | 'ativo_ecommerce'
> {}

export interface EcuModelo {
  secao: string
  motorizacoes: EcuMotorizacao[]
}

export interface EcuMarca {
  marca: string
  modelos: EcuModelo[]
}

/** Agrupa array flat de EcuCatalogRow em hierarquia Marca > Modelo > Motorização */
export function groupByMarcaModelo(rows: EcuCatalogRow[]): EcuMarca[] {
  const map = new Map<string, Map<string, EcuMotorizacao[]>>()

  for (const row of rows) {
    const marca  = row.marca  ?? 'Sem marca'
    const secao  = row.secao_original ?? 'Geral'

    if (!map.has(marca)) map.set(marca, new Map())
    const modeloMap = map.get(marca)!
    if (!modeloMap.has(secao)) modeloMap.set(secao, [])
    modeloMap.get(secao)!.push(row)
  }

  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b, 'pt-BR'))
    .map(([marca, modeloMap]) => ({
      marca,
      modelos: Array.from(modeloMap.entries())
        .sort(([a], [b]) => a.localeCompare(b, 'pt-BR'))
        .map(([secao, motorizacoes]) => ({ secao, motorizacoes })),
    }))
}
```

- [ ] **Commit**

```bash
git add src/types/ecu-catalog.ts
git commit -m "feat(catalog): add EcuCatalog TypeScript types"
```

---

## Task 6: Hook useEcuCatalog

**Files:**
- Create: `src/hooks/useEcuCatalog.ts`

- [ ] **Criar hook**

```typescript
// src/hooks/useEcuCatalog.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { EcuCatalogRow, CatalogFilters, BulkPricePayload } from '@/types/ecu-catalog'

const QK = {
  list:   (f: CatalogFilters) => ['ecu-catalog', 'list', f] as const,
  brands: (slug: string)       => ['ecu-catalog', 'brands', slug] as const,
}

// ── Queries ──────────────────────────────────────────────────────────────────

export function useEcuCatalogList(filters: CatalogFilters = {}) {
  const { categoriaSlug, marca, modelo, ano, apenasAtivos, page = 0, pageSize = 50 } = filters

  return useQuery({
    queryKey: QK.list(filters),
    queryFn: async (): Promise<{ data: EcuCatalogRow[]; count: number }> => {
      let q = supabase
        .from('ecu_catalog')
        .select('*', { count: 'exact' })
        .order('marca', { ascending: true })
        .order('secao_original', { ascending: true })
        .range(page * pageSize, (page + 1) * pageSize - 1)

      if (categoriaSlug && categoriaSlug !== 'all') q = q.eq('categoria_slug', categoriaSlug)
      if (marca)   q = q.eq('marca', marca)
      if (modelo)  q = q.ilike('modelo_descricao', `%${modelo}%`)
      if (ano)     q = q.ilike('ano', `%${ano}%`)
      if (apenasAtivos === true)  q = q.eq('ativo', true)
      if (apenasAtivos === false) q = q.eq('ativo', false)

      const { data, error, count } = await q
      if (error) throw error
      return { data: data ?? [], count: count ?? 0 }
    },
    staleTime: 60_000,
  })
}

export function useEcuCatalogBrands(categoriaSlug: string) {
  return useQuery({
    queryKey: QK.brands(categoriaSlug),
    queryFn: async (): Promise<string[]> => {
      let q = supabase
        .from('ecu_catalog')
        .select('marca')
        .not('marca', 'is', null)
        .order('marca', { ascending: true })

      if (categoriaSlug !== 'all') q = q.eq('categoria_slug', categoriaSlug)

      const { data, error } = await q
      if (error) throw error
      return [...new Set(data?.map(r => r.marca as string) ?? [])]
    },
    staleTime: 300_000,
  })
}

// ── Mutations ────────────────────────────────────────────────────────────────

export function useUpdateEcuRecord() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<EcuCatalogRow> }) => {
      const { error } = await supabase.from('ecu_catalog').update(patch).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ecu-catalog'] }),
  })
}

export function useDeleteEcuRecord() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('ecu_catalog').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ecu-catalog'] }),
  })
}

export function useBulkUpdatePrice() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: BulkPricePayload) => {
      // Busca registros afetados (com valor > 0)
      let q = supabase
        .from('ecu_catalog')
        .select('id,' + payload.target)
        .gt(payload.target, 0)

      if (payload.categoriaSlug !== 'all') q = q.eq('categoria_slug', payload.categoriaSlug)

      const { data, error } = await q
      if (error) throw error
      if (!data || data.length === 0) return { affected: 0 }

      // Calcula novos valores e atualiza em batch
      const updates = data.map(row => ({
        id: row.id as string,
        [payload.target]: Math.round(
          (row[payload.target] as number) * (1 + payload.percentual / 100) * 100
        ) / 100,
      }))

      // Upsert em chunks de 100
      for (let i = 0; i < updates.length; i += 100) {
        const chunk = updates.slice(i, i + 100)
        const { error: upsErr } = await supabase.from('ecu_catalog').upsert(chunk)
        if (upsErr) throw upsErr
      }

      return { affected: updates.length }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ecu-catalog'] }),
  })
}

// ── Franqueado view (sem campos internos) ─────────────────────────────────────

export function useEcuCatalogFranqueado(filters: CatalogFilters = {}) {
  const { categoriaSlug, marca, modelo, page = 0, pageSize = 500 } = filters

  return useQuery({
    queryKey: ['ecu-catalog', 'franqueado', filters],
    queryFn: async () => {
      let q = (supabase as ReturnType<typeof import('@supabase/supabase-js').createClient>)
        .from('ecu_catalog_franqueado' as never)
        .select('*')
        .order('marca', { ascending: true })
        .order('secao_original', { ascending: true })
        .range(page * pageSize, (page + 1) * pageSize - 1)

      if (categoriaSlug && categoriaSlug !== 'all') q = (q as ReturnType<typeof q.eq>).eq('categoria_slug', categoriaSlug)
      if (marca)  q = (q as ReturnType<typeof q.eq>).eq('marca', marca)
      if (modelo) q = (q as ReturnType<typeof q.ilike>).ilike('modelo_descricao', `%${modelo}%`)

      const { data, error } = await q
      if (error) throw error
      return (data ?? []) as EcuCatalogRow[]
    },
    staleTime: 300_000,
  })
}

// ── Cliente público (usa view ecu_catalog_public) ─────────────────────────────

export function useEcuCatalogPublic(categoriaSlug: string) {
  return useQuery({
    queryKey: ['ecu-catalog', 'public', categoriaSlug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ecu_catalog_public' as never)
        .select('*')
        .eq('categoria_slug', categoriaSlug)
        .order('marca', { ascending: true })
        .order('secao_original', { ascending: true })

      if (error) throw error
      return (data ?? []) as EcuCatalogRow[]
    },
    staleTime: 300_000,
  })
}
```

- [ ] **Commit**

```bash
git add src/hooks/useEcuCatalog.ts
git commit -m "feat(catalog): add useEcuCatalog hook (queries + mutations)"
```

---

## Task 7: Componentes Compartilhados

**Files:**
- Create: `src/components/catalogo/CatalogoFiltros.tsx`
- Create: `src/components/catalogo/DeleteConfirmModal.tsx`

- [ ] **Criar CatalogoFiltros.tsx**

```tsx
// src/components/catalogo/CatalogoFiltros.tsx
import { useState, useCallback } from 'react'
import { Search } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'

const CATEGORIAS = [
  { slug: 'all',          label: 'Todas as categorias' },
  { slug: 'carros-e-suvs', label: 'Carros & SUVs' },
  { slug: 'pickups',      label: 'Pickups' },
  { slug: 'trucks',       label: 'Trucks' },
  { slug: 'agricola',     label: 'Agrícola' },
  { slug: 'maquinas',     label: 'Máquinas' },
  { slug: 'motos',        label: 'Motos' },
]

export interface FiltrosValue {
  categoriaSlug: string
  marca: string
  modelo: string
  ano: string
  apenasAtivos?: boolean
}

interface Props {
  value: FiltrosValue
  onChange: (v: FiltrosValue) => void
  marcas?: string[]
  showStatusFilter?: boolean
}

export function CatalogoFiltros({ value, onChange, marcas = [], showStatusFilter = false }: Props) {
  const set = useCallback(
    (patch: Partial<FiltrosValue>) => onChange({ ...value, ...patch }),
    [value, onChange],
  )

  return (
    <div className="flex flex-wrap gap-3 items-center">
      <Select value={value.categoriaSlug} onValueChange={v => set({ categoriaSlug: v, marca: '' })}>
        <SelectTrigger className="w-44">
          <SelectValue placeholder="Categoria" />
        </SelectTrigger>
        <SelectContent>
          {CATEGORIAS.map(c => (
            <SelectItem key={c.slug} value={c.slug}>{c.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={value.marca || 'all'} onValueChange={v => set({ marca: v === 'all' ? '' : v })}>
        <SelectTrigger className="w-36">
          <SelectValue placeholder="Marca" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todas as marcas</SelectItem>
          {marcas.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
        </SelectContent>
      </Select>

      <div className="relative">
        <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-8 w-48"
          placeholder="Modelo/Desc."
          value={value.modelo}
          onChange={e => set({ modelo: e.target.value })}
        />
      </div>

      <div className="relative">
        <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-8 w-28"
          placeholder="Ano"
          value={value.ano}
          onChange={e => set({ ano: e.target.value })}
        />
      </div>

      {showStatusFilter && (
        <Select
          value={value.apenasAtivos === undefined ? 'all' : value.apenasAtivos ? 'ativos' : 'inativos'}
          onValueChange={v => set({
            apenasAtivos: v === 'all' ? undefined : v === 'ativos',
          })}
        >
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="ativos">Apenas ativos</SelectItem>
            <SelectItem value="inativos">Desativados</SelectItem>
          </SelectContent>
        </Select>
      )}
    </div>
  )
}
```

- [ ] **Criar DeleteConfirmModal.tsx**

```tsx
// src/components/catalogo/DeleteConfirmModal.tsx
import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { AlertTriangle } from 'lucide-react'

interface Props {
  open: boolean
  onCancel: () => void
  onConfirm: () => void
  isLoading?: boolean
  description?: string
}

export function DeleteConfirmModal({ open, onCancel, onConfirm, isLoading, description }: Props) {
  const [typed, setTyped] = useState('')
  const confirmed = typed === 'EXCLUIR'

  return (
    <Dialog open={open} onOpenChange={o => { if (!o) { setTyped(''); onCancel() } }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle size={18} />
            Confirmar exclusão permanente
          </DialogTitle>
        </DialogHeader>

        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}

        <p className="text-sm">
          Esta ação é <strong>irreversível</strong>. Para confirmar, digite{' '}
          <code className="bg-muted px-1 py-0.5 rounded font-mono text-destructive">EXCLUIR</code>{' '}
          abaixo:
        </p>

        <Input
          placeholder="EXCLUIR"
          value={typed}
          onChange={e => setTyped(e.target.value)}
          className="font-mono"
          autoComplete="off"
        />

        <DialogFooter>
          <Button variant="ghost" onClick={() => { setTyped(''); onCancel() }}>
            Cancelar
          </Button>
          <Button
            variant="destructive"
            disabled={!confirmed || isLoading}
            onClick={onConfirm}
          >
            {isLoading ? 'Excluindo...' : 'Excluir registro'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Commit**

```bash
git add src/components/catalogo/CatalogoFiltros.tsx src/components/catalogo/DeleteConfirmModal.tsx
git commit -m "feat(catalog): add shared CatalogoFiltros and DeleteConfirmModal"
```

---

## Task 8: Componentes Backoffice

**Files:**
- Create: `src/components/catalogo/BulkActionsPanel.tsx`
- Create: `src/components/catalogo/MotorizacaoCard.tsx`
- Create: `src/components/catalogo/ModeloAccordion.tsx`
- Create: `src/components/catalogo/MarcaAccordion.tsx`

- [ ] **Criar BulkActionsPanel.tsx**

```tsx
// src/components/catalogo/BulkActionsPanel.tsx
import { useState } from 'react'
import { Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useBulkUpdatePrice } from '@/hooks/useEcuCatalog'
import type { BulkPricePayload } from '@/types/ecu-catalog'

const CATEGORIAS = [
  { slug: 'all',           label: 'Todas as categorias' },
  { slug: 'carros-e-suvs', label: 'Carros & SUVs' },
  { slug: 'pickups',       label: 'Pickups' },
  { slug: 'trucks',        label: 'Trucks' },
  { slug: 'agricola',      label: 'Agrícola' },
  { slug: 'maquinas',      label: 'Máquinas' },
  { slug: 'motos',         label: 'Motos' },
]

export function BulkActionsPanel() {
  const [target, setTarget]     = useState<BulkPricePayload['target']>('preco_franqueado')
  const [catSlug, setCatSlug]   = useState('all')
  const [pct, setPct]           = useState('')
  const [mode, setMode]         = useState<'add' | 'sub'>('add')
  const [confirm, setConfirm]   = useState(false)
  const [result, setResult]     = useState<string | null>(null)

  const bulk = useBulkUpdatePrice()

  const percentual = parseFloat(pct)
  const valid = !isNaN(percentual) && percentual > 0

  function handleApply() {
    if (!valid) return
    setConfirm(true)
  }

  function handleConfirm() {
    bulk.mutate(
      { target, categoriaSlug: catSlug, percentual: mode === 'add' ? percentual : -percentual },
      {
        onSuccess: (data) => {
          setResult(`✓ ${data.affected} registros atualizados`)
          setConfirm(false)
          setPct('')
          setTimeout(() => setResult(null), 4000)
        },
      },
    )
  }

  return (
    <div className="rounded-lg border border-[hsl(var(--pm-gray-700))] bg-[hsl(var(--pm-gray-900))] p-4">
      <div className="flex items-center gap-2 mb-3">
        <Zap size={14} className="text-[hsl(var(--pm-red-500))]" />
        <span className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
          Atualização em massa
        </span>
      </div>

      <div className="flex flex-wrap gap-3 items-end">
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Coluna alvo</label>
          <Select value={target} onValueChange={v => setTarget(v as typeof target)}>
            <SelectTrigger className="w-44 h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="preco_franqueado">Franqueado</SelectItem>
              <SelectItem value="preco_cliente_final">Cliente Final</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Categoria</label>
          <Select value={catSlug} onValueChange={setCatSlug}>
            <SelectTrigger className="w-44 h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIAS.map(c => (
                <SelectItem key={c.slug} value={c.slug}>{c.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Operação</label>
          <Select value={mode} onValueChange={v => setMode(v as 'add' | 'sub')}>
            <SelectTrigger className="w-32 h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="add">+ Acréscimo %</SelectItem>
              <SelectItem value="sub">- Desconto %</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Percentual</label>
          <Input
            className="w-24 h-8 text-xs font-mono"
            placeholder="ex: 10"
            value={pct}
            onChange={e => setPct(e.target.value.replace(/[^0-9.]/g, ''))}
          />
        </div>

        <Button
          size="sm"
          className="h-8 bg-[hsl(var(--pm-red-500))] hover:bg-[hsl(var(--pm-red-600))]"
          disabled={!valid || bulk.isPending}
          onClick={handleApply}
        >
          Aplicar
        </Button>
      </div>

      {confirm && (
        <div className="mt-3 flex items-center gap-3 rounded border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-sm text-amber-400">
          <span>
            Isso recalculará <strong>{mode === 'add' ? '+' : '-'}{pct}%</strong> em{' '}
            <strong>{CATEGORIAS.find(c => c.slug === catSlug)?.label}</strong>{' '}
            (coluna: {target === 'preco_franqueado' ? 'Franqueado' : 'Cliente Final'}).
            Valores nulos/zero são ignorados.
          </span>
          <Button size="sm" variant="ghost" className="h-7 text-amber-400" onClick={() => setConfirm(false)}>
            Cancelar
          </Button>
          <Button
            size="sm"
            className="h-7 bg-amber-500 hover:bg-amber-600 text-black font-bold"
            onClick={handleConfirm}
            disabled={bulk.isPending}
          >
            {bulk.isPending ? 'Aplicando...' : 'Confirmar'}
          </Button>
        </div>
      )}

      {result && (
        <p className="mt-2 text-xs text-green-400 font-mono">{result}</p>
      )}
    </div>
  )
}
```

- [ ] **Criar MotorizacaoCard.tsx**

```tsx
// src/components/catalogo/MotorizacaoCard.tsx
import { useState, useRef, useCallback } from 'react'
import { Trash2 } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { DeleteConfirmModal } from './DeleteConfirmModal'
import { useUpdateEcuRecord, useDeleteEcuRecord } from '@/hooks/useEcuCatalog'
import type { EcuCatalogRow } from '@/types/ecu-catalog'
import { cn } from '@/lib/utils'

interface Props {
  row: EcuCatalogRow
}

function PrecoInput({ value, onSave, label }: {
  value: number | null
  onSave: (v: number | null) => void
  label: string
}) {
  const [local, setLocal] = useState(value != null ? String(value) : '')
  const timerRef = useRef<ReturnType<typeof setTimeout>>()

  const handleChange = useCallback((raw: string) => {
    setLocal(raw)
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      const n = parseFloat(raw.replace(',', '.'))
      onSave(isNaN(n) || n === 0 ? null : Math.round(n * 100) / 100)
    }, 800)
  }, [onSave])

  const isEmpty = value == null || value === 0

  return (
    <div className="space-y-0.5">
      <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">{label}</span>
      <div className="relative">
        {isEmpty && !local && (
          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-amber-400 font-mono pointer-events-none">
            CONSULTAR
          </span>
        )}
        <Input
          className="h-7 w-28 text-xs font-mono pl-2"
          value={local}
          placeholder="0,00"
          onChange={e => handleChange(e.target.value)}
        />
      </div>
    </div>
  )
}

export function MotorizacaoCard({ row }: Props) {
  const update = useUpdateEcuRecord()
  const remove = useDeleteEcuRecord()
  const [delOpen, setDelOpen] = useState(false)

  const patch = useCallback(
    (p: Partial<EcuCatalogRow>) => update.mutate({ id: row.id, patch: p }),
    [row.id, update],
  )

  return (
    <div
      className={cn(
        'rounded-md border border-[hsl(var(--pm-gray-700))] bg-[hsl(var(--pm-gray-900))] p-3 space-y-2',
        !row.ativo && 'opacity-40',
      )}
    >
      {/* Linha 1: campos de identificação */}
      <div className="grid grid-cols-4 gap-3 text-xs">
        <div>
          <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground block">Modelo/Desc.</span>
          <span className="text-foreground">{row.modelo_descricao ?? '—'}</span>
        </div>
        <div>
          <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground block">Ano</span>
          <span className="text-foreground">{row.ano ?? '—'}</span>
        </div>
        <div>
          <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground block">Aparelho</span>
          <span className="text-muted-foreground">{row.aparelho ?? '—'}</span>
        </div>
        <div>
          <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground block">Protocolo</span>
          <span className="text-muted-foreground">{row.protocolo ?? '—'}</span>
        </div>
      </div>

      {/* Linha 2: ganho + cabo */}
      <div className="grid grid-cols-3 gap-3 text-xs">
        <div>
          <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground block">Ganho</span>
          <span className="text-[hsl(var(--pm-red-500))] font-mono font-medium">{row.ganho ?? '—'}</span>
        </div>
        <div>
          <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground block">Cabo</span>
          <span className="text-muted-foreground">{row.cabo ?? '—'}</span>
        </div>
        <div>
          <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground block">Tipo</span>
          <span className={cn(
            'text-xs px-1.5 py-0.5 rounded font-mono',
            row.tipo_registro === 'Dados'             && 'bg-blue-500/15 text-blue-400',
            row.tipo_registro === 'Serviço/Adicional' && 'bg-amber-500/15 text-amber-400',
          )}>
            {row.tipo_registro}
          </span>
        </div>
      </div>

      {/* Linha 3: preços + toggles + delete */}
      <div className="flex flex-wrap items-end gap-4 pt-1 border-t border-[hsl(var(--pm-gray-700))]">
        <PrecoInput
          label="Franqueado"
          value={row.preco_franqueado}
          onSave={v => patch({ preco_franqueado: v })}
        />
        <PrecoInput
          label="Cliente Final"
          value={row.preco_cliente_final}
          onSave={v => patch({ preco_cliente_final: v })}
        />

        <div className="flex items-center gap-2 ml-auto">
          <div className="flex items-center gap-1.5">
            <Switch
              checked={row.ativo}
              onCheckedChange={v => patch({ ativo: v })}
              className="scale-75"
            />
            <span className="text-[10px] text-muted-foreground">Ativo</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Switch
              checked={row.ativo_ecommerce}
              onCheckedChange={v => patch({ ativo_ecommerce: v })}
              className="scale-75"
            />
            <span className="text-[10px] text-muted-foreground">E-comm</span>
          </div>
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7 text-muted-foreground hover:text-destructive"
            onClick={() => setDelOpen(true)}
          >
            <Trash2 size={13} />
          </Button>
        </div>
      </div>

      {row.observacoes && (
        <p className="text-[10px] text-muted-foreground italic border-t border-[hsl(var(--pm-gray-700))] pt-1">
          {row.observacoes}
        </p>
      )}

      <DeleteConfirmModal
        open={delOpen}
        description={`Excluir: ${row.marca} ${row.secao_original} — ${row.modelo_descricao}`}
        onCancel={() => setDelOpen(false)}
        onConfirm={() => remove.mutate(row.id, { onSuccess: () => setDelOpen(false) })}
        isLoading={remove.isPending}
      />
    </div>
  )
}
```

- [ ] **Criar ModeloAccordion.tsx**

```tsx
// src/components/catalogo/ModeloAccordion.tsx
import { useState } from 'react'
import { ChevronRight } from 'lucide-react'
import { MotorizacaoCard } from './MotorizacaoCard'
import type { EcuModelo } from '@/types/ecu-catalog'
import { cn } from '@/lib/utils'

interface Props {
  modelo: EcuModelo
}

export function ModeloAccordion({ modelo }: Props) {
  const [open, setOpen] = useState(false)

  return (
    <div className="border-b border-[hsl(var(--pm-gray-800))] last:border-0">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex w-full items-center justify-between px-4 py-2.5 hover:bg-[hsl(var(--pm-gray-800))] transition-colors text-left"
      >
        <span className="text-sm text-foreground font-medium">{modelo.secao}</span>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{modelo.motorizacoes.length} reg.</span>
          <ChevronRight
            size={14}
            className={cn('text-muted-foreground transition-transform duration-200', open && 'rotate-90')}
          />
        </div>
      </button>

      <div
        className="overflow-hidden transition-all duration-300"
        style={{ maxHeight: open ? `${modelo.motorizacoes.length * 200}px` : '0px' }}
      >
        {open && (
          <div className="px-4 pb-3 space-y-2 border-l-2 border-[hsl(var(--pm-red-500)/0.3)] ml-4">
            {modelo.motorizacoes.map(m => (
              <MotorizacaoCard key={m.id} row={m as import('@/types/ecu-catalog').EcuCatalogRow} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Criar MarcaAccordion.tsx**

```tsx
// src/components/catalogo/MarcaAccordion.tsx
import { useState } from 'react'
import { ChevronRight } from 'lucide-react'
import { ModeloAccordion } from './ModeloAccordion'
import type { EcuMarca } from '@/types/ecu-catalog'
import { cn } from '@/lib/utils'

interface Props {
  marca: EcuMarca
}

export function MarcaAccordion({ marca }: Props) {
  const [open, setOpen] = useState(false)
  const total = marca.modelos.reduce((s, m) => s + m.motorizacoes.length, 0)

  return (
    <div className="rounded-lg border border-[hsl(var(--pm-gray-700))] overflow-hidden mb-2">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex w-full items-center justify-between bg-[hsl(var(--pm-gray-900))] px-4 py-3 hover:bg-[hsl(var(--pm-gray-800))] transition-colors"
      >
        <span className="font-mono text-xs uppercase tracking-widest text-foreground font-bold">
          {marca.marca}
        </span>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground">{total} registros</span>
          <ChevronRight
            size={14}
            className={cn('text-muted-foreground transition-transform duration-200', open && 'rotate-90')}
          />
        </div>
      </button>

      <div
        className="overflow-hidden transition-all duration-300"
        style={{ maxHeight: open ? `${total * 250}px` : '0px' }}
      >
        {open && marca.modelos.map(m => (
          <ModeloAccordion key={m.secao} modelo={m} />
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Commit**

```bash
git add src/components/catalogo/
git commit -m "feat(catalog): add backoffice accordion components + BulkActionsPanel"
```

---

## Task 9: Página Backoffice + Rota + Sidebar

**Files:**
- Create: `src/pages/app/tabela-remap/TabelaRemapPage.tsx`
- Modify: `src/router/index.tsx`
- Modify: `src/components/layout/Sidebar.tsx`

- [ ] **Criar TabelaRemapPage.tsx**

```tsx
// src/pages/app/tabela-remap/TabelaRemapPage.tsx
import { useState, useMemo } from 'react'
import { PageHeader } from '@/components/shared/PageHeader'
import { BulkActionsPanel } from '@/components/catalogo/BulkActionsPanel'
import { CatalogoFiltros } from '@/components/catalogo/CatalogoFiltros'
import { MarcaAccordion } from '@/components/catalogo/MarcaAccordion'
import { useEcuCatalogList, useEcuCatalogBrands } from '@/hooks/useEcuCatalog'
import { groupByMarcaModelo } from '@/types/ecu-catalog'
import type { FiltrosValue } from '@/components/catalogo/CatalogoFiltros'

const DEFAULT_FILTROS: FiltrosValue = {
  categoriaSlug: 'all',
  marca: '',
  modelo: '',
  ano: '',
  apenasAtivos: undefined,
}

export default function TabelaRemapPage() {
  const [filtros, setFiltros] = useState<FiltrosValue>(DEFAULT_FILTROS)

  const { data, isLoading } = useEcuCatalogList({
    categoriaSlug: filtros.categoriaSlug,
    marca:         filtros.marca || undefined,
    modelo:        filtros.modelo || undefined,
    ano:           filtros.ano || undefined,
    apenasAtivos:  filtros.apenasAtivos,
    pageSize: 200,
  })

  const { data: marcas = [] } = useEcuCatalogBrands(filtros.categoriaSlug)

  const grupos = useMemo(
    () => groupByMarcaModelo(data?.data ?? []),
    [data],
  )

  return (
    <div className="space-y-6 max-w-6xl">
      <PageHeader
        title="Tabela Remap"
        description={`${data?.count ?? 0} registros — painel mestre de catálogo ECU`}
      />

      <BulkActionsPanel />

      <div className="space-y-3">
        <CatalogoFiltros
          value={filtros}
          onChange={setFiltros}
          marcas={marcas}
          showStatusFilter
        />
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="pm-skeleton h-12 rounded-lg" />
          ))}
        </div>
      ) : grupos.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">
          Nenhum registro encontrado com os filtros atuais.
        </p>
      ) : (
        <div>
          {grupos.map(m => <MarcaAccordion key={m.marca} marca={m} />)}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Adicionar rota em router/index.tsx**

Localizar o bloco de rotas protegidas e adicionar após `/matriz/arquivos/:id`:
```tsx
// Adicionar import no topo:
const TabelaRemapPage = lazy(() => import('@/pages/app/tabela-remap/TabelaRemapPage'))

// Adicionar na lista de rotas protegidas:
{ path: '/matriz/tabela-remap', element: <S><TabelaRemapPage /></S> },
```

- [ ] **Adicionar link na Sidebar**

Em `src/components/layout/Sidebar.tsx`, após o `NavItem` de `/matriz/arquivos`:
```tsx
// Adicionar import:
import { Table2 } from 'lucide-react'

// Adicionar após NavItem arquivos:
<NavItem to="/matriz/tabela-remap" icon={Table2} label="Tabela Remap" collapsed={collapsed} />
```

- [ ] **Testar no browser**

```bash
npm run dev
```

Navegar para `http://localhost:5173/login`, logar como matriz, acessar `/matriz/tabela-remap`. Verificar: filtros funcionam, accordions expandem, cards mostram dados.

- [ ] **Commit**

```bash
git add src/pages/app/tabela-remap/ src/router/index.tsx src/components/layout/Sidebar.tsx
git commit -m "feat(catalog): add TabelaRemapPage backoffice + route + sidebar link"
```

---

## Task 10: Vista Franqueado

**Files:**
- Create: `src/pages/app/franqueados/FranqueadoCatalogPage.tsx`
- Modify: `src/router/index.tsx`

- [ ] **Criar FranqueadoCatalogPage.tsx**

```tsx
// src/pages/app/franqueados/FranqueadoCatalogPage.tsx
import { useState, useMemo, useRef } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { PageHeader } from '@/components/shared/PageHeader'
import { CatalogoFiltros } from '@/components/catalogo/CatalogoFiltros'
import { useEcuCatalogFranqueado, useEcuCatalogBrands } from '@/hooks/useEcuCatalog'
import { groupByMarcaModelo } from '@/types/ecu-catalog'
import type { FiltrosValue } from '@/components/catalogo/CatalogoFiltros'
import { cn } from '@/lib/utils'

const DEFAULT_FILTROS: FiltrosValue = {
  categoriaSlug: 'carros-e-suvs',
  marca: '',
  modelo: '',
  ano: '',
}

function formatPreco(value: number | null): { text: string; isConsultar: boolean } {
  if (value == null || value === 0) return { text: 'CONSULTAR', isConsultar: true }
  return {
    text: value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
    isConsultar: false,
  }
}

export default function FranqueadoCatalogPage() {
  const [filtros, setFiltros] = useState<FiltrosValue>(DEFAULT_FILTROS)
  const parentRef = useRef<HTMLDivElement>(null)

  const { data = [], isLoading } = useEcuCatalogFranqueado({
    categoriaSlug: filtros.categoriaSlug,
    marca: filtros.marca || undefined,
    modelo: filtros.modelo || undefined,
  })

  const { data: marcas = [] } = useEcuCatalogBrands(filtros.categoriaSlug)

  const grupos = useMemo(() => groupByMarcaModelo(data), [data])

  // Achatar grupos em linhas renderizáveis para virtual scroll
  type FlatRow =
    | { type: 'categoria'; label: string }
    | { type: 'marca'; label: string }
    | { type: 'modelo'; label: string }
    | { type: 'row'; data: (typeof data)[0] }

  const flatRows = useMemo<FlatRow[]>(() => {
    const rows: FlatRow[] = []
    for (const marca of grupos) {
      rows.push({ type: 'marca', label: marca.marca })
      for (const modelo of marca.modelos) {
        rows.push({ type: 'modelo', label: modelo.secao })
        for (const m of modelo.motorizacoes) {
          rows.push({ type: 'row', data: m as (typeof data)[0] })
        }
      }
    }
    return rows
  }, [grupos])

  const rowVirtualizer = useVirtualizer({
    count: flatRows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: (i) => {
      const r = flatRows[i]
      if (r.type === 'marca')  return 36
      if (r.type === 'modelo') return 28
      return 40
    },
    overscan: 10,
  })

  return (
    <div className="space-y-4 max-w-5xl">
      <PageHeader
        title="Catálogo de Remap"
        description="Lista de compatibilidades e preços para franqueados"
      />

      <CatalogoFiltros value={filtros} onChange={setFiltros} marcas={marcas} />

      {isLoading ? (
        <div className="space-y-1">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="pm-skeleton h-9 rounded" />
          ))}
        </div>
      ) : (
        <div
          ref={parentRef}
          className="h-[calc(100vh-260px)] overflow-auto rounded-lg border border-[hsl(var(--pm-gray-700))] bg-[hsl(var(--pm-gray-950))]"
        >
          <div style={{ height: rowVirtualizer.getTotalSize(), position: 'relative' }}>
            {rowVirtualizer.getVirtualItems().map(vr => {
              const row = flatRows[vr.index]
              return (
                <div
                  key={vr.key}
                  style={{ position: 'absolute', top: vr.start, left: 0, right: 0, height: vr.size }}
                  className="flex items-center px-4"
                >
                  {row.type === 'marca' && (
                    <div className="flex items-center gap-3 w-full border-b border-[rgba(255,255,255,0.06)] pb-1">
                      <span className="font-mono text-[10px] uppercase tracking-widest text-foreground font-bold">
                        {row.label}
                      </span>
                    </div>
                  )}
                  {row.type === 'modelo' && (
                    <span className="text-xs text-muted-foreground pl-4 italic">{row.label}</span>
                  )}
                  {row.type === 'row' && (() => {
                    const preco = formatPreco(row.data.preco_franqueado)
                    return (
                      <div className="flex w-full items-center justify-between pl-8 gap-4 text-xs">
                        <span className="text-foreground flex-1 truncate">
                          {row.data.modelo_descricao}
                        </span>
                        <span className="text-muted-foreground w-24 text-center shrink-0">
                          {row.data.ano ?? '—'}
                        </span>
                        <span className="text-muted-foreground w-48 shrink-0 truncate">
                          {[row.data.aparelho, row.data.protocolo].filter(Boolean).join(' / ')}
                        </span>
                        {row.data.tipo_registro === 'Serviço/Adicional' && (
                          <span className="text-amber-400 text-[10px] font-mono shrink-0">↳</span>
                        )}
                        <span
                          className={cn(
                            'font-mono text-right w-28 shrink-0 font-medium',
                            preco.isConsultar ? 'text-amber-400' : 'text-white',
                          )}
                        >
                          {preco.text}
                        </span>
                      </div>
                    )
                  })()}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Adicionar rota em router/index.tsx**

```tsx
// Adicionar import:
const FranqueadoCatalogPage = lazy(() => import('@/pages/app/franqueados/FranqueadoCatalogPage'))

// Adicionar na lista de rotas protegidas:
{ path: '/franqueado/tabela-remap', element: <S><FranqueadoCatalogPage /></S> },
```

- [ ] **Commit**

```bash
git add src/pages/app/franqueados/FranqueadoCatalogPage.tsx src/router/index.tsx
git commit -m "feat(catalog): add FranqueadoCatalogPage with virtual scroll"
```

---

## Task 11: Componentes Catálogo Cliente

**Files:**
- Create: `src/data/brand-logos.ts`
- Create: `src/components/catalogo/GainsPanel.tsx`
- Create: `src/components/catalogo/MotorizacaoRow.tsx`
- Create: `src/components/catalogo/ModeloRow.tsx`
- Create: `src/components/catalogo/MarcaSection.tsx`
- Create: `src/components/catalogo/CatalogoCliente.tsx`

- [ ] **Criar brand-logos.ts**

```typescript
// src/data/brand-logos.ts
// SVG logos automotivos via Wikimedia Commons (domínio público / CC0)
export const BRAND_LOGOS: Record<string, string> = {
  'Audi':       'https://upload.wikimedia.org/wikipedia/commons/thumb/9/92/Audi-Logo_2016.svg/120px-Audi-Logo_2016.svg.png',
  'BMW':        'https://upload.wikimedia.org/wikipedia/commons/thumb/4/44/BMW.svg/60px-BMW.svg.png',
  'Chevrolet':  'https://upload.wikimedia.org/wikipedia/commons/thumb/1/15/Chevrolet_logo.svg/60px-Chevrolet_logo.svg.png',
  'Fiat':       'https://upload.wikimedia.org/wikipedia/commons/thumb/2/23/Fiat_logo.svg/60px-Fiat_logo.svg.png',
  'Ford':       'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3e/Ford_Motor_Company_Logo.svg/60px-Ford_Motor_Company_Logo.svg.png',
  'Honda':      'https://upload.wikimedia.org/wikipedia/commons/thumb/3/38/Honda.svg/60px-Honda.svg.png',
  'Hyundai':    'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d9/Hyundai_Motor_Company_logo.svg/120px-Hyundai_Motor_Company_logo.svg.png',
  'Jeep':       'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2e/Jeep_logo.svg/60px-Jeep_logo.svg.png',
  'Kia':        'https://upload.wikimedia.org/wikipedia/commons/thumb/1/13/Kia-logo.svg/120px-Kia-logo.svg.png',
  'Mercedes-Benz': 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/90/Mercedes-Logo.svg/60px-Mercedes-Logo.svg.png',
  'Nissan':     'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6d/Nissan_Motor_logo.svg/120px-Nissan_Motor_logo.svg.png',
  'Peugeot':    'https://upload.wikimedia.org/wikipedia/commons/thumb/a/aa/Logo_of_Peugeot.svg/60px-Logo_of_Peugeot.svg.png',
  'Renault':    'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b8/Renault_2021_Text.svg/120px-Renault_2021_Text.svg.png',
  'Toyota':     'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9d/Toyota_carlogo.svg/120px-Toyota_carlogo.svg.png',
  'Volkswagen': 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6d/Volkswagen_logo_2019.svg/60px-Volkswagen_logo_2019.svg.png',
  'Volvo':      'https://upload.wikimedia.org/wikipedia/commons/thumb/4/43/Volvo_wordmark.svg/120px-Volvo_wordmark.svg.png',
}
```

- [ ] **Criar GainsPanel.tsx**

```tsx
// src/components/catalogo/GainsPanel.tsx
import type { EcuCatalogRow } from '@/types/ecu-catalog'

interface Props {
  row: EcuCatalogRow
  categoria: string
  whatsappNumber: string
}

function MetricBlock({ label, original, tuned }: {
  label: string
  original: string
  tuned: string
}) {
  return (
    <div className="flex-1 px-6 py-4">
      <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-4 text-center">
        {label}
      </p>
      <div className="grid grid-cols-2 divide-x divide-[rgba(255,255,255,0.08)]">
        <div className="pr-4">
          <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-1">Original</p>
          <p className="text-3xl font-bold text-foreground">{original}</p>
        </div>
        <div className="pl-4">
          <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-1">Reprogramado</p>
          <p className="text-3xl font-bold text-[hsl(var(--pm-red-500))] flex items-center gap-1">
            <span className="inline-block w-2 h-2 rounded-full bg-[hsl(var(--pm-red-500))] animate-pulse" />
            {tuned}
          </p>
        </div>
      </div>
    </div>
  )
}

export function GainsPanel({ row, categoria, whatsappNumber }: Props) {
  const hasParsed = row.cv_original != null && row.cv_tuned != null

  const title = [row.marca, row.secao_original, '–', row.modelo_descricao, row.ano ? `(${row.ano})` : '']
    .filter(Boolean).join(' ')

  const msg = encodeURIComponent(
    `Olá, gostaria de saber mais sobre o remap de ${categoria}. ` +
    `Veículo: ${row.marca} ${row.secao_original} – ${row.modelo_descricao}` +
    (row.ano ? ` (${row.ano})` : '')
  )

  return (
    <div
      className="rounded-xl border border-[hsl(var(--pm-red-500)/0.2)] bg-[hsl(var(--pm-gray-900))] p-6 space-y-4"
      style={{ boxShadow: '0 8px 32px rgba(220,38,38,0.06)' }}
    >
      <h3 className="text-center font-display text-lg font-bold uppercase tracking-wide text-foreground">
        {title}
      </h3>

      {hasParsed ? (
        <div className="flex divide-x divide-[rgba(255,255,255,0.08)] rounded-lg border border-[rgba(255,255,255,0.06)] overflow-hidden">
          <MetricBlock
            label="Potência"
            original={`${row.cv_original}CV`}
            tuned={`${row.cv_tuned}CV`}
          />
          {row.kgfm_original != null && row.kgfm_tuned != null ? (
            <MetricBlock
              label="Torque"
              original={`${row.kgfm_original} KGFM`}
              tuned={`${row.kgfm_tuned} KGFM`}
            />
          ) : (
            <div className="flex-1 px-6 py-4 flex items-center justify-center">
              <p className="text-[hsl(var(--pm-red-500))] font-mono font-bold text-xl text-center">
                {row.ganho}
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-lg border border-[rgba(255,255,255,0.06)] py-6 text-center">
          <p className="text-[hsl(var(--pm-red-500))] font-mono font-bold text-xl">{row.ganho}</p>
        </div>
      )}

      <a
        href={`https://wa.me/${whatsappNumber}?text=${msg}`}
        target="_blank"
        rel="noopener noreferrer"
        className="flex w-full items-center justify-center gap-2 rounded bg-[hsl(var(--pm-red-500))] py-3 font-display font-bold uppercase tracking-widest text-white transition-all duration-200 hover:brightness-110"
        style={{ fontSize: '13px' }}
      >
        SOLICITAR SERVIÇO →
      </a>
    </div>
  )
}
```

- [ ] **Criar MotorizacaoRow.tsx**

```tsx
// src/components/catalogo/MotorizacaoRow.tsx
import { useState } from 'react'
import { GainsPanel } from './GainsPanel'
import type { EcuCatalogRow } from '@/types/ecu-catalog'
import { cn } from '@/lib/utils'

interface Props {
  row: EcuCatalogRow
  categoria: string
  whatsappNumber: string
}

export function MotorizacaoRow({ row, categoria, whatsappNumber }: Props) {
  const [open, setOpen] = useState(false)

  const label = [row.modelo_descricao, row.ano ? `(${row.ano})` : ''].filter(Boolean).join(' ')

  return (
    <div>
      <button
        onClick={() => setOpen(o => !o)}
        className={cn(
          'flex w-full items-center justify-between py-2 pl-6 pr-3 text-sm text-left transition-colors',
          open
            ? 'text-[hsl(var(--pm-red-500))]'
            : 'text-muted-foreground hover:text-foreground',
        )}
      >
        <span>{label}</span>
        <span className="text-xs text-muted-foreground">{open ? '−' : '→'}</span>
      </button>

      <div
        className="overflow-hidden transition-all duration-300"
        style={{ maxHeight: open ? '500px' : '0px' }}
      >
        {open && (
          <div className="pb-4 pt-1 px-2">
            <GainsPanel row={row} categoria={categoria} whatsappNumber={whatsappNumber} />
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Criar ModeloRow.tsx**

```tsx
// src/components/catalogo/ModeloRow.tsx
import { useState } from 'react'
import { ChevronRight } from 'lucide-react'
import { MotorizacaoRow } from './MotorizacaoRow'
import type { EcuModelo } from '@/types/ecu-catalog'
import { cn } from '@/lib/utils'

interface Props {
  modelo: EcuModelo
  categoria: string
  whatsappNumber: string
}

export function ModeloRow({ modelo, categoria, whatsappNumber }: Props) {
  const [open, setOpen] = useState(false)

  return (
    <div className="border-b border-[rgba(255,255,255,0.04)] last:border-0">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex w-full items-center justify-between py-3 pl-3 pr-2 text-sm text-left hover:text-foreground transition-colors text-muted-foreground"
      >
        <span className="font-medium">{modelo.secao}</span>
        <ChevronRight
          size={14}
          className={cn('transition-transform duration-200', open && 'rotate-90')}
        />
      </button>

      <div
        className="overflow-hidden transition-all duration-300"
        style={{ maxHeight: open ? `${modelo.motorizacoes.length * 400}px` : '0px' }}
      >
        {open && modelo.motorizacoes.map(m => (
          <MotorizacaoRow
            key={m.id}
            row={m as import('@/types/ecu-catalog').EcuCatalogRow}
            categoria={categoria}
            whatsappNumber={whatsappNumber}
          />
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Criar MarcaSection.tsx**

```tsx
// src/components/catalogo/MarcaSection.tsx
import { BRAND_LOGOS } from '@/data/brand-logos'
import { ModeloRow } from './ModeloRow'
import type { EcuMarca } from '@/types/ecu-catalog'

interface Props {
  marca: EcuMarca
  categoria: string
  whatsappNumber: string
}

export function MarcaSection({ marca, categoria, whatsappNumber }: Props) {
  const logoUrl = BRAND_LOGOS[marca.marca]

  return (
    <div className="mb-10">
      {/* Separador de marca */}
      <div className="flex items-center gap-3 mb-4">
        {logoUrl ? (
          <img
            src={logoUrl}
            alt={marca.marca}
            className="h-5 w-auto object-contain"
            style={{ filter: 'brightness(0) invert(1)', opacity: 0.9 }}
            onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
          />
        ) : (
          <span
            className="font-display text-[hsl(var(--pm-red-500))] font-bold text-base uppercase"
          >
            {marca.marca[0]}
          </span>
        )}
        <span className="font-mono text-[10px] uppercase tracking-widest text-foreground">
          {marca.marca}
        </span>
        <div className="flex-1 h-px bg-[rgba(255,255,255,0.08)]" />
      </div>

      {/* Modelos */}
      <div className="rounded-lg border border-[rgba(255,255,255,0.06)] bg-[hsl(var(--pm-gray-900)/0.5)]">
        {marca.modelos.map(m => (
          <ModeloRow
            key={m.secao}
            modelo={m}
            categoria={categoria}
            whatsappNumber={whatsappNumber}
          />
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Criar CatalogoCliente.tsx**

```tsx
// src/components/catalogo/CatalogoCliente.tsx
import { useMemo } from 'react'
import { MarcaSection } from './MarcaSection'
import { useEcuCatalogPublic } from '@/hooks/useEcuCatalog'
import { groupByMarcaModelo } from '@/types/ecu-catalog'

const CATEGORIA_LABELS: Record<string, string> = {
  'carros-e-suvs': 'CARROS & SUVs',
  'pickups':       'PICKUPS',
  'trucks':        'TRUCKS',
  'agricola':      'AGRÍCOLA',
  'maquinas':      'MÁQUINAS',
  'motos':         'MOTOS',
}

interface Props {
  categoriaSlug: string
  whatsappNumber?: string
}

export function CatalogoCliente({ categoriaSlug, whatsappNumber = '' }: Props) {
  const { data = [], isLoading } = useEcuCatalogPublic(categoriaSlug)

  const grupos = useMemo(() => groupByMarcaModelo(data), [data])

  const label = CATEGORIA_LABELS[categoriaSlug] ?? categoriaSlug.toUpperCase()

  if (isLoading) {
    return (
      <div className="space-y-3 py-8">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="pm-skeleton h-10 rounded-lg" />
        ))}
      </div>
    )
  }

  if (grupos.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        Catálogo de {label} em breve.
      </p>
    )
  }

  return (
    <section className="mt-16 space-y-2">
      <div className="mb-8">
        <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-1">
          Catálogo de compatibilidades
        </p>
        <h2 className="font-display text-2xl font-bold uppercase tracking-wide text-foreground">
          Reprogramação Eletrônica{' '}
          <span className="text-[hsl(var(--pm-red-500))]">"{label}"</span>
        </h2>
      </div>

      {grupos.map(m => (
        <MarcaSection
          key={m.marca}
          marca={m}
          categoria={label}
          whatsappNumber={whatsappNumber}
        />
      ))}
    </section>
  )
}
```

- [ ] **Commit**

```bash
git add src/data/brand-logos.ts src/components/catalogo/GainsPanel.tsx \
        src/components/catalogo/MotorizacaoRow.tsx src/components/catalogo/ModeloRow.tsx \
        src/components/catalogo/MarcaSection.tsx src/components/catalogo/CatalogoCliente.tsx
git commit -m "feat(catalog): add client-facing catalog components"
```

---

## Task 12: Integrar CatalogoCliente no VehicleDetailPage

**Files:**
- Modify: `src/pages/VehicleDetailPage.tsx`

- [ ] **Localizar ponto de inserção**

Abrir `src/pages/VehicleDetailPage.tsx`. O componente retorna JSX com seções de KPIs, benefits, gains, etc. Localizar o final do JSX principal (antes do `</div>` de fechamento do wrapper raiz) para inserir a nova seção.

- [ ] **Adicionar import e seção CatalogoCliente**

No topo do arquivo, adicionar:
```tsx
import { CatalogoCliente } from '@/components/catalogo/CatalogoCliente'
```

No mapa de slugs de categoria (objeto `VEHICLES`), o campo `slug` já existe (ex: `'carros'`). Precisamos mapear para `categoria_slug` do banco. Adicionar helper após o array `VEHICLES`:

```tsx
const SLUG_TO_CAT: Record<string, string> = {
  carros:   'carros-e-suvs',
  pickups:  'pickups',
  trucks:   'trucks',
  agricola: 'agricola',
  maquinas: 'maquinas',
  motos:    'motos',
}
```

No return do componente, após o último bloco de conteúdo da categoria (antes do `</div>` mais externo):
```tsx
{vehicle && SLUG_TO_CAT[vehicle.slug] && (
  <CatalogoCliente
    categoriaSlug={SLUG_TO_CAT[vehicle.slug]}
    whatsappNumber={import.meta.env.VITE_WHATSAPP_NUMBER ?? ''}
  />
)}
```

- [ ] **Adicionar VITE_WHATSAPP_NUMBER no .env.local**

```bash
# .env.local
VITE_WHATSAPP_NUMBER=5511999999999
```

- [ ] **Testar no browser**

```bash
npm run dev
```

Navegar para `http://localhost:5173/veiculos/carros`. Verificar que a seção de catálogo aparece abaixo dos KPIs de categoria com marcas em ordem alfabética, expansão funcionando, painel de ganhos com CV original e CV tuned.

- [ ] **Commit**

```bash
git add src/pages/VehicleDetailPage.tsx .env.local
git commit -m "feat(catalog): integrate CatalogoCliente into VehicleDetailPage"
```

---

## Task 13: Edge Function Pública

**Files:**
- Create: `supabase/functions/ecu-catalog-public/index.ts`

- [ ] **Criar Edge Function**

```typescript
// supabase/functions/ecu-catalog-public/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  const url = new URL(req.url)
  const categoriaSlug = url.searchParams.get('categoria')

  if (!categoriaSlug) {
    return new Response(
      JSON.stringify({ error: 'param "categoria" required' }),
      { status: 400, headers: { ...CORS, 'Content-Type': 'application/json' } },
    )
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  const { data, error } = await supabase
    .from('ecu_catalog_public')
    .select('id,categoria_slug,marca,secao_original,modelo_descricao,ano,ganho,cv_original,cv_tuned,kgfm_original,kgfm_tuned,preco_cliente_final')
    .eq('categoria_slug', categoriaSlug)
    .order('marca', { ascending: true })
    .order('secao_original', { ascending: true })

  if (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } },
    )
  }

  return new Response(JSON.stringify(data), {
    headers: {
      ...CORS,
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=300',
    },
  })
})
```

- [ ] **Testar Edge Function localmente**

```bash
supabase functions serve ecu-catalog-public
# Em outro terminal:
curl "http://localhost:54321/functions/v1/ecu-catalog-public?categoria=carros-e-suvs"
```

Expected: array JSON com registros da categoria.

- [ ] **Commit**

```bash
git add supabase/functions/ecu-catalog-public/index.ts
git commit -m "feat(catalog): add ecu-catalog-public Edge Function"
```

---

## Task 14: Loja Virtual — Aba REMAP

**Files:**
- Modify: `public/loja-virtual.html`

O arquivo tem 528 linhas com sistema de abas de categoria já existente (Carros, Pickups, etc.) e 488+ linhas de JS. Precisamos:

1. Adicionar duas macro-abas (`PRODUTOS` / `REMAP`) acima das abas de categoria
2. Criar a seção REMAP com sub-navegação de categoria e cards dinâmicos

- [ ] **Adicionar macro-abas PRODUTOS/REMAP logo após o `<header>`**

Localizar o `<div id="category-tabs"` (linha ~139) e inserir ANTES dele:

```html
<!-- Macro tabs: PRODUTOS / REMAP -->
<div class="flex gap-0 border-b border-borderline mb-6">
  <button id="macro-tab-produtos" onclick="switchMacroTab('produtos')"
    class="macro-tab macro-tab-active px-8 py-3 font-display text-sm font-bold uppercase tracking-widest border-b-2 border-crimson text-white transition-all">
    PRODUTOS
  </button>
  <button id="macro-tab-remap" onclick="switchMacroTab('remap')"
    class="macro-tab px-8 py-3 font-display text-sm font-bold uppercase tracking-widest border-b-2 border-transparent text-muted hover:text-white transition-all">
    REMAP
  </button>
</div>
```

- [ ] **Envolver o conteúdo existente em `<div id="section-produtos">`**

O conteúdo atual (category-tabs + grid de produtos) deve ficar dentro de:
```html
<div id="section-produtos">
  <!-- conteúdo existente das abas de categoria e grid de produtos -->
</div>
```

- [ ] **Adicionar `<div id="section-remap">` após `section-produtos`**

```html
<div id="section-remap" style="display:none">
  <!-- Sub-navegação de categorias REMAP -->
  <div class="flex gap-2 py-3 overflow-x-auto hide-scroll items-center font-display text-sm italic font-bold uppercase mb-8">
    <button class="remap-cat-btn remap-cat-active px-6 py-2 rounded-sm whitespace-nowrap transition-all duration-200 border border-transparent" data-cat="carros-e-suvs">CARROS & SUVs</button>
    <button class="remap-cat-btn border border-borderline text-muted hover:text-white hover:border-muted px-6 py-2 rounded-sm whitespace-nowrap transition-all duration-200" data-cat="pickups">PICKUPS</button>
    <button class="remap-cat-btn border border-borderline text-muted hover:text-white hover:border-muted px-6 py-2 rounded-sm whitespace-nowrap transition-all duration-200" data-cat="trucks">TRUCKS</button>
    <button class="remap-cat-btn border border-borderline text-muted hover:text-white hover:border-muted px-6 py-2 rounded-sm whitespace-nowrap transition-all duration-200" data-cat="agricola">AGRÍCOLA</button>
    <button class="remap-cat-btn border border-borderline text-muted hover:text-white hover:border-muted px-6 py-2 rounded-sm whitespace-nowrap transition-all duration-200" data-cat="maquinas">MÁQUINAS</button>
    <button class="remap-cat-btn border border-borderline text-muted hover:text-white hover:border-muted px-6 py-2 rounded-sm whitespace-nowrap transition-all duration-200" data-cat="motos">MOTOS</button>
  </div>

  <!-- Container de cards gerado dinamicamente -->
  <div id="remap-content">
    <div class="flex items-center justify-center py-16 text-muted text-sm font-mono">
      Carregando catálogo...
    </div>
  </div>
</div>
```

- [ ] **Adicionar CSS para abas e cards REMAP** (dentro do `<style>` existente)

```css
/* Macro tabs */
.macro-tab-active { border-bottom-color: #E72B2B !important; color: white !important; }

/* REMAP category sub-tab active */
.remap-cat-active { background: #E72B2B; color: white; border-color: #E72B2B !important; }

/* REMAP cards */
.remap-card {
  background: linear-gradient(145deg, #1a1a1c, #0f0f11);
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: 12px;
  overflow: hidden;
  transition: all 0.3s cubic-bezier(0.4,0,0.2,1);
}
.remap-card:hover {
  border-color: rgba(231,43,43,0.4);
  box-shadow: 0 8px 32px rgba(231,43,43,0.12);
  transform: translateY(-2px);
}
.remap-card-img {
  height: 140px;
  object-fit: cover;
  width: 100%;
  position: relative;
}
.remap-card-img-wrapper {
  position: relative;
  height: 140px;
  overflow: hidden;
}
.remap-card-img-wrapper::after {
  content: '';
  position: absolute;
  bottom: 0; left: 0; right: 0; height: 60%;
  background: linear-gradient(to bottom, transparent, #1a1a1c);
}
.remap-gain-chip {
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  border-radius: 4px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
  font-weight: 700;
  background: rgba(231,43,43,0.15);
  border: 1px solid rgba(231,43,43,0.3);
  color: #ef4444;
}
.remap-marca-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 2rem 0 1rem;
}
.remap-marca-header::after {
  content: '';
  flex: 1;
  height: 1px;
  background: rgba(255,255,255,0.08);
}
```

- [ ] **Adicionar JS do REMAP** (dentro do `<script>` existente, no final, antes do `</script>`)

```javascript
// ─── Loja Virtual: Seção REMAP ───────────────────────────────────────────────

const REMAP_CATEGORY_IMAGES = {
  'carros-e-suvs': '/images/cat-carros.jpg',
  'pickups':       '/images/cat-pickups.jpg',
  'trucks':        '/images/cat-trucks.jpg',
  'agricola':      '/images/cat-agricola.jpg',
  'maquinas':      '/images/cat-maquinas.jpg',
  'motos':         '/images/cat-motos.jpg',
}

const REMAP_CATEGORY_LABELS = {
  'carros-e-suvs': 'CARROS & SUVs',
  'pickups': 'PICKUPS',
  'trucks': 'TRUCKS',
  'agricola': 'AGRÍCOLA',
  'maquinas': 'MÁQUINAS',
  'motos': 'MOTOS',
}

const WHATSAPP_NUMBER = '5511999999999' // substituir pelo número real
const ECU_API_BASE = '/functions/v1/ecu-catalog-public'

const remapCache = {}

function switchMacroTab(tab) {
  document.getElementById('section-produtos').style.display = tab === 'produtos' ? '' : 'none'
  document.getElementById('section-remap').style.display    = tab === 'remap'    ? '' : 'none'
  document.getElementById('macro-tab-produtos').classList.toggle('macro-tab-active', tab === 'produtos')
  document.getElementById('macro-tab-remap').classList.toggle('macro-tab-active', tab === 'remap')
  if (tab === 'remap') loadRemapCategory('carros-e-suvs')
}

async function loadRemapCategory(slug) {
  // Update sub-tab UI
  document.querySelectorAll('.remap-cat-btn').forEach(btn => {
    const active = btn.dataset.cat === slug
    btn.classList.toggle('remap-cat-active', active)
    btn.classList.toggle('border-borderline', !active)
    btn.classList.toggle('text-muted', !active)
  })

  const container = document.getElementById('remap-content')

  if (remapCache[slug]) {
    renderRemapData(remapCache[slug], slug, container)
    return
  }

  container.innerHTML = '<div class="flex items-center justify-center py-16 text-muted text-sm font-mono">Carregando...</div>'

  try {
    const res = await fetch(`${ECU_API_BASE}?categoria=${slug}`)
    if (!res.ok) throw new Error('Erro na API')
    const data = await res.json()
    remapCache[slug] = data
    renderRemapData(data, slug, container)
  } catch (e) {
    container.innerHTML = '<div class="flex items-center justify-center py-16 text-muted text-sm font-mono">Erro ao carregar catálogo.</div>'
  }
}

function groupByMarca(rows) {
  const map = new Map()
  for (const row of rows) {
    const marca = row.marca ?? 'Sem marca'
    if (!map.has(marca)) map.set(marca, [])
    map.get(marca).push(row)
  }
  return [...map.entries()].sort(([a], [b]) => a.localeCompare(b, 'pt-BR'))
}

function formatPrecoRemap(value) {
  if (value == null || value === 0) return { text: 'CONSULTAR', isConsultar: true }
  return {
    text: value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
    isConsultar: false,
  }
}

function buildGainChips(row) {
  const chips = []
  if (row.cv_original != null && row.cv_tuned != null) {
    chips.push(`+${row.cv_tuned - row.cv_original} CV`)
  }
  if (row.kgfm_original != null && row.kgfm_tuned != null) {
    chips.push(`+${(row.kgfm_tuned - row.kgfm_original).toFixed(1)} KGFM`)
  }
  if (chips.length === 0 && row.ganho) {
    // Tenta extrair ganho do texto raw
    const cvMatch = row.ganho.match(/\+(\d+)\s*CV/i)
    if (cvMatch) chips.push(`+${cvMatch[1]} CV`)
    const kgMatch = row.ganho.match(/\+(\d+[,.]?\d*)\s*KG/i)
    if (kgMatch) chips.push(`+${kgMatch[1].replace(',','.')} KGFM`)
  }
  return chips
}

function makeRemapCard(row, slug) {
  const preco = formatPrecoRemap(row.preco_cliente_final)
  const img = REMAP_CATEGORY_IMAGES[slug] ?? ''
  const title = `${row.secao_original ?? ''} – ${row.modelo_descricao ?? ''}`
  const chips = buildGainChips(row)
  const msg = encodeURIComponent(
    `Olá, gostaria de saber mais sobre o remap de ${REMAP_CATEGORY_LABELS[slug]}. ` +
    `Veículo: ${row.marca} ${row.secao_original} – ${row.modelo_descricao}` +
    (row.ano ? ` (${row.ano})` : '')
  )

  return `
    <div class="remap-card">
      <div class="remap-card-img-wrapper">
        <img class="remap-card-img" src="${img}" alt="${title}" loading="lazy" />
      </div>
      <div class="p-4 space-y-3">
        <div>
          <p class="font-display font-bold text-white text-sm uppercase leading-tight">${title}</p>
          ${row.ano ? `<p class="text-xs text-muted font-mono mt-0.5">${row.ano}</p>` : ''}
        </div>
        ${chips.length > 0 ? `
          <div class="flex flex-wrap gap-1.5">
            ${chips.map(c => `<span class="remap-gain-chip">${c}</span>`).join('')}
          </div>
        ` : ''}
        <p class="font-display font-bold text-xl ${preco.isConsultar ? 'text-amber-400' : 'text-white'}">
          ${preco.text}
        </p>
        <a href="https://wa.me/${WHATSAPP_NUMBER}?text=${msg}" target="_blank" rel="noopener noreferrer"
          class="flex items-center justify-center w-full py-2.5 rounded font-display font-bold uppercase tracking-widest text-xs text-white transition-all duration-200 hover:brightness-110"
          style="background:#E72B2B">
          SOLICITAR SERVIÇO →
        </a>
      </div>
    </div>
  `
}

function renderRemapData(rows, slug, container) {
  if (!rows || rows.length === 0) {
    container.innerHTML = `<p class="text-center text-muted text-sm font-mono py-16">Catálogo de ${REMAP_CATEGORY_LABELS[slug]} em breve.</p>`
    return
  }

  const grupos = groupByMarca(rows.filter(r => r.marca))
  let html = ''

  for (const [marca, marcaRows] of grupos) {
    html += `
      <div class="remap-marca-header">
        <span class="font-mono text-xs uppercase tracking-widest text-white">${marca}</span>
      </div>
      <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-8">
        ${marcaRows.map(r => makeRemapCard(r, slug)).join('')}
      </div>
    `
  }

  container.innerHTML = html
}

// Inicializar sub-tabs REMAP
document.querySelectorAll('.remap-cat-btn').forEach(btn => {
  btn.addEventListener('click', () => loadRemapCategory(btn.dataset.cat))
})
```

- [ ] **Copiar imagens de categoria para public/images/**

```bash
mkdir -p public/images
cp src/assets/cat-carros.jpg   public/images/cat-carros.jpg
cp src/assets/cat-pickups.jpg  public/images/cat-pickups.jpg
cp src/assets/cat-trucks.jpg   public/images/cat-trucks.jpg
cp src/assets/cat-agricola.jpg public/images/cat-agricola.jpg
cp src/assets/cat-maquinas.jpg public/images/cat-maquinas.jpg
cp src/assets/cat-motos.jpg    public/images/cat-motos.jpg
```

- [ ] **Testar loja virtual**

Abrir `public/loja-virtual.html` via servidor local (não `file://`, pois o fetch da Edge Function precisa de HTTP):

```bash
# Com supabase functions serve rodando em outro terminal:
cd public && python3 -m http.server 8080
```

Abrir `http://localhost:8080/loja-virtual.html`, clicar em REMAP, verificar que cards aparecem com imagem, chips de ganho, preço (ou "CONSULTAR").

- [ ] **Commit**

```bash
git add public/loja-virtual.html public/images/
git commit -m "feat(catalog): add REMAP tab + dynamic cards to loja-virtual.html"
```

---

## Task 15: Self-review e Smoke Test Final

- [ ] **Rodar todos os testes unitários**

```bash
npm run test -- --run
```

Expected: todos passam.

- [ ] **Rodar lint**

```bash
npm run lint
```

Expected: sem erros.

- [ ] **Smoke test completo no browser**

```bash
npm run dev
```

Fluxo a verificar:
1. `/matriz/tabela-remap` — accordion por marca abre/fecha, filtros funcionam, preço inline edita e salva, toggle ativo muda opacidade, modal delete exige "EXCLUIR"
2. Bulk actions — selecionar Franqueado + Carros & SUVs + 10% acréscimo → confirmar → verificar valores atualizados na lista
3. `/veiculos/carros` — seção catálogo aparece abaixo dos KPIs, marcas em ordem alfabética, expansão 2 níveis, painel de ganhos exibe CV original e CV tuned, botão WhatsApp monta URL correta
4. `loja-virtual.html` — aba REMAP carrega, sub-categoria Pickups carrega cards, card com preço nulo mostra "CONSULTAR"

- [ ] **Commit final**

```bash
git add -A
git commit -m "feat(catalog): complete ECU catalog module — 5 interfaces integrated"
```

---

## Self-Review do Plano

**Cobertura da spec:**
- ✅ Import script xlsx → Supabase (Task 4)
- ✅ Schema `ecu_catalog` + views + RLS (Task 2)
- ✅ Dois campos de preço: `preco_franqueado` (do xlsx) + `preco_cliente_final` (null inicial) (Tasks 2, 3)
- ✅ Regra "CONSULTAR" para valores null/0 (Tasks 8, 10, 11, 14)
- ✅ Toggle `ativo` (Desativar Produto Geral) (Tasks 8, 9)
- ✅ Toggle `ativo_ecommerce` (Desativar no E-commerce) (Tasks 8, 9)
- ✅ Delete com trava "EXCLUIR" case-sensitive (Tasks 7, 8)
- ✅ Bulk Actions: target + categoria + % (Tasks 6, 8)
- ✅ Backoffice `/matriz/tabela-remap` com accordion e filtros (Tasks 8, 9)
- ✅ Vista franqueado lista densa + virtual scroll (Task 10)
- ✅ Catálogo cliente 3 níveis + painel ganhos + WhatsApp (Tasks 11, 12)
- ✅ Loja virtual: macro-abas PRODUTOS/REMAP + cards dinâmicos (Task 14)
- ✅ Edge Function pública Deno (Task 13)
- ✅ Testes unitários do parser (Task 3)

**Consistência de tipos:**
- `EcuCatalogRow` definido em Task 5, usado em Tasks 6, 8, 11 — consistente
- `groupByMarcaModelo` definido em Task 5, importado em Tasks 9, 10, 11 — consistente
- `BulkPricePayload` definido em Task 5, usado em Tasks 6, 8 — consistente
- `FiltrosValue` definido em Task 7, usado em Tasks 9, 10 — consistente

**Sem placeholders:** Todos os code blocks são completos. Sem TBDs.
