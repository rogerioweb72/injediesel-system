import { useState } from 'react'
import { ArrowLeft, Download, Lock, CheckCircle, Monitor } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Skeleton } from '@/components/ui/skeleton'
import {
  useEquipmentTypes,
  useFirmwareUpdates,
  useFirmwareFiles,
  useMyAcceptances,
  useAcceptFirmwareUpdate,
  downloadFirmwareFile,
  type EquipmentType,
  type FirmwareUpdate,
  type Block,
} from '@/hooks/useFirmwareUpdates'
import { useAuth } from '@/hooks/useAuth'
import { useMyUnit } from '@/hooks/useMyUnit'

// ─── Renderização de blocos ───────────────────────────────────────────────────

function renderBlock(block: Block, index: number) {
  switch (block.type) {
    case 'aviso':
      return (
        <div key={index} className="flex gap-3 rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-4">
          <span className="mt-0.5 text-yellow-400">⚠</span>
          <p className="text-sm text-yellow-200">{block.content}</p>
        </div>
      )
    case 'texto':
      return (
        <div key={index} className="prose prose-invert prose-sm max-w-none">
          <p className="text-sm text-zinc-300 whitespace-pre-wrap">{block.content}</p>
        </div>
      )
    case 'passos':
      return (
        <ol key={index} className="space-y-2">
          {(block.items ?? []).map((item, i) => (
            <li key={i} className="flex gap-3 text-sm text-zinc-300">
              <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-red-600 text-xs font-bold text-white">
                {i + 1}
              </span>
              <span className="mt-0.5">{item}</span>
            </li>
          ))}
        </ol>
      )
    case 'imagem': {
      if (!block.r2_key) return null
      return (
        <figure key={index} className="space-y-2">
          <img
            src={`${import.meta.env.VITE_R2_PRESIGN_URL}/r2-firmware-img-serve?key=${encodeURIComponent(block.r2_key)}`}
            alt={block.caption ?? ''}
            className="w-full rounded-lg border border-zinc-700 object-cover"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
          />
          {block.caption && (
            <figcaption className="text-center text-xs text-zinc-500">{block.caption}</figcaption>
          )}
        </figure>
      )
    }
    case 'video': {
      const videoId = block.url?.match(/(?:v=|youtu\.be\/)([^&?/]+)/)?.[1]
      if (!videoId) return null
      return (
        <div key={index} className="aspect-video w-full overflow-hidden rounded-lg">
          <iframe
            src={`https://www.youtube.com/embed/${videoId}`}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="h-full w-full"
          />
        </div>
      )
    }
    default:
      return null
  }
}

// ─── Estado 3: Artigo + aceite + download ────────────────────────────────────

function ArticleView({
  update,
  equipment,
  onBack,
}: {
  update: FirmwareUpdate
  equipment: EquipmentType
  onBack: () => void
}) {
  const { user } = useAuth()
  const { data: myUnit } = useMyUnit()
  const { data: files = [], isLoading: filesLoading } = useFirmwareFiles(update.id)
  const { data: acceptances = [] } = useMyAcceptances()
  const acceptMutation = useAcceptFirmwareUpdate()

  const [checked, setChecked] = useState(false)
  const [downloading, setDownloading] = useState<string | null>(null)

  const myAcceptance = acceptances.find((a) => a.update_id === update.id)
  const alreadyAccepted = !!myAcceptance
  const canDownload = alreadyAccepted || checked

  async function handleDownload(fileId: string) {
    const file = files.find((f) => f.id === fileId)
    if (!file || !user) return
    setDownloading(fileId)
    try {
      if (!alreadyAccepted) {
        await acceptMutation.mutateAsync({
          update_id: update.id,
          unit_id: myUnit?.unit_id ?? null,
          user_id: user.id,
        })
      }
      await downloadFirmwareFile(file, update.id)
    } catch (err) {
      console.error(err)
    } finally {
      setDownloading(null)
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 pb-32">
      <button onClick={onBack} className="flex items-center gap-1 text-sm text-zinc-400 hover:text-white">
        <ArrowLeft className="h-4 w-4" />
        Versões
      </button>

      <div>
        <h1 className="text-xl font-bold text-white">
          {update.version} — {update.title}
        </h1>
        <p className="mt-1 text-sm text-zinc-400">
          {equipment.name}
          {update.published_at && (
            <> · {format(new Date(update.published_at), "d 'de' MMMM 'de' yyyy", { locale: ptBR })}</>
          )}
        </p>
      </div>

      <div className="space-y-4">
        {update.blocks.map((block, i) => renderBlock(block, i))}
      </div>

      {filesLoading ? (
        <Skeleton className="h-20 w-full" />
      ) : files.length > 0 ? (
        <div className="sticky bottom-4 rounded-xl border border-zinc-700 bg-zinc-900 p-4 shadow-xl space-y-3">
          {alreadyAccepted ? (
            <div className="flex items-center gap-2 text-sm text-emerald-400">
              <CheckCircle className="h-4 w-4" />
              Aceito em {format(new Date(myAcceptance!.accepted_at), 'dd/MM/yyyy')}
            </div>
          ) : (
            <label className="flex cursor-pointer items-start gap-3">
              <Checkbox
                checked={checked}
                onCheckedChange={(v) => setChecked(v === true)}
                className="mt-0.5"
              />
              <span className="text-xs text-zinc-300 leading-relaxed">
                Li todas as instruções e assumo a responsabilidade pela execução segura desta atualização.
              </span>
            </label>
          )}
          <div className="space-y-2">
            {files.map((file) => (
              <Button
                key={file.id}
                disabled={!canDownload || downloading === file.id}
                onClick={() => handleDownload(file.id)}
                className={`w-full gap-2 ${
                  canDownload
                    ? 'bg-red-600 hover:bg-red-700 text-white'
                    : 'bg-zinc-700 text-zinc-400 cursor-not-allowed'
                }`}
              >
                {canDownload ? <Download className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                {downloading === file.id ? 'Baixando...' : file.file_name}
              </Button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}

// ─── Estado 2: Lista de versões ───────────────────────────────────────────────

function VersionList({
  equipment,
  onBack,
  onSelect,
}: {
  equipment: EquipmentType
  onBack: () => void
  onSelect: (update: FirmwareUpdate) => void
}) {
  const { data: updates = [], isLoading } = useFirmwareUpdates(equipment.id)
  const { data: acceptances = [] } = useMyAcceptances()
  const acceptedIds = new Set(acceptances.map((a) => a.update_id))

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <button onClick={onBack} className="flex items-center gap-1 text-sm text-zinc-400 hover:text-white">
          <ArrowLeft className="h-4 w-4" />
          Equipamentos
        </button>
        <span className="text-zinc-600">/</span>
        <span className="text-base font-semibold text-white">{equipment.name}</span>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
        </div>
      ) : updates.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-12 text-center">
          <Monitor className="h-10 w-10 text-zinc-600" />
          <p className="text-sm text-zinc-500">Nenhuma atualização disponível para este equipamento.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {updates.map((update) => {
            const accepted = acceptedIds.has(update.id)
            return (
              <button
                key={update.id}
                onClick={() => onSelect(update)}
                className="w-full text-left rounded-xl border border-zinc-700 bg-zinc-900 p-4 hover:border-zinc-500 transition-colors"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium text-white text-sm">
                      {update.version} — {update.title}
                    </p>
                    <p className="mt-0.5 text-xs text-zinc-500">
                      {update.published_at
                        ? format(new Date(update.published_at), "d MMM yyyy", { locale: ptBR })
                        : ''}
                      {' · '}
                      {accepted ? 'Aceito' : 'Pendente aceite'}
                    </p>
                  </div>
                  {accepted ? (
                    <Badge className="bg-emerald-600/20 text-emerald-400 border-emerald-600/40 text-xs">
                      ACEITO
                    </Badge>
                  ) : (
                    <Badge className="bg-red-600/20 text-red-400 border-red-600/40 text-xs">
                      NOVO
                    </Badge>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Estado 1: Cards de equipamentos ─────────────────────────────────────────

export default function AtualizacoesPage() {
  const { data: equipments = [], isLoading } = useEquipmentTypes()
  const [selectedEquipment, setSelectedEquipment] = useState<EquipmentType | null>(null)
  const [selectedUpdate, setSelectedUpdate] = useState<FirmwareUpdate | null>(null)

  if (selectedEquipment && selectedUpdate) {
    return (
      <ArticleView
        update={selectedUpdate}
        equipment={selectedEquipment}
        onBack={() => setSelectedUpdate(null)}
      />
    )
  }

  if (selectedEquipment) {
    return (
      <VersionList
        equipment={selectedEquipment}
        onBack={() => setSelectedEquipment(null)}
        onSelect={setSelectedUpdate}
      />
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white">Atualizações de Firmware</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Selecione um equipamento para ver as atualizações disponíveis.
        </p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-28 w-full rounded-xl" />)}
        </div>
      ) : equipments.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-16 text-center">
          <Monitor className="h-12 w-12 text-zinc-600" />
          <p className="text-sm text-zinc-500">Em breve</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {equipments.map((eq) => (
            <button
              key={eq.id}
              onClick={() => setSelectedEquipment(eq)}
              className="flex flex-col items-start gap-2 rounded-xl border border-zinc-700 bg-zinc-900 p-4 text-left hover:border-zinc-500 transition-colors"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-600/20">
                <Monitor className="h-5 w-5 text-red-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">{eq.name}</p>
                {eq.description && (
                  <p className="mt-0.5 text-xs text-zinc-500 line-clamp-2">{eq.description}</p>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
