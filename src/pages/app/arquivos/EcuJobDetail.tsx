import { useRef, useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useRoutePrefix } from '@/contexts/RoutePrefixContext'
import {
  ArrowLeft, Upload, FileText, Clock, Pencil,
  ChevronRight, AlertCircle, AlertTriangle, MessageSquarePlus, X,
  CreditCard, CheckCircle2, Loader2, ShieldAlert, ShieldCheck, ArrowUp, ArrowDown,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { PageHeader } from '@/components/shared/PageHeader'
import { EcuStatusBadge, STATUS_LABELS } from '@/components/shared/EcuStatusBadge'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { useEcuJob, useUpdateEcuJobStatus, useSetMatrixPrice, useUpdateEcuJobFlags, NEXT_STATUS, useEcuJobFinancialEntry, useSendToFinance, type EcuJob } from '@/hooks/useEcuJobs'
import { useUploadEcuFile, useDownloadEcuFile, useEcuJobFilesRealtime } from '@/hooks/useEcuFiles'
import { useCreateSupportTicket } from '@/hooks/useSupportTickets'
import { useMyUnit } from '@/hooks/useMyUnit'
import { useProfile } from '@/hooks/useProfile'
import { useMarkJobAsSeen } from '@/hooks/useUnseenJobs'
import { EcuValueEditModal } from '@/pages/app/arquivos/EcuValueEditModal'
import { useJobValueEditHistory } from '@/hooks/useEcuValueEdit'
import { toast } from 'sonner'
import type { FileStatus } from '@/types/app'

const ACCEPTED_EXTENSIONS = '.bin,.ori,.kfg,.bck,.eprom,.zip,.rar'

const PRIORITY_COLORS: Record<string, string> = {
  normal: 'text-muted-foreground',
  alta: 'text-amber-400',
  critica: 'text-red-400',
}

const STATUS_ACTION_LABELS: Partial<Record<FileStatus, string>> = {
  em_processamento: 'Iniciar Processamento',
  concluido:        'Marcar Concluído',
  cancelado:        'Cancelar Job',
}

// Status pipeline visual (ordered)
const STATUS_PIPELINE: FileStatus[] = [
  'recebido', 'em_processamento', 'concluido',
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
  const [valueEditOpen, setValueEditOpen] = useState(false)

  const { data: job, isLoading } = useEcuJob(id ?? '')
  useEcuJobFilesRealtime(id ?? '')
  const updateStatus = useUpdateEcuJobStatus()
  const updateFlags  = useUpdateEcuJobFlags()
  const setPrice     = useSetMatrixPrice()
  const uploadFile   = useUploadEcuFile()
  const downloadFile = useDownloadEcuFile()
  const { isMatrixUser, isFranchiseUser, hasRole } = useProfile()
  const { data: editHistory = [], isError: editHistoryError } = useJobValueEditHistory(isMatrixUser() ? (id ?? '') : '')
  const markAsSeen   = useMarkJobAsSeen(id)
  const { data: financialEntry } = useEcuJobFinancialEntry(job?.id ?? '')
  const sendToFinance = useSendToFinance()

  useEffect(() => {
    if (job) markAsSeen()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [job?.id])

  if (isLoading || !job) return <div className="pm-skeleton h-96 w-full rounded" />

  const isFranchise = isFranchiseUser()
  // Alinhado 1:1 com a RLS financial_admin_write (migration 089) — só quem
  // tem INSERT liberado em financial_entries vê o botão. isMatrixUser()/
  // isFranchise sozinhos eram amplos demais (incluíam support_agent, seller,
  // auditor, unit_operator etc., que RLS sempre negou — botão clicável e
  // sem efeito).
  const canSendToFinance = hasRole(
    'company_admin', 'finance_admin', 'finance_staff',
    'operations_admin', 'franchise_manager', 'unit_manager',
  )
  const allNextStatuses = NEXT_STATUS[job.status] ?? []
  const nextStatuses = isFranchise
    ? (job.status === 'recebido' ? (['cancelado'] as typeof allNextStatuses) : [])
    : allNextStatuses
  // Job de franquia cobra pelo valor que a matriz repassa; job direto de matriz
  // (sem unidade) cobra direto do valor passado ao cliente — não existe repasse.
  const isFranchiseJob = job.unit_id !== null
  const chargeAmount = isFranchiseJob ? job.amount_charged_by_matrix : job.amount_charged_to_customer
  const chargeFieldLabel = isFranchiseJob ? 'cobrado pela matriz' : 'cobrado do cliente'
  const missingMatrixPriceToConclude = isFranchiseJob && !job.amount_charged_by_matrix
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
    await uploadFile.mutateAsync({ jobId: job.id, file, fileType: 'entrega' })
  }

  async function handleDownloadFile(f: { id: string; r2_key: string; file_name: string }) {
    if (!job) return
    if (isMatrixUser() && job.status === 'recebido') {
      try {
        await updateStatus.mutateAsync({ id: job.id, status: 'em_processamento' })
      } catch {
        // non-blocking
      }
    }
    downloadFile.mutate({ fileId: f.id, fileName: f.file_name })
  }

  async function handleSendToFinance() {
    if (!job) return
    if (!chargeAmount) return
    try {
      await sendToFinance.mutateAsync({
        jobId: job.id,
        unitId: job.unit_id,
        amount: chargeAmount,
        serviceType: job.service_type,
        customerName: job.customers?.name ?? 'Cliente',
      })
    } catch {
      // toast já disparado no onError de useSendToFinance — catch aqui só
      // evita unhandled rejection (onClick não é awaited por ninguém)
    }
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

      {/* Alerta: contatar financeiro */}
      {job.contact_finance && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl mb-4"
          style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)' }}>
          <AlertTriangle size={16} style={{ color: '#F87171', flexShrink: 0 }} />
          <p className="text-sm font-semibold" style={{ color: '#F87171' }}>
            CONTATAR FINANCEIRO — este job requer atenção do financeiro
          </p>
        </div>
      )}

      {/* Alerta: arquivo em aberto >12h */}
      {(() => {
        const ageH = (Date.now() - new Date(job.created_at).getTime()) / (1000 * 60 * 60)
        if (ageH < 12 || job.status === 'concluido' || job.status === 'cancelado') return null
        const ageD  = Math.floor(ageH / 24)
        const hours = Math.floor(ageH % 24)
        const label = ageD > 0 ? `${ageD}d ${hours}h` : `${Math.floor(ageH)}h`
        return (
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl mb-4"
            style={{ background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.3)' }}>
            <AlertTriangle size={16} style={{ color: '#FBBF24', flexShrink: 0 }} />
            <p className="text-sm font-semibold" style={{ color: '#FBBF24' }}>
              ARQUIVO EM ABERTO — em atendimento há {label} sem finalização
            </p>
          </div>
        )
      })()}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Col 1-2: Info + Files */}
        <div className="lg:col-span-2 space-y-6">

          {/* Job info */}
          <div className="pm-card grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Status</p>
              <div className="flex items-center gap-2 flex-wrap">
                <EcuStatusBadge status={job.status} />
                {job.is_complex_file && (
                  <span className="pm-badge pm-badge--warning">Arquivo Complexo</span>
                )}
              </div>
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
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-red-400">
                      {formatCurrency(job.amount_charged_by_matrix)}
                    </p>
                    {isMatrixUser() && job.matrix_payment_status === 'em_aberto' && (
                      job.edicao_valor_pendente ? (
                        <span
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold"
                          style={{ background: 'rgba(251,146,60,0.15)', color: '#FB923C', border: '1px solid rgba(251,146,60,0.3)' }}
                          title="Já existe uma alteração pendente de aprovação"
                        >
                          <Clock size={10} />
                          Edição pendente
                        </span>
                      ) : (
                        <button
                          onClick={() => setValueEditOpen(true)}
                          title="Solicitar edição de valor"
                          className="p-1 rounded hover:bg-white/10 transition-colors"
                          style={{ color: 'hsl(var(--pm-gray-500))' }}
                        >
                          <Pencil size={12} />
                        </button>
                      )
                    )}
                  </div>
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
                {files.map((f) => {
                  const isModificado = f.file_type === 'entrega'
                  return (
                  <div key={f.id} className={cn('flex items-center gap-3 p-3', isModificado && 'bg-green-500/[0.06]')}>
                    {isModificado ? (
                      <ArrowDown size={18} className="text-green-600 shrink-0" />
                    ) : (
                      <ArrowUp size={18} className="text-red-500 shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground truncate">{f.file_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {isModificado ? 'Modificado' : 'Original'} · {formatBytes(f.size_bytes)} · {formatDateTime(f.created_at)}
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
                  )
                })}
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

            {/* Erro ao carregar histórico de edições — antes ficava mascarado como lista vazia */}
            {isMatrixUser() && editHistoryError && (
              <p className="text-xs mt-4" style={{ color: '#F87171' }}>
                Erro ao carregar histórico de edições de valor deste job.
              </p>
            )}

            {/* Histórico de edições de valor — apenas matriz */}
            {isMatrixUser() && editHistory.length > 0 && (
              <div className="space-y-2 mt-6">
                <div className="pm-accent-line">Histórico de alterações de valor</div>
                <div className="pm-card p-0 divide-y divide-[hsl(var(--pm-gray-700))]">
                  {editHistory.map((h) => {
                    const statusColor = h.status === 'APROVADO' ? '#4ADE80' : h.status === 'RECUSADO' ? '#F87171' : '#FBBF24'
                    const statusLabel = h.status === 'APROVADO' ? 'Aprovado' : h.status === 'RECUSADO' ? 'Recusado' : h.status === 'CANCELADO_PAGAMENTO' ? 'Cancelado' : 'Aguardando'
                    const diff = h.valor_novo - h.valor_anterior
                    const sign = diff >= 0 ? '+' : ''
                    return (
                      <div key={h.id} className="p-3 space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono text-white">
                              {h.valor_anterior.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                              {' → '}
                              {h.valor_novo.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </span>
                            <span className="text-[11px] font-semibold" style={{ color: diff >= 0 ? '#4ADE80' : '#F87171' }}>
                              ({sign}{diff.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })})
                            </span>
                          </div>
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                            style={{ background: `${statusColor}22`, color: statusColor }}>
                            {statusLabel}
                          </span>
                        </div>
                        <p className="text-xs" style={{ color: 'hsl(var(--pm-gray-500))' }}>
                          {h.motivo}
                        </p>
                        <p className="text-[11px]" style={{ color: 'hsl(var(--pm-gray-600))' }}>
                          Solicitado por {h.solicitado_profile?.name ?? '—'} em{' '}
                          {new Date(h.solicitado_em).toLocaleString('pt-BR')}
                          {h.aprovado_em && (
                            <> · {h.status === 'APROVADO' ? 'Aprovado' : 'Recusado'} por {h.aprovado_profile?.name ?? '—'}</>
                          )}
                          {h.motivo_recusa && (
                            <span style={{ color: '#F87171' }}> · Motivo: {h.motivo_recusa}</span>
                          )}
                        </p>
                      </div>
                    )
                  })}
                </div>
              </div>
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
          {(nextStatuses.length > 0 || isMatrixUser()) && (
            <div className="pm-card space-y-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Próximas Ações
              </p>

              {nextStatuses.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground/70">
                    Status
                  </p>
                  {nextStatuses.map((next) => {
                    const blocked = next === 'concluido' && missingMatrixPriceToConclude
                    return (
                      <Button
                        key={next}
                        className="w-full justify-between"
                        variant={next === 'cancelado' ? 'ghost' : 'outline'}
                        disabled={blocked}
                        title={blocked ? 'Informe o valor cobrado pela matriz antes de concluir' : undefined}
                        onClick={() => {
                          if (blocked) {
                            toast.error('Informe o valor cobrado pela matriz antes de concluir o job.')
                            return
                          }
                          setConfirmStatus(next)
                        }}
                      >
                        <span className={next === 'cancelado' ? 'text-red-400' : ''}>
                          {STATUS_ACTION_LABELS[next] ?? STATUS_LABELS[next]}
                        </span>
                        {blocked && <ShieldAlert size={14} className="text-amber-400" />}
                        {!blocked && next !== 'cancelado' && <ChevronRight size={14} />}
                        {next === 'cancelado' && <AlertCircle size={14} className="text-red-400" />}
                      </Button>
                    )
                  })}
                  {missingMatrixPriceToConclude && nextStatuses.includes('concluido') && (
                    <p className="text-xs" style={{ color: '#FB923C' }}>
                      Informe o valor cobrado pela matriz para poder concluir este job.
                    </p>
                  )}
                </div>
              )}

              {isMatrixUser() && (
                <div className={cn('space-y-2', nextStatuses.length > 0 && 'pt-3 border-t border-white/[0.06]')}>
                  <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground/70">
                    Tags
                  </p>
                  <Button
                    className="w-full justify-between"
                    variant="outline"
                    disabled={updateFlags.isPending}
                    onClick={() => updateFlags.mutate({ id: job.id, field: 'is_complex_file', value: !job.is_complex_file })}
                  >
                    <span className={job.is_complex_file ? 'text-amber-400' : ''}>Arquivo Complexo</span>
                    {job.is_complex_file
                      ? <CheckCircle2 size={14} className="text-amber-400" />
                      : <span className="h-3 w-3 rounded-full border border-white/20" />}
                  </Button>
                  <Button
                    className="w-full justify-between"
                    variant="outline"
                    disabled={updateFlags.isPending}
                    onClick={() => updateFlags.mutate({ id: job.id, field: 'contact_finance', value: !job.contact_finance })}
                  >
                    <span className={job.contact_finance ? 'text-red-400' : ''}>Contatar Financeiro</span>
                    {job.contact_finance
                      ? <AlertCircle size={14} className="text-red-400" />
                      : <span className="h-3 w-3 rounded-full border border-white/20" />}
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Status Financeiro — franchise ou matriz direct, qualquer status */}
          {canSendToFinance && job.status !== 'cancelado' && (
            <div className="pm-card space-y-3">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Status Financeiro
              </p>

              {/* Serviço 100% completo: job concluído + pago */}
              {job.status === 'concluido' && financialEntry?.status === 'pago' && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg"
                  style={{ background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.2)' }}>
                  <CheckCircle2 size={15} style={{ color: '#4ADE80', flexShrink: 0 }} />
                  <div>
                    <p className="text-sm font-semibold" style={{ color: '#4ADE80' }}>100% Concluído</p>
                    <p className="text-[11px]" style={{ color: 'hsl(var(--pm-gray-500))' }}>Serviço finalizado e pago</p>
                  </div>
                </div>
              )}

              {/* Status do pagamento */}
              {!financialEntry ? (
                <p className="text-sm" style={{ color: 'hsl(var(--pm-gray-500))' }}>
                  Financeiro não aberto
                </p>
              ) : financialEntry.status === 'pendente' ? (
                <div className="flex items-center gap-2 justify-center py-2.5 px-4 rounded-xl text-sm font-medium"
                  style={{ background: 'rgba(251,191,36,0.1)', color: '#FBBF24' }}>
                  <Clock size={14} /> Aguardando caixa
                </div>
              ) : (
                <div className="flex items-center gap-2 justify-center py-2.5 px-4 rounded-xl text-sm font-medium"
                  style={{ background: 'rgba(74,222,128,0.1)', color: '#4ADE80' }}>
                  <CheckCircle2 size={14} /> Pago
                  {financialEntry.payment_method && (
                    <span style={{ opacity: 0.7 }}>· {financialEntry.payment_method}</span>
                  )}
                </div>
              )}

              {/* Botão Enviar para o Financeiro — qualquer status, enquanto não enviado.
                  Cobrança: job de franquia usa amount_charged_by_matrix (repasse);
                  job direto de matriz usa amount_charged_to_customer (sem repasse). */}
              {!financialEntry && chargeAmount ? (
                <button
                  onClick={handleSendToFinance}
                  disabled={sendToFinance.isPending}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-semibold text-sm transition-all disabled:opacity-40"
                  style={{ background: 'hsl(var(--pm-red-500))', color: '#fff' }}
                >
                  {sendToFinance.isPending ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <CreditCard size={16} />
                  )}
                  Enviar para o Financeiro
                </button>
              ) : !financialEntry && !chargeAmount ? (
                <p className="text-xs text-center" style={{ color: 'hsl(var(--pm-gray-500))' }}>
                  Informe o valor {chargeFieldLabel} antes de enviar ao financeiro.
                </p>
              ) : null}
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

      {/* Value edit modal */}
      {valueEditOpen && job.amount_charged_by_matrix != null && (
        <EcuValueEditModal
          open={valueEditOpen}
          onClose={() => setValueEditOpen(false)}
          jobId={job.id}
          jobCode={`#${job.id.slice(0, 8).toUpperCase()}`}
          valorAtual={job.amount_charged_by_matrix}
        />
      )}
    </div>
  )
}
