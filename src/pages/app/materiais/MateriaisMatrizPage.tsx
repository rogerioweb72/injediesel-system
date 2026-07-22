import { useState, useRef } from 'react'
import {
  Upload, Trash2, Loader2, AlertCircle, FileIcon, Download,
  Image, FileText, FileImage, Layers, Plus, X,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import {
  useMarketingMaterialsAdmin,
  useUploadMarketingMaterial,
  useDeleteMarketingMaterial,
  downloadMktMaterial,
  MKT_CATEGORIES,
  type MktCategory,
  type MarketingMaterial,
  formatBytes,
} from '@/hooks/useMarketingMaterials'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'

const CATEGORY_ICONS: Record<MktCategory, LucideIcon> = {
  logo:              Image,
  impressos:         FileText,
  social_media:      FileImage,
  identidade_visual: Layers,
}

const CATEGORY_COLORS: Record<MktCategory, string> = {
  logo:              'hsl(var(--pm-red-500))',
  impressos:         '#4A9EFF',
  social_media:      '#9B59B6',
  identidade_visual: '#27AE60',
}

interface UploadModalProps {
  category: MktCategory
  onClose: () => void
}

function UploadModal({ category, onClose }: UploadModalProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const { mutate, isPending, error } = useUploadMarketingMaterial()
  const catMeta = MKT_CATEGORIES.find(c => c.value === category)!
  const color = CATEGORY_COLORS[category]
  const Icon = CATEGORY_ICONS[category]

  function handleFile(f: File) {
    setFile(f)
    if (!title) setTitle(f.name.replace(/\.[^.]+$/, ''))
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    const f = e.dataTransfer.files[0]
    if (f) handleFile(f)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!file || !title.trim()) return
    mutate({ file, title: title.trim(), category, description: description.trim() || undefined }, {
      onSuccess: onClose,
    })
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.75)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="w-full max-w-lg rounded-2xl flex flex-col"
        style={{
          background: 'hsl(var(--pm-gray-950))',
          border: '1px solid hsl(var(--pm-gray-800))',
        }}
      >
        <div
          className="flex items-center justify-between px-6 py-4"
          style={{ borderBottom: '1px solid hsl(var(--pm-gray-800))' }}
        >
          <div className="flex items-center gap-2">
            <div
              className="flex items-center justify-center rounded-lg"
              style={{ width: 32, height: 32, background: `${color}22` }}
            >
              <Icon size={15} style={{ color }} />
            </div>
            <div>
              <p className="text-sm font-semibold" style={{ color: 'hsl(var(--pm-gray-100))' }}>
                Upload — {catMeta.label}
              </p>
              <p className="text-xs" style={{ color: 'hsl(var(--pm-gray-500))' }}>
                Disponível para todas as franquias
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex items-center justify-center rounded-md"
            style={{ width: 28, height: 28, color: 'hsl(var(--pm-gray-500))', cursor: 'pointer' }}
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-6">
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileRef.current?.click()}
            className="flex flex-col items-center gap-2 rounded-xl py-8 cursor-pointer transition-all"
            style={{
              background: dragOver ? `${color}12` : 'hsl(var(--pm-gray-900))',
              border: `2px dashed ${dragOver ? color : 'hsl(var(--pm-gray-700))'}`,
            }}
          >
            <input
              ref={fileRef}
              type="file"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
            />
            {file ? (
              <>
                <FileIcon size={28} style={{ color }} />
                <p className="text-sm font-medium" style={{ color: 'hsl(var(--pm-gray-200))' }}>{file.name}</p>
                <p className="text-xs" style={{ color: 'hsl(var(--pm-gray-500))' }}>{formatBytes(file.size)}</p>
              </>
            ) : (
              <>
                <Upload size={28} style={{ color: 'hsl(var(--pm-gray-600))' }} />
                <p className="text-sm" style={{ color: 'hsl(var(--pm-gray-400))' }}>
                  Arraste o arquivo ou <span style={{ color }}>clique para selecionar</span>
                </p>
              </>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'hsl(var(--pm-gray-400))' }}>
              Título *
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Logo Horizontal Branca"
              required
              className="px-3 py-2 rounded-lg text-sm outline-none"
              style={{
                background: 'hsl(var(--pm-gray-900))',
                border: '1px solid hsl(var(--pm-gray-700))',
                color: 'hsl(var(--pm-gray-100))',
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = color)}
              onBlur={(e) => (e.currentTarget.style.borderColor = 'hsl(var(--pm-gray-700))')}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'hsl(var(--pm-gray-400))' }}>
              Descrição <span style={{ color: 'hsl(var(--pm-gray-600))' }}>(opcional)</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Orientações de uso, formato, dimensões..."
              rows={2}
              className="px-3 py-2 rounded-lg text-sm outline-none resize-none"
              style={{
                background: 'hsl(var(--pm-gray-900))',
                border: '1px solid hsl(var(--pm-gray-700))',
                color: 'hsl(var(--pm-gray-100))',
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = color)}
              onBlur={(e) => (e.currentTarget.style.borderColor = 'hsl(var(--pm-gray-700))')}
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 text-sm" style={{ color: 'hsl(var(--pm-red-500))' }}>
              <AlertCircle size={14} />
              <span>Erro ao fazer upload. Tente novamente.</span>
            </div>
          )}

          <div className="flex gap-2 justify-end pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm font-medium"
              style={{
                background: 'hsl(var(--pm-gray-800))',
                color: 'hsl(var(--pm-gray-300))',
                border: '1px solid hsl(var(--pm-gray-700))',
                cursor: 'pointer',
              }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!file || !title.trim() || isPending}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold"
              style={{
                background: !file || !title.trim() || isPending ? 'hsl(var(--pm-gray-800))' : 'hsl(var(--pm-red-500))',
                color: !file || !title.trim() || isPending ? 'hsl(var(--pm-gray-500))' : '#fff',
                cursor: !file || !title.trim() || isPending ? 'not-allowed' : 'pointer',
              }}
            >
              {isPending ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
              {isPending ? 'Enviando...' : 'Enviar arquivo'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function MaterialRow({ material, onDelete }: { material: MarketingMaterial; onDelete: () => void }) {
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [downloading, setDownloading] = useState(false)

  async function handleDownload() {
    setDownloading(true)
    try {
      await downloadMktMaterial(material)
    } catch {
      // silently fail — mesmo padrao do FileRow em MateriaisPage.tsx (franquia)
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div
      className="flex items-center gap-3 px-4 py-3 rounded-lg"
      style={{
        background: 'hsl(var(--pm-gray-900))',
        border: '1px solid hsl(var(--pm-gray-800))',
      }}
    >
      <div
        className="flex-shrink-0 flex items-center justify-center rounded-md"
        style={{ width: 36, height: 36, background: 'hsl(var(--pm-gray-800))' }}
      >
        <FileIcon size={16} style={{ color: 'hsl(var(--pm-gray-400))' }} />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate" style={{ color: 'hsl(var(--pm-gray-100))' }}>
          {material.title}
        </p>
        <p className="text-xs truncate" style={{ color: 'hsl(var(--pm-gray-500))' }}>
          {material.file_name}
          {material.file_size_bytes ? ` · ${formatBytes(material.file_size_bytes)}` : ''}
          {' · '}
          {new Date(material.created_at).toLocaleDateString('pt-BR')}
        </p>
        {material.description && (
          <p className="text-xs mt-0.5 truncate" style={{ color: 'hsl(var(--pm-gray-600))' }}>
            {material.description}
          </p>
        )}
      </div>

      <button
        onClick={handleDownload}
        disabled={downloading}
        className="flex-shrink-0 flex items-center justify-center rounded-md"
        style={{
          width: 32, height: 32,
          background: 'hsl(var(--pm-gray-800))',
          border: '1px solid hsl(var(--pm-gray-700))',
          color: downloading ? 'hsl(var(--pm-gray-600))' : 'hsl(var(--pm-gray-300))',
          cursor: downloading ? 'not-allowed' : 'pointer',
        }}
        title="Baixar"
      >
        {downloading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
      </button>

      <button
        onClick={() => setConfirmOpen(true)}
        className="flex-shrink-0 flex items-center justify-center rounded-md"
        style={{
          width: 32, height: 32,
          background: 'hsl(var(--pm-red-500)/0.08)',
          border: '1px solid hsl(var(--pm-red-500)/0.25)',
          color: 'hsl(var(--pm-red-500))',
          cursor: 'pointer',
        }}
      >
        <Trash2 size={14} />
      </button>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Excluir material"
        description={`Excluir "${material.title}"? O arquivo será removido do storage e não estará mais disponível para as franquias.`}
        confirmLabel="Excluir"
        onConfirm={() => { setConfirmOpen(false); onDelete() }}
      />
    </div>
  )
}

function CategoryContent({ category }: { category: MktCategory }) {
  const [showUpload, setShowUpload] = useState(false)
  const { data, isLoading, isError } = useMarketingMaterialsAdmin(category)
  const { mutate: doDelete } = useDeleteMarketingMaterial()
  const color = CATEGORY_COLORS[category]
  const Icon = CATEGORY_ICONS[category]

  return (
    <>
      {showUpload && (
        <UploadModal category={category} onClose={() => setShowUpload(false)} />
      )}

      <div className="flex items-center justify-between mb-4">
        <p className="text-sm" style={{ color: 'hsl(var(--pm-gray-400))' }}>
          {isLoading ? 'Carregando...' : `${data?.length ?? 0} arquivo${data?.length !== 1 ? 's' : ''}`}
        </p>
        <button
          onClick={() => setShowUpload(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold"
          style={{ background: 'hsl(var(--pm-red-500))', color: '#fff', cursor: 'pointer' }}
        >
          <Plus size={14} />
          Upload
        </button>
      </div>

      {isLoading && (
        <div className="flex justify-center py-10">
          <Loader2 size={24} className="animate-spin" style={{ color: 'hsl(var(--pm-gray-500))' }} />
        </div>
      )}

      {isError && (
        <div className="flex items-center gap-2 justify-center py-10" style={{ color: 'hsl(var(--pm-gray-500))' }}>
          <AlertCircle size={16} />
          <span className="text-sm">Erro ao carregar materiais.</span>
        </div>
      )}

      {!isLoading && !isError && data?.length === 0 && (
        <div
          className="flex flex-col items-center gap-3 py-14 rounded-xl"
          style={{ background: 'hsl(var(--pm-gray-900))', border: '2px dashed hsl(var(--pm-gray-800))' }}
        >
          <Icon size={32} style={{ color: 'hsl(var(--pm-gray-700))' }} />
          <p className="text-sm" style={{ color: 'hsl(var(--pm-gray-500))' }}>Nenhum material nesta categoria.</p>
          <button
            onClick={() => setShowUpload(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold"
            style={{ background: `${color}18`, border: `1px solid ${color}44`, color, cursor: 'pointer' }}
          >
            <Plus size={12} />
            Adicionar primeiro arquivo
          </button>
        </div>
      )}

      {!isLoading && !isError && data && data.length > 0 && (
        <div className="flex flex-col gap-2">
          {data.map(m => (
            <MaterialRow key={m.id} material={m} onDelete={() => doDelete(m)} />
          ))}
        </div>
      )}
    </>
  )
}

export default function MateriaisMatrizPage() {
  const [active, setActive] = useState<MktCategory>('logo')

  return (
    <div className="flex flex-col gap-6 p-6 max-w-4xl mx-auto">
      <div>
        <h1
          className="text-2xl font-black uppercase tracking-tight"
          style={{ fontFamily: 'var(--pm-font-display)', color: 'hsl(var(--pm-gray-50))' }}
        >
          Materiais de Marketing
        </h1>
        <p className="text-sm mt-1" style={{ color: 'hsl(var(--pm-gray-500))' }}>
          Gerencie os arquivos disponíveis para download nas franquias.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {MKT_CATEGORIES.map(cat => {
          const Icon = CATEGORY_ICONS[cat.value]
          const color = CATEGORY_COLORS[cat.value]
          const isActive = active === cat.value
          return (
            <button
              key={cat.value}
              onClick={() => setActive(cat.value)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium"
              style={{
                background: isActive ? `${color}18` : 'transparent',
                border: `1px solid ${isActive ? color : 'transparent'}`,
                color: isActive ? color : 'hsl(var(--pm-gray-400))',
                cursor: 'pointer',
              }}
            >
              <Icon size={14} />
              {cat.label}
            </button>
          )
        })}
      </div>

      <div
        className="rounded-xl p-5"
        style={{ background: 'hsl(var(--pm-gray-950))', border: '1px solid hsl(var(--pm-gray-800))' }}
      >
        <CategoryContent key={active} category={active} />
      </div>
    </div>
  )
}
