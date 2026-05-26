import { useState } from 'react'
import { Plus, Edit2, PowerOff, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { useServicos, useUpsertServico, useDeactivateServico, type Servico } from '@/hooks/useServicos'

function ServicoModal({ unitId, item, open, onOpenChange }: {
  unitId: string | null
  item: Servico | null
  open: boolean
  onOpenChange: (v: boolean) => void
}) {
  const upsert = useUpsertServico()
  const [name, setName] = useState(item?.name ?? '')
  const [description, setDescription] = useState(item?.description ?? '')
  const [price, setPrice] = useState(item?.default_price != null ? String(item.default_price) : '')
  const [minutes, setMinutes] = useState(item?.estimated_min != null ? String(item.estimated_min) : '')
  const [err, setErr] = useState<string | null>(null)

  async function save() {
    if (!name.trim()) return
    setErr(null)
    try {
      await upsert.mutateAsync({
        ...(item?.id ? { id: item.id } : {}),
        unit_id: unitId,
        name: name.trim(),
        description: description.trim() || null,
        default_price: price !== '' ? Number(price) : null,
        estimated_min: minutes !== '' ? Number(minutes) : null,
      })
      onOpenChange(false)
    } catch (e) { setErr(e instanceof Error ? e.message : 'Erro ao salvar.') }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>{item ? 'Editar Serviço' : 'Novo Serviço'}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Nome *</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="Nome do serviço" />
          </div>
          <div className="space-y-1.5">
            <Label>Descrição</Label>
            <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="Descrição opcional" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Preço padrão (R$)</Label>
              <Input type="number" min="0" step="0.01" value={price} onChange={e => setPrice(e.target.value)} placeholder="0,00" />
            </div>
            <div className="space-y-1.5">
              <Label>Tempo estimado (min)</Label>
              <Input type="number" min="0" value={minutes} onChange={e => setMinutes(e.target.value)} placeholder="60" />
            </div>
          </div>
          {err && <p className="text-sm text-red-400">{err}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button className="bg-red-600 hover:bg-red-700" disabled={!name.trim() || upsert.isPending} onClick={save}>
            {upsert.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function TabServicos({ unitId }: { unitId: string | null | undefined }) {
  const { data: items = [], isLoading } = useServicos(unitId)
  const deactivate = useDeactivateServico()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Servico | null>(null)

  if (unitId === undefined || isLoading) return (
    <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-12 rounded-xl" />)}</div>
  )

  return (
    <div className="rounded-xl border border-zinc-700 bg-zinc-900 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-700">
        <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Serviços ({items.length})</p>
        <Button size="sm" className="h-7 bg-red-600 hover:bg-red-700 text-xs" onClick={() => { setEditing(null); setOpen(true) }}>
          <Plus className="mr-1 h-3 w-3" />Novo
        </Button>
      </div>

      {items.length === 0 ? (
        <p className="p-6 text-sm text-zinc-500 text-center">Nenhum serviço cadastrado.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800">
                {['Nome','Descrição','Preço','Tempo',''].map(h => (
                  <th key={h} className="px-4 py-2 text-left text-xs text-zinc-500 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map(item => (
                <tr key={item.id} className="border-b border-zinc-800 hover:bg-zinc-800/40">
                  <td className="px-4 py-2 font-medium text-white">{item.name}</td>
                  <td className="px-4 py-2 text-zinc-400">{item.description ?? '—'}</td>
                  <td className="px-4 py-2 text-zinc-400">
                    {item.default_price != null ? `R$ ${Number(item.default_price).toFixed(2)}` : '—'}
                  </td>
                  <td className="px-4 py-2 text-zinc-400">
                    {item.estimated_min != null ? `${item.estimated_min} min` : '—'}
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-1 justify-end">
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-zinc-400 hover:text-white" onClick={() => { setEditing(item); setOpen(true) }}>
                        <Edit2 className="h-3 w-3" />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-zinc-400 hover:text-red-400" disabled={deactivate.isPending} onClick={() => deactivate.mutate(item)}>
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

      <ServicoModal key={editing?.id ?? 'new'} unitId={unitId ?? null} item={editing} open={open} onOpenChange={setOpen} />
    </div>
  )
}
