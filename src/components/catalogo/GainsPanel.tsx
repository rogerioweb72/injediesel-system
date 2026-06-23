// src/components/catalogo/GainsPanel.tsx
import type { EcuCatalogRow } from '@/types/ecu-catalog'
import { Check, Flame, Gauge, Zap, ArrowUpRight } from 'lucide-react'

const DISP = 'var(--pm-font-display, "Barlow Condensed", "Arial Narrow", Arial, sans-serif)'

const toNum = (s: string) => parseFloat(s.replace(',', '.'))

function parseGanho(ganho: string | null): { cv: number | null; kgfm: number | null } {
  if (!ganho) return { cv: null, kgfm: null }
  const cvMatch  = ganho.match(/\+(\d+(?:[,.]\d+)?)\s*CV/i)
  const kgMatch  = ganho.match(/(\d+(?:[,.]\d+)?)\s*KG/i)
  return {
    cv:   cvMatch ? toNum(cvMatch[1])  : null,
    kgfm: kgMatch ? toNum(kgMatch[1]) : null,
  }
}

function parseCvFromModel(modelo: string | null): number | null {
  if (!modelo) return null
  const matches = [...modelo.matchAll(/(\d+(?:[,.]\d+)?)\s*[Cc][Vv]/g)]
  if (!matches.length) return null
  return toNum(matches[matches.length - 1][1])
}

function NumDisplay({ value, unit, dim = false }: { value: string | number | null; unit: string; dim?: boolean }) {
  const display = value ?? '—'
  return (
    <span style={{
      fontFamily: DISP,
      fontWeight: 900,
      fontStyle: 'italic',
      fontSize: '2.4rem',
      letterSpacing: '0.02em',
      lineHeight: 1,
      color: dim ? 'rgba(148,163,184,1)' : '#fff',
      display: 'flex',
      alignItems: 'baseline',
      gap: '0.3rem',
    }}>
      {display}
      {value != null && (
        <span style={{ fontSize: '1rem', fontStyle: 'normal', fontWeight: 700, opacity: 0.6 }}>{unit}</span>
      )}
    </span>
  )
}

export function GainsPanel({ record }: { record: EcuCatalogRow }) {
  const isConsult = !record.preco_cliente_final || record.preco_cliente_final === 0

  const parsedGanho = parseGanho(record.ganho)

  // CV — valores das colunas
  const cvOriginal  = record.cv_original ?? parseCvFromModel(record.modelo_descricao)
  const cvTuned     = record.cv_tuned    ?? (cvOriginal != null && parsedGanho.cv != null ? Math.round(cvOriginal + parsedGanho.cv) : null)
  // O que exibir em "Reprogramado": valor absoluto se temos original, caso contrário "+N" do ganho
  const cvRepDisp   = cvTuned != null ? cvTuned : (parsedGanho.cv != null ? `+${parsedGanho.cv}` : null)
  // Badge de ganho: diferença calculada OU o ganho bruto do texto
  const cvGainBadge = (cvTuned != null && cvOriginal != null)
    ? Math.round((cvTuned - cvOriginal) * 10) / 10
    : parsedGanho.cv ?? null

  // KGFM — mesma lógica simétrica
  const kgfmOriginal = record.kgfm_original ?? null
  const kgfmTuned    = record.kgfm_tuned    ?? (parsedGanho.kgfm != null ? parsedGanho.kgfm : null)
  const kgfmRepDisp  = kgfmTuned != null ? (kgfmOriginal != null ? kgfmTuned : `+${kgfmTuned}`) : null

  const handleWhatsApp = () => {
    const msg = encodeURIComponent(
      `Olá, gostaria de saber mais sobre o remap de ${record.categoria}. ` +
      `Veículo: ${record.marca} ${record.secao_original} – ${record.modelo_descricao} (${record.ano})`
    )
    window.open(`https://wa.me/${import.meta.env.VITE_WHATSAPP_NUMBER || '5511999999999'}?text=${msg}`, '_blank')
  }

  return (
    <div className="flex flex-col gap-4">

      {/* CARD 1: POTÊNCIA */}
      <div className="bg-[#181920] rounded-xl border border-white/5 p-6 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-[#FF4B2B] to-[#E60000]" />

        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-bold tracking-widest text-slate-300 uppercase flex items-center gap-2">
            <Gauge size={16} className="text-[#E60000]" />
            POTÊNCIA (CV)
          </span>
          {cvGainBadge != null && cvGainBadge > 0 && (
            <span className="text-xs font-bold text-emerald-400 bg-emerald-950/40 px-3 py-1.5 rounded-md border border-emerald-800/50">
              +{cvGainBadge} CV estimado
            </span>
          )}
        </div>

        <div className="grid grid-cols-2">
          <div className="flex flex-col justify-center">
            <span className="text-[10px] text-slate-500 uppercase font-bold tracking-widest mb-1">Original</span>
            <NumDisplay value={cvOriginal} unit="CV" dim />
          </div>
          <div className="flex flex-col justify-center pl-8 border-l border-white/5">
            <span className="text-[10px] text-slate-500 uppercase font-bold tracking-widest mb-1">Reprogramado</span>
            <div className="flex items-center gap-3">
              <NumDisplay value={cvRepDisp} unit="CV" />
              {cvRepDisp != null && <Check size={22} strokeWidth={2.5} className="text-emerald-500" />}
            </div>
          </div>
        </div>
      </div>

      {/* CARD 2: TORQUE */}
      <div className="bg-[#181920] rounded-xl border border-white/5 p-6 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-blue-600 to-[#E60000]" />

        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-bold tracking-widest text-slate-300 uppercase flex items-center gap-2">
            <Zap size={16} className="text-[#E60000]" />
            TORQUE (KGFM)
          </span>
        </div>

        <div className="grid grid-cols-2">
          <div className="flex flex-col justify-center">
            <span className="text-[10px] text-slate-500 uppercase font-bold tracking-widest mb-1">Original</span>
            <NumDisplay value={kgfmOriginal} unit="KGFM" dim />
          </div>
          <div className="flex flex-col justify-center pl-8 border-l border-white/5">
            <span className="text-[10px] text-slate-500 uppercase font-bold tracking-widest mb-1">Reprogramado</span>
            <div className="flex items-center gap-3">
              <NumDisplay value={kgfmRepDisp} unit="KGFM" />
              {kgfmRepDisp != null && <Check size={22} strokeWidth={2.5} className="text-emerald-500" />}
            </div>
          </div>
        </div>
      </div>

      {/* BANNER CTA INFERIOR */}
      <div className="mt-0 p-6 rounded-xl border border-white/5 bg-[#181920] flex flex-col md:flex-row items-start md:items-center justify-between gap-6">

        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-xl bg-[#E60000]/10 flex items-center justify-center shrink-0">
            <Flame className="text-[#E60000]" size={24} strokeWidth={2} />
          </div>
          <div className="flex flex-col gap-0.5">
            <h4 className="text-white font-black text-lg tracking-tight italic m-0">
              GANHO BRUTO GARANTIDO
            </h4>
            <p className="text-sm text-slate-400 m-0">
              Instalação limpa via OBD / sem perda de garantia.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-6 w-full md:w-auto">
          <div className="text-left">
            <span className="text-[10px] text-slate-500 uppercase font-bold tracking-widest block mb-1">
              Investimento
            </span>
            <span className="text-white font-black tracking-wider text-lg uppercase leading-tight block">
              {isConsult
                ? <span>SOB<br />CONSULTA</span>
                : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(record.preco_cliente_final!)}
            </span>
          </div>

          <button
            onClick={handleWhatsApp}
            className="px-6 py-3.5 bg-gradient-to-r from-[#FF4B2B] to-[#E60000] rounded flex items-center gap-4 hover:shadow-[0_0_25px_rgba(230,0,0,0.35)] transition-all transform -skew-x-[8deg] group shrink-0 border-0 cursor-pointer"
          >
            <span className="text-white font-black tracking-wider text-sm uppercase leading-tight italic transform skew-x-[8deg] text-left">
              FALE COM UM<br />ESPECIALISTA
            </span>
            <ArrowUpRight size={20} className="text-white transform skew-x-[8deg] group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
          </button>
        </div>
      </div>

    </div>
  )
}
