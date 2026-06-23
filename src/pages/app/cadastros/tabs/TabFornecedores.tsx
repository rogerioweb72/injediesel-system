import { useState } from 'react'
import { Plus, Edit2, PowerOff, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { useFornecedores, useUpsertFornecedor, useDeactivateFornecedor, type Fornecedor } from '@/hooks/useFornecedores'

function FornecedorModal({ unitId, item, open, onOpenChange }: {
  unitId: string | null
  item: Fornecedor | null
  open: boolean
  onOpenChange: (v: boolean) => void
}) {
  const upsert = useUpsertFornecedor()
  const [name, setName] = useState(item?.name ?? '')
  const [document, setDocument] = useState(item?.document ?? '')
  const [contact, setContact] = useState(item?.contact ?? '')
  const [term, setTerm] = useState(String(item?.payment_term_days ?? 30))
  const [notes, setNotes] = useState(item?.notes ?? '')
  const [err, setErr] = useState<string | null>(null)

  async function save() {
    if (!name.trim()) return
    setErr(null)
    try {
      await upsert.mutateAsync({
        ...(item?.id ? { id: item.id } : {}),
        unit_id: unitId,
        name: name.trim(),
        document: document.trim() || null,
        contact: contact.trim() || null,
        payment_term_days: Number(term) || 30,
        notes: notes.trim() || null,
      })
      onOpenChange(false)
    } catch (e) { setErr(e instanceof Error ? e.message : 'Erro ao salvar.') }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>{item ? 'Editar Fornecedor' : 'Novo Fornecedor'}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Nome *</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="Nome do fornecedor" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>CNPJ / CPF</Label>
              <Input value={document} onChange={e => setDocument(e.target.value)} placeholder="00.000.000/0001-00" />
            </div>
            <div className="space-y-1.5">
              <Label>Prazo padrão (dias)</Label>
              <Input type="number" min="0" value={term} onChange={e => setTerm(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Contato</Label>
            <Input value={contact} onChange={e => setContact(e.target.value)} placeholder="Telefone ou e-mail" />
          </div>
          <div className="space-y-1.5">
            <Label>Observações</Label>
            <Input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Observações opcionais" />
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

export function TabFornecedores({ unitId }: { unitId: string | null | undefined }) {
  const { data: items = [], isLoading } = useFornecedores(unitId)
  const deactivate = useDeactivateFornecedor()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Fornecedor | null>(null)

  if (unitId === undefined || isLoading) return (
    <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-12 rounded-xl" />)}</div>
  )

  return (
    <div className="rounded-xl border border-zinc-700 bg-zinc-900 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-700">
        <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Fornecedores ({items.length})</p>
        <Button size="sm" className="h-7 bg-blue-600 hover:bg-blue-700 text-xs" onClick={() => { setEditing(null); setOpen(true) }}>
          <Plus className="mr-1 h-3 w-3" />Novo
        </Button>
      </div>

      {items.length === 0 ? (
        <p className="p-6 text-sm text-zinc-500 text-center">Nenhum fornecedor cadastrado.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800">
                {['Nome','Documento','Contato','Prazo',''].map(h => (
                  <th key={h} className="px-4 py-2 text-left text-xs text-zinc-500 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map(item => (
                <tr key={item.id} className="border-b border-zinc-800 hover:bg-zinc-800/40">
                  <td className="px-4 py-2 font-medium text-white">{item.name}</td>
                  <td className="px-4 py-2 text-zinc-400">{item.document ?? '—'}</td>
                  <td className="px-4 py-2 text-zinc-400">{item.contact ?? '—'}</td>
                  <td className="px-4 py-2 text-zinc-400">{item.payment_term_days}d</td>
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

      <FornecedorModal key={editing?.id ?? 'new'} unitId={unitId ?? null} item={editing} open={open} onOpenChange={setOpen} />
    </div>
  )
}
