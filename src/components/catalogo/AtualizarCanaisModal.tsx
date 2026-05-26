// src/components/catalogo/AtualizarCanaisModal.tsx
import { useState, useRef } from 'react'
import {
  Users, Car, ShoppingBag, CheckCircle2, Loader2, Zap,
  Image, AlertCircle, Terminal, ChevronDown, ChevronUp, Download,
  ArrowRight, RefreshCw,
} from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { usePublishChannels, useChannelPreview } from '@/hooks/useEcuCatalog'
import type { ChannelPublishResult, ChannelLogEntry } from '@/hooks/useEcuCatalog'

interface Props {
  open: boolean
  onClose: () => void
}

const CHANNELS = [
  {
    key: 'franqueado' as const,
    previewKey: 'franqueado' as const,
    icon: Users,
    label: 'Painel Franqueado',
    desc: 'Registros com ativo=true ficam visíveis para franqueados',
    color: 'text-blue-400',
    border: 'border-blue-500/20',
    bg: 'bg-blue-500/[0.06]',
    pill: 'bg-blue-500/10 text-blue-400',
  },
  {
    key: 'veiculos' as const,
    previewKey: 'ecommerce' as const,
    icon: Car,
    label: 'Página de Veículos',
    desc: 'Catálogo público — ativo + ativo_ecommerce',
    color: 'text-green-400',
    border: 'border-green-500/20',
    bg: 'bg-green-500/[0.06]',
    pill: 'bg-green-500/10 text-green-400',
  },
  {
    key: 'loja' as const,
    previewKey: 'ecommerce' as const,
    icon: ShoppingBag,
    label: 'Loja Virtual',
    desc: 'E-commerce — itens sem foto usam imagem padrão ECU',
    color: 'text-purple-400',
    border: 'border-purple-500/20',
    bg: 'bg-purple-500/[0.06]',
    pill: 'bg-purple-500/10 text-purple-400',
    badge: { icon: Image, text: 'Com imagem padrão' },
  },
]

function levelColor(level: ChannelLogEntry['level']) {
  if (level === 'error') return 'text-red-400'
  if (level === 'warn')  return 'text-amber-400'
  return 'text-gray-400'
}

function levelPrefix(level: ChannelLogEntry['level']) {
  if (level === 'error') return '[ERR]'
  if (level === 'warn')  return '[WRN]'
  return '[INF]'
}

type Phase = 'preview' | 'running' | 'done'

export function AtualizarCanaisModal({ open, onClose }: Props) {
  const [phase, setPhase]       = useState<Phase>('preview')
  const [result, setResult]     = useState<ChannelPublishResult | null>(null)
  const [logsOpen, setLogsOpen] = useState(false)
  const logRef = useRef<HTMLDivElement>(null)

  const publish = usePublishChannels()
  const preview = useChannelPreview(open && phase === 'preview')

  const handlePublish = async () => {
    setPhase('running')
    setLogsOpen(false)
    try {
      const r = await publish.mutateAsync()
      setResult(r)
      setPhase('done')
      if (r.hasErrors) setLogsOpen(true)
    } catch (err) {
      setResult({
        franqueado: { total: 0, ativados: 0, error: String(err) },
        veiculos:   { total: 0, ativados: 0, error: String(err) },
        loja:       { total: 0, ativados: 0, error: String(err) },
        logs: [{ ts: new Date().toISOString(), level: 'error', canal: 'sistema', message: String(err) }],
        hasErrors: true,
      })
      setPhase('done')
      setLogsOpen(true)
    }
  }

  const handleDownloadLog = () => {
    if (!result) return
    const lines = result.logs.map(l =>
      `${l.ts}  ${levelPrefix(l.level).padEnd(6)} [${l.canal.padEnd(14)}] ${l.message}`
    )
    const blob = new Blob([lines.join('\n')], { type: 'text/plain; charset=utf-8' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `promax-canais-log-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleClose = () => {
    setPhase('preview')
    setResult(null)
    setLogsOpen(false)
    onClose()
  }

  const errorCount = result?.logs.filter(l => l.level === 'error').length ?? 0
  const totalWillChange = preview.data
    ? preview.data.franqueado.inativos + preview.data.ecommerce.inativos
    : 0
  const allSynced = preview.data && totalWillChange === 0

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) handleClose() }}>
      <DialogContent className="max-w-lg bg-[hsl(var(--pm-gray-900))] border-[hsl(var(--pm-gray-800))] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display uppercase text-white tracking-wide flex items-center gap-2">
            <Zap size={16} className="text-blue-400" />
            Atualizar Canais de Publicação
          </DialogTitle>
        </DialogHeader>

        {/* ── PREVIEW PHASE ── */}
        {phase === 'preview' && (
          <>
            <p className="text-xs text-muted-foreground -mt-1 mb-4">
              Comparativo do estado atual vs o que será publicado. Revise antes de confirmar.
            </p>

            {/* Preview table */}
            <div className="space-y-2">
              {CHANNELS.map(ch => {
                const Icon = ch.icon
                const stat = preview.data?.[ch.previewKey]
                const loading = preview.isLoading

                return (
                  <div
                    key={ch.key}
                    className={`rounded-lg border p-3.5 ${ch.border} ${ch.bg}`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`mt-0.5 shrink-0 ${ch.color}`}>
                        <Icon size={16} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-2">
                          <span className={`text-sm font-medium ${ch.color}`}>{ch.label}</span>
                          {ch.badge && (
                            <span className="flex items-center gap-1 text-[9px] font-mono uppercase tracking-widest text-muted-foreground border border-white/10 px-1.5 py-0.5 rounded">
                              <ch.badge.icon size={9} />
                              {ch.badge.text}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-muted-foreground mb-3">{ch.desc}</p>

                        {/* Comparison row */}
                        {loading ? (
                          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                            <Loader2 size={11} className="animate-spin" />
                            Verificando estado atual…
                          </div>
                        ) : stat ? (
                          <div className="flex items-center gap-3">
                            {/* Before */}
                            <div className="flex-1 rounded-md bg-black/30 border border-white/[0.06] px-3 py-2">
                              <p className="text-[9px] uppercase tracking-widest text-muted-foreground mb-1">Atual</p>
                              <p className="text-sm font-mono text-white">{stat.ativos}<span className="text-muted-foreground text-[11px]">/{stat.total}</span></p>
                              <p className="text-[10px] text-muted-foreground">ativos</p>
                            </div>

                            <ArrowRight size={14} className={stat.inativos > 0 ? ch.color : 'text-muted-foreground'} />

                            {/* After */}
                            <div className={`flex-1 rounded-md border px-3 py-2 ${stat.inativos > 0 ? `${ch.border} bg-black/20` : 'border-white/[0.06] bg-black/30'}`}>
                              <p className="text-[9px] uppercase tracking-widest text-muted-foreground mb-1">Após publicar</p>
                              <p className={`text-sm font-mono ${stat.inativos > 0 ? ch.color : 'text-white'}`}>{stat.total}<span className="text-muted-foreground text-[11px]">/{stat.total}</span></p>
                              <p className="text-[10px] text-muted-foreground">ativos</p>
                            </div>

                            {/* Delta pill */}
                            <div className={`shrink-0 rounded-md px-2.5 py-1.5 text-center min-w-[52px] ${stat.inativos > 0 ? ch.pill : 'bg-white/5 text-muted-foreground'}`}>
                              {stat.inativos > 0 ? (
                                <>
                                  <p className="text-sm font-mono font-bold">+{stat.inativos}</p>
                                  <p className="text-[9px] uppercase tracking-wider">ativar</p>
                                </>
                              ) : (
                                <>
                                  <CheckCircle2 size={14} className="mx-auto mb-0.5 text-green-400" />
                                  <p className="text-[9px] uppercase tracking-wider">ok</p>
                                </>
                              )}
                            </div>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Summary strip */}
            {!preview.isLoading && preview.data && (
              <div className={`mt-4 rounded-lg border px-4 py-3 flex items-center gap-3 ${allSynced ? 'border-green-500/20 bg-green-500/[0.06]' : 'border-blue-500/20 bg-blue-500/[0.06]'}`}>
                {allSynced
                  ? <CheckCircle2 size={14} className="text-green-400 shrink-0" />
                  : <Zap size={14} className="text-blue-400 shrink-0" />}
                <span className={`text-xs ${allSynced ? 'text-green-400' : 'text-blue-300'}`}>
                  {allSynced
                    ? 'Todos os canais já estão sincronizados. Nenhuma alteração necessária.'
                    : `${totalWillChange} registro(s) serão ativados no total ao confirmar.`}
                </span>
              </div>
            )}
          </>
        )}

        {/* ── RUNNING / DONE: channel result cards ── */}
        {(phase === 'running' || phase === 'done') && (
          <>
            {phase !== 'done' && (
              <p className="text-xs text-muted-foreground -mt-1 mb-4">
                Publicando em todos os canais…
              </p>
            )}
            <div className="space-y-3">
              {CHANNELS.map(ch => {
                const Icon  = ch.icon
                const stat  = result?.[ch.key]
                const isDone = phase === 'done' && stat
                const hasErr = isDone && !!stat.error

                return (
                  <div
                    key={ch.key}
                    className={[
                      'flex items-start gap-3 rounded-lg border p-3.5 transition-all',
                      hasErr
                        ? 'border-red-500/30 bg-red-500/[0.08]'
                        : phase === 'running'
                          ? 'border-[hsl(var(--pm-gray-700))] opacity-60'
                          : isDone
                            ? 'border-green-500/20 bg-green-500/[0.08]'
                            : ch.border + ' ' + ch.bg,
                    ].join(' ')}
                  >
                    <div className={`mt-0.5 shrink-0 ${hasErr ? 'text-red-400' : isDone ? 'text-green-400' : ch.color}`}>
                      {phase === 'running' ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : hasErr ? (
                        <AlertCircle size={16} />
                      ) : isDone ? (
                        <CheckCircle2 size={16} />
                      ) : (
                        <Icon size={16} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-sm font-medium ${hasErr ? 'text-red-400' : isDone ? 'text-green-400' : ch.color}`}>
                          {ch.label}
                        </span>
                        {isDone && !hasErr && (
                          <span className={`text-[10px] font-mono ${stat.ativados > 0 ? 'text-green-400' : 'text-muted-foreground'}`}>
                            {stat.ativados > 0 ? `+${stat.ativados} ativados` : 'já sincronizado'}
                          </span>
                        )}
                        {hasErr && (
                          <span className="text-[10px] font-mono text-red-400">ERRO — ver log</span>
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5">{ch.desc}</p>
                      {hasErr && stat.error && (
                        <p className="text-[10px] text-red-400/80 font-mono mt-1 break-all">{stat.error}</p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Result summary */}
            {phase === 'done' && result && (
              <div className={[
                'mt-4 rounded-lg border px-4 py-3 flex items-center gap-2',
                result.hasErrors
                  ? 'border-red-500/30 bg-red-500/[0.08]'
                  : 'border-green-500/20 bg-green-500/[0.08]',
              ].join(' ')}>
                {result.hasErrors
                  ? <AlertCircle size={15} className="text-red-400 shrink-0" />
                  : <CheckCircle2 size={15} className="text-green-400 shrink-0" />}
                <span className={`text-sm ${result.hasErrors ? 'text-red-400' : 'text-green-400'}`}>
                  {result.hasErrors
                    ? `Publicação concluída com ${errorCount} erro(s). Verifique o log abaixo.`
                    : `Todos os canais atualizados. Total: ${result.franqueado.total} registros publicados.`}
                </span>
              </div>
            )}

            {/* Log panel */}
            {phase === 'done' && result && (
              <div className="mt-3 rounded-lg border border-[hsl(var(--pm-gray-700))] overflow-hidden">
                <button
                  onClick={() => setLogsOpen(v => !v)}
                  className="w-full flex items-center justify-between px-3 py-2 bg-[hsl(var(--pm-gray-950))] hover:bg-[hsl(var(--pm-gray-800))] transition-colors text-left"
                >
                  <span className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
                    <Terminal size={12} />
                    Log de execução
                    {errorCount > 0 && (
                      <span className="px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 text-[9px]">
                        {errorCount} erro{errorCount > 1 ? 's' : ''}
                      </span>
                    )}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={e => { e.stopPropagation(); handleDownloadLog() }}
                      className="flex items-center gap-1 text-[10px] font-mono text-muted-foreground hover:text-foreground px-2 py-0.5 rounded border border-white/10 hover:border-white/20 transition-colors"
                      title="Baixar log completo"
                    >
                      <Download size={10} />
                      .txt
                    </button>
                    {logsOpen ? <ChevronUp size={13} className="text-muted-foreground" /> : <ChevronDown size={13} className="text-muted-foreground" />}
                  </div>
                </button>

                {logsOpen && (
                  <div
                    ref={logRef}
                    className="max-h-52 overflow-y-auto bg-black/40 p-3 space-y-0.5"
                  >
                    {result.logs.map((l, i) => (
                      <div key={i} className="flex gap-2 text-[10px] font-mono leading-relaxed">
                        <span className="text-[hsl(var(--pm-gray-600))] shrink-0 select-none">
                          {l.ts.slice(11, 19)}
                        </span>
                        <span className={`shrink-0 w-10 ${levelColor(l.level)}`}>
                          {levelPrefix(l.level)}
                        </span>
                        <span className="text-[hsl(var(--pm-gray-500))] shrink-0 w-24 truncate" title={l.canal}>
                          [{l.canal}]
                        </span>
                        <span className={`flex-1 break-all ${levelColor(l.level)}`}>
                          {l.message}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* Footer */}
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="ghost" onClick={handleClose} disabled={phase === 'running'}>
            {phase === 'done' ? 'Fechar' : 'Cancelar'}
          </Button>

          {phase === 'preview' && (
            <Button
              onClick={handlePublish}
              disabled={preview.isLoading}
              className="gap-2 bg-blue-600 hover:bg-blue-500 text-white border-0"
            >
              {preview.isLoading ? (
                <><Loader2 size={13} className="animate-spin" /> Verificando…</>
              ) : allSynced ? (
                <><CheckCircle2 size={13} /> Tudo Sincronizado</>
              ) : (
                <><Zap size={13} /> Confirmar e Publicar</>
              )}
            </Button>
          )}

          {phase === 'done' && result?.hasErrors && (
            <Button
              onClick={() => { setResult(null); setPhase('preview') }}
              className="gap-2 bg-blue-600 hover:bg-blue-500 text-white border-0"
            >
              <RefreshCw size={13} /> Verificar Novamente
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
