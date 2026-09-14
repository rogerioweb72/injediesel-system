// src/pages/app/configuracoes/ServiceTagsTab.tsx
// Gestão das tags de serviço do formulário de arquivo ECU. Antes eram hardcoded
// no frontend — agora company_admin / operations_admin / system_ti podem
// adicionar novas ou ocultar as existentes sem depender de deploy.
import { useState } from 'react'
import { Plus, ChevronUp, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import {
  useEcuServiceTagsAll,
  useCreateEcuServiceTag,
  useUpdateEcuServiceTag,
  type EcuServiceTag,
} from '@/hooks/useEcuServiceTags'
import { cn } from '@/lib/utils'

function TagRow({ tag, isFirst, isLast }: { tag: EcuServiceTag; isFirst: boolean; isLast: boolean }) {
  const update = useUpdateEcuServiceTag()

  const move = (direction: 'up' | 'down') => {
    update.mutate({ id: tag.id, patch: { ordem: tag.ordem + (direction === 'up' ? -1.5 : 1.5) } })
  }

  const toggleAtivo = (checked: boolean) => {
    update.mutate({ id: tag.id, patch: { ativo: checked } })
  }

  return (
    <div className={cn(
      'flex items-center gap-2 py-2.5 px-3 border-b border-[hsl(var(--pm-gray-700))] last:border-0',
      !tag.ativo && 'opacity-50',
    )}>
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

      <div className="flex-1 min-w-0 flex items-center gap-2">
        <span className="text-sm font-medium">{tag.label}</span>
        <span className="text-[10px] font-mono text-muted-foreground">{tag.slug}</span>
        {!tag.ativo && (
          <span className="text-[10px] font-mono text-muted-foreground bg-[hsl(var(--pm-gray-700))] px-1.5 py-0.5 rounded">
            OCULTA
          </span>
        )}
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
          {tag.ativo ? 'Visível' : 'Oculta'}
        </span>
        <Switch checked={tag.ativo} onCheckedChange={toggleAtivo} disabled={update.isPending} />
      </div>
    </div>
  )
}

export function ServiceTagsTab() {
  const { data: tags = [], isLoading } = useEcuServiceTagsAll()
  const create = useCreateEcuServiceTag()
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
    <div className="max-w-2xl space-y-6">
      <div>
        <h3 className="font-mono uppercase tracking-widest text-sm text-[hsl(var(--pm-red-500))] mb-1">
          Tags de Serviço (ECU)
        </h3>
        <p className="text-xs text-muted-foreground">
          Tags exibidas na criação de arquivo ECU. Oculte uma tag para removê-la do
          seletor de novos jobs sem apagar o histórico dos jobs que já a usam — ou
          adicione uma tag nova a qualquer momento.
        </p>
      </div>

      <div className="rounded border border-[hsl(var(--pm-gray-700))]">
        {isLoading ? (
          <p className="text-xs text-muted-foreground py-6 text-center">Carregando...</p>
        ) : tags.length === 0 ? (
          <p className="text-xs text-muted-foreground py-6 text-center">Nenhuma tag cadastrada.</p>
        ) : (
          tags.map((tag, i) => (
            <TagRow key={tag.id} tag={tag} isFirst={i === 0} isLast={i === tags.length - 1} />
          ))
        )}
      </div>

      <div className="space-y-1.5">
        <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Nova tag</p>
        <div className="flex gap-2">
          <Input
            className="h-9 text-sm flex-1"
            placeholder="Ex: Delete SCR"
            value={newLabel}
            onChange={e => setNewLabel(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
          />
          <Button
            className="h-9 gap-1.5 bg-[hsl(var(--pm-red-500))] hover:bg-[hsl(var(--pm-red-500)_/_0.85)] text-white shrink-0"
            disabled={!newLabel.trim() || create.isPending}
            onClick={handleAdd}
          >
            <Plus size={14} /> Adicionar
          </Button>
        </div>
        {addError && <p className="text-[10px] text-red-400 font-mono">{addError}</p>}
      </div>
    </div>
  )
}
