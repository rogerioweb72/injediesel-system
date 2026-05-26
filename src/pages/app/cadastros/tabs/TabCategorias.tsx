import { useState } from 'react'
import { Plus, Edit2, PowerOff, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  useFinancialCategories,
  useUpsertFinancialCategory,
  useDeactivateFinancialCategory,
  type FinancialCategory,
} from '@/hooks/useFinancial'

function CategoriaModal({ item, open, onOpenChange }: {
  item: FinancialCategory | null
  open: boolean
  onOpenChange: (v: boolean) => void
}) {
  const upsert = useUpsertFinancialCategory()
  const [name, setName] = useState(item?.name ?? '')
  const [type, setType] = useState<'receita' | 'despesa'>(item?.type ?? 'receita')
  const [subtipo, setSubtipo] = useState<'fixa' | 'variavel' | 'none'>(item?.subtipo ?? 'none')
  const [err, setErr] = useState<string | null>(null)

  async function save() {
    if (!name.trim()) return
    setErr(null)
    try {
      await upsert.mutateAsync({
        ...(item?.id ? { id: item.id } : {}),
        name: name.trim(),
        type,
        subtipo: subtipo === 'none' ? null : subtipo,
      })
      onOpenChange(false)
    } catch (e) { setErr(e instanceof Error ? e.message : 'Erro ao salvar.') }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>{item ? 'Editar Categoria' : 'Nova Categoria'}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Nome *</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Aluguel, Vendas, Manutenção" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Tipo</Label>
              <Select value={type} onValueChange={v => setType(v as 'receita' | 'despesa')}>
                <SelectTrigger className="bg-zinc-800 border-zinc-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="receita">Receita</SelectItem>
                  <SelectItem value="despesa">Despesa</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Subtipo</Label>
              <Select value={subtipo} onValueChange={v => setSubtipo(v as 'fixa' | 'variavel' | 'none')}>
                <SelectTrigger className="bg-zinc-800 border-zinc-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">—</SelectItem>
                  <SelectItem value="fixa">Fixa</SelectItem>
                  <SelectItem value="variavel">Variável</SelectItem>
                </SelectContent>
              </Select>
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

const TYPE_LABEL: Record<string, string> = { receita: 'Receita', despesa: 'Despesa' }
const TYPE_CLASS: Record<string, string> = {
  receita: 'bg-emerald-900/40 text-emerald-400',
  despesa: 'bg-red-900/40 text-red-400',
}
const SUBTIPO_LABEL: Record<string, string> = { fixa: 'Fixa', variavel: 'Variável' }

export function TabCategorias() {
  const { data: items = [], isLoading } = useFinancialCategories()
  const deactivate = useDeactivateFinancialCategory()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<FinancialCategory | null>(null)

  if (isLoading) return (
    <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-12 rounded-xl" />)}</div>
  )

  return (
    <div className="rounded-xl border border-zinc-700 bg-zinc-900 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-700">
        <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Categorias Financeiras ({items.length})</p>
        <Button size="sm" className="h-7 bg-red-600 hover:bg-red-700 text-xs" onClick={() => { setEditing(null); setOpen(true) }}>
          <Plus className="mr-1 h-3 w-3" />Nova
        </Button>
      </div>

      {items.length === 0 ? (
        <p className="p-6 text-sm text-zinc-500 text-center">Nenhuma categoria cadastrada.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800">
                {['Nome','Tipo','Subtipo',''].map(h => (
                  <th key={h} className="px-4 py-2 text-left text-xs text-zinc-500 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map(item => (
                <tr key={item.id} className="border-b border-zinc-800 hover:bg-zinc-800/40">
                  <td className="px-4 py-2 font-medium text-white">{item.name}</td>
                  <td className="px-4 py-2">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${TYPE_CLASS[item.type] ?? ''}`}>
                      {TYPE_LABEL[item.type] ?? item.type}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-zinc-400">
                    {item.subtipo ? SUBTIPO_LABEL[item.subtipo] ?? item.subtipo : '—'}
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

      <CategoriaModal key={editing?.id ?? 'new'} item={editing} open={open} onOpenChange={setOpen} />
    </div>
  )
}
