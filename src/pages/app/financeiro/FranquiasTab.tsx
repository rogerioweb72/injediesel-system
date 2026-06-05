// src/pages/app/financeiro/FranquiasTab.tsx
import { useState, useMemo, useEffect } from 'react'
import { ChevronDown, ChevronUp, Loader2, CheckCircle2, Building2, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  useSaldoFranquias, useFranchiseOpenJobs, usePayFranchiseJobs, markFranchiseTabSeen,
  fmtBRL, diasEmAberto, type SaldoFranquia, type FranchiseEcuJob,
} from '@/hooks/useFranquiasFinanceiro'
import { BadgeStatusFinanceiro } from '@/components/shared/BadgeStatusFinanceiro'

// ── Helpers ────────────────────────────────────────────────────────────────────

function diasColor(dias: number) {
  if (dias > 15) return '#F87171'
  if (dias >= 5) return '#FBBF24'
  return 'hsl(var(--pm-gray-400))'
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function exportCSV(jobs: FranchiseEcuJob[], nomeUnidade: string) {
  const header = 'Arquivo,Tipo,Cliente,Veículo,Data Envio,Valor'
  const rows = jobs.map((j) => {
    const veiculo = j.vehicles
      ? `${j.vehicles.brand} ${j.vehicles.model}`
      : [j.vehicle_info?.marca, j.vehicle_info?.modelo].filter(Boolean).join(' ') || '—'
    return [
      j.id.slice(0, 8).toUpperCase(),
      j.service_type,
      j.customers?.name ?? '—',
      veiculo,
      fmtDate(j.created_at),
      j.amount_charged_by_matrix.toFixed(2).replace('.', ','),
    ].join(',')
  })
  const csv = [header, ...rows].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `cobrancas-${nomeUnidade.replace(/\s+/g, '-')}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

// ── FranchiseCard ──────────────────────────────────────────────────────────────

function FranchiseCard({ saldo, searchQ }: { saldo: SaldoFranquia; searchQ: string }) {
  const [expanded, setExpanded] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [payOpen, setPayOpen] = useState(false)
  const [obs, setObs] = useState('')

  const { data: jobs = [], isLoading } = useFranchiseOpenJobs(expanded ? saldo.unit_id : '')
  const pay = usePayFranchiseJobs()

  const diasAntigo = diasEmAberto(saldo.data_mais_antiga)
  const cor = diasColor(diasAntigo)
  const selectedJobs = jobs.filter((j) => selected.has(j.id))
  const selectedTotal = selectedJobs.reduce((s, j) => s + j.amount_charged_by_matrix, 0)

  function toggleAll() {
    if (selected.size === jobs.length) setSelected(new Set())
    else setSelected(new Set(jobs.map((j) => j.id)))
  }

  function toggleJob(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function handlePay() {
    await pay.mutateAsync({
      unitId: saldo.unit_id,
      unitNome: saldo.nome,
      jobIds: [...selected],
      totalValor: selectedTotal,
      observacao: obs.trim() || undefined,
    })
    setPayOpen(false)
    setSelected(new Set())
    setObs('')
  }

  const nomeCompleto = `${saldo.nome} ${saldo.cidade ?? ''} ${saldo.uf ?? ''}`.toLowerCase()
  if (searchQ && !nomeCompleto.includes(searchQ.toLowerCase())) return null

  return (
    <div className="rounded-xl overflow-hidden" style={{ background: 'hsl(var(--pm-gray-900))', border: '1px solid rgba(255,255,255,0.06)' }}>
      <button
        className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-white/[0.02] transition-colors"
        onClick={() => setExpanded((v) => !v)}
      >
        <Building2 size={15} style={{ color: '#60A5FA', flexShrink: 0 }} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white truncate">{saldo.nome}</p>
          <p className="text-xs" style={{ color: 'hsl(var(--pm-gray-500))' }}>
            {saldo.cidade ?? '—'}/{saldo.uf ?? '—'} · {saldo.qtd_abertos} arquivo{saldo.qtd_abertos !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="text-right shrink-0 mr-3">
          <p className="text-sm font-bold text-white">{fmtBRL(saldo.total_em_aberto)}</p>
          <p className="text-[11px] font-medium" style={{ color: cor }}>
            {diasAntigo > 0 ? `há ${diasAntigo}d em aberto` : 'hoje'}
          </p>
        </div>
        {expanded
          ? <ChevronUp size={15} style={{ color: 'hsl(var(--pm-gray-500))' }} />
          : <ChevronDown size={15} style={{ color: 'hsl(var(--pm-gray-500))' }} />}
      </button>

      {expanded && (
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 size={18} className="animate-spin" style={{ color: 'hsl(var(--pm-gray-600))' }} />
            </div>
          ) : jobs.length === 0 ? (
            <p className="text-center text-sm py-6" style={{ color: 'hsl(var(--pm-gray-600))' }}>Nenhum arquivo em aberto</p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      {['', 'Arquivo', 'Tipo', 'Veículo', 'Data', 'Valor', 'Dias', 'Status'].map((h) => (
                        <th key={h} className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider"
                          style={{ color: 'hsl(var(--pm-gray-600))' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {jobs.map((job) => {
                      const dias = diasEmAberto(job.created_at)
                      const veiculo = job.vehicles
                        ? `${job.vehicles.brand} ${job.vehicles.model}`
                        : [job.vehicle_info?.marca, job.vehicle_info?.modelo].filter(Boolean).join(' ') || '—'
                      return (
                        <tr key={job.id}
                          style={{ borderTop: '1px solid rgba(255,255,255,0.04)', cursor: 'pointer' }}
                          onClick={() => toggleJob(job.id)}
                          className="hover:bg-white/[0.02] transition-colors"
                        >
                          <td className="px-3 py-2.5">
                            <input type="checkbox" checked={selected.has(job.id)}
                              onChange={() => toggleJob(job.id)}
                              onClick={(e) => e.stopPropagation()}
                              className="accent-red-500" />
                          </td>
                          <td className="px-3 py-2.5 font-mono text-xs text-white">{job.id.slice(0, 8).toUpperCase()}</td>
                          <td className="px-3 py-2.5 text-xs" style={{ color: 'hsl(var(--pm-gray-300))' }}>{job.service_type}</td>
                          <td className="px-3 py-2.5 text-xs" style={{ color: 'hsl(var(--pm-gray-400))' }}>{veiculo}</td>
                          <td className="px-3 py-2.5 text-xs" style={{ color: 'hsl(var(--pm-gray-500))' }}>{fmtDate(job.created_at)}</td>
                          <td className="px-3 py-2.5 text-xs font-semibold text-white">{fmtBRL(job.amount_charged_by_matrix)}</td>
                          <td className="px-3 py-2.5 text-xs font-semibold" style={{ color: diasColor(dias) }}>{dias}d</td>
                          <td className="px-3 py-2.5">
                            <BadgeStatusFinanceiro status="em_aberto" />
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-between gap-3 px-4 py-3 flex-wrap"
                style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="flex items-center gap-3">
                  <button onClick={toggleAll} className="text-xs underline underline-offset-2"
                    style={{ color: 'hsl(var(--pm-gray-500))' }}>
                    {selected.size === jobs.length ? 'Desmarcar todos' : 'Selecionar todos'}
                  </button>
                  {selected.size > 0 && (
                    <span className="text-xs" style={{ color: 'hsl(var(--pm-gray-400))' }}>
                      {selected.size} selecionado{selected.size > 1 ? 's' : ''} — {fmtBRL(selectedTotal)}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" onClick={() => exportCSV(jobs, saldo.nome)} className="gap-1.5 text-xs">
                    <Download size={12} /> Exportar CSV
                  </Button>
                  <Button size="sm" disabled={selected.size === 0} onClick={() => setPayOpen(true)}
                    style={{ background: selected.size > 0 ? 'hsl(var(--pm-red-500))' : undefined }}
                    className="gap-1.5 text-xs text-white border-0">
                    Pagar Selecionados
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      <Dialog open={payOpen} onOpenChange={(v) => !v && setPayOpen(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Confirmar Pagamento</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              Unidade: <span className="text-foreground font-semibold">{saldo.nome}</span>
            </p>
            <div className="rounded-lg overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
              {selectedJobs.map((j, i) => (
                <div key={j.id} className="flex justify-between items-center px-3 py-2 text-xs"
                  style={{ borderTop: i === 0 ? 'none' : '1px solid rgba(255,255,255,0.05)' }}>
                  <span style={{ color: 'hsl(var(--pm-gray-400))' }}>{j.service_type}</span>
                  <span className="font-semibold text-white">{fmtBRL(j.amount_charged_by_matrix)}</span>
                </div>
              ))}
              <div className="flex justify-between items-center px-3 py-2.5 text-sm font-bold"
                style={{ borderTop: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.03)' }}>
                <span style={{ color: 'hsl(var(--pm-gray-300))' }}>Total</span>
                <span className="text-white">{fmtBRL(selectedTotal)}</span>
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs" style={{ color: 'hsl(var(--pm-gray-500))' }}>Observação (opcional)</label>
              <textarea value={obs} onChange={(e) => setObs(e.target.value)} rows={2}
                placeholder="Ex: Pix ref. maio/2026"
                className="w-full rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1"
                style={{ background: 'hsl(var(--pm-gray-800))', border: '1px solid rgba(255,255,255,0.08)', color: 'hsl(var(--pm-gray-200))' }}
              />
            </div>
            <div className="flex justify-end gap-3 pt-1">
              <Button variant="ghost" onClick={() => setPayOpen(false)} disabled={pay.isPending}>Cancelar</Button>
              <Button onClick={handlePay} disabled={pay.isPending}
                style={{ background: 'hsl(var(--pm-red-500))' }}
                className="text-white border-0 min-w-[100px]">
                {pay.isPending ? <Loader2 size={14} className="animate-spin" /> : 'Confirmar'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ── FranquiasTab ───────────────────────────────────────────────────────────────

export default function FranquiasTab() {
  const { data: saldos = [], isLoading } = useSaldoFranquias()
  const [searchQ, setSearchQ] = useState('')
  const [onlyAtrasado, setOnlyAtrasado] = useState(false)

  useEffect(() => { markFranchiseTabSeen() }, [])

  const filtrados = useMemo(() => {
    return saldos.filter((s) => {
      if (onlyAtrasado && diasEmAberto(s.data_mais_antiga) <= 15) return false
      return true
    })
  }, [saldos, onlyAtrasado])

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <input type="text" value={searchQ} onChange={(e) => setSearchQ(e.target.value)}
          placeholder="Buscar unidade ou cidade..."
          className="rounded-lg px-3 py-2 text-sm flex-1 min-w-[200px] focus:outline-none focus:ring-1"
          style={{ background: 'hsl(var(--pm-gray-800))', border: '1px solid rgba(255,255,255,0.08)', color: 'hsl(var(--pm-gray-200))' }}
        />
        <label className="flex items-center gap-2 text-xs cursor-pointer" style={{ color: 'hsl(var(--pm-gray-400))' }}>
          <input type="checkbox" checked={onlyAtrasado} onChange={(e) => setOnlyAtrasado(e.target.checked)} className="accent-red-500" />
          Atraso &gt; 15 dias
        </label>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 size={22} className="animate-spin" style={{ color: 'hsl(var(--pm-gray-600))' }} />
        </div>
      ) : filtrados.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 rounded-xl"
          style={{ background: 'hsl(var(--pm-gray-900))', border: '1px dashed rgba(255,255,255,0.08)' }}>
          <CheckCircle2 size={32} style={{ color: 'hsl(var(--pm-gray-700))' }} />
          <p className="text-sm" style={{ color: 'hsl(var(--pm-gray-600))' }}>
            Nenhuma unidade com saldo em aberto 🎉
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtrados.map((s) => (
            <FranchiseCard key={s.unit_id} saldo={s} searchQ={searchQ} />
          ))}
        </div>
      )}
    </div>
  )
}
