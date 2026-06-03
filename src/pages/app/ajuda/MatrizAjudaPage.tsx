import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Edit2, Trash2, Building2, LayoutDashboard, Search, X, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { translateError } from '@/lib/errors'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/shared/PageHeader'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { useRoutePrefix } from '@/contexts/RoutePrefixContext'
import {
  useHelpArticles,
  useDeleteHelpArticle,
  extractYouTubeId,
  CATEGORY_LABELS,
  CATEGORY_COLORS,
  type HelpArticle,
} from '@/hooks/useHelpArticles'

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
}

// ─── ArticleCard ──────────────────────────────────────────────────────────────
function ArticleCard({
  article,
  onEdit,
  onDelete,
}: {
  article: HelpArticle
  onEdit: () => void
  onDelete: () => void
}) {
  const { color, bg } = CATEGORY_COLORS[article.category] ?? CATEGORY_COLORS.geral
  const ytId = article.youtube_url ? extractYouTubeId(article.youtube_url) : null
  const thumb = article.cover_url ?? (ytId ? `https://img.youtube.com/vi/${ytId}/hqdefault.jpg` : null)
  const published = article.status === 'published'

  return (
    <div
      className="rounded-xl overflow-hidden flex flex-col"
      style={{
        background: 'hsl(var(--pm-gray-900))',
        border: '1px solid rgba(255,255,255,0.05)',
      }}
    >
      {/* Thumbnail */}
      <div
        className="relative w-full flex-shrink-0"
        style={{ aspectRatio: '16/7', background: 'hsl(var(--pm-gray-800))' }}
      >
        {thumb ? (
          <img
            src={thumb}
            alt=""
            className="absolute inset-0 w-full h-full object-cover opacity-60"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-3xl opacity-20">📄</span>
          </div>
        )}
        {/* Status badge */}
        <div className="absolute top-2 right-2">
          <span
            className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full"
            style={{
              background: published ? 'rgba(22,163,74,0.85)' : 'rgba(100,100,100,0.75)',
              color: '#fff',
            }}
          >
            {published ? 'Publicado' : 'Rascunho'}
          </span>
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-col flex-1 p-4 gap-3">
        {/* Category */}
        <div className="flex items-center gap-2">
          <span
            className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full"
            style={{ color, background: bg }}
          >
            {CATEGORY_LABELS[article.category]}
          </span>
        </div>

        {/* Title */}
        <p
          className="text-sm font-bold text-white leading-snug line-clamp-2"
          style={{ fontFamily: 'var(--pm-font-display)' }}
        >
          {article.title}
        </p>

        {/* Excerpt */}
        {article.excerpt && (
          <p className="text-xs leading-relaxed line-clamp-2" style={{ color: 'hsl(var(--pm-gray-400))' }}>
            {article.excerpt}
          </p>
        )}

        {/* Audience badges */}
        <div className="flex items-center gap-1.5 mt-auto pt-1">
          {article.for_units && (
            <span className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded"
              style={{ background: 'rgba(96,165,250,0.12)', color: '#60A5FA' }}>
              <Building2 size={9} /> Unidades
            </span>
          )}
          {article.for_matrix && (
            <span className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded"
              style={{ background: 'rgba(167,139,250,0.12)', color: '#A78BFA' }}>
              <LayoutDashboard size={9} /> Matriz
            </span>
          )}
          <span className="ml-auto text-[10px]" style={{ color: 'hsl(var(--pm-gray-600))' }}>
            {fmtDate(article.updated_at)}
          </span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 pt-1 border-t" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
          <button
            onClick={onEdit}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg flex-1 justify-center transition-colors"
            style={{ background: 'hsl(var(--pm-gray-800))', color: 'hsl(var(--pm-gray-300))' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = '#fff' }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = 'hsl(var(--pm-gray-300))' }}
          >
            <Edit2 size={12} /> Editar
          </button>
          <button
            onClick={onDelete}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-colors"
            style={{ background: 'hsl(var(--pm-red-500)/0.08)', color: 'hsl(var(--pm-red-500)/0.7)' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = 'hsl(var(--pm-red-500))' }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = 'hsl(var(--pm-red-500)/0.7)' }}
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Stats bar ────────────────────────────────────────────────────────────────
function StatsBar({ articles }: { articles: HelpArticle[] }) {
  const published = articles.filter((a) => a.status === 'published').length
  const draft     = articles.filter((a) => a.status === 'draft').length
  const forUnits  = articles.filter((a) => a.for_units && a.status === 'published').length
  const forMatrix = articles.filter((a) => a.for_matrix && a.status === 'published').length

  const stat = (label: string, value: number, color: string) => (
    <div className="flex flex-col items-center gap-0.5">
      <span className="text-lg font-black" style={{ color, fontFamily: 'var(--pm-font-display)' }}>{value}</span>
      <span className="text-[10px] uppercase tracking-wider" style={{ color: 'hsl(var(--pm-gray-500))' }}>{label}</span>
    </div>
  )

  return (
    <div
      className="flex items-center justify-around rounded-xl p-4"
      style={{ background: 'hsl(var(--pm-gray-900))', border: '1px solid rgba(255,255,255,0.05)' }}
    >
      {stat('Total', articles.length, 'hsl(var(--pm-gray-300))')}
      <div className="w-px h-8" style={{ background: 'rgba(255,255,255,0.06)' }} />
      {stat('Publicados', published, '#4ADE80')}
      <div className="w-px h-8" style={{ background: 'rgba(255,255,255,0.06)' }} />
      {stat('Rascunhos', draft, '#FBBF24')}
      <div className="w-px h-8" style={{ background: 'rgba(255,255,255,0.06)' }} />
      {stat('P/ Unidades', forUnits, '#60A5FA')}
      <div className="w-px h-8" style={{ background: 'rgba(255,255,255,0.06)' }} />
      {stat('P/ Matriz', forMatrix, '#A78BFA')}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
type StatusFilter = 'all' | 'published' | 'draft'
type AudienceFilter = 'all' | 'units' | 'matrix'

export default function MatrizAjudaPage() {
  const navigate  = useNavigate()
  const prefix    = useRoutePrefix()
  const deleteArt = useDeleteHelpArticle()

  const [search,     setSearch]     = useState('')
  const [statusF,    setStatusF]    = useState<StatusFilter>('all')
  const [audienceF,  setAudienceF]  = useState<AudienceFilter>('all')
  const [deleteId,   setDeleteId]   = useState<string | null>(null)

  const { data: articles = [], isLoading } = useHelpArticles()

  const filtered = articles.filter((a) => {
    const q = search.toLowerCase()
    if (q && !a.title.toLowerCase().includes(q) && !(a.excerpt ?? '').toLowerCase().includes(q)) return false
    if (statusF === 'published' && a.status !== 'published') return false
    if (statusF === 'draft'     && a.status !== 'draft')     return false
    if (audienceF === 'units'  && !a.for_units)  return false
    if (audienceF === 'matrix' && !a.for_matrix) return false
    return true
  })

  const handleDelete = async () => {
    if (!deleteId) return
    try {
      await deleteArt.mutateAsync(deleteId)
      toast.success('Artigo excluído.')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e: any) {
      toast.error(translateError(e))
    } finally {
      setDeleteId(null)
    }
  }

  const tabBtn = (label: string, value: StatusFilter) => (
    <button
      onClick={() => setStatusF(value)}
      className="px-4 py-2 text-xs font-semibold rounded-lg transition-colors"
      style={{
        background: statusF === value ? 'hsl(var(--pm-red-500)/0.15)' : 'transparent',
        color: statusF === value ? 'hsl(var(--pm-red-500))' : 'hsl(var(--pm-gray-400))',
        border: statusF === value ? '1px solid hsl(var(--pm-red-500)/0.3)' : '1px solid transparent',
      }}
    >
      {label}
    </button>
  )

  const audBtn = (label: string, value: AudienceFilter, icon: React.ReactNode) => (
    <button
      onClick={() => setAudienceF(value)}
      className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg transition-colors"
      style={{
        background: audienceF === value ? 'hsl(var(--pm-gray-700))' : 'transparent',
        color: audienceF === value ? '#fff' : 'hsl(var(--pm-gray-500))',
      }}
    >
      {icon} {label}
    </button>
  )

  return (
    <div className="space-y-6 w-full">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <PageHeader title="Base de Conhecimento" />
        <Button
          onClick={() => navigate(`${prefix}/ajuda/novo`)}
          style={{ background: 'hsl(var(--pm-red-500))', flexShrink: 0 }}
        >
          <Plus size={15} className="mr-2" /> Novo Artigo
        </Button>
      </div>

      {/* Stats */}
      {!isLoading && articles.length > 0 && <StatsBar articles={articles} />}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-0">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
            style={{ color: 'hsl(var(--pm-gray-500))' }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar artigos..."
            className="w-full rounded-xl pl-9 pr-4 py-2.5 text-sm text-white outline-none"
            style={{ background: 'hsl(var(--pm-gray-900))', border: '1px solid rgba(255,255,255,0.07)' }}
            onFocus={(e) => { e.currentTarget.style.borderColor = 'hsl(var(--pm-red-500)/0.4)' }}
            onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)' }}
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2"
              style={{ color: 'hsl(var(--pm-gray-500))' }}>
              <X size={13} />
            </button>
          )}
        </div>

        {/* Status tabs */}
        <div className="flex items-center gap-1 rounded-xl p-1"
          style={{ background: 'hsl(var(--pm-gray-900))', border: '1px solid rgba(255,255,255,0.05)' }}>
          {tabBtn('Todos', 'all')}
          {tabBtn('Publicados', 'published')}
          {tabBtn('Rascunhos', 'draft')}
        </div>

        {/* Audience filter */}
        <div className="flex items-center gap-1 rounded-xl p-1"
          style={{ background: 'hsl(var(--pm-gray-900))', border: '1px solid rgba(255,255,255,0.05)' }}>
          {audBtn('Todos', 'all', null)}
          {audBtn('Unidades', 'units', <Building2 size={11} />)}
          {audBtn('Matriz', 'matrix', <LayoutDashboard size={11} />)}
        </div>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 size={24} className="animate-spin" style={{ color: 'hsl(var(--pm-gray-600))' }} />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <span className="text-4xl opacity-20">📝</span>
          <p className="text-sm" style={{ color: 'hsl(var(--pm-gray-500))' }}>
            {articles.length === 0
              ? 'Nenhum artigo ainda. Crie o primeiro!'
              : 'Nenhum artigo corresponde aos filtros.'}
          </p>
          {articles.length === 0 && (
            <Button
              size="sm"
              onClick={() => navigate(`${prefix}/ajuda/novo`)}
              style={{ background: 'hsl(var(--pm-red-500))' }}
            >
              <Plus size={13} className="mr-1.5" /> Criar primeiro artigo
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((a) => (
            <ArticleCard
              key={a.id}
              article={a}
              onEdit={() => navigate(`${prefix}/ajuda/${a.id}/editar`)}
              onDelete={() => setDeleteId(a.id)}
            />
          ))}
        </div>
      )}

      {/* Delete confirm */}
      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(o) => { if (!o) setDeleteId(null) }}
        title="Excluir artigo"
        description="Esta ação é irreversível. O artigo será removido para todos os usuários."
        confirmLabel="Excluir"
        onConfirm={handleDelete}
      />
    </div>
  )
}
