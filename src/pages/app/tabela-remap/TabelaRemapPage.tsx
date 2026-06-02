// src/pages/app/tabela-remap/TabelaRemapPage.tsx
import { useState, useMemo, useRef, useCallback, useEffect } from 'react'
import { Search, Download, Upload, FileDown, Settings2, X, CheckCircle2, AlertCircle, Zap, Plus } from 'lucide-react'
import { BulkActionsPanel } from '@/components/catalogo/BulkActionsPanel'
import { CategoriaAccordion } from '@/components/catalogo/CategoriaAccordion'
import { CategoriasManagerModal } from '@/components/catalogo/CategoriasManagerModal'
import { AtualizarCanaisModal } from '@/components/catalogo/AtualizarCanaisModal'
import { EcuRecordForm } from '@/components/catalogo/EcuRecordForm'
import {
  useEcuCatalogList,
  useEcuCatalogBrands,
  useEcuCatalogCategoryStats,
  useEcuBulkReplace,
} from '@/hooks/useEcuCatalog'
import { useEcuCategories } from '@/hooks/useEcuCategories'
import {
  downloadEcuCsv, downloadEcuCsvTemplate, parseEcuCsv,
} from '@/lib/ecu-xml'
import type { FiltrosValue } from '@/components/catalogo/CatalogoFiltros'

const DEFAULT_FILTROS: FiltrosValue = {
  categoriaSlug: 'all',
  marca: '',
  modelo: '',
  ano: '',
  apenasAtivos: undefined,
}

interface ImportFeedback {
  type: 'success' | 'error'
  message: string
}

export default function TabelaRemapPage() {
  const [filtros, setFiltros] = useState<FiltrosValue>(DEFAULT_FILTROS)
  const [busca, setBusca] = useState('')
  const [openCategory, setOpenCategory] = useState<string | null>(null)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 1024)
    check()
    window.addEventListener('resize', check, { passive: true })
    return () => window.removeEventListener('resize', check)
  }, [])
  const [catModalOpen, setCatModalOpen] = useState(false)
  const [canaisModalOpen, setCanaisModalOpen] = useState(false)
  const [newRecordOpen, setNewRecordOpen] = useState(false)
  const [importFeedback, setImportFeedback] = useState<ImportFeedback | null>(null)
  const [importing, setImporting] = useState(false)
  const csvInputRef = useRef<HTMLInputElement>(null)

  const { data, isLoading, isError, error } = useEcuCatalogList({
    // fetch all; category grouping is client-side via accordion
    categoriaSlug: 'all',
    marca:        filtros.marca || undefined,
    modelo:       filtros.modelo || undefined,
    ano:          filtros.ano || undefined,
    apenasAtivos: filtros.apenasAtivos,
    pageSize: 5000,
  })

  const { data: marcas = [] }          = useEcuCatalogBrands(filtros.categoriaSlug)
  const { data: categoryCounts }       = useEcuCatalogCategoryStats()
  const { data: categorias = [] }      = useEcuCategories()
  const bulkReplace                    = useEcuBulkReplace()

  const totalCount = data?.count ?? 0

  // Client-side text search across all fields
  const filtered = useMemo(() => {
    const rows = data?.data ?? []
    const q = busca.trim().toLowerCase()
    if (!q) return rows
    return rows.filter(r =>
      [
        r.marca,
        r.secao_original,
        r.modelo_descricao,
        r.aparelho,
        r.protocolo,
        r.cabo,
        r.ganho,
        r.categoria,
        r.arquivo_origem,
        r.observacoes,
      ].some(v => v?.toLowerCase().includes(q)),
    )
  }, [data, busca])

  const handleToggleCategory = useCallback((slug: string) => {
    setOpenCategory(prev => (prev === slug ? null : slug))
  }, [])

  const handleDownloadCsv = useCallback(() => {
    downloadEcuCsv(filtered)
  }, [filtered])

  const handleImportCsvFile = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return
      setImporting(true)
      setImportFeedback(null)
      try {
        const text = await file.text()
        const { records } = parseEcuCsv(text)
        if (records.length === 0) throw new Error('Nenhum registro encontrado no CSV.')
        const { inserted } = await bulkReplace.mutateAsync(records)
        setImportFeedback({
          type: 'success',
          message: `Catálogo substituído: ${inserted} registros importados.`,
        })
      } catch (err) {
        setImportFeedback({
          type: 'error',
          message: err instanceof Error ? err.message : 'Erro ao importar CSV.',
        })
      } finally {
        setImporting(false)
        if (csvInputRef.current) csvInputRef.current.value = ''
      }
    },
    [bulkReplace],
  )

  const dismissFeedback = useCallback(() => setImportFeedback(null), [])

  const hasSearch = busca.trim().length > 0
  const filteredCount = filtered.length

  // helpers
  const sleekSelect = [
    'bg-black/20 border border-white/[0.08] text-white rounded-xl px-3 py-2',
    'text-xs font-light appearance-none cursor-pointer outline-none',
    'focus:border-white/30 focus:bg-black/40 transition-all',
    'text-gray-300',
  ].join(' ')

  const clearFilters = useCallback(() => {
    setBusca('')
    setFiltros(DEFAULT_FILTROS)
  }, [])

  const hasActiveFilters = busca.trim() !== '' ||
    filtros.categoriaSlug !== 'all' ||
    filtros.marca !== '' ||
    filtros.ano !== ''

  return (
    <div className="space-y-6">

      {/* ── METRICS + ACTIONS ── */}
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-6">

        {/* Left: big number */}
        <div className="flex items-center gap-5">
          <div className="flex items-baseline gap-1">
            <span className="text-[3.2rem] leading-none font-light text-white tracking-tighter">
              {hasSearch ? filteredCount : totalCount}
            </span>
          </div>
          <div className="flex flex-col border-l border-white/10 pl-5">
            <h1 className="text-[11px] font-semibold text-gray-300 tracking-[0.2em] uppercase mb-0.5">
              Arquivos ECU
            </h1>
            <p className="text-[10px] text-gray-500 tracking-wider">
              {hasSearch
                ? `de ${totalCount} — filtrando por "${busca}"`
                : 'Catálogo mestre ativo'}
            </p>
          </div>
        </div>

        {/* Right: action buttons */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Primary */}
          <button
            onClick={() => setNewRecordOpen(true)}
            className="flex items-center gap-2 bg-white hover:bg-gray-200 text-[#121318] text-[10px] font-bold uppercase tracking-widest px-5 py-2.5 rounded-lg transition-all shadow-[0_0_15px_rgba(255,255,255,0.08)]"
          >
            <Plus size={14} />
            Novo Registro
          </button>

          <div className="h-5 w-px bg-white/10 hidden sm:block" />

          {/* Atualizar Canais */}
          <button
            onClick={() => setCanaisModalOpen(true)}
            className="flex items-center gap-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 hover:text-blue-300 border border-blue-500/25 hover:border-blue-500/40 text-[10px] font-medium uppercase tracking-widest px-4 py-2.5 rounded-lg transition-all"
          >
            <Zap size={14} />
            Atualizar Canais
          </button>

          {/* CSV pill group */}
          <div className="flex items-center p-1 bg-[hsl(var(--pm-gray-950))]/60 border border-white/[0.06] rounded-lg">
            <button
              onClick={() => csvInputRef.current?.click()}
              disabled={importing || bulkReplace.isPending}
              className="flex items-center gap-1.5 text-gray-400 hover:text-white hover:bg-white/10 text-[10px] font-medium uppercase tracking-widest px-3 py-1.5 rounded transition-all"
            >
              <Upload size={13} />
              {importing ? 'Importando…' : 'Importar'}
            </button>
            <button
              onClick={handleDownloadCsv}
              disabled={filtered.length === 0}
              className="flex items-center gap-1.5 text-gray-400 hover:text-white hover:bg-white/10 text-[10px] font-medium uppercase tracking-widest px-3 py-1.5 rounded transition-all disabled:opacity-40"
            >
              <Download size={13} />
              Exportar
            </button>
            <div className="w-px h-4 bg-white/10 mx-1" />
            <button
              onClick={downloadEcuCsvTemplate}
              className="flex items-center gap-1.5 text-gray-400 hover:text-white hover:bg-white/10 text-[10px] font-medium uppercase tracking-widest px-3 py-1.5 rounded transition-all"
            >
              <FileDown size={13} />
              Modelo CSV
            </button>
          </div>
        </div>

        <input
          ref={csvInputRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={handleImportCsvFile}
        />
      </div>

      {/* Import feedback */}
      {importFeedback && (
        <div className={[
          'flex items-center gap-3 rounded-xl border px-4 py-3 text-sm',
          importFeedback.type === 'success'
            ? 'border-green-500/20 bg-green-500/[0.08] text-green-400'
            : 'border-red-500/20 bg-red-500/[0.08] text-red-400',
        ].join(' ')}>
          {importFeedback.type === 'success'
            ? <CheckCircle2 size={15} className="shrink-0" />
            : <AlertCircle size={15} className="shrink-0" />}
          <span className="flex-1 text-xs">{importFeedback.message}</span>
          <button onClick={dismissFeedback} className="hover:opacity-70 transition-opacity">
            <X size={13} />
          </button>
        </div>
      )}

      {/* ── COMMAND BAR (glass) ── */}
      <div className="rounded-2xl p-2 flex flex-col xl:flex-row gap-2 bg-[rgba(20,20,22,0.55)] backdrop-blur-xl border border-white/[0.06] shadow-[0_4px_30px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.04)]">

        {/* Search */}
        <div className="relative flex-1">
          <Search
            size={16}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none"
          />
          <input
            type="text"
            value={busca}
            onChange={e => setBusca(e.target.value)}
            placeholder="Buscar por marca, modelo, aparelho ou protocolo..."
            className="w-full bg-white/[0.07] rounded-xl border border-white/[0.12] text-white pl-11 pr-4 py-3.5 text-sm font-light placeholder-gray-400 focus:outline-none focus:ring-0 focus:bg-white/[0.10] focus:border-white/25 transition-all"
          />
          {busca && (
            <button
              onClick={() => setBusca('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
            >
              <X size={13} />
            </button>
          )}
        </div>

        {/* Divider */}
        <div className="w-px bg-white/[0.08] hidden xl:block my-2" />

        {/* Filter controls */}
        <div className="flex flex-wrap gap-2 p-1 items-center">
          <select
            value={filtros.categoriaSlug}
            onChange={e => setFiltros(f => ({ ...f, categoriaSlug: e.target.value }))}
            className={sleekSelect + ' min-w-[150px] flex-1'}
          >
            <option value="all">Todas Categorias</option>
            {categorias.map(c => (
              <option key={c.slug} value={c.slug}>{c.label}</option>
            ))}
          </select>

          <select
            value={filtros.marca}
            onChange={e => setFiltros(f => ({ ...f, marca: e.target.value }))}
            className={sleekSelect + ' min-w-[140px] flex-1'}
          >
            <option value="">Todas Marcas</option>
            {marcas.map(m => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>

          <input
            type="text"
            value={filtros.ano ?? ''}
            onChange={e => setFiltros(f => ({ ...f, ano: e.target.value }))}
            placeholder="Ano"
            className={sleekSelect + ' w-24 text-center'}
          />

          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white border border-transparent hover:border-white/10 text-[10px] font-medium uppercase tracking-widest px-4 py-2 rounded-xl transition-all"
            >
              Limpar
            </button>
          )}

          <button
            onClick={() => setCatModalOpen(true)}
            title="Gerenciar categorias"
            className="flex items-center gap-1.5 text-gray-500 hover:text-white hover:bg-white/10 text-[10px] font-medium uppercase tracking-widest px-3 py-2 rounded-xl transition-all border border-transparent hover:border-white/10"
          >
            <Settings2 size={13} />
            <span className="hidden sm:inline">Categorias</span>
          </button>
        </div>
      </div>

      {/* ── BULK ACTIONS (unchanged) ── */}
      <div>
        <BulkActionsPanel />
      </div>

      <CategoriasManagerModal
        open={catModalOpen}
        onClose={() => setCatModalOpen(false)}
        categoryCounts={categoryCounts}
      />

      <AtualizarCanaisModal
        open={canaisModalOpen}
        onClose={() => setCanaisModalOpen(false)}
      />

      <EcuRecordForm
        open={newRecordOpen}
        onClose={() => setNewRecordOpen(false)}
      />

      {/* ── CATEGORY ACCORDION BARS ── */}
      {isError ? (
        <div className="rounded-xl border border-red-500/20 bg-red-500/[0.06] px-5 py-8 text-center">
          <p className="text-sm font-medium text-red-400 mb-1">Erro ao carregar catálogo</p>
          <p className="text-xs text-red-400/60">{error instanceof Error ? error.message : 'Falha na consulta. Verifique sua sessão.'}</p>
        </div>
      ) : isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="pm-skeleton h-14 rounded-xl" />
          ))}
        </div>
      ) : (
        <div
          className="space-y-2"
          style={isMobile ? { margin: '0 -1.5rem' } : undefined}
        >
          {categorias.map(cat => {
            const catRows = filtered.filter(r => r.categoria_slug === cat.slug)
            return (
              <CategoriaAccordion
                key={cat.slug}
                category={cat}
                rows={catRows}
                isOpen={openCategory === cat.slug}
                onToggle={() => handleToggleCategory(cat.slug)}
              />
            )
          })}

          {/* Rows that don't match any known category */}
          {(() => {
            const knownSlugs = new Set(categorias.map(c => c.slug))
            const orphans = filtered.filter(r => !knownSlugs.has(r.categoria_slug))
            if (orphans.length === 0) return null
            return (
              <CategoriaAccordion
                key="__other__"
                category={{ id: '__other__', slug: '__other__', label: 'Outros', ordem: 99, ativo: true, created_at: '' }}
                rows={orphans}
                isOpen={openCategory === '__other__'}
                onToggle={() => handleToggleCategory('__other__')}
              />
            )
          })()}

          {filtered.length === 0 && !isLoading && (
            <p className="text-sm text-muted-foreground py-10 text-center">
              Nenhum registro encontrado com os filtros atuais.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
