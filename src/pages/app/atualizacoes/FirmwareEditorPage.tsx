import { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  ChevronUp,
  ChevronDown,
  Trash2,
  Plus,
  Loader2,
  FileText,
  X,
  Image as ImageIcon,
  Video,
  AlertTriangle,
  AlignLeft,
  List,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  useEquipmentTypes,
  useFirmwareUpdate,
  useSaveFirmwareUpdate,
  useFirmwareFiles,
  useAddFirmwareFile,
  useDeleteFirmwareFile,
  type Block,
  type BlockType,
} from '@/hooks/useFirmwareUpdates'
import { uploadFirmwareImageToR2, uploadFirmwareFileToR2 } from '@/lib/r2'
import { supabase } from '@/lib/supabase'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatFileSize(bytes: number | null): string {
  if (!bytes) return '—'
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

async function getAccessToken(): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession()
  return session?.access_token ?? ''
}

function makeDefaultBlock(type: BlockType): Block {
  switch (type) {
    case 'aviso':
      return { type: 'aviso', content: '' }
    case 'texto':
      return { type: 'texto', content: '' }
    case 'passos':
      return { type: 'passos', items: [''] }
    case 'imagem':
      return { type: 'imagem', r2_key: '', caption: '' }
    case 'video':
      return { type: 'video', url: '' }
  }
}

// ─── Block editors ────────────────────────────────────────────────────────────

interface BlockCardProps {
  index: number
  total: number
  onMoveUp: () => void
  onMoveDown: () => void
  onDelete: () => void
  children: React.ReactNode
  label: string
  labelIcon?: React.ReactNode
  warnStyle?: boolean
}

function BlockCard({
  index,
  total,
  onMoveUp,
  onMoveDown,
  onDelete,
  children,
  label,
  labelIcon,
  warnStyle,
}: BlockCardProps) {
  return (
    <div
      className={`rounded-xl border bg-zinc-900 overflow-hidden ${
        warnStyle ? 'border-yellow-600/60' : 'border-zinc-700'
      }`}
    >
      <div
        className={`flex items-center justify-between px-3 py-2 ${
          warnStyle
            ? 'border-b border-yellow-600/40 bg-yellow-950/40'
            : 'border-b border-zinc-700 bg-zinc-800/60'
        }`}
      >
        <div className="flex items-center gap-1.5 text-xs font-medium text-zinc-400">
          {labelIcon}
          {label}
        </div>
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant="ghost"
            className="h-6 w-6 p-0 text-zinc-500 hover:text-white disabled:opacity-30"
            disabled={index === 0}
            onClick={onMoveUp}
            title="Mover para cima"
          >
            <ChevronUp className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-6 w-6 p-0 text-zinc-500 hover:text-white disabled:opacity-30"
            disabled={index === total - 1}
            onClick={onMoveDown}
            title="Mover para baixo"
          >
            <ChevronDown className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-6 w-6 p-0 text-zinc-500 hover:text-red-400"
            onClick={onDelete}
            title="Remover bloco"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
      <div className="p-3">{children}</div>
    </div>
  )
}

// Aviso block
function AvisoBlockEditor({
  block,
  onChange,
}: {
  block: Block & { type: 'aviso' }
  onChange: (b: Block) => void
}) {
  return (
    <Textarea
      value={block.content ?? ''}
      onChange={(e) => onChange({ ...block, content: e.target.value })}
      placeholder="Texto do aviso..."
      rows={3}
      className="resize-none border-yellow-600/40 bg-yellow-950/20 text-yellow-200 placeholder:text-yellow-700/60 focus-visible:ring-yellow-600/40"
    />
  )
}

// Texto block
function TextoBlockEditor({
  block,
  onChange,
}: {
  block: Block & { type: 'texto' }
  onChange: (b: Block) => void
}) {
  return (
    <Textarea
      value={block.content ?? ''}
      onChange={(e) => onChange({ ...block, content: e.target.value })}
      placeholder="Conteúdo do parágrafo..."
      rows={4}
      className="resize-none"
    />
  )
}

// Passos block
function PassosBlockEditor({
  block,
  onChange,
}: {
  block: Block & { type: 'passos' }
  onChange: (b: Block) => void
}) {
  const items = block.items ?? ['']

  function updateItem(idx: number, value: string) {
    const next = [...items]
    next[idx] = value
    onChange({ ...block, items: next })
  }

  function removeItem(idx: number) {
    const next = items.filter((_, i) => i !== idx)
    onChange({ ...block, items: next.length ? next : [''] })
  }

  function addItem() {
    onChange({ ...block, items: [...items, ''] })
  }

  return (
    <div className="space-y-2">
      {items.map((item, idx) => (
        <div key={idx} className="flex items-center gap-2">
          <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-zinc-700 text-xs font-bold text-zinc-300">
            {idx + 1}
          </span>
          <Input
            value={item}
            onChange={(e) => updateItem(idx, e.target.value)}
            placeholder={`Passo ${idx + 1}...`}
            className="flex-1"
          />
          <Button
            size="sm"
            variant="ghost"
            className="h-7 w-7 p-0 text-zinc-500 hover:text-red-400"
            onClick={() => removeItem(idx)}
            disabled={items.length === 1}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ))}
      <Button
        size="sm"
        variant="outline"
        className="mt-1 h-7 text-xs"
        onClick={addItem}
      >
        <Plus className="mr-1 h-3 w-3" />
        Adicionar passo
      </Button>
    </div>
  )
}

// Imagem block
function ImagemBlockEditor({
  block,
  onChange,
}: {
  block: Block & { type: 'imagem' }
  onChange: (b: Block) => void
}) {
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadError(null)
    setUploading(true)
    try {
      const token = await getAccessToken()
      const result = await uploadFirmwareImageToR2({ file, accessToken: token })
      onChange({ ...block, r2_key: result.key })
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Falha ao enviar imagem.')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <Button
          size="sm"
          variant="outline"
          className="h-8 text-xs"
          disabled={uploading}
          onClick={() => fileInputRef.current?.click()}
        >
          {uploading ? (
            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
          ) : (
            <ImageIcon className="mr-1.5 h-3.5 w-3.5" />
          )}
          {uploading ? 'Enviando...' : 'Selecionar imagem'}
        </Button>
        {block.r2_key && (
          <span className="text-xs text-emerald-400">Imagem carregada</span>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>
      {uploadError && (
        <p className="text-xs text-red-400">{uploadError}</p>
      )}
      {block.r2_key && (
        <div className="space-y-1">
          <Label className="text-xs text-zinc-400">Legenda (opcional)</Label>
          <Input
            value={block.caption ?? ''}
            onChange={(e) => onChange({ ...block, caption: e.target.value })}
            placeholder="Descrição da imagem..."
            className="h-8 text-sm"
          />
        </div>
      )}
    </div>
  )
}

// Video block
function VideoBlockEditor({
  block,
  onChange,
}: {
  block: Block & { type: 'video' }
  onChange: (b: Block) => void
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-zinc-400">URL do YouTube</Label>
      <Input
        value={block.url ?? ''}
        onChange={(e) => onChange({ ...block, url: e.target.value })}
        placeholder="https://www.youtube.com/watch?v=..."
      />
    </div>
  )
}

// ─── Block dispatch ───────────────────────────────────────────────────────────

const BLOCK_LABELS: Record<BlockType, string> = {
  aviso: 'Aviso',
  texto: 'Texto',
  passos: 'Passo a Passo',
  imagem: 'Imagem',
  video: 'Vídeo',
}

const BLOCK_ICONS: Record<BlockType, React.ReactNode> = {
  aviso: <AlertTriangle className="h-3 w-3 text-yellow-400" />,
  texto: <AlignLeft className="h-3 w-3" />,
  passos: <List className="h-3 w-3" />,
  imagem: <ImageIcon className="h-3 w-3" />,
  video: <Video className="h-3 w-3" />,
}

function BlockEditor({
  block,
  index,
  total,
  onChange,
  onMoveUp,
  onMoveDown,
  onDelete,
}: {
  block: Block
  index: number
  total: number
  onChange: (b: Block) => void
  onMoveUp: () => void
  onMoveDown: () => void
  onDelete: () => void
}) {
  return (
    <BlockCard
      index={index}
      total={total}
      onMoveUp={onMoveUp}
      onMoveDown={onMoveDown}
      onDelete={onDelete}
      label={BLOCK_LABELS[block.type]}
      labelIcon={BLOCK_ICONS[block.type]}
      warnStyle={block.type === 'aviso'}
    >
      {block.type === 'aviso' && (
        <AvisoBlockEditor
          block={block as Block & { type: 'aviso' }}
          onChange={onChange}
        />
      )}
      {block.type === 'texto' && (
        <TextoBlockEditor
          block={block as Block & { type: 'texto' }}
          onChange={onChange}
        />
      )}
      {block.type === 'passos' && (
        <PassosBlockEditor
          block={block as Block & { type: 'passos' }}
          onChange={onChange}
        />
      )}
      {block.type === 'imagem' && (
        <ImagemBlockEditor
          block={block as Block & { type: 'imagem' }}
          onChange={onChange}
        />
      )}
      {block.type === 'video' && (
        <VideoBlockEditor
          block={block as Block & { type: 'video' }}
          onChange={onChange}
        />
      )}
    </BlockCard>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function FirmwareEditorPage() {
  const { agentSlug, equipmentSlug, updateId } = useParams<{
    agentSlug: string
    equipmentSlug?: string
    updateId?: string
  }>()
  const navigate = useNavigate()
  const isNew = !updateId

  // ── Data ──────────────────────────────────────────────────────────────────
  const { data: equipmentTypes = [] } = useEquipmentTypes()
  const { data: existingUpdate, isLoading: loadingUpdate } = useFirmwareUpdate(updateId)
  const { data: existingFiles = [], isLoading: loadingFiles } = useFirmwareFiles(updateId)

  const saveUpdate = useSaveFirmwareUpdate()
  const addFile = useAddFirmwareFile()
  const deleteFile = useDeleteFirmwareFile()

  // ── Local state ───────────────────────────────────────────────────────────
  const [version, setVersion] = useState('')
  const [title, setTitle] = useState('')
  const [blocks, setBlocks] = useState<Block[]>([])
  const [blockKeys, setBlockKeys] = useState<string[]>([])
  const [initialized, setInitialized] = useState(false)

  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [saveError, setSaveError] = useState<string | null>(null)

  const [fileUploading, setFileUploading] = useState(false)
  const [fileError, setFileError] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // ── Resolve equipment_id ──────────────────────────────────────────────────
  const equipmentFromSlug = equipmentTypes.find((e) => e.slug === equipmentSlug)
  const equipmentId = isNew
    ? (equipmentFromSlug?.id ?? '')
    : (existingUpdate?.equipment_id ?? '')

  const equipmentName = isNew
    ? (equipmentFromSlug?.name ?? equipmentSlug ?? '')
    : (equipmentTypes.find((e) => e.id === existingUpdate?.equipment_id)?.name ?? '')

  // ── Populate from existing update ─────────────────────────────────────────
  useEffect(() => {
    if (!isNew && existingUpdate && !initialized) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setVersion(existingUpdate.version)
      setTitle(existingUpdate.title)
      const loaded = existingUpdate.blocks ?? []
      setBlocks(loaded)
      setBlockKeys(loaded.map(() => crypto.randomUUID()))
      setInitialized(true)
    }
    if (isNew && !initialized) {
      setInitialized(true)
    }
  }, [isNew, existingUpdate, initialized])

  // ── Block operations ──────────────────────────────────────────────────────
  const addBlock = useCallback((type: BlockType) => {
    setBlocks((prev) => [...prev, makeDefaultBlock(type)])
    setBlockKeys((prev) => [...prev, crypto.randomUUID()])
  }, [])

  const updateBlock = useCallback((index: number, block: Block) => {
    setBlocks((prev) => prev.map((b, i) => (i === index ? block : b)))
  }, [])

  const moveBlock = useCallback((index: number, direction: 'up' | 'down') => {
    setBlocks((prev) => {
      const next = [...prev]
      const target = direction === 'up' ? index - 1 : index + 1
      if (target < 0 || target >= next.length) return prev
      ;[next[index], next[target]] = [next[target], next[index]]
      return next
    })
    setBlockKeys((prev) => {
      const next = [...prev]
      const target = direction === 'up' ? index - 1 : index + 1
      if (target < 0 || target >= next.length) return prev
      ;[next[index], next[target]] = [next[target], next[index]]
      return next
    })
  }, [])

  const deleteBlock = useCallback((index: number) => {
    setBlocks((prev) => prev.filter((_, i) => i !== index))
    setBlockKeys((prev) => prev.filter((_, i) => i !== index))
  }, [])

  // ── Save ──────────────────────────────────────────────────────────────────
  async function handleSave(publish: boolean) {
    if (!equipmentId) {
      setSaveError('Equipamento não encontrado.')
      return
    }
    setSaveStatus('saving')
    setSaveError(null)
    try {
      const result = await saveUpdate.mutateAsync({
        ...(updateId ? { id: updateId } : {}),
        equipment_id: equipmentId,
        version: version.trim(),
        title: title.trim(),
        blocks,
        published: publish,
        published_at: publish ? (existingUpdate?.published_at ?? null) : null,
      })
      if (isNew && result?.id) {
        navigate(`/${agentSlug}/atualizacoes/${result.id}/editar`, { replace: true })
      } else {
        setSaveStatus('saved')
        setTimeout(() => setSaveStatus('idle'), 2000)
      }
    } catch (err) {
      setSaveStatus('error')
      setSaveError(err instanceof Error ? err.message : 'Erro ao salvar.')
    }
  }

  // ── File upload ───────────────────────────────────────────────────────────
  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !updateId) return
    setFileError(null)
    setFileUploading(true)
    try {
      const token = await getAccessToken()
      const result = await uploadFirmwareFileToR2({ file, accessToken: token })
      await addFile.mutateAsync({
        update_id: updateId,
        r2_key: result.key,
        file_name: result.fileName ?? file.name,
        file_size: result.size ?? file.size,
        sort_order: existingFiles.length,
      })
    } catch (err) {
      setFileError(err instanceof Error ? err.message : 'Falha ao enviar arquivo.')
    } finally {
      setFileUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  async function handleDeleteFile(fileId: string) {
    const file = existingFiles.find((f) => f.id === fileId)
    if (!file) return
    setDeleteError(null)
    try {
      await deleteFile.mutateAsync(file)
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Erro ao remover arquivo.')
    }
  }

  // ── Loading states ────────────────────────────────────────────────────────
  const isLoadingData = !isNew && loadingUpdate

  if (isLoadingData) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-40 w-full rounded-xl" />
        <Skeleton className="h-40 w-full rounded-xl" />
      </div>
    )
  }

  const isPublished = existingUpdate?.published ?? false

  return (
    <div className="space-y-6 pb-12">
      {/* Back button */}
      <div>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 pl-0 text-zinc-400 hover:text-white"
          onClick={() => navigate(`/${agentSlug}/atualizacoes`)}
        >
          <ArrowLeft className="mr-1.5 h-4 w-4" />
          Voltar
        </Button>
      </div>

      {/* Header: equipment / version / title */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-zinc-400">{equipmentName || equipmentSlug}</span>
          {equipmentName && <span className="text-zinc-600">/</span>}
          <div className="flex items-center gap-2">
            {isPublished && (
              <Badge className="bg-emerald-600/20 text-emerald-400 border-emerald-600/40 text-xs">
                Publicado
              </Badge>
            )}
            {!isPublished && !isNew && (
              <Badge variant="outline" className="text-zinc-500 text-xs">
                Rascunho
              </Badge>
            )}
          </div>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="w-full sm:w-40">
            <Label className="text-xs text-zinc-400">Versão</Label>
            <Input
              value={version}
              onChange={(e) => setVersion(e.target.value)}
              placeholder="Ex: v2.1.0"
              className="mt-1 h-9"
            />
          </div>
          <div className="flex-1">
            <Label className="text-xs text-zinc-400">Título</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Título da atualização..."
              className="mt-1 h-9"
            />
          </div>
        </div>
      </div>

      {/* Content section */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-zinc-700" />
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Conteúdo
          </span>
          <div className="h-px flex-1 bg-zinc-700" />
        </div>

        {blocks.length === 0 && (
          <div className="rounded-xl border border-dashed border-zinc-700 py-8 text-center">
            <p className="text-sm text-zinc-500">
              Nenhum bloco adicionado. Use o botão abaixo para adicionar conteúdo.
            </p>
          </div>
        )}

        {blocks.map((block, index) => (
          <BlockEditor
            key={blockKeys[index] ?? index}
            block={block}
            index={index}
            total={blocks.length}
            onChange={(b) => updateBlock(index, b)}
            onMoveUp={() => moveBlock(index, 'up')}
            onMoveDown={() => moveBlock(index, 'down')}
            onDelete={() => deleteBlock(index)}
          />
        ))}

        {/* Add block dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 text-xs">
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Adicionar bloco
              <ChevronDown className="ml-1.5 h-3 w-3 opacity-60" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="min-w-[160px]">
            {(['aviso', 'texto', 'passos', 'imagem', 'video'] as BlockType[]).map((type) => (
              <DropdownMenuItem
                key={type}
                className="gap-2 text-sm"
                onClick={() => addBlock(type)}
              >
                {BLOCK_ICONS[type]}
                {BLOCK_LABELS[type]}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Files section — only in edit mode */}
      {!isNew && (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-zinc-700" />
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
              Arquivos para Download
            </span>
            <div className="h-px flex-1 bg-zinc-700" />
          </div>

          {loadingFiles ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full rounded-lg" />
              <Skeleton className="h-10 w-full rounded-lg" />
            </div>
          ) : existingFiles.length === 0 ? (
            <p className="text-sm text-zinc-500">Nenhum arquivo adicionado ainda.</p>
          ) : (
            <div className="space-y-2">
              {existingFiles.map((file) => (
                <div
                  key={file.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <FileText className="h-4 w-4 flex-shrink-0 text-zinc-500" />
                    <div className="min-w-0">
                      <p className="truncate text-sm text-white">{file.file_name}</p>
                      <p className="text-xs text-zinc-500">{formatFileSize(file.file_size)}</p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 w-7 flex-shrink-0 p-0 text-zinc-500 hover:text-red-400"
                    onClick={() => handleDeleteFile(file.id)}
                    disabled={deleteFile.isPending}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {deleteError && (
            <p className="text-sm text-red-400">{deleteError}</p>
          )}

          {fileError && (
            <p className="text-sm text-red-400">{fileError}</p>
          )}

          <div>
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs"
              disabled={fileUploading}
              onClick={() => fileInputRef.current?.click()}
            >
              {fileUploading ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : (
                <Plus className="mr-1.5 h-3.5 w-3.5" />
              )}
              {fileUploading ? 'Enviando...' : 'Adicionar arquivo'}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={handleFileUpload}
            />
          </div>
        </div>
      )}

      {isNew && (
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 px-4 py-3">
          <p className="text-xs text-zinc-500">
            Salve como rascunho primeiro para poder adicionar arquivos para download.
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-zinc-700" />
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Ações
          </span>
          <div className="h-px flex-1 bg-zinc-700" />
        </div>

        {saveError && (
          <p className="text-sm text-red-400">{saveError}</p>
        )}

        {saveStatus === 'saved' && (
          <p className="text-sm text-emerald-400">Salvo com sucesso!</p>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="outline"
            disabled={saveStatus === 'saving' || !version.trim() || !title.trim()}
            onClick={() => handleSave(false)}
          >
            {saveStatus === 'saving' && !saveUpdate.variables?.published ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            Salvar rascunho
          </Button>
          <Button
            className="bg-red-600 hover:bg-red-700"
            disabled={saveStatus === 'saving' || !version.trim() || !title.trim()}
            onClick={() => handleSave(true)}
          >
            {saveStatus === 'saving' && saveUpdate.variables?.published ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            Publicar
          </Button>
        </div>
      </div>
    </div>
  )
}
