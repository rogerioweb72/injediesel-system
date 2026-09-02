import { useState, Fragment, type ReactNode } from 'react'
import { toast } from 'sonner'
import { Activity, Search, Check, RotateCcw, ChevronDown, ChevronRight, AlertTriangle, Bug, Clock } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { translateError } from '@/lib/errors'
import { useErrorLogs, useErrorLogStats, useResolveError, type ErrorLog } from '@/hooks/useErrorLogs'

const LEVEL_COLOR: Record<string, string> = { fatal: '#F87171', error: '#FB923C', warn: '#FBBF24' }
const SOURCE_LABEL: Record<string, string> = { frontend: 'Front', edge: 'Edge', db: 'Banco' }

function fmt(v: string) { return new Date(v).toLocaleString('pt-BR') }

export default function MonitoramentoPage() {
  const [level, setLevel] = useState('all')
  const [source, setSource] = useState('all')
  const [resolved, setResolved] = useState<'open' | 'all' | 'resolved'>('open')
  const [q, setQ] = useState('')
  const [page, setPage] = useState(0)
  const [open, setOpen] = useState<string | null>(null)

  const { data, isLoading } = useErrorLogs({
    level: level === 'all' ? undefined : level,
    source: source === 'all' ? undefined : source,
    resolved, q, page,
  })
  const { data: stats } = useErrorLogStats()
  const resolve = useResolveError()

  const rows = data?.data ?? []
  const total = data?.total ?? 0

  async function toggleResolve(r: ErrorLog) {
    try { await resolve.mutateAsync({ id: r.id, resolved: !r.resolved }); toast.success(r.resolved ? 'Reaberto' : 'Resolvido') }
    catch (e) { toast.error(translateError(e)) }
  }

  return (
    <div>
      <PageHeader title="Monitoramento" subtitle="Erros, falhas e bugs do sistema (acesso restrito ao TI)" />

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-5 max-w-xl">
        <Stat icon={<Bug size={15} />} label="Em aberto" value={stats?.open ?? 0} color="#FB923C" />
        <Stat icon={<AlertTriangle size={15} />} label="Fatais (abertos)" value={stats?.fatal ?? 0} color="#F87171" />
        <Stat icon={<Clock size={15} />} label="Últimas 24h" value={stats?.last24h ?? 0} />
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="relative w-full sm:w-64">
          <Search size={14} className="absolute left-3 top-2.5 text-zinc-500" />
          <Input value={q} onChange={(e) => { setQ(e.target.value); setPage(0) }} placeholder="Buscar mensagem, rota, cargo..." className="pl-9 h-9" />
        </div>
        <Select value={level} onValueChange={(v) => { setLevel(v); setPage(0) }}>
          <SelectTrigger className="h-9 w-[130px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos níveis</SelectItem>
            <SelectItem value="fatal">Fatal</SelectItem>
            <SelectItem value="error">Erro</SelectItem>
            <SelectItem value="warn">Aviso</SelectItem>
          </SelectContent>
        </Select>
        <Select value={source} onValueChange={(v) => { setSource(v); setPage(0) }}>
          <SelectTrigger className="h-9 w-[130px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas origens</SelectItem>
            <SelectItem value="frontend">Front</SelectItem>
            <SelectItem value="edge">Edge</SelectItem>
            <SelectItem value="db">Banco</SelectItem>
          </SelectContent>
        </Select>
        <Select value={resolved} onValueChange={(v) => { setResolved(v as typeof resolved); setPage(0) }}>
          <SelectTrigger className="h-9 w-[130px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="open">Em aberto</SelectItem>
            <SelectItem value="resolved">Resolvidos</SelectItem>
            <SelectItem value="all">Todos</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="pm-skeleton h-64 rounded" />
      ) : rows.length === 0 ? (
        <div className="pm-card text-sm text-muted-foreground flex items-center gap-2">
          <Activity size={15} className="text-emerald-400" /> Nenhum erro {resolved === 'open' ? 'em aberto' : ''}. Sistema limpo. 🎉
        </div>
      ) : (
        <div className="pm-card p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[11px] uppercase tracking-wider text-zinc-500 text-left border-b border-white/[0.06]">
                  <th className="py-2.5 px-3"></th>
                  <th className="py-2.5 px-2">Quando</th>
                  <th className="py-2.5 px-2">Nível</th>
                  <th className="py-2.5 px-2">Origem</th>
                  <th className="py-2.5 px-2">Mensagem</th>
                  <th className="py-2.5 px-2">Rota</th>
                  <th className="py-2.5 px-2">Cargo</th>
                  <th className="py-2.5 px-2 text-right">Ação</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <Fragment key={r.id}>
                    <tr className="border-b border-white/[0.04] hover:bg-white/[0.02] cursor-pointer"
                      onClick={() => setOpen(open === r.id ? null : r.id)}>
                      <td className="py-2 px-3 text-zinc-600">{open === r.id ? <ChevronDown size={14} /> : <ChevronRight size={14} />}</td>
                      <td className="py-2 px-2 text-zinc-400 whitespace-nowrap">{fmt(r.created_at)}</td>
                      <td className="py-2 px-2">
                        <span className="text-[11px] px-2 py-0.5 rounded-full font-medium uppercase" style={{ color: LEVEL_COLOR[r.level], background: `${LEVEL_COLOR[r.level]}1a` }}>{r.level}</span>
                      </td>
                      <td className="py-2 px-2 text-zinc-400">{SOURCE_LABEL[r.source] ?? r.source}</td>
                      <td className="py-2 px-2 text-zinc-100 max-w-[340px] truncate">{r.message}</td>
                      <td className="py-2 px-2 text-zinc-500 max-w-[140px] truncate">{r.route ?? '—'}</td>
                      <td className="py-2 px-2 text-zinc-500">{r.user_role ?? '—'}</td>
                      <td className="py-2 px-2 text-right" onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => toggleResolve(r)} disabled={resolve.isPending}
                          className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md transition-colors"
                          style={{ color: r.resolved ? '#94A3B8' : '#34D399', background: r.resolved ? 'transparent' : '#34D39914' }}>
                          {r.resolved ? <><RotateCcw size={13} /> Reabrir</> : <><Check size={13} /> Resolver</>}
                        </button>
                      </td>
                    </tr>
                    {open === r.id && (
                      <tr className="border-b border-white/[0.04]" style={{ background: 'hsl(var(--pm-gray-900))' }}>
                        <td colSpan={8} className="px-6 py-3 space-y-2">
                          <p className="text-sm text-zinc-200 break-words"><strong>Mensagem:</strong> {r.message}</p>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[11px] text-zinc-500">
                            <span>Rota: <span className="text-zinc-300">{r.route ?? '—'}</span></span>
                            <span>Usuário: <span className="text-zinc-300">{r.user_id?.slice(0, 8) ?? '—'} ({r.user_role ?? '—'})</span></span>
                            <span>Unidade: <span className="text-zinc-300">{r.unit_id?.slice(0, 8) ?? '—'}</span></span>
                            <span>Navegador: <span className="text-zinc-300 truncate">{r.user_agent?.slice(0, 40) ?? '—'}</span></span>
                          </div>
                          {r.stack && (
                            <pre className="text-[11px] text-zinc-400 bg-black/30 rounded p-2 overflow-x-auto max-h-48 whitespace-pre-wrap">{r.stack}</pre>
                          )}
                          {r.context && <pre className="text-[11px] text-zinc-500 bg-black/20 rounded p-2 overflow-x-auto">{JSON.stringify(r.context, null, 2)}</pre>}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Paginação */}
      {total > 50 && (
        <div className="flex items-center justify-between mt-3 text-sm text-zinc-400">
          <span>{total} registros</span>
          <div className="flex gap-2">
            <button disabled={page === 0} onClick={() => setPage((p) => Math.max(0, p - 1))} className="px-3 py-1 rounded border border-white/10 disabled:opacity-40">Anterior</button>
            <button disabled={(page + 1) * 50 >= total} onClick={() => setPage((p) => p + 1)} className="px-3 py-1 rounded border border-white/10 disabled:opacity-40">Próxima</button>
          </div>
        </div>
      )}
    </div>
  )
}

function Stat({ icon, label, value, color }: { icon: ReactNode; label: string; value: number; color?: string }) {
  return (
    <div className="rounded-lg px-3 py-2.5" style={{ background: 'hsl(var(--pm-gray-900))', border: '1px solid rgba(255,255,255,0.06)' }}>
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-zinc-500">
        <span style={{ color: color ?? '#94A3B8' }}>{icon}</span> {label}
      </div>
      <p className="mt-0.5 text-xl font-bold" style={{ color: color ?? '#fff' }}>{value}</p>
    </div>
  )
}
