import { useState } from 'react'
import { Plus, Edit2, PowerOff, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { useFormasPagamento, useUpsertFormaPagamento, useDeactivateFormaPagamento, type FormaPagamento } from '@/hooks/useFormasPagamento'

function FormaPagamentoModal({ unitId, item, open, onOpenChange }: {
  unitId: string | null
  item: FormaPagamento | null
  open: boolean
  onOpenChange: (v: boolean) => void
}) {
  const upsert = useUpsertFormaPagamento()
  const [name, setName] = useState(item?.name ?? '')
  const [fee, setFee] = useState(String(item?.fee_percentage ?? 0))
  const [days, setDays] = useState(String(item?.receipt_days ?? 0))
  const [parcelas, setParcelas] = useState(String(item?.max_installments ?? 1))
  const [err, setErr] = useState<string | null>(null)

  async function save() {
    if (!name.trim()) return
    setErr(null)
    try {
      await upsert.mutateAsync({
        ...(item?.id ? { id: item.id } : {}),
        unit_id: unitId,
        name: name.trim(),
        fee_percentage: Number(fee) || 0,
        receipt_days: Number(days) || 0,
        max_installments: Number(parcelas) || 1,
      })
      onOpenChange(false)
    } catch (e) { setErr(e instanceof Error ? e.message : 'Erro ao salvar.') }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>{item ? 'Editar Forma de Pagamento' : 'Nova Forma de Pagamento'}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Nome *</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="Ex: PIX, Cartão Crédito 2x" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label>Taxa (%)</Label>
              <Input type="number" min="0" step="0.01" value={fee} onChange={e => setFee(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Recebimento (D+)</Label>
              <Input type="number" min="0" value={days} onChange={e => setDays(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Parcelas máx</Label>
              <Input type="number" min="1" value={parcelas} onChange={e => setParcelas(e.target.value)} />
            </div>
          </div>
          {err && <p className="text-sm text-red-400">{err}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button className="bg-blue-600 hover:bg-blue-700" disabled={!name.trim() || upsert.isPending} onClick={save}>
            {upsert.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function TabFormasPagamento({ unitId }: { unitId: string | null | undefined }) {
  const { data: items = [], isLoading } = useFormasPagamento(unitId)
  const deactivate = useDeactivateFormaPagamento()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<FormaPagamento | null>(null)

  if (unitId === undefined || isLoading) return (
    <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-12 rounded-xl" />)}</div>
  )

  return (
    <div className="rounded-xl border border-zinc-700 bg-zinc-900 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-700">
        <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Formas de Pagamento ({items.length})</p>
        <Button size="sm" className="h-7 bg-blue-600 hover:bg-blue-700 text-xs" onClick={() => { setEditing(null); setOpen(true) }}>
          <Plus className="mr-1 h-3 w-3" />Nova
        </Button>
      </div>

      {items.length === 0 ? (
        <p className="p-6 text-sm text-zinc-500 text-center">Nenhuma forma de pagamento cadastrada.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800">
                {['Nome','Taxa','Recebimento','Parcelas',''].map(h => (
                  <th key={h} className="px-4 py-2 text-left text-xs text-zinc-500 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map(item => (
                <tr key={item.id} className="border-b border-zinc-800 hover:bg-zinc-800/40">
                  <td className="px-4 py-2 font-medium text-white">{item.name}</td>
                  <td className="px-4 py-2 text-zinc-400">{item.fee_percentage > 0 ? `${item.fee_percentage}%` : '—'}</td>
                  <td className="px-4 py-2 text-zinc-400">D+{item.receipt_days}</td>
                  <td className="px-4 py-2 text-zinc-400">{item.max_installments}x</td>
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-1 justify-end">
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-zinc-400 hover:text-white" onClick={() => { setEditing(item); setOpen(true) }}>
                        <Edit2 className="h-3 w-3" />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-zinc-400 hover:text-blue-400" disabled={deactivate.isPending} onClick={() => deactivate.mutate(item)}>
                        <PowerOff className="h-3 w-3" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <FormaPagamentoModal key={editing?.id ?? 'new'} unitId={unitId ?? null} item={editing} open={open} onOpenChange={setOpen} />
    </div>
  )
}
