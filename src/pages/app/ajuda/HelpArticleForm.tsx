import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { ArrowLeft, Eye, Save, Loader2, PlayCircle, Image as ImageIcon, Upload, Building2, LayoutDashboard } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { PageHeader } from '@/components/shared/PageHeader'
import { useRoutePrefix } from '@/contexts/RoutePrefixContext'
import { useStorageUpload } from '@/hooks/useStorageUpload'
import {
  useHelpArticle,
  useCreateHelpArticle,
  useUpdateHelpArticle,
  extractYouTubeId,
  CATEGORY_LABELS,
  type HelpArticleCategory,
} from '@/hooks/useHelpArticles'

// ─── Schema ───────────────────────────────────────────────────────────────────
const schema = z.object({
  title:       z.string().min(3, 'Mínimo 3 caracteres'),
  excerpt:     z.string().optional().or(z.literal('')),
  body:        z.string().optional().or(z.literal('')),
  cover_url:   z.string().url('URL inválida').optional().or(z.literal('')),
  youtube_url: z.string().optional().or(z.literal('')),
  category:    z.string(),
  for_units:   z.boolean(),
  for_matrix:  z.boolean(),
  status:      z.enum(['draft', 'published']),
  position:    z.number(),
}).refine((d) => d.for_units || d.for_matrix, {
  message: 'Selecione ao menos um público',
  path: ['for_units'],
})

type FormData = z.infer<typeof schema>

// ─── Helpers ──────────────────────────────────────────────────────────────────
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: 'hsl(var(--pm-gray-500))' }}>
      {children}
    </p>
  )
}

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-xl p-4 ${className}`}
      style={{ background: 'hsl(var(--pm-gray-900))', border: '1px solid rgba(255,255,255,0.05)' }}
    >
      {children}
    </div>
  )
}

function YoutubePreview({ url }: { url: string }) {
  const id = extractYouTubeId(url)
  if (!id) return null
  return (
    <img
      src={`https://img.youtube.com/vi/${id}/hqdefault.jpg`}
      alt="Thumbnail"
      className="w-full rounded-lg mt-2 object-cover opacity-80"
      style={{ maxHeight: 120 }}
    />
  )
}

// ─── Form ─────────────────────────────────────────────────────────────────────
export default function HelpArticleForm() {
  const { id } = useParams<{ id?: string }>()
  const isEdit = !!id
  const navigate  = useNavigate()
  const prefix    = useRoutePrefix()

  const { data: existing, isLoading } = useHelpArticle(id)
  const create = useCreateHelpArticle()
  const update = useUpdateHelpArticle()

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    control,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: '', excerpt: '', body: '', cover_url: '', youtube_url: '',
      category: 'geral', for_units: true, for_matrix: true,
      status: 'draft', position: 0,
    },
  })

  useEffect(() => {
    if (existing) {
      reset({
        title:       existing.title,
        excerpt:     existing.excerpt ?? '',
        body:        existing.body ?? '',
        cover_url:   existing.cover_url ?? '',
        youtube_url: existing.youtube_url ?? '',
        category:    existing.category,
        for_units:   existing.for_units,
        for_matrix:  existing.for_matrix,
        status:      existing.status,
        position:    existing.position,
      })
    }
  }, [existing, reset])

  const [saving, setSaving] = useState<'draft' | 'published' | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { upload, uploading: uploadingCover } = useStorageUpload()

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const ext  = file.name.split('.').pop() ?? 'jpg'
    const path = `covers/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
    const { publicUrl, error } = await upload('help-images', path, file, { maxSizeMB: 5 })
    if (error) { toast.error(error); return }
    setValue('cover_url', publicUrl!)
    toast.success('Imagem carregada.')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const onSubmit = async (data: FormData, statusOverride?: 'draft' | 'published') => {
    const payload = {
      title:       data.title,
      excerpt:     data.excerpt     || null,
      body:        data.body        || null,
      cover_url:   data.cover_url   || null,
      youtube_url: data.youtube_url || null,
      category:    data.category    as HelpArticleCategory,
      for_units:   data.for_units,
      for_matrix:  data.for_matrix,
      status:      (statusOverride ?? data.status) as 'draft' | 'published',
      position:    data.position,
    }
    try {
      if (isEdit && id) {
        await update.mutateAsync({ id, ...payload })
        toast.success('Artigo atualizado.')
      } else {
        await create.mutateAsync(payload)
        toast.success('Artigo criado.')
      }
      navigate(`${prefix}/ajuda`)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e: any) {
      toast.error(e.message ?? 'Erro ao salvar')
    } finally {
      setSaving(null)
    }
  }

  // eslint-disable-next-line react-hooks/incompatible-library
  const forUnits   = watch('for_units')
  const forMatrix  = watch('for_matrix')
  const youtubeUrl = watch('youtube_url')
  const coverUrl   = watch('cover_url')

  if (isEdit && isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 size={24} className="animate-spin" style={{ color: 'hsl(var(--pm-gray-500))' }} />
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* ── Topbar ── */}
      <div className="flex items-center justify-between">
        <PageHeader title={isEdit ? 'Editar Artigo' : 'Novo Artigo'} />
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-xs transition-colors"
          style={{ color: 'hsl(var(--pm-gray-400))' }}
          onMouseEnter={(e) => { e.currentTarget.style.color = '#fff' }}
          onMouseLeave={(e) => { e.currentTarget.style.color = 'hsl(var(--pm-gray-400))' }}
        >
          <ArrowLeft size={13} /> Voltar
        </button>
      </div>

      <form className="space-y-5">

        {/* ── Título ── */}
        <Card>
          <SectionLabel>Título *</SectionLabel>
          <input
            {...register('title')}
            placeholder="Título do artigo..."
            className="w-full bg-transparent text-2xl font-bold text-white outline-none placeholder:text-zinc-700"
            style={{ fontFamily: 'var(--pm-font-display)' }}
          />
          {errors.title && (
            <p className="text-xs mt-1" style={{ color: 'hsl(var(--pm-red-500))' }}>{errors.title.message}</p>
          )}
        </Card>

        {/* ── Configurações (linha) ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Categoria */}
          <Card>
            <SectionLabel>Categoria</SectionLabel>
            <Controller
              name="category"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </Card>

          {/* Status */}
          <Card>
            <SectionLabel>Status</SectionLabel>
            <Controller
              name="status"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Rascunho</SelectItem>
                    <SelectItem value="published">Publicado</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </Card>

          {/* Visível para */}
          <Card className="col-span-2">
            <SectionLabel>Visível para</SectionLabel>
            {errors.for_units && (
              <p className="text-xs mb-1" style={{ color: 'hsl(var(--pm-red-500))' }}>
                {errors.for_units.message}
              </p>
            )}
            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={forUnits}
                  onChange={(e) => setValue('for_units', e.target.checked)}
                  className="w-4 h-4 rounded accent-red-600"
                />
                <span className="flex items-center gap-1.5 text-sm text-white">
                  <Building2 size={13} className="text-blue-400" /> Unidades
                </span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={forMatrix}
                  onChange={(e) => setValue('for_matrix', e.target.checked)}
                  className="w-4 h-4 rounded accent-red-600"
                />
                <span className="flex items-center gap-1.5 text-sm text-white">
                  <LayoutDashboard size={13} className="text-purple-400" /> Matriz
                </span>
              </label>
            </div>
          </Card>
        </div>

        {/* ── Resumo ── */}
        <Card>
          <SectionLabel>Resumo (exibido na listagem)</SectionLabel>
          <textarea
            {...register('excerpt')}
            rows={2}
            placeholder="Descrição curta do artigo..."
            className="w-full rounded-lg px-3 py-2 text-sm text-white resize-none outline-none"
            style={{ background: 'hsl(var(--pm-gray-800))', border: '1px solid rgba(255,255,255,0.06)' }}
          />
        </Card>

        {/* ── Mídia ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <SectionLabel>
              <span className="flex items-center gap-1.5">
                <PlayCircle size={11} style={{ color: '#F87171' }} />
                Vídeo YouTube (URL)
              </span>
            </SectionLabel>
            <Input
              {...register('youtube_url')}
              placeholder="https://youtube.com/watch?v=..."
              className="text-sm"
            />
            {youtubeUrl && <YoutubePreview url={youtubeUrl} />}
          </Card>

          <Card>
            <SectionLabel>
              <span className="flex items-center gap-1.5">
                <ImageIcon size={11} />
                Imagem de capa
              </span>
            </SectionLabel>

            {/* Preview */}
            {coverUrl && !errors.cover_url && (
              <div className="relative mb-3 rounded-lg overflow-hidden group" style={{ maxHeight: 140 }}>
                <img
                  src={coverUrl}
                  alt="Capa"
                  className="w-full object-cover"
                  style={{ maxHeight: 140 }}
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                />
                <button
                  type="button"
                  onClick={() => setValue('cover_url', '')}
                  className="absolute top-2 right-2 rounded-full px-2 py-0.5 text-[10px] font-semibold opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ background: 'rgba(0,0,0,0.7)', color: '#fff' }}
                >
                  Remover
                </button>
              </div>
            )}

            {/* Upload do computador */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleCoverUpload}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingCover}
              className="w-full flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-medium transition-colors mb-3"
              style={{
                background: 'hsl(var(--pm-gray-800))',
                border: '1.5px dashed rgba(255,255,255,0.12)',
                color: uploadingCover ? 'hsl(var(--pm-gray-500))' : 'hsl(var(--pm-gray-300))',
                cursor: uploadingCover ? 'not-allowed' : 'pointer',
              }}
              onMouseEnter={(e) => { if (!uploadingCover) (e.currentTarget as HTMLElement).style.borderColor = 'hsl(var(--pm-red-500)/0.4)' }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.12)' }}
            >
              {uploadingCover
                ? <><Loader2 size={14} className="animate-spin" /> Enviando...</>
                : <><Upload size={14} /> Enviar do computador</>
              }
            </button>

            {/* Ou por URL */}
            <p className="text-[10px] mb-1.5" style={{ color: 'hsl(var(--pm-gray-600))' }}>ou cole a URL da imagem:</p>
            <Input
              {...register('cover_url')}
              placeholder="https://..."
              className="text-sm"
            />
            {errors.cover_url && (
              <p className="text-xs mt-1" style={{ color: 'hsl(var(--pm-red-500))' }}>
                {errors.cover_url.message}
              </p>
            )}
          </Card>
        </div>

        {/* ── Conteúdo (full width) ── */}
        <Card>
          <SectionLabel>Conteúdo</SectionLabel>
          <textarea
            {...register('body')}
            rows={20}
            placeholder={`Escreva o conteúdo completo do artigo aqui...\n\nUse linhas em branco para separar parágrafos.\nUse - no início da linha para criar listas.`}
            className="w-full rounded-lg p-3 text-sm text-white resize-y outline-none leading-relaxed"
            style={{
              background: 'hsl(var(--pm-gray-800))',
              border: '1px solid rgba(255,255,255,0.06)',
              minHeight: 400,
              fontFamily: 'var(--pm-font-mono)',
              fontSize: 13,
            }}
          />
        </Card>

        {/* ── Ações ── */}
        <div className="flex items-center justify-end gap-3 pb-4">
          <Button
            type="button"
            variant="outline"
            disabled={saving !== null}
            onClick={handleSubmit((d) => {
              setSaving('draft')
              onSubmit(d, 'draft')
            })}
          >
            {saving === 'draft'
              ? <Loader2 size={14} className="animate-spin mr-2" />
              : <Save size={14} className="mr-2" />}
            Salvar rascunho
          </Button>
          <Button
            type="button"
            disabled={saving !== null}
            onClick={handleSubmit((d) => {
              setSaving('published')
              onSubmit(d, 'published')
            })}
            style={{ background: 'hsl(var(--pm-red-500))' }}
          >
            {saving === 'published'
              ? <Loader2 size={14} className="animate-spin mr-2" />
              : <Eye size={14} className="mr-2" />}
            Publicar
          </Button>
        </div>
      </form>
    </div>
  )
}
