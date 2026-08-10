// src/hooks/useEcuCatalog.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { EcuCatalogRow, CatalogFilters, BulkPricePayload } from '@/types/ecu-catalog'

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
      const { data, error } = await supabase
        .from('ecu_catalog')
        .select('categoria_slug')
      if (error) throw error
      const counts: Record<string, number> = {}
      for (const r of data ?? []) {
        const s = r.categoria_slug
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
      let q = supabase
        .from('ecu_catalog')
        .select('marca')
        .not('marca', 'is', null)
        .order('marca', { ascending: true })

      if (categoriaSlug !== 'all') q = q.eq('categoria_slug', categoriaSlug)

      const { data, error } = await q
      if (error) throw error
      return [...new Set(data?.map(r => r.marca).filter(m => m && m.trim() !== '') ?? [])].sort()
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
      // RPC transaction: atomic delete + insert (no data loss on failure)
      const now = new Date().toISOString()
      const rows = records.map(r => ({
        ...r,
        id: crypto.randomUUID(),
        created_at: now,
        updated_at: now,
      }))

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await supabase.rpc('bulk_replace_ecu_catalog' as any, {
        p_records: rows,
      })

      if (error) throw error
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
