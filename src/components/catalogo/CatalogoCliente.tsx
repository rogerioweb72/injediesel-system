import { useState, useMemo, useEffect } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { EcuCatalogRow } from '@/types/ecu-catalog'
import mockData from '@/data/ecu-catalog-mock.json'
import { brandLogos } from '@/data/brand-logos'
import { GainsPanel } from './GainsPanel'

const IS_MOCK = import.meta.env.VITE_MOCK === 'true'

const RED = 'hsl(var(--pm-red-500))'
const MONO = 'var(--pm-font-mono, "JetBrains Mono", monospace)'
const DISP = 'var(--pm-font-display, "Barlow Condensed", "Arial Narrow", Arial, sans-serif)'

function MotorizacaoRow({ record }: { record: EcuCatalogRow }) {
  const [isOpen, setIsOpen] = useState(false)

  const title = [record.secao_original, record.modelo_descricao].filter(Boolean).join(' – ')

  return (
    <div
      className={`mt-2 w-full transition-all duration-300 rounded-xl overflow-hidden border ${
        isOpen
          ? 'border-[#E60000]/15 bg-[#121319] shadow-[0_0_40px_rgba(230,0,0,0.06)]'
          : 'border-white/5 bg-[#121319]/80 hover:bg-[#121319] hover:border-white/10'
      }`}
    >
      {/* ── HEADER ── */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-6 text-left focus:outline-none cursor-pointer bg-transparent border-0"
      >
        <div className="flex items-start gap-4">
          <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${isOpen ? 'bg-[#E60000]' : 'bg-slate-600'}`} />
          <div>
            <span className="text-[11px] font-bold text-[#E60000] tracking-[0.15em] uppercase block mb-1">
              {record.marca}
            </span>
            <h3 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2 m-0">
              {title || '—'}
              {record.ano && (
                <span className="text-slate-500 font-normal text-lg tracking-normal">
                  ({record.ano})
                </span>
              )}
            </h3>
          </div>
        </div>

        <div className="w-10 h-10 rounded-xl bg-[#1D1E26] hover:bg-[#252732] border border-white/5 flex items-center justify-center text-slate-400 transition-colors shrink-0">
          {isOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </div>
      </button>

      {/* ── EXPANDED BODY ── */}
      <div className={`transition-all duration-500 ease-in-out origin-top overflow-hidden ${
        isOpen ? 'max-h-[900px] opacity-100' : 'max-h-0 opacity-0'
      }`}>
        <div className="px-5 pb-4 pt-1">
          <GainsPanel record={record} />
        </div>
      </div>
    </div>
  )
}

function MarcaSection({ marca, records, initialOpen = false }: { marca: string; records: EcuCatalogRow[]; initialOpen?: boolean }) {
  const [isOpen, setIsOpen] = useState(initialOpen)
  const logoUrl = brandLogos[marca.toUpperCase()]

  return (
    <div style={{ marginBottom: '2.5rem' }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: '12px', margin: '2rem 0 0.75rem',
          width: '100%', textAlign: 'left',
        }}
      >
        {logoUrl ? (
          <img src={logoUrl} alt={marca} style={{ width: '20px', height: '20px', objectFit: 'contain', filter: 'brightness(0) invert(1)', flexShrink: 0 }} />
        ) : (
          <span style={{ fontFamily: DISP, color: '#E60000', fontSize: '18px', fontWeight: 900, flexShrink: 0 }}>{marca.charAt(0)}</span>
        )}
        <h2 style={{
          fontFamily: DISP, fontSize: '20px', fontWeight: 900,
          color: '#E60000', textTransform: 'uppercase', letterSpacing: '0.12em',
          flex: 1, transform: 'skewX(-5deg)', display: 'inline-block',
        }}>
          {marca}
        </h2>
        <span style={{ fontFamily: MONO, fontSize: '10px', color: 'rgba(255,255,255,0.25)', flexShrink: 0 }}>
          {records.length} reg.
        </span>
      </button>
      <div style={{ height: '1px', background: 'linear-gradient(to right, rgba(230,0,0,0.35), transparent)', marginBottom: '6px' }} />
      {isOpen && (
        <div>
          {records.map(record => (
            <MotorizacaoRow key={record.id} record={record} />
          ))}
        </div>
      )}
    </div>
  )
}

export function CatalogoCliente({ categorySlug }: { categorySlug: string }) {
  const [records, setRecords] = useState<EcuCatalogRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [marcaFilter, setMarcaFilter] = useState('Todas as Marcas')

  useEffect(() => {
    if (IS_MOCK) {
      const filtered = (mockData as EcuCatalogRow[])
        .filter(r => r.categoria_slug === categorySlug && r.tipo_registro !== 'Observação' && r.ativo_ecommerce)
        .sort((a, b) => ((a.marca ?? '') > (b.marca ?? '') ? 1 : (a.marca ?? '') < (b.marca ?? '') ? -1 : 0))
      setRecords(filtered)
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    const base = `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/ecu_catalog_public?categoria_slug=eq.${categorySlug}&order=marca,secao_original,modelo_descricao`
    const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
    const CHUNK = 1000
    ;(async () => {
      const all: EcuCatalogRow[] = []
      let offset = 0
      try {
        while (true) {
          const res = await fetch(base, {
            headers: {
              apikey: key,
              Authorization: `Bearer ${key}`,
              Range: `${offset}-${offset + CHUNK - 1}`,
              'Range-Unit': 'items',
              Prefer: 'count=none',
            },
          })
          const data = await res.json()
          if (!Array.isArray(data)) break
          all.push(...(data as EcuCatalogRow[]))
          if (data.length < CHUNK) break
          offset += CHUNK
        }
        if (!cancelled) setRecords(all)
      } catch (err) {
        if (!cancelled) console.error('FETCH ERROR:', err)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [categorySlug])

  const allMarcas = useMemo(() => [...new Set(records.map(r => r.marca).filter((m): m is string => Boolean(m)))].sort(), [records])

  const filtered = useMemo(() => {
    let rows = records
    if (marcaFilter !== 'Todas as Marcas') rows = rows.filter(r => r.marca === marcaFilter)
    if (search.trim()) {
      const q = search.toLowerCase()
      rows = rows.filter(r =>
        r.modelo_descricao?.toLowerCase().includes(q) ||
        r.secao_original?.toLowerCase().includes(q) ||
        r.marca?.toLowerCase().includes(q)
      )
    }
    return rows
  }, [records, marcaFilter, search])

  const marcas = useMemo(() => {
    const result: Record<string, EcuCatalogRow[]> = {}
    for (const r of filtered) {
      const m = r.marca || 'SEM MARCA'
      if (!result[m]) result[m] = []
      result[m].push(r)
    }
    return result
  }, [filtered])

  const sortedMarcas = Object.keys(marcas).sort()

  if (loading) {
    return (
      <div style={{ padding: '4rem', textAlign: 'center' }}>
        <div style={{ width: '32px', height: '32px', border: `2px solid ${RED}`, borderBottomColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto' }} />
        <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  if (records.length === 0) return null

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 3rem' }}>
      <div style={{ marginBottom: '2rem' }}>
        <p style={{ fontFamily: MONO, fontSize: '0.72rem', fontWeight: 700, color: RED, letterSpacing: '0.22em', textTransform: 'uppercase', marginBottom: '0.6rem' }}>
          Veículos Compatíveis
        </p>
        <h2 style={{ fontFamily: DISP, fontWeight: 500, fontSize: 'clamp(2.2rem, 3.5vw, 3rem)', textTransform: 'uppercase', color: '#fff', lineHeight: 1.0, letterSpacing: '0.10em' }}>
          Tabela de Aplicação
        </h2>
      </div>

      {/* Filter bar */}
      <div style={{
        display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '2rem',
        padding: '16px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.07)',
      }}>
        <input
          type="text"
          placeholder="Buscar modelo, seção..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            flex: 1, minWidth: '180px', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '6px', padding: '8px 12px', color: '#fff', fontFamily: MONO, fontSize: '13px', outline: 'none',
          }}
        />
        <select
          value={marcaFilter}
          onChange={e => setMarcaFilter(e.target.value)}
          style={{
            background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '6px', padding: '8px 12px', color: '#fff', fontFamily: MONO, fontSize: '13px', outline: 'none',
            minWidth: '160px', cursor: 'pointer',
          }}
        >
          <option value="Todas as Marcas">Todas as Marcas</option>
          {allMarcas.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
        {(search || marcaFilter !== 'Todas as Marcas') && (
          <button
            onClick={() => { setSearch(''); setMarcaFilter('Todas as Marcas') }}
            style={{
              background: 'transparent', border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: '6px', padding: '8px 14px', color: 'rgba(255,255,255,0.5)',
              fontFamily: MONO, fontSize: '12px', cursor: 'pointer',
            }}
          >
            Limpar
          </button>
        )}
        <span style={{ alignSelf: 'center', fontFamily: MONO, fontSize: '11px', color: 'rgba(255,255,255,0.3)' }}>
          {filtered.length} resultado{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {sortedMarcas.length === 0 ? (
        <p style={{ fontFamily: MONO, fontSize: '13px', color: 'rgba(255,255,255,0.3)', textAlign: 'center', padding: '3rem 0' }}>
          Nenhum veículo encontrado para esta busca.
        </p>
      ) : (
        <div>
          {sortedMarcas.map((marca, i) => (
            <MarcaSection key={marca} marca={marca} records={marcas[marca]} initialOpen={i === 0} />
          ))}
        </div>
      )}
    </div>
  )
}
