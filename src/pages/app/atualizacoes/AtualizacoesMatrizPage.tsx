import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Plus, ChevronDown, ChevronRight, Edit2, Zap, Loader2 } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import {
  useEquipmentTypes,
  useFirmwareUpdatesAdmin,
  useUpsertEquipmentType,
  type EquipmentType,
  type FirmwareUpdate,
} from '@/hooks/useFirmwareUpdates'

// ─── UpdateRow ────────────────────────────────────────────────────────────────

function UpdateRow({ update, agentSlug }: { update: FirmwareUpdate; agentSlug: string }) {
  const navigate = useNavigate()
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2">
      <div>
        <p className="text-sm text-white">{update.version} — {update.title}</p>
        <p className="text-xs text-zinc-500">
          {update.published_at
            ? format(new Date(update.published_at), "d MMM yyyy", { locale: ptBR })
            : format(new Date(update.created_at), "d MMM yyyy", { locale: ptBR })}
        </p>
      </div>
      <div className="flex items-center gap-2">
        {update.published ? (
          <Badge className="bg-emerald-600/20 text-emerald-400 border-emerald-600/40 text-xs">
            Publicado
          </Badge>
        ) : (
          <Badge variant="outline" className="text-zinc-500 text-xs">Rascunho</Badge>
        )}
        <Button
          size="sm"
          variant="ghost"
          className="h-7 px-2 text-zinc-400 hover:text-white"
          onClick={() => navigate(`/${agentSlug}/atualizacoes/${update.id}/editar`)}
        >
          <Edit2 className="h-3 w-3" />
        </Button>
      </div>
    </div>
  )
}

// ─── EquipmentAccordion ───────────────────────────────────────────────────────

function EquipmentAccordion({
  equipment,
  agentSlug,
  onEdit,
}: {
  equipment: EquipmentType
  agentSlug: string
  onEdit: (eq: EquipmentType) => void
}) {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const { data: updates = [], isLoading } = useFirmwareUpdatesAdmin(equipment.id)

  return (
    <div className="rounded-xl border border-zinc-700 bg-zinc-900 overflow-hidden">
      <div className="flex items-center justify-between gap-3 p-4">
        <button
          className="flex flex-1 items-center gap-3 text-left min-w-0"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? (
            <ChevronDown className="h-4 w-4 flex-shrink-0 text-zinc-400" />
          ) : (
            <ChevronRight className="h-4 w-4 flex-shrink-0 text-zinc-400" />
          )}
          <div className="min-w-0">
            <p className="font-semibold text-white truncate">{equipment.name}</p>
            {equipment.description && (
              <p className="text-xs text-zinc-500 truncate">{equipment.description}</p>
            )}
          </div>
        </button>
        <div className="flex flex-shrink-0 items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            className="h-8 text-xs"
            onClick={() => onEdit(equipment)}
          >
            <Edit2 className="mr-1 h-3 w-3" />
            Editar
          </Button>
          <Button
            size="sm"
            className="h-8 bg-red-600 hover:bg-red-700 text-xs"
            onClick={() => navigate(`/${agentSlug}/atualizacoes/${equipment.slug}/novo`)}
          >
            <Plus className="mr-1 h-3 w-3" />
            Update
          </Button>
        </div>
      </div>

      {open && (
        <div className="border-t border-zinc-700 px-4 pb-4 pt-3 space-y-2">
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : updates.length === 0 ? (
            <p className="py-3 text-center text-xs text-zinc-500">
              Nenhum update criado ainda.
            </p>
          ) : (
            updates.map((u) => (
              <UpdateRow key={u.id} update={u} agentSlug={agentSlug} />
            ))
          )}
        </div>
      )}
    </div>
  )
}

// ─── EquipmentModal ───────────────────────────────────────────────────────────

function EquipmentModal({
  equipment,
  open,
  onOpenChange,
}: {
  equipment: EquipmentType | null
  open: boolean
  onOpenChange: (v: boolean) => void
}) {
  const upsert = useUpsertEquipmentType()
  const [name, setName] = useState(equipment?.name ?? '')
  const [description, setDescription] = useState(equipment?.description ?? '')

  const slug = name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

  async function handleSave() {
    if (!name.trim()) return
    await upsert.mutateAsync({
      ...(equipment?.id ? { id: equipment.id } : {}),
      name: name.trim(),
      slug,
      description: description.trim() || null,
    })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{equipment ? 'Editar Equipamento' : 'Novo Equipamento'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Nome</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Scanner X200"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Slug (auto-gerado)</Label>
            <Input value={slug} disabled className="text-zinc-400" />
          </div>
          <div className="space-y-1.5">
            <Label>Descrição (opcional)</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Breve descrição do equipamento"
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            disabled={!name.trim() || upsert.isPending}
            onClick={handleSave}
            className="bg-red-600 hover:bg-red-700"
          >
            {upsert.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AtualizacoesMatrizPage() {
  const { agentSlug } = useParams<{ agentSlug: string }>()
  const { data: equipments = [], isLoading } = useEquipmentTypes()
  const [modalOpen, setModalOpen] = useState(false)
  const [editingEquipment, setEditingEquipment] = useState<EquipmentType | null>(null)

  function openNew() {
    setEditingEquipment(null)
    setModalOpen(true)
  }

  function openEdit(eq: EquipmentType) {
    setEditingEquipment(eq)
    setModalOpen(true)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-red-400" />
          <h1 className="text-xl font-bold text-white">Firmware</h1>
        </div>
        <Button onClick={openNew} className="bg-red-600 hover:bg-red-700">
          <Plus className="mr-2 h-4 w-4" />
          Novo Equipamento
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2].map((i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
        </div>
      ) : equipments.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <Zap className="h-12 w-12 text-zinc-600" />
          <p className="text-sm text-zinc-500">
            Nenhum equipamento cadastrado. Clique em "Novo Equipamento" para começar.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {equipments.map((eq) => (
            <EquipmentAccordion
              key={eq.id}
              equipment={eq}
              agentSlug={agentSlug ?? ''}
              onEdit={openEdit}
            />
          ))}
        </div>
      )}

      <EquipmentModal
        equipment={editingEquipment}
        open={modalOpen}
        onOpenChange={setModalOpen}
      />
    </div>
  )
}
