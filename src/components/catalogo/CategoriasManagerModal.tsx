// src/components/catalogo/CategoriasManagerModal.tsx
import { useState } from 'react'
import { Pencil, Trash2, Plus, Check, X, ChevronUp, ChevronDown } from 'lucide-react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  useEcuCategories,
  useCreateEcuCategory,
  useUpdateEcuCategory,
  useDeleteEcuCategory,
  type EcuCategory,
} from '@/hooks/useEcuCategories'
import { DeleteConfirmModal } from './DeleteConfirmModal'
import { cn } from '@/lib/utils'

interface Props {
  open: boolean
  onClose: () => void
  categoryCounts?: Record<string, number>
}

function CategoryRow({
  cat,
  isFirst,
  isLast,
  count,
}: {
  cat: EcuCategory
  isFirst: boolean
  isLast: boolean
  count: number
}) {
  const update = useUpdateEcuCategory()
  const remove = useDeleteEcuCategory()
  const [editing, setEditing] = useState(false)
  const [label, setLabel] = useState(cat.label)
  const [delOpen, setDelOpen] = useState(false)

  const save = () => {
    if (label.trim() && label.trim() !== cat.label) {
      update.mutate({ id: cat.id, patch: { label: label.trim() } })
    }
    setEditing(false)
  }

  const move = (direction: 'up' | 'down') => {
    update.mutate({ id: cat.id, patch: { ordem: cat.ordem + (direction === 'up' ? -1.5 : 1.5) } })
  }

  return (
    <div className="flex items-center gap-2 py-2 border-b border-[hsl(var(--pm-gray-700))] last:border-0">
      <div className="flex flex-col gap-0.5">
        <button
          className="text-muted-foreground hover:text-foreground disabled:opacity-20 transition-colors"
          onClick={() => move('up')}
          disabled={isFirst || update.isPending}
        >
          <ChevronUp size={13} />
        </button>
        <button
          className="text-muted-foreground hover:text-foreground disabled:opacity-20 transition-colors"
          onClick={() => move('down')}
          disabled={isLast || update.isPending}
        >
          <ChevronDown size={13} />
        </button>
      </div>

      <div className="flex-1 min-w-0">
        {editing ? (
          <Input
            className="h-7 text-sm"
            value={label}
            autoFocus
            onChange={e => setLabel(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') setEditing(false) }}
          />
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">{cat.label}</span>
            <span className="text-[10px] font-mono text-muted-foreground">{cat.slug}</span>
            {count > 0 && (
              <span className="text-[10px] font-mono text-[hsl(var(--pm-red-500))] bg-[hsl(var(--pm-red-500)_/_0.1)] px-1.5 py-0.5 rounded">
                {count}
              </span>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center gap-1 shrink-0">
        {editing ? (
          <>
            <Button size="icon" variant="ghost" className="h-6 w-6 text-green-400 hover:text-green-300" onClick={save}>
              <Check size={11} />
            </Button>
            <Button size="icon" variant="ghost" className="h-6 w-6 text-muted-foreground hover:text-foreground" onClick={() => { setLabel(cat.label); setEditing(false) }}>
              <X size={11} />
            </Button>
          </>
        ) : (
          <>
            <Button size="icon" variant="ghost" className="h-6 w-6 text-muted-foreground hover:text-foreground" onClick={() => setEditing(true)}>
              <Pencil size={11} />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className={cn(
                'h-6 w-6',
                count > 0 ? 'text-muted-foreground/30 cursor-not-allowed' : 'text-muted-foreground hover:text-destructive',
              )}
              disabled={count > 0}
              title={count > 0 ? `${count} registros vinculados — não pode excluir` : 'Excluir categoria'}
              onClick={() => setDelOpen(true)}
            >
              <Trash2 size={11} />
            </Button>
          </>
        )}
      </div>

      <DeleteConfirmModal
        open={delOpen}
        description={`Excluir categoria "${cat.label}"`}
        onCancel={() => setDelOpen(false)}
        onConfirm={() => remove.mutate(cat.id, { onSuccess: () => setDelOpen(false) })}
        isLoading={remove.isPending}
      />
    </div>
  )
}

export function CategoriasManagerModal({ open, onClose, categoryCounts = {} }: Props) {
  const { data: cats = [], isLoading } = useEcuCategories()
  const create = useCreateEcuCategory()
  const [newLabel, setNewLabel] = useState('')
  const [addError, setAddError] = useState<string | null>(null)

  const handleAdd = () => {
    const label = newLabel.trim()
    if (!label) return
    setAddError(null)
    create.mutate(label, {
      onSuccess: () => setNewLabel(''),
      onError: (e) => setAddError(e.message),
    })
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-md bg-[hsl(var(--pm-gray-900))] border-[hsl(var(--pm-gray-700))]">
        <DialogHeader>
          <DialogTitle className="font-mono uppercase tracking-widest text-sm text-[hsl(var(--pm-red-500))]">
            Gerenciar Categorias
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* list */}
          <div className="rounded border border-[hsl(var(--pm-gray-700))] px-3">
            {isLoading ? (
              <p className="text-xs text-muted-foreground py-4 text-center">Carregando...</p>
            ) : cats.length === 0 ? (
              <p className="text-xs text-muted-foreground py-4 text-center">Nenhuma categoria cadastrada.</p>
            ) : (
              cats.map((cat, i) => (
                <CategoryRow
                  key={cat.id}
                  cat={cat}
                  isFirst={i === 0}
                  isLast={i === cats.length - 1}
                  count={categoryCounts[cat.slug] ?? 0}
                />
              ))
            )}
          </div>

          {/* add new */}
          <div className="space-y-1.5">
            <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Nova categoria</p>
            <div className="flex gap-2">
              <Input
                className="h-8 text-sm flex-1"
                placeholder="Ex: Náutica"
                value={newLabel}
                onChange={e => setNewLabel(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAdd()}
              />
              <Button
                size="sm"
                className="h-8 gap-1.5 bg-[hsl(var(--pm-red-500))] hover:bg-[hsl(var(--pm-red-500)_/_0.85)] text-white shrink-0"
                disabled={!newLabel.trim() || create.isPending}
                onClick={handleAdd}
              >
                <Plus size={13} /> Adicionar
              </Button>
            </div>
            {addError && <p className="text-[10px] text-red-400 font-mono">{addError}</p>}
          </div>

          <p className="text-[9px] text-muted-foreground">
            Categorias com registros vinculados não podem ser excluídas. Renomear não afeta o slug nem os registros existentes.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
