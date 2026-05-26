// src/hooks/useEcuCatalog.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { EcuCatalogRow, CatalogFilters, BulkPricePayload } from '@/types/ecu-catalog'
import mockData from '@/data/ecu-catalog-mock.json'

const IS_MOCK = import.meta.env.VITE_MOCK === 'true'

const mkRow = (o: Partial<EcuCatalogRow>): EcuCatalogRow => ({
  id: crypto.randomUUID(),
  categoria: o.categoria ?? 'Carros & SUVs',
  categoria_slug: o.categoria_slug ?? 'carros-e-suvs',
  arquivo_origem: o.arquivo_origem ?? 'mock.xlsx',
  marca: o.marca ?? 'Volkswagen',
  secao_original: o.secao_original ?? 'Golf',
  modelo_descricao: o.modelo_descricao ?? '1.4 TSI',
  ano: o.ano ?? '2020/2021',
  tipo_registro: o.tipo_registro ?? 'Dados',
  ganho: o.ganho ?? '+30CV +5,2KG',
  cv_original: o.cv_original ?? 150,
  cv_tuned: o.cv_tuned ?? 180,
  kgfm_original: o.kgfm_original ?? null,
  kgfm_tuned: o.kgfm_tuned ?? null,
  aparelho: o.aparelho ?? 'Kess V2',
  protocolo: o.protocolo ?? 'OBD',
  cabo: o.cabo ?? 'K-TAG',
  preco_franqueado: o.preco_franqueado ?? 450,
  preco_cliente_final: o.preco_cliente_final ?? null,
  observacoes: o.observacoes ?? null,
  foto_url: o.foto_url ?? null,
  ativo: o.ativo ?? true,
  ativo_ecommerce: o.ativo_ecommerce ?? true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
})

const MOCK_ROWS: EcuCatalogRow[] = [
  // ── CARROS & SUVs ─────────────────────────────────────────────────────────
  mkRow({ marca:'Volkswagen', secao_original:'Golf',    modelo_descricao:'1.4 TSI 125cv',    ano:'2014/2020', cv_original:125, cv_tuned:155, preco_franqueado:380, preco_cliente_final:520, ganho:'+30CV +4,8KG', categoria:'Carros & SUVs', categoria_slug:'carros-e-suvs' }),
  mkRow({ marca:'Volkswagen', secao_original:'Golf',    modelo_descricao:'2.0 TSI GTI 220cv', ano:'2018/2023', cv_original:220, cv_tuned:270, preco_franqueado:580, preco_cliente_final:null, ganho:'+50CV +7,0KG', categoria:'Carros & SUVs', categoria_slug:'carros-e-suvs' }),
  mkRow({ marca:'Volkswagen', secao_original:'Polo',    modelo_descricao:'1.0 TSI 116cv',     ano:'2018/2023', cv_original:116, cv_tuned:140, preco_franqueado:320, preco_cliente_final:440, ganho:'+24CV +3,5KG', categoria:'Carros & SUVs', categoria_slug:'carros-e-suvs' }),
  mkRow({ marca:'Volkswagen', secao_original:'Tiguan',  modelo_descricao:'1.4 TSI 150cv',     ano:'2017/2022', cv_original:150, cv_tuned:185, preco_franqueado:420, preco_cliente_final:580, ganho:'+35CV +6,0KG', categoria:'Carros & SUVs', categoria_slug:'carros-e-suvs' }),
  mkRow({ marca:'BMW',        secao_original:'Série 3', modelo_descricao:'320i 184cv',        ano:'2019/2023', cv_original:184, cv_tuned:230, preco_franqueado:680, preco_cliente_final:null, ganho:'+46CV +8,2KG', categoria:'Carros & SUVs', categoria_slug:'carros-e-suvs' }),
  mkRow({ marca:'BMW',        secao_original:'Série 3', modelo_descricao:'330i 258cv',        ano:'2019/2023', cv_original:258, cv_tuned:320, preco_franqueado:780, preco_cliente_final:1080, ganho:'+62CV +10KG',  categoria:'Carros & SUVs', categoria_slug:'carros-e-suvs' }),
  mkRow({ marca:'Audi',       secao_original:'A3',      modelo_descricao:'1.4 TFSI 122cv',    ano:'2015/2020', cv_original:122, cv_tuned:155, preco_franqueado:380, preco_cliente_final:520, ganho:'+33CV +5,0KG', categoria:'Carros & SUVs', categoria_slug:'carros-e-suvs' }),
  mkRow({ marca:'Audi',       secao_original:'A4',      modelo_descricao:'2.0 TFSI 190cv',    ano:'2017/2023', cv_original:190, cv_tuned:240, preco_franqueado:580, preco_cliente_final:780, ganho:'+50CV +9,0KG', categoria:'Carros & SUVs', categoria_slug:'carros-e-suvs' }),
  mkRow({ marca:'Honda',      secao_original:'Civic',   modelo_descricao:'1.5 Turbo 173cv',   ano:'2017/2022', cv_original:173, cv_tuned:210, preco_franqueado:420, preco_cliente_final:580, ganho:'+37CV +6,2KG', categoria:'Carros & SUVs', categoria_slug:'carros-e-suvs' }),
  mkRow({ marca:'Toyota',     secao_original:'Corolla', modelo_descricao:'2.0 Altis 177cv',   ano:'2020/2023', cv_original:177, cv_tuned:210, preco_franqueado:380, preco_cliente_final:520, ganho:'+33CV +5,5KG', categoria:'Carros & SUVs', categoria_slug:'carros-e-suvs' }),
  mkRow({ marca:'Hyundai',    secao_original:'Creta',   modelo_descricao:'1.0 Turbo 120cv',   ano:'2022/2024', cv_original:120, cv_tuned:148, preco_franqueado:320, preco_cliente_final:440, ganho:'+28CV +4,0KG', categoria:'Carros & SUVs', categoria_slug:'carros-e-suvs' }),

  // ── PICKUPS ───────────────────────────────────────────────────────────────
  mkRow({ marca:'Volkswagen', secao_original:'Amarok',  modelo_descricao:'3.0 V6 TDI 224cv', ano:'2018/2023', cv_original:224, cv_tuned:290, preco_franqueado:780, preco_cliente_final:1050, ganho:'+66CV +14KG', categoria:'Pickups', categoria_slug:'pickups' }),
  mkRow({ marca:'Ford',       secao_original:'Ranger',  modelo_descricao:'3.2 TD 200cv',     ano:'2015/2022', cv_original:200, cv_tuned:250, preco_franqueado:680, preco_cliente_final:920,  ganho:'+50CV +12KG', categoria:'Pickups', categoria_slug:'pickups' }),
  mkRow({ marca:'Toyota',     secao_original:'Hilux',   modelo_descricao:'2.8 TDI 204cv',    ano:'2016/2023', cv_original:204, cv_tuned:255, preco_franqueado:680, preco_cliente_final:920,  ganho:'+51CV +11KG', categoria:'Pickups', categoria_slug:'pickups' }),
  mkRow({ marca:'Chevrolet',  secao_original:'S10',     modelo_descricao:'2.8 TD 200cv',     ano:'2016/2022', cv_original:200, cv_tuned:248, preco_franqueado:580, preco_cliente_final:null,  ganho:'+48CV +10KG', categoria:'Pickups', categoria_slug:'pickups' }),
  mkRow({ marca:'Nissan',     secao_original:'Frontier',modelo_descricao:'2.3 Biturbo 190cv',ano:'2017/2023', cv_original:190, cv_tuned:238, preco_franqueado:580, preco_cliente_final:800,  ganho:'+48CV +9,5KG', categoria:'Pickups', categoria_slug:'pickups' }),

  // ── MOTOS ─────────────────────────────────────────────────────────────────
  mkRow({ marca:'Honda',      secao_original:'CB 650R', modelo_descricao:'93cv',             ano:'2020/2024', cv_original:93,  cv_tuned:108, preco_franqueado:320, preco_cliente_final:440, ganho:'+15CV',       categoria:'Motos', categoria_slug:'motos' }),
  mkRow({ marca:'Kawasaki',   secao_original:'Z900',    modelo_descricao:'125cv',            ano:'2019/2023', cv_original:125, cv_tuned:142, preco_franqueado:380, preco_cliente_final:520, ganho:'+17CV',       categoria:'Motos', categoria_slug:'motos' }),
]

const QK = {
  list:        (f: CatalogFilters) => ['ecu-catalog', 'list', f] as const,
  brands:      (slug: string)       => ['ecu-catalog', 'brands', slug] as const,
  catStats:    ()                   => ['ecu-catalog', 'category-stats'] as const,
  franqueado:  (f: CatalogFilters)  => ['ecu-catalog', 'franqueado', f] as const,
  public:      (slug: string)       => ['ecu-catalog', 'public', slug] as const,
}

const LIST_CHUNK = 1000

export function useEcuCatalogList(filters: CatalogFilters = {}) {
  const { categoriaSlug, marca, modelo, ano, apenasAtivos, page = 0, pageSize = 50 } = filters

  return useQuery({
    queryKey: QK.list(filters),
    queryFn: async (): Promise<{ data: EcuCatalogRow[]; count: number }> => {
      if (IS_MOCK) {
        let rows = MOCK_ROWS
        if (categoriaSlug && categoriaSlug !== 'all') rows = rows.filter(r => r.categoria_slug === categoriaSlug)
        if (marca)  rows = rows.filter(r => r.marca === marca)
        if (modelo) rows = rows.filter(r => r.modelo_descricao?.toLowerCase().includes(modelo.toLowerCase()))
        if (ano)    rows = rows.filter(r => r.ano?.includes(ano))
        if (apenasAtivos === true)  rows = rows.filter(r => r.ativo)
        if (apenasAtivos === false) rows = rows.filter(r => !r.ativo)
        const sliced = rows.slice(page * pageSize, (page + 1) * pageSize)
        return { data: sliced, count: rows.length }
      }

      // When fetching "all" (pageSize > LIST_CHUNK), loop to bypass PostgREST max_rows=1000
      if (pageSize > LIST_CHUNK) {
        const all: EcuCatalogRow[] = []
        let offset = 0
        let total = 0
        while (true) {
          let q = supabase
            .from('ecu_catalog')
            .select('*', { count: offset === 0 ? 'exact' : undefined })
            .order('marca', { ascending: true })
            .order('secao_original', { ascending: true })
            .range(offset, offset + LIST_CHUNK - 1)

          if (categoriaSlug && categoriaSlug !== 'all') q = q.eq('categoria_slug', categoriaSlug)
          if (marca)   q = q.eq('marca', marca)
          if (modelo)  q = q.ilike('modelo_descricao', `%${modelo}%`)
          if (ano)     q = q.ilike('ano', `%${ano}%`)
          if (apenasAtivos === true)  q = q.eq('ativo', true)
          if (apenasAtivos === false) q = q.eq('ativo', false)

          const { data, error, count } = await q
          if (error) throw error
          const chunk = (data ?? []) as EcuCatalogRow[]
          all.push(...chunk)
          if (offset === 0) total = count ?? 0
          if (chunk.length < LIST_CHUNK) break
          offset += LIST_CHUNK
        }
        return { data: all, count: total }
      }

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
      return { data: (data ?? []) as EcuCatalogRow[], count: count ?? 0 }
    },
    staleTime: 60_000,
  })
}

interface CategoryKpis {
  maxCvGain: number | null
  maxKgfmGain: number | null
  avgGainPct: number | null
  vehicleCount: number
  modelCount: number
}

export function useEcuCatalogCategoryKpis(categoriaSlug: string) {
  return useQuery({
    queryKey: ['ecu-catalog', 'kpis', categoriaSlug] as const,
    enabled: !!categoriaSlug && categoriaSlug !== 'all',
    staleTime: 300_000,
    queryFn: async (): Promise<CategoryKpis | null> => {
      if (IS_MOCK) {
        const rows = MOCK_ROWS.filter(r => r.categoria_slug === categoriaSlug && r.ativo && r.ativo_ecommerce)
        if (!rows.length) return null
        const cvGains = rows.filter(r => r.cv_original != null && r.cv_tuned != null).map(r => r.cv_tuned! - r.cv_original!)
        const kgfmGains = rows.filter(r => r.kgfm_original != null && r.kgfm_tuned != null).map(r => r.kgfm_tuned! - r.kgfm_original!)
        const pcts = rows.filter(r => r.cv_original && r.cv_tuned).map(r => ((r.cv_tuned! - r.cv_original!) / r.cv_original!) * 100)
        return {
          maxCvGain: cvGains.length ? Math.max(...cvGains) : null,
          maxKgfmGain: kgfmGains.length ? Math.max(...kgfmGains) : null,
          avgGainPct: pcts.length ? Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length) : null,
          vehicleCount: rows.length,
          modelCount: new Set(rows.map(r => r.secao_original).filter(Boolean)).size,
        }
      }
      const { data, error } = await supabase
        .from('ecu_catalog')
        .select('cv_original,cv_tuned,kgfm_original,kgfm_tuned,secao_original')
        .eq('categoria_slug', categoriaSlug)
        .eq('ativo', true)
        .eq('ativo_ecommerce', true)
      if (error) return null
      if (!data?.length) return null

      type Row = { cv_original: number | null; cv_tuned: number | null; kgfm_original: number | null; kgfm_tuned: number | null; secao_original: string | null }
      const rows = data as Row[]
      const cvGains = rows.filter(r => r.cv_original != null && r.cv_tuned != null).map(r => r.cv_tuned! - r.cv_original!)
      const kgfmGains = rows.filter(r => r.kgfm_original != null && r.kgfm_tuned != null).map(r => r.kgfm_tuned! - r.kgfm_original!)
      const pcts = rows.filter(r => r.cv_original && r.cv_tuned).map(r => ((r.cv_tuned! - r.cv_original!) / r.cv_original!) * 100)
      return {
        maxCvGain: cvGains.length ? Math.max(...cvGains) : null,
        maxKgfmGain: kgfmGains.length ? Math.max(...kgfmGains) : null,
        avgGainPct: pcts.length ? Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length) : null,
        vehicleCount: data.length,
        modelCount: new Set(rows.map(r => r.secao_original).filter(Boolean)).size,
      }
    },
  })
}

export function useEcuCatalogCategoryStats() {
  return useQuery({
    queryKey: QK.catStats(),
    queryFn: async (): Promise<Record<string, number>> => {
      if (IS_MOCK) {
        const counts: Record<string, number> = {}
        for (const r of MOCK_ROWS) {
          counts[r.categoria_slug] = (counts[r.categoria_slug] ?? 0) + 1
        }
        return counts
      }
      const { data, error } = await supabase
        .from('ecu_catalog')
        .select('categoria_slug')
      if (error) throw error
      const counts: Record<string, number> = {}
      for (const r of data ?? []) {
        const s = r.categoria_slug as string
        counts[s] = (counts[s] ?? 0) + 1
      }
      return counts
    },
    staleTime: 300_000,
  })
}

export function useEcuCatalogBrands(categoriaSlug: string) {
  return useQuery({
    queryKey: QK.brands(categoriaSlug),
    queryFn: async (): Promise<string[]> => {
      if (IS_MOCK) {
        const rows = categoriaSlug !== 'all'
          ? MOCK_ROWS.filter(r => r.categoria_slug === categoriaSlug)
          : MOCK_ROWS
        return [...new Set(rows.map(r => r.marca).filter(Boolean) as string[])].sort()
      }
      let q = supabase
        .from('ecu_catalog')
        .select('marca')
        .not('marca', 'is', null)
        .order('marca', { ascending: true })

      if (categoriaSlug !== 'all') q = q.eq('categoria_slug', categoriaSlug)

      const { data, error } = await q
      if (error) throw error
      return [...new Set(data?.map(r => r.marca as string).filter(m => m && m.trim() !== '') ?? [])].sort()
    },
    staleTime: 300_000,
  })
}

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
    mutationFn: async (payload: BulkPricePayload): Promise<{ affected: number }> => {
      let q = supabase
        .from('ecu_catalog')
        .select(`id,${payload.target}`)
        .gt(payload.target, 0)

      if (payload.categoriaSlug !== 'all') q = q.eq('categoria_slug', payload.categoriaSlug)

      const { data, error } = await q
      if (error) throw error
      if (!data || data.length === 0) return { affected: 0 }

      const rows = data as Array<{ id: string } & Record<string, unknown>>
      const updates = rows.map(row => ({
        id: row.id,
        [payload.target]: Math.round(
          ((row[payload.target] as number) ?? 0) * (1 + payload.percentual / 100) * 100
        ) / 100,
      }))

      for (let i = 0; i < updates.length; i += 100) {
        const chunk = updates.slice(i, i + 100)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error: upsErr } = await supabase.from('ecu_catalog').upsert(chunk as any)
        if (upsErr) throw upsErr
      }

      return { affected: updates.length }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ecu-catalog'] }),
  })
}

export function useCreateEcuRecord() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (record: Omit<EcuCatalogRow, 'id' | 'created_at' | 'updated_at'>) => {
      if (IS_MOCK) return { ...record, id: crypto.randomUUID(), created_at: new Date().toISOString(), updated_at: new Date().toISOString() } as EcuCatalogRow
      const { data, error } = await supabase.from('ecu_catalog').insert(record).select().single()
      if (error) throw error
      return data as EcuCatalogRow
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ecu-catalog'] }),
  })
}

const FRANQ_CHUNK = 1000

export function useEcuCatalogFranqueado(filters: CatalogFilters = {}) {
  const { categoriaSlug, marca, modelo } = filters

  return useQuery({
    queryKey: QK.franqueado(filters),
    queryFn: async (): Promise<EcuCatalogRow[]> => {
      if (IS_MOCK) {
        let rows = MOCK_ROWS.filter(r => r.ativo)
        if (categoriaSlug && categoriaSlug !== 'all') rows = rows.filter(r => r.categoria_slug === categoriaSlug)
        if (marca)  rows = rows.filter(r => r.marca === marca)
        if (modelo) rows = rows.filter(r => r.modelo_descricao?.toLowerCase().includes(modelo.toLowerCase()))
        return rows
      }

      // Fetch all rows in chunks to bypass PostgREST max_rows=1000 limit
      const all: EcuCatalogRow[] = []
      let offset = 0
      while (true) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let q = (supabase as any)
          .from('ecu_catalog_franqueado')
          .select('*')
          .order('marca', { ascending: true })
          .order('secao_original', { ascending: true })
          .range(offset, offset + FRANQ_CHUNK - 1)

        if (categoriaSlug && categoriaSlug !== 'all') q = q.eq('categoria_slug', categoriaSlug)
        if (marca)  q = q.eq('marca', marca)
        if (modelo) q = q.ilike('modelo_descricao', `%${modelo}%`)

        const { data, error } = await q
        if (error) throw error
        const chunk = (data ?? []) as EcuCatalogRow[]
        all.push(...chunk)
        if (chunk.length < FRANQ_CHUNK) break
        offset += FRANQ_CHUNK
      }

      return all
    },
    staleTime: 300_000,
  })
}

export function useEcuBulkUpsert() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (
      records: Array<Omit<EcuCatalogRow, 'created_at' | 'updated_at'>>,
    ): Promise<{ inserted: number; updated: number }> => {
      if (IS_MOCK) {
        return { inserted: records.filter(r => !MOCK_ROWS.find(m => m.id === r.id)).length, updated: records.length }
      }

      const withId  = records.filter(r => r.id && r.id.trim() !== '')
      const withoutId = records
        .filter(r => !r.id || r.id.trim() === '')
        .map(r => ({ ...r, id: crypto.randomUUID() }))

      const now = new Date().toISOString()

      if (withoutId.length > 0) {
        const rows = withoutId.map(r => ({ ...r, created_at: now, updated_at: now }))
        for (let i = 0; i < rows.length; i += 200) {
          const { error } = await supabase.from('ecu_catalog').insert(rows.slice(i, i + 200))
          if (error) throw error
        }
      }

      if (withId.length > 0) {
        const rows = withId.map(r => ({ ...r, updated_at: now }))
        for (let i = 0; i < rows.length; i += 200) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { error } = await supabase.from('ecu_catalog').upsert(rows.slice(i, i + 200) as any, { onConflict: 'id' })
          if (error) throw error
        }
      }

      return { inserted: withoutId.length, updated: withId.length }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ecu-catalog'] }),
  })
}

export function useEcuBulkReplace() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (
      records: Array<Omit<EcuCatalogRow, 'created_at' | 'updated_at'>>,
    ): Promise<{ inserted: number }> => {
      if (IS_MOCK) {
        MOCK_ROWS.length = 0
        return { inserted: records.length }
      }

      // 1. Apaga TODOS os registros existentes
      const { error: delErr } = await supabase
        .from('ecu_catalog')
        .delete()
        .not('id', 'is', null)
      if (delErr) throw delErr

      // 2. Insere todos os novos com IDs frescos
      const now = new Date().toISOString()
      const rows = records.map(r => ({
        ...r,
        id: crypto.randomUUID(),
        created_at: now,
        updated_at: now,
      }))

      for (let i = 0; i < rows.length; i += 200) {
        const { error } = await supabase.from('ecu_catalog').insert(rows.slice(i, i + 200))
        if (error) throw error
      }

      return { inserted: rows.length }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ecu-catalog'] }),
  })
}

export interface ChannelStat {
  total: number
  ativados: number
  error: string | null
}

export interface ChannelPublishResult {
  franqueado: ChannelStat
  veiculos:   ChannelStat
  loja:       ChannelStat
  logs:       ChannelLogEntry[]
  hasErrors:  boolean
}

export interface ChannelLogEntry {
  ts:      string
  level:   'info' | 'warn' | 'error'
  canal:   string
  message: string
}

function logEntry(level: ChannelLogEntry['level'], canal: string, message: string): ChannelLogEntry {
  return { ts: new Date().toISOString(), level, canal, message }
}

export interface ChannelPreviewStat {
  total: number
  ativos: number
  inativos: number
}

export interface ChannelPreview {
  franqueado: ChannelPreviewStat
  ecommerce: ChannelPreviewStat
}

export function useChannelPreview(enabled: boolean) {
  return useQuery({
    queryKey: ['ecu-catalog', 'channel-preview'],
    enabled,
    staleTime: 0,
    queryFn: async (): Promise<ChannelPreview> => {
      if (IS_MOCK) {
        return {
          franqueado: {
            total: MOCK_ROWS.length,
            ativos: MOCK_ROWS.filter(r => r.ativo).length,
            inativos: MOCK_ROWS.filter(r => !r.ativo).length,
          },
          ecommerce: {
            total: MOCK_ROWS.length,
            ativos: MOCK_ROWS.filter(r => r.ativo_ecommerce).length,
            inativos: MOCK_ROWS.filter(r => !r.ativo_ecommerce).length,
          },
        }
      }

      const [
        { count: total },
        { count: franqInativos },
        { count: lojaInativos },
      ] = await Promise.all([
        supabase.from('ecu_catalog').select('*', { count: 'exact', head: true }),
        supabase.from('ecu_catalog').select('*', { count: 'exact', head: true }).eq('ativo', false),
        supabase.from('ecu_catalog').select('*', { count: 'exact', head: true }).eq('ativo_ecommerce', false),
      ])

      const t = total ?? 0
      const fi = franqInativos ?? 0
      const li = lojaInativos ?? 0
      return {
        franqueado: { total: t, ativos: t - fi, inativos: fi },
        ecommerce:  { total: t, ativos: t - li, inativos: li },
      }
    },
  })
}

export function usePublishChannels() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (): Promise<ChannelPublishResult> => {
      const logs: ChannelLogEntry[] = []

      if (IS_MOCK) {
        logs.push(logEntry('info', 'sistema', 'Modo mock — simulando publicação'))
        return {
          franqueado: { total: MOCK_ROWS.length, ativados: MOCK_ROWS.filter(r => !r.ativo).length, error: null },
          veiculos:   { total: MOCK_ROWS.length, ativados: MOCK_ROWS.filter(r => !r.ativo || !r.ativo_ecommerce).length, error: null },
          loja:       { total: MOCK_ROWS.length, ativados: MOCK_ROWS.filter(r => !r.ativo || !r.ativo_ecommerce).length, error: null },
          logs,
          hasErrors: false,
        }
      }

      // 1. Count total
      logs.push(logEntry('info', 'sistema', 'Iniciando publicação — contando registros'))
      const { count: totalCount, error: countErr } = await supabase
        .from('ecu_catalog')
        .select('*', { count: 'exact', head: true })
      if (countErr) logs.push(logEntry('warn', 'sistema', `Contagem falhou: ${countErr.message}`))
      const total = totalCount ?? 0
      logs.push(logEntry('info', 'sistema', `Total de registros no catálogo: ${total}`))

      // 2. Canal Franqueado — ativo = true
      logs.push(logEntry('info', 'franqueado', 'Ativando registros inativos (ativo=true)'))
      const franqStat: ChannelStat = { total, ativados: 0, error: null }
      const { data: franqRows, error: e1 } = await supabase
        .from('ecu_catalog')
        .update({ ativo: true })
        .eq('ativo', false)
        .select('id')
      if (e1) {
        franqStat.error = e1.message
        logs.push(logEntry('error', 'franqueado', `Falha ao ativar: ${e1.message} (code: ${e1.code})`))
      } else {
        franqStat.ativados = franqRows?.length ?? 0
        logs.push(
          franqStat.ativados > 0
            ? logEntry('info', 'franqueado', `${franqStat.ativados} registro(s) ativado(s) com sucesso`)
            : logEntry('info', 'franqueado', 'Nenhum registro precisava ser ativado — já sincronizado'),
        )
      }

      // 3. Canal Veículos + Loja — ativo_ecommerce = true
      logs.push(logEntry('info', 'loja/veículos', 'Ativando registros no e-commerce (ativo_ecommerce=true)'))
      const lojaStat: ChannelStat = { total, ativados: 0, error: null }
      const { data: lojaRows, error: e2 } = await supabase
        .from('ecu_catalog')
        .update({ ativo: true, ativo_ecommerce: true })
        .eq('ativo_ecommerce', false)
        .select('id')
      if (e2) {
        lojaStat.error = e2.message
        logs.push(logEntry('error', 'loja/veículos', `Falha ao ativar e-commerce: ${e2.message} (code: ${e2.code})`))
      } else {
        lojaStat.ativados = lojaRows?.length ?? 0
        logs.push(
          lojaStat.ativados > 0
            ? logEntry('info', 'loja/veículos', `${lojaStat.ativados} registro(s) publicado(s) na loja com sucesso`)
            : logEntry('info', 'loja/veículos', 'Nenhum registro precisava ser publicado — já sincronizado'),
        )
      }

      const hasErrors = !!(franqStat.error || lojaStat.error)
      if (!hasErrors) {
        logs.push(logEntry('info', 'sistema', 'Publicação concluída sem erros'))
      } else {
        logs.push(logEntry('error', 'sistema', 'Publicação concluída COM ERROS — verifique os canais afetados'))
      }

      return {
        franqueado: franqStat,
        veiculos:   lojaStat,
        loja:       lojaStat,
        logs,
        hasErrors,
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ecu-catalog'] }),
  })
}

const PUBLIC_CHUNK = 1000

// Uses raw fetch (not supabase-js) — supabase-js v2 hangs for anonymous public queries
export function useEcuCatalogPublic(categoriaSlug: string) {
  return useQuery({
    queryKey: QK.public(categoriaSlug),
    enabled: !!categoriaSlug,
    queryFn: async (): Promise<EcuCatalogRow[]> => {
      if (IS_MOCK) {
        return (mockData as EcuCatalogRow[]).filter(
          r => r.categoria_slug === categoriaSlug
            && r.tipo_registro !== 'Observação'
            && r.ativo_ecommerce,
        )
      }
      const base = import.meta.env.VITE_SUPABASE_URL as string
      const key  = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string
      const url  = `${base}/rest/v1/ecu_catalog_public?categoria_slug=eq.${categoriaSlug}&order=marca,secao_original,modelo_descricao`
      const all: EcuCatalogRow[] = []
      let offset = 0
      while (true) {
        const res = await fetch(url, {
          headers: {
            apikey: key,
            Authorization: `Bearer ${key}`,
            Range: `${offset}-${offset + PUBLIC_CHUNK - 1}`,
            'Range-Unit': 'items',
            Prefer: 'count=none',
          },
        })
        const data = await res.json()
        if (!Array.isArray(data)) break
        all.push(...(data as EcuCatalogRow[]))
        if (data.length < PUBLIC_CHUNK) break
        offset += PUBLIC_CHUNK
      }
      return all
    },
    staleTime: 300_000,
  })
}
