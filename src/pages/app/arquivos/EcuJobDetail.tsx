import { useRef, useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useRoutePrefix } from '@/contexts/RoutePrefixContext'
import {
  ArrowLeft, Upload, FileText, Clock,
  ChevronRight, AlertCircle, MessageSquarePlus, X, CheckCircle,
  CreditCard, CheckCircle2, Loader2, ShieldAlert, ShieldCheck,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { PageHeader } from '@/components/shared/PageHeader'
import { EcuStatusBadge, STATUS_LABELS } from '@/components/shared/EcuStatusBadge'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { useEcuJob, useUpdateEcuJobStatus, useSetMatrixPrice, NEXT_STATUS, useEcuJobFinancialEntry, useSendToFinance, type EcuJob } from '@/hooks/useEcuJobs'
import { useUploadEcuFile, useDownloadEcuFile } from '@/hooks/useEcuFiles'
import { useCreateSupportTicket } from '@/hooks/useSupportTickets'
import { useMyUnit } from '@/hooks/useMyUnit'
import { useProfile } from '@/hooks/useProfile'
import { useMarkJobAsSeen } from '@/hooks/useUnseenJobs'
import { toast } from 'sonner'
import type { FileStatus } from '@/types/app'

const ACCEPTED_EXTENSIONS = '.bin,.ori,.kfg,.bck,.eprom,.zip,.rar'

const PRIORITY_COLORS: Record<string, string> = {
  normal: 'text-muted-foreground',
  alta: 'text-amber-400',
  critica: 'text-red-400',
}

const STATUS_ACTION_LABELS: Partial<Record<FileStatus, string>> = {
  em_triagem:         'Iniciar Triagem',
  em_processamento:   'Iniciar Processamento',
  aguardando_cliente: 'Aguardando Cliente',
  concluido:          'Marcar Concluído',
  cancelado:          'Cancelar Job',
}

// Status pipeline visual (ordered)
const STATUS_PIPELINE: FileStatus[] = [
  'recebido', 'em_triagem', 'em_processamento', 'aguardando_cliente', 'concluido',
]

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function formatCurrency(n: number | null | undefined) {
  if (n == null) return '—'
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

// ── Status pipeline tracker ────────────────────────────────────────────────────
function StatusPipeline({ current }: { current: FileStatus }) {
  if (current === 'cancelado') {
    return (
      <div className="flex items-center gap-2 py-2">
        <div className="h-2 w-2 rounded-full bg-red-500 shrink-0" />
        <span className="text-xs font-medium text-red-400">Job Cancelado</span>
      </div>
    )
  }

  const currentIdx = STATUS_PIPELINE.indexOf(current)

  return (
    <div className="space-y-1.5">
      {STATUS_PIPELINE.map((s, i) => {
        const done    = i < currentIdx
        const active  = i === currentIdx
        const pending = i > currentIdx

        return (
          <div key={s} className="flex items-center gap-2.5">
            <div
              className="h-2 w-2 rounded-full shrink-0 transition-colors"
              style={{
                background: done
                  ? 'hsl(var(--pm-red-500))'
                  : active
                    ? '#34D399'
                    : 'hsl(var(--pm-gray-700))',
                boxShadow: active ? '0 0 0 3px rgba(52,211,153,0.2)' : undefined,
              }}
            />
            <span
              className="text-xs transition-colors"
              style={{
                color: done
                  ? 'hsl(var(--pm-gray-400))'
                  : active
                    ? '#34D399'
                    : pending
                      ? 'hsl(var(--pm-gray-600))'
                      : undefined,
                fontWeight: active ? 600 : 400,
              }}
            >
              {STATUS_LABELS[s]}
            </span>
            {active && (
              <span className="ml-auto text-[9px] font-mono uppercase tracking-widest text-green-400 bg-green-400/10 px-1.5 py-0.5 rounded">
                atual
              </span>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Ticket Correção Modal (franchise only) ────────────────────────────────────
function TicketCorrecaoModal({ open, onClose, job }: {
  open: boolean
  onClose: () => void
  job: EcuJob
}) {
  const [body, setBody] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)

  const createTicket = useCreateSupportTicket()
  const uploadFile   = useUploadEcuFile()
  const { data: myUnit } = useMyUnit()
  const navigate = useNavigate()
  const prefix   = useRoutePrefix()

  async function handleSubmit() {
    if (!body.trim()) { toast.error('Descreva o motivo da correção'); return }
    setLoading(true)
    try {
      const preBody = [
        `**Serviço:** ${job.service_type}`,
        `**Cliente:** ${job.customers?.name ?? '—'}`,
        job.vehicles ? `**Veículo:** ${job.vehicles.brand} ${job.vehicles.model}` : null,
        `**Status atual:** ${STATUS_LABELS[job.status]}`,
        `**Job ID:** ${job.id.slice(0, 8).toUpperCase()}`,
        '',
        '---',
        '',
        body.trim(),
      ].filter(Boolean).join('\n')

      const ticket = await createTicket.mutateAsync({
        title:       `Correção — ${job.id.slice(0, 8).toUpperCase()}`,
        customer_id: job.customer_id,
        unit_id:     myUnit?.unit_id ?? null,
        ecu_job_id:  job.id,
        category:    'ecu_arquivo',
        priority:    'alta',
        body:        preBody,
      })

      if (file) {
        await uploadFile.mutateAsync({ jobId: job.id, file, fileType: 'original' })
      }

      toast.success(`Ticket ${ticket.protocol} criado com sucesso`)
      onClose()
      navigate(`${prefix}/suporte/${ticket.id}`)
    } catch {
      toast.error('Erro ao criar ticket de correção')
    } finally {
      setLoading(false)
    }
  }

  function handleClose() {
    if (!loading) { setBody(''); setFile(null); onClose() }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquarePlus size={16} className="text-amber-400" />
            Ticket de Correção
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-1 py-1 text-xs text-muted-foreground border-b border-white/[0.06] pb-4">
          <p>Job <span className="font-mono text-foreground">{job.id.slice(0, 8).toUpperCase()}</span> · {job.service_type} · {job.customers?.name ?? '—'}</p>
        </div>

        <div className="space-y-4 pt-2">
          <div className="space-y-1">
            <Label>Descreva o motivo da correção *</Label>
            <Textarea
              rows={4}
              placeholder="Ex: o arquivo retornou com erro de checksum, verifique..."
              value={body}
              onChange={e => setBody(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="space-y-1">
            <Label>Novo arquivo ECU (opcional)</Label>
            {file ? (
              <div className="flex items-center gap-2 p-2.5 rounded border border-[hsl(var(--pm-gray-700))] bg-[hsl(var(--pm-gray-900))]">
                <FileText size={14} className="text-muted-foreground shrink-0" />
                <p className="text-xs text-foreground flex-1 truncate">{file.name}</p>
                <button onClick={() => setFile(null)} disabled={loading} className="text-muted-foreground hover:text-foreground">
                  <X size={13} />
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center h-16 rounded border-2 border-dashed border-[hsl(var(--pm-gray-700))] cursor-pointer hover:border-[hsl(var(--pm-red-500))] transition-colors">
                <Upload size={15} className="text-muted-foreground mb-1" />
                <span className="text-[11px] text-muted-foreground">Clique para selecionar</span>
                <input type="file" className="hidden" accept={ACCEPTED_EXTENSIONS}
                  onChange={e => { const f = e.target.files?.[0]; if (f) setFile(f); e.target.value = '' }}
                />
              </label>
            )}
            <p className="text-[10px] text-muted-foreground">Arquivo ficará vinculado ao serviço permanentemente.</p>
          </div>

          <div className="flex justify-between items-center gap-3 pt-1">
            <Button variant="ghost" onClick={handleClose} disabled={loading}>Cancelar</Button>
            <Button
              onClick={handleSubmit}
              disabled={loading || !body.trim()}
              className="bg-amber-600 hover:bg-amber-500 text-white border-0"
            >
              {loading ? 'Criando...' : 'Abrir Ticket'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function EcuJobDetail() {
  const navigate = useNavigate()
  const prefix = useRoutePrefix()
  const { id } = useParams<{ id: string }>()
  const matrixFileRef = useRef<HTMLInputElement>(null)
  const [confirmStatus, setConfirmStatus] = useState<FileStatus | null>(null)
  const [matrixPrice, setMatrixPrice] = useState('')
  const [editingPrice, setEditingPrice] = useState(false)
  const [correcaoOpen, setCorrecaoOpen] = useState(false)
  const [pendingDeliveryFile, setPendingDeliveryFile] = useState<File | null>(null)
  const [deliveryConfirmOpen, setDeliveryConfirmOpen] = useState(false)
  const [sentVisible, setSentVisible] = useState<'in' | 'out' | null>(null)

  const { data: job, isLoading } = useEcuJob(id ?? '')
  const updateStatus = useUpdateEcuJobStatus()
  const setPrice     = useSetMatrixPrice()
  const uploadFile   = useUploadEcuFile()
  const downloadFile = useDownloadEcuFile()
  const { isMatrixUser, isFranchiseUser } = useProfile()
  const markAsSeen   = useMarkJobAsSeen(id)
  const { data: financialEntry } = useEcuJobFinancialEntry(job?.id ?? '')
  const sendToFinance = useSendToFinance()

  useEffect(() => {
    if (job) markAsSeen()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [job?.id])

  if (isLoading || !job) return <div className="pm-skeleton h-96 w-full rounded" />

  const isFranchise = isFranchiseUser()
  const allNextStatuses = NEXT_STATUS[job.status] ?? []
  const nextStatuses = isFranchise
    ? (job.status === 'recebido' ? (['cancelado'] as typeof allNextStatuses) : [])
    : allNextStatuses
  const files  = job.ecu_job_files ?? []
  const events = [...(job.ecu_job_events ?? [])].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )

  async function handleStatusChange() {
    if (!confirmStatus || !job) return
    await updateStatus.mutateAsync({ id: job.id, status: confirmStatus })
    setConfirmStatus(null)
  }

  async function handleMatrixFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !job) return
    e.target.value = ''
    const fileType = job.status === 'concluido' || job.status === 'aguardando_cliente'
      ? 'entrega'
      : 'original'
    if (fileType === 'entrega') {
      setPendingDeliveryFile(file)
      setDeliveryConfirmOpen(true)
    } else {
      await uploadFile.mutateAsync({ jobId: job.id, file, fileType: 'original' })
    }
  }

  async function handleDeliveryConfirm() {
    if (!pendingDeliveryFile || !job) return
    setDeliveryConfirmOpen(false)
    try {
      await uploadFile.mutateAsync({ jobId: job.id, file: pendingDeliveryFile, fileType: 'entrega' })
      await updateStatus.mutateAsync({ id: job.id, status: 'concluido' })
      setSentVisible('in')
      setTimeout(() => setSentVisible('out'), 1800)
      setTimeout(() => setSentVisible(null), 2400)
    } catch {
      toast.error('Erro ao enviar arquivo')
    } finally {
      setPendingDeliveryFile(null)
    }
  }

  async function handleDownloadFile(f: { id: string; r2_key: string; file_name: string }) {
    if (!job) return
    if (isMatrixUser() && job.status === 'recebido') {
      try {
        await updateStatus.mutateAsync({ id: job.id, status: 'em_triagem' })
      } catch {
        // non-blocking
      }
    }
    downloadFile.mutate({ fileId: f.id, fileName: f.file_name })
  }

  async function handleSendToFinance() {
    if (!job) return
    await sendToFinance.mutateAsync({
      jobId: job.id,
      unitId: job.unit_id ?? '',
      amount: job.amount_charged_to_customer ?? 0,
      serviceType: job.service_type,
      customerName: job.customers?.name ?? 'Cliente',
    })
  }

  const franqueadoUnit = job.franchise_units as { name: string; city: string | null; state: string | null } | null
  const creatorFirstName = job.creator_profile?.name?.trim().split(' ')[0] ?? null
  const unitLabel = franqueadoUnit
    ? `${franqueadoUnit.name}${franqueadoUnit.city ? ` — ${franqueadoUnit.city}/${franqueadoUnit.state}` : ''}`
    : `MATRIZ${creatorFirstName ? ` — ${creatorFirstName}` : ''}`

  return (
    <div>
      <PageHeader
        title={`Job #${job.id.slice(0, 8).toUpperCase()}`}
        subtitle={[job.customers?.name, unitLabel].filter(Boolean).join(' · ')}
        actions={
          <Button variant="ghost" onClick={() => navigate(`${prefix}/arquivos`)}>
            <ArrowLeft size={16} className="mr-2" />Voltar
          </Button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Col 1-2: Info + Files */}
        <div className="lg:col-span-2 space-y-6">

          {/* Job info */}
          <div className="pm-card grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Status</p>
              <EcuStatusBadge status={job.status} />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Prioridade</p>
              <span className={`text-sm font-medium ${PRIORITY_COLORS[job.priority]}`}>
                {job.priority.charAt(0).toUpperCase() + job.priority.slice(1)}
              </span>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Serviço</p>
              <p className="text-sm text-foreground">{job.service_type}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Veículo</p>
              <p className="text-sm text-foreground">
                {job.vehicles
                  ? `${job.vehicles.brand} ${job.vehicles.model}${job.vehicles.plate ? ` (${job.vehicles.plate})` : ''}`
                  : [job.vehicle_info?.marca, job.vehicle_info?.modelo].filter(Boolean).join(' ') || '—'}
              </p>
              {!job.vehicles && job.vehicle_info?.placa && (
                <p className="text-xs text-muted-foreground">{job.vehicle_info.placa}</p>
              )}
            </div>
            {job.due_at && (
              <div>
                <p className="text-xs text-muted-foreground">Prazo</p>
                <p className="text-sm text-foreground">{new Date(job.due_at).toLocaleDateString('pt-BR')}</p>
              </div>
            )}
            <div>
              <p className="text-xs text-muted-foreground">Abertura</p>
              <p className="text-sm text-foreground">{formatDateTime(job.created_at)}</p>
            </div>
            {job.problem_description && (
              <div className="col-span-2">
                <p className="text-xs text-muted-foreground">Descrição</p>
                <p className="text-sm text-foreground">{job.problem_description}</p>
              </div>
            )}
          </div>

          {/* Dados Financeiros */}
          <div className="pm-card bg-[hsl(var(--pm-gray-900))] space-y-3">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
              Dados Financeiros
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Cobrado do cliente</p>
                <p className="text-sm font-medium text-green-400">
                  {formatCurrency(job.amount_charged_to_customer)}
                </p>
              </div>

              <div>
                <p className="text-xs text-muted-foreground">Cobrado pela matriz</p>
                {isMatrixUser() && !job.amount_charged_by_matrix ? (
                  editingPrice ? (
                    <div className="flex gap-2 items-center mt-1">
                      <input
                        type="number" step="0.01" min="0" placeholder="0,00"
                        value={matrixPrice}
                        onChange={(e) => setMatrixPrice(e.target.value)}
                        className="w-28 rounded border border-[hsl(var(--pm-gray-700))] bg-background px-2 py-1 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-[hsl(var(--pm-red-500))]"
                      />
                      <Button
                        size="sm" disabled={setPrice.isPending || !matrixPrice}
                        style={{ background: 'var(--pm-accent-gradient)' }}
                        onClick={async () => {
                          await setPrice.mutateAsync({ id: job.id, amount: Number(matrixPrice) })
                          setEditingPrice(false)
                          setMatrixPrice('')
                        }}
                      >Salvar</Button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setEditingPrice(true)}
                      className="text-sm text-amber-400 underline underline-offset-2"
                    >Informar valor</button>
                  )
                ) : (
                  <p className="text-sm font-medium text-red-400">
                    {formatCurrency(job.amount_charged_by_matrix)}
                  </p>
                )}
              </div>

              {/* Margem — exibe sempre que preenchida */}
              {job.franchise_margin_amount != null && (
                <>
                  <div>
                    <p className="text-xs text-muted-foreground">Margem bruta</p>
                    <p
                      className="text-sm font-bold"
                      style={{ color: job.franchise_margin_amount >= 0 ? '#34D399' : 'hsl(var(--pm-red-400))' }}
                    >
                      {formatCurrency(job.franchise_margin_amount)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">% Margem</p>
                    <p
                      className="text-sm font-bold"
                      style={{ color: (job.franchise_margin_percentage ?? 0) >= 0 ? '#34D399' : 'hsl(var(--pm-red-400))' }}
                    >
                      {job.franchise_margin_percentage?.toFixed(1)}%
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Arquivos */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="pm-accent-line">Arquivos ({files.length})</div>

              {/* Franquia: só pode reenviar via ticket de correção */}
              {isFranchise && job.status !== 'cancelado' && (
                <Button
                  size="sm" variant="outline"
                  onClick={() => setCorrecaoOpen(true)}
                  className="border-amber-500/30 text-amber-400 hover:bg-amber-500/10 hover:text-amber-300"
                >
                  <MessageSquarePlus size={14} className="mr-1" />
                  Ticket Correção
                </Button>
              )}
            </div>

            {/* hidden input — triggered by button below */}
            {isMatrixUser() && (
              <input
                ref={matrixFileRef} type="file" className="hidden"
                accept={ACCEPTED_EXTENSIONS}
                onChange={handleMatrixFileSelect}
              />
            )}

            {files.length === 0 ? (
              <div className="pm-card flex items-center gap-3 py-8 justify-center text-muted-foreground">
                <FileText size={20} />
                <span className="text-sm">Nenhum arquivo anexado.</span>
              </div>
            ) : (
              <div className="pm-card p-0 divide-y divide-[hsl(var(--pm-gray-700))]">
                {files.map((f) => (
                  <div key={f.id} className="flex items-center gap-3 p-3">
                    <FileText size={18} className="text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground truncate">{f.file_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {f.file_type === 'original' ? 'Original' : 'Entrega'} · {formatBytes(f.size_bytes)} · {formatDateTime(f.created_at)}
                      </p>
                    </div>
                    {(f.scan_status === 'infected' || f.scan_status === 'blocked') ? (
                      <Button size="sm" disabled className="bg-red-700/80 text-white border-0 gap-1.5 cursor-not-allowed opacity-90">
                        <ShieldAlert size={14} />
                        {f.scan_status === 'blocked' ? 'Bloqueado' : 'Infectado'}
                      </Button>
                    ) : f.scan_status === 'pending' ? (
                      <Button size="sm" disabled className="opacity-60 gap-1.5 cursor-not-allowed">
                        <Loader2 size={14} className="animate-spin" />
                        Analisando
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        disabled={f.r2_key.startsWith('mock/') || downloadFile.isPending}
                        className={f.r2_key.startsWith('mock/')
                          ? 'opacity-40 cursor-not-allowed'
                          : 'bg-green-600 hover:bg-green-500 text-white border-0 gap-1.5'}
                        onClick={() => handleDownloadFile(f)}
                      >
                        <ShieldCheck size={14} />
                        Baixar
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* ── Enviar arquivo pronto (matriz only) ── */}
            {isMatrixUser() && job.status !== 'cancelado' && job.status !== 'concluido' && (
              <button
                type="button"
                disabled={uploadFile.isPending || updateStatus.isPending}
                onClick={() => matrixFileRef.current?.click()}
                className="mt-4 w-full flex items-center justify-center gap-2.5 rounded-xl border-2 border-dashed border-green-600/40 bg-green-600/[0.06] hover:border-green-500/70 hover:bg-green-600/[0.12] text-green-400 hover:text-green-300 transition-all py-4 font-mono text-sm font-semibold uppercase tracking-widest disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Upload size={16} />
                {uploadFile.isPending || updateStatus.isPending ? 'Enviando...' : 'Enviar Arquivo Pronto'}
              </button>
            )}
          </div>
        </div>

        {/* Col 3: Pipeline + Ações + Timeline */}
        <div className="space-y-6">

          {/* Status pipeline visual */}
          <div className="pm-card space-y-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Progresso do Serviço
            </p>
            <StatusPipeline current={job.status} />
          </div>

          {/* Próximas Ações (matriz ou franchise cancelar) */}
          {nextStatuses.length > 0 && (
            <div className="pm-card space-y-3">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Próximas Ações
              </p>
              {nextStatuses.map((next) => (
                <Button
                  key={next}
                  className="w-full justify-between"
                  variant={next === 'cancelado' ? 'ghost' : 'outline'}
                  onClick={() => setConfirmStatus(next)}
                >
                  <span className={next === 'cancelado' ? 'text-red-400' : ''}>
                    {STATUS_ACTION_LABELS[next] ?? STATUS_LABELS[next]}
                  </span>
                  {next !== 'cancelado' && <ChevronRight size={14} />}
                  {next === 'cancelado' && <AlertCircle size={14} className="text-red-400" />}
                </Button>
              ))}
            </div>
          )}

          {/* Envio ao financeiro — franquia, job concluído */}
          {isFranchise && job.status === 'concluido' && (
            <div className="mt-4">
              {!financialEntry && (
                <button
                  onClick={handleSendToFinance}
                  disabled={sendToFinance.isPending || !job.amount_charged_to_customer}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-semibold text-sm transition-all disabled:opacity-40"
                  style={{ background: 'hsl(var(--pm-red-500))', color: '#fff' }}
                >
                  {sendToFinance.isPending ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <CreditCard size={16} />
                  )}
                  Finalizar e enviar para o financeiro
                </button>
              )}
              {financialEntry?.status === 'pendente' && (
                <div
                  className="flex items-center gap-2 justify-center py-2.5 px-4 rounded-xl text-sm font-medium"
                  style={{ background: 'rgba(251,191,36,0.1)', color: '#FBBF24' }}
                >
                  <Clock size={14} /> Aguardando caixa
                </div>
              )}
              {financialEntry?.status === 'pago' && (
                <div
                  className="flex items-center gap-2 justify-center py-2.5 px-4 rounded-xl text-sm font-medium"
                  style={{ background: 'rgba(74,222,128,0.1)', color: '#4ADE80' }}
                >
                  <CheckCircle2 size={14} /> Pago
                  {financialEntry.payment_method && (
                    <span style={{ opacity: 0.7 }}>· {financialEntry.payment_method}</span>
                  )}
                </div>
              )}
              {!job.amount_charged_to_customer && !financialEntry && (
                <p className="text-xs text-center mt-1" style={{ color: 'hsl(var(--pm-gray-500))' }}>
                  Preencha o valor cobrado do cliente para enviar ao financeiro.
                </p>
              )}
            </div>
          )}

          {/* Timeline */}
          <div>
            <div className="pm-accent-line mb-3">Histórico</div>
            {events.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Sem eventos registrados.</p>
            ) : (
              <div className="space-y-3">
                {events.map((ev) => (
                  <div key={ev.id} className="flex gap-3">
                    <div className="mt-1 shrink-0">
                      <Clock size={14} className="text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-xs text-foreground">
                        {ev.event_type === 'status_change'
                          ? `Status → ${STATUS_LABELS[(ev.payload as { new_status: FileStatus }).new_status] ?? ev.payload.new_status as string}`
                          : ev.event_type}
                      </p>
                      <p className="text-xs text-muted-foreground">{formatDateTime(ev.created_at)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      <ConfirmDialog
        open={!!confirmStatus}
        onOpenChange={(v) => !v && setConfirmStatus(null)}
        title={confirmStatus === 'cancelado' ? 'Cancelar Job' : `Mover para: ${STATUS_LABELS[confirmStatus!]}`}
        description={
          confirmStatus === 'cancelado'
            ? 'O job será cancelado. Esta ação não pode ser desfeita.'
            : `Confirmar mudança de status para "${STATUS_LABELS[confirmStatus!]}"?`
        }
        onConfirm={handleStatusChange}
        isLoading={updateStatus.isPending}
        confirmLabel={confirmStatus === 'cancelado' ? 'Cancelar Job' : 'Confirmar'}
      />

      {correcaoOpen && (
        <TicketCorrecaoModal
          open={correcaoOpen}
          onClose={() => setCorrecaoOpen(false)}
          job={job}
        />
      )}

      {/* Delivery file confirmation modal */}
      <Dialog open={deliveryConfirmOpen} onOpenChange={(v) => {
        if (!v) { setDeliveryConfirmOpen(false); setPendingDeliveryFile(null) }
      }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Confirmar envio</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground py-2">
            Ao enviar o arquivo o status mudará para{' '}
            <span className="font-semibold text-foreground">Finalizado</span>.
          </p>
          <div className="flex justify-end gap-3 pt-2">
            <Button
              variant="ghost"
              onClick={() => { setDeliveryConfirmOpen(false); setPendingDeliveryFile(null) }}
              disabled={uploadFile.isPending || updateStatus.isPending}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleDeliveryConfirm}
              disabled={uploadFile.isPending || updateStatus.isPending}
              className="bg-green-600 hover:bg-green-500 text-white border-0 min-w-[96px]"
            >
              {uploadFile.isPending || updateStatus.isPending ? 'Enviando...' : 'OK Enviar'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Floating sent checkmark */}
      {sentVisible && (
        <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none">
          <div
            className="flex flex-col items-center gap-3 bg-green-600/95 backdrop-blur-sm rounded-2xl px-12 py-8 shadow-2xl transition-all duration-500"
            style={{
              opacity: sentVisible === 'in' ? 1 : 0,
              transform: sentVisible === 'in' ? 'scale(1)' : 'scale(0.88)',
            }}
          >
            <CheckCircle size={64} className="text-white" strokeWidth={1.5} />
            <span className="text-white font-bold text-2xl tracking-wide font-mono uppercase">enviado</span>
          </div>
        </div>
      )}
    </div>
  )
}
