// src/pages/app/franqueados/FranqueadoCatalogPage.tsx
import { useState, useMemo, useCallback } from 'react'
import { Search, X } from 'lucide-react'
import { CategoriaAccordion } from '@/components/catalogo/CategoriaAccordion'
import { useEcuCatalogFranqueado, useEcuCatalogBrands } from '@/hooks/useEcuCatalog'
import { useEcuCategories } from '@/hooks/useEcuCategories'
import type { FiltrosValue } from '@/components/catalogo/CatalogoFiltros'

const DEFAULT_FILTROS: FiltrosValue = {
  categoriaSlug: 'all',
  marca: '',
  modelo: '',
  ano: '',
}

export default function FranqueadoCatalogPage() {
  const [filtros, setFiltros] = useState<FiltrosValue>(DEFAULT_FILTROS)
  const [busca, setBusca] = useState('')
  const [openCategory, setOpenCategory] = useState<string | null>(null)

  const { data: allRows = [], isLoading, isError, error } = useEcuCatalogFranqueado({
    categoriaSlug: 'all',
    marca:  filtros.marca  || undefined,
    modelo: filtros.modelo || undefined,
    pageSize: 5000,
  })

  const { data: marcas = [] }     = useEcuCatalogBrands(filtros.categoriaSlug)
  const { data: categorias = [] } = useEcuCategories()

  const totalCount = allRows.length

  const filtered = useMemo(() => {
    let rows = allRows
    if (filtros.ano) rows = rows.filter(r => r.ano?.includes(filtros.ano))
    const q = busca.trim().toLowerCase()
    if (!q) return rows
    return rows.filter(r =>
      [r.marca, r.secao_original, r.modelo_descricao, r.aparelho, r.protocolo, r.cabo, r.ganho, r.categoria, r.observacoes]
        .some(v => v?.toLowerCase().includes(q)),
    )
  }, [allRows, busca, filtros.ano])

  const handleToggleCategory = useCallback((slug: string) => {
    setOpenCategory(prev => (prev === slug ? null : slug))
  }, [])

  const hasSearch = busca.trim().length > 0
  const filteredCount = filtered.length

  const hasActiveFilters = busca.trim() !== '' || filtros.categoriaSlug !== 'all' || filtros.marca !== '' || filtros.ano !== ''

  const sleekSelect = [
    'bg-black/20 border border-white/[0.08] text-white rounded-xl px-3 py-2',
    'text-xs font-light appearance-none cursor-pointer outline-none',
    'focus:border-white/30 focus:bg-black/40 transition-all text-gray-300',
  ].join(' ')

  const clearFilters = useCallback(() => { setBusca(''); setFiltros(DEFAULT_FILTROS) }, [])

  return (
    <div className="space-y-6">

      {/* ── METRICS ── */}
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
              : 'Catálogo de remapeamento'}
          </p>
        </div>
      </div>

      {/* ── COMMAND BAR ── */}
      <div className="rounded-2xl p-2 flex flex-col xl:flex-row gap-2 bg-[rgba(20,20,22,0.55)] backdrop-blur-xl border border-white/[0.06] shadow-[0_4px_30px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.04)]">

        <div className="relative flex-1">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
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

        <div className="w-px bg-white/[0.08] hidden xl:block my-2" />

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
        </div>
      </div>

      {/* ── ACCORDIONS (read-only) ── */}
      {isError ? (
        <div className="rounded-xl border border-red-500/20 bg-red-500/[0.06] px-5 py-8 text-center">
          <p className="text-sm font-medium text-red-400 mb-1">Erro ao carregar catálogo</p>
          <p className="text-xs text-red-400/60">{error instanceof Error ? error.message : 'Falha na consulta.'}</p>
        </div>
      ) : isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="pm-skeleton h-14 rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {categorias.map(cat => {
            const catRows = filtered.filter(r => r.categoria_slug === cat.slug)
            return (
              <CategoriaAccordion
                key={cat.slug}
                category={cat}
                rows={catRows}
                isOpen={openCategory === cat.slug}
                onToggle={() => handleToggleCategory(cat.slug)}
                readOnly
              />
            )
          })}

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
                readOnly
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
