import { useState } from 'react'
import { toast } from 'sonner'
import { Wallet, Plus, Check, RotateCcw, Pencil, Trash2, AlertTriangle, Loader2 } from 'lucide-react'
import { RoleGuard } from '@/components/auth/RoleGuard'
import { translateError } from '@/lib/errors'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import type { FranchiseUnit } from '@/hooks/useFranchiseUnits'
import type { UserRole } from '@/types/app'
import {
  useFranchiseInstallments, useFranchiseCommission,
  useGenerateInstallments, useSetInstallmentPaid, useUpdateInstallment,
  useDeleteInstallment, useSetCommissionPaid, type Installment,
} from '@/hooks/useFranchiseInstallments'

const FIN_ROLES: UserRole[] = ['finance_admin', 'company_admin', 'operations_admin', 'system_ti']
const METHODS = [
  { v: 'boleto', l: 'Boleto' }, { v: 'pix', l: 'PIX' },
  { v: 'cartao', l: 'Cartão' }, { v: 'transferencia', l: 'Transferência' },
]
const PLAN_PARCELAS: Record<string, number> = { a_vista: 0, '3x': 3, '6x': 6, '12x': 12 }

function brl(v?: number | null) {
  return (v ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}
function fmtDate(v?: string | null) {
  if (!v) return '—'
  return new Date(v + 'T00:00:00').toLocaleDateString('pt-BR')
}
function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

export function FinanceiroContratoTab({ unit }: { unit: FranchiseUnit }) {
  const { data: rows = [], isLoading } = useFranchiseInstallments(unit.id)
  const { data: commission } = useFranchiseCommission(unit.id)
  const gen = useGenerateInstallments()
  const setPaid = useSetInstallmentPaid(unit.id)
  const del = useDeleteInstallment(unit.id)
  const setCommPaid = useSetCommissionPaid(unit.id)

  const [genOpen, setGenOpen] = useState(false)
  const [editRow, setEditRow] = useState<Installment | null>(null)
  const [delRow, setDelRow] = useState<Installment | null>(null)

  const totalParcelado = rows.reduce((s, r) => s + Number(r.amount), 0)
  const pago = rows.filter((r) => r.status === 'pago').reduce((s, r) => s + Number(r.paid_amount ?? r.amount), 0)
  const emAberto = rows.filter((r) => r.status === 'pendente').reduce((s, r) => s + Number(r.amount), 0)
  const atrasadas = rows.filter((r) => r.atrasado)
  const atrasadoSum = atrasadas.reduce((s, r) => s + Number(r.amount), 0)

  const hasSale = unit.sale_status && unit.sale_status !== 'none'
  const hasPago = rows.some((r) => r.status === 'pago')

  async function togglePaid(r: Installment) {
    try { await setPaid.mutateAsync({ id: r.id, paid: r.status !== 'pago' }); toast.success('Atualizado') }
    catch (e) { toast.error(translateError(e)) }
  }
  async function removeRow() {
    if (!delRow) return
    try { await del.mutateAsync(delRow.id); toast.success('Parcela removida'); setDelRow(null) }
    catch (e) { toast.error(translateError(e)) }
  }

  if (!hasSale) {
    return <p className="text-sm text-muted-foreground">Unidade sem contrato de venda — financeiro de parcelas não se aplica.</p>
  }

  return (
    <div className="space-y-6">
      {/* Resumo */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Kpi label="Valor do contrato" value={brl(unit.franchise_fee)} />
        <Kpi label="Parcelado" value={brl(totalParcelado)} />
        <Kpi label="Pago" value={brl(pago)} color="#34D399" />
        <Kpi label="Em aberto" value={brl(emAberto)} color="#F59E0B" />
        <Kpi label={`Atrasado (${atrasadas.length})`} value={brl(atrasadoSum)} color={atrasadas.length ? '#F87171' : undefined} />
      </div>

      {/* Parcelas */}
      <div className="pm-card space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
            <Wallet size={12} /> Parcelas do contrato
          </p>
          <RoleGuard roles={FIN_ROLES}>
            <button onClick={() => setGenOpen(true)}
              className="flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-widest text-amber-400 hover:text-amber-300 border border-amber-500/30 hover:border-amber-500/50 bg-amber-500/[0.08] px-3 py-1.5 rounded-lg transition-all">
              <Plus size={12} /> {rows.length ? 'Regerar parcelas' : 'Gerar parcelas'}
            </button>
          </RoleGuard>
        </div>

        {isLoading ? (
          <div className="pm-skeleton h-16 rounded" />
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma parcela gerada. Use "Gerar parcelas" para criar o cronograma a partir do valor do contrato.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[11px] uppercase tracking-wider text-zinc-500 text-left">
                  <th className="py-2 pr-2">Parcela</th>
                  <th className="py-2 px-2">Vencimento</th>
                  <th className="py-2 px-2">Valor</th>
                  <th className="py-2 px-2">Forma</th>
                  <th className="py-2 px-2">Status</th>
                  <th className="py-2 pl-2 text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-t border-white/5">
                    <td className="py-2 pr-2 text-zinc-100">{r.label}</td>
                    <td className="py-2 px-2 text-zinc-300">{fmtDate(r.due_date)}</td>
                    <td className="py-2 px-2 text-zinc-100">{brl(r.amount)}</td>
                    <td className="py-2 px-2 text-zinc-400">{METHODS.find((m) => m.v === r.payment_method)?.l ?? '—'}</td>
                    <td className="py-2 px-2"><StatusPill r={r} /></td>
                    <td className="py-2 pl-2">
                      <RoleGuard roles={FIN_ROLES}>
                        <div className="flex items-center gap-1 justify-end">
                          <button onClick={() => togglePaid(r)} disabled={setPaid.isPending} title={r.status === 'pago' ? 'Estornar' : 'Marcar pago'}
                            className="p-1.5 rounded-md text-zinc-400 hover:bg-white/[0.06] hover:text-emerald-400">
                            {r.status === 'pago' ? <RotateCcw size={14} /> : <Check size={14} />}
                          </button>
                          {r.status !== 'pago' && (
                            <>
                              <button onClick={() => setEditRow(r)} title="Editar/renegociar"
                                className="p-1.5 rounded-md text-zinc-400 hover:bg-white/[0.06] hover:text-amber-400"><Pencil size={14} /></button>
                              <button onClick={() => setDelRow(r)} title="Remover"
                                className="p-1.5 rounded-md text-zinc-500 hover:bg-white/[0.06] hover:text-red-400"><Trash2 size={14} /></button>
                            </>
                          )}
                        </div>
                      </RoleGuard>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Comissão do vendedor */}
      {commission && (
        <div className="pm-card space-y-2">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Comissão do vendedor</p>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="text-sm text-zinc-300">
              <span className="text-zinc-100 font-medium">{brl(commission.amount)}</span>
              <span className="text-zinc-500"> · {commission.commission_type === 'percent' ? `${commission.commission_value}% de ${brl(commission.base_amount)}` : 'valor fixo'}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] px-2 py-1 rounded-full" style={{
                color: commission.status === 'pago' ? '#34D399' : '#F59E0B',
                background: commission.status === 'pago' ? '#34D39916' : '#F59E0B16',
              }}>{commission.status === 'pago' ? 'Paga' : 'Pendente'}</span>
              <RoleGuard roles={FIN_ROLES}>
                <button onClick={async () => {
                  try { await setCommPaid.mutateAsync({ id: commission.id, paid: commission.status !== 'pago' }); toast.success('Atualizado') }
                  catch (e) { toast.error(translateError(e)) }
                }} className="text-xs text-amber-400 hover:text-amber-300 border border-amber-500/30 px-2.5 py-1 rounded-md">
                  {commission.status === 'pago' ? 'Estornar' : 'Marcar paga'}
                </button>
              </RoleGuard>
            </div>
          </div>
        </div>
      )}

      {atrasadas.length > 0 && (
        <div className="flex items-center gap-2 text-sm text-red-400">
          <AlertTriangle size={15} /> {atrasadas.length} parcela(s) atrasada(s) — {brl(atrasadoSum)} em cobrança.
        </div>
      )}

      {/* Dialog: gerar/regerar */}
      <GenerateDialog
        open={genOpen} onOpenChange={setGenOpen} unit={unit} hasPago={hasPago} pending={gen.isPending}
        onSubmit={async (a) => {
          try {
            await gen.mutateAsync({ unitId: unit.id, ...a })
            toast.success('Parcelas geradas'); setGenOpen(false)
          } catch (e) { toast.error(translateError(e)) }
        }}
      />

      {/* Dialog: editar parcela */}
      {editRow && <EditDialog unitId={unit.id} row={editRow} onClose={() => setEditRow(null)} />}

      <ConfirmDialog
        open={!!delRow} onOpenChange={(o) => !o && setDelRow(null)}
        title="Remover parcela" description={`Remover "${delRow?.label}"? Esta ação não pode ser desfeita.`}
        confirmLabel="Remover" isLoading={del.isPending} onConfirm={removeRow}
      />
    </div>
  )
}

function Kpi({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="rounded-lg px-3 py-2" style={{ background: 'hsl(var(--pm-gray-900))', border: '1px solid rgba(255,255,255,0.06)' }}>
      <p className="text-[10px] uppercase tracking-wider text-zinc-500">{label}</p>
      <p className="text-sm font-semibold" style={{ color: color ?? '#fff' }}>{value}</p>
    </div>
  )
}

function StatusPill({ r }: { r: Installment }) {
  const s = r.atrasado ? { t: 'Atrasado', c: '#F87171' }
    : r.status === 'pago' ? { t: 'Pago', c: '#34D399' }
    : r.status === 'cancelado' ? { t: 'Cancelado', c: '#94A3B8' }
    : { t: 'Pendente', c: '#F59E0B' }
  return <span className="text-[11px] px-2 py-0.5 rounded-full" style={{ color: s.c, background: `${s.c}1a` }}>{s.t}</span>
}

// ── Dialog: gerar/regerar parcelas ───────────────────────────────────────────
function GenerateDialog({ open, onOpenChange, unit, hasPago, pending, onSubmit }: {
  open: boolean; onOpenChange: (o: boolean) => void; unit: FranchiseUnit; hasPago: boolean; pending: boolean
  onSubmit: (a: { entrada: number; numParcelas: number; firstDue: string; paymentMethod: string }) => void
}) {
  const [entrada, setEntrada] = useState('0')
  const [numParcelas, setNumParcelas] = useState(String(PLAN_PARCELAS[unit.payment_plan ?? ''] ?? 12))
  const [firstDue, setFirstDue] = useState(todayISO())
  const [method, setMethod] = useState(unit.sale_payment_method ?? 'pix')

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Gerar parcelas do contrato</DialogTitle></DialogHeader>
        {hasPago && (
          <p className="text-xs text-red-400">Há parcelas já pagas — regenerar não é permitido. Edite as parcelas individualmente.</p>
        )}
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">Valor do contrato: <strong className="text-zinc-200">{brl(unit.franchise_fee)}</strong>. A entrada + parcelas somam esse total (split calculado no servidor).</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Entrada (R$)</Label>
              <Input type="number" step="0.01" min={0} value={entrada} onChange={(e) => setEntrada(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Nº de parcelas</Label>
              <Input type="number" min={0} value={numParcelas} onChange={(e) => setNumParcelas(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>1º vencimento</Label>
              <Input type="date" value={firstDue} onChange={(e) => setFirstDue(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Forma de pagamento</Label>
              <Select value={method} onValueChange={setMethod}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{METHODS.map((m) => <SelectItem key={m.v} value={m.v}>{m.l}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button disabled={pending || hasPago}
            style={{ background: 'linear-gradient(135deg, #D97706 0%, #F59E0B 100%)' }}
            onClick={() => onSubmit({ entrada: Number(entrada) || 0, numParcelas: Number(numParcelas) || 0, firstDue, paymentMethod: method })}>
            {pending ? <Loader2 size={15} className="animate-spin" /> : 'Gerar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Dialog: editar/renegociar uma parcela ────────────────────────────────────
function EditDialog({ unitId, row, onClose }: { unitId: string; row: Installment; onClose: () => void }) {
  const upd = useUpdateInstallment(unitId)
  const [amount, setAmount] = useState(String(row.amount))
  const [dueDate, setDueDate] = useState(row.due_date)
  const [method, setMethod] = useState(row.payment_method ?? 'pix')

  async function save() {
    try {
      await upd.mutateAsync({ id: row.id, amount: Number(amount) || 0, dueDate, paymentMethod: method })
      toast.success('Parcela atualizada'); onClose()
    } catch (e) { toast.error(translateError(e)) }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Editar {row.label}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label>Valor (R$)</Label>
            <Input type="number" step="0.01" min={0} value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Vencimento</Label>
              <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Forma</Label>
              <Select value={method} onValueChange={setMethod}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{METHODS.map((m) => <SelectItem key={m.v} value={m.v}>{m.l}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button disabled={upd.isPending} style={{ background: 'linear-gradient(135deg, #D97706 0%, #F59E0B 100%)' }} onClick={save}>
            {upd.isPending ? <Loader2 size={15} className="animate-spin" /> : 'Salvar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
