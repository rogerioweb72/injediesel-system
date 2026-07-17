import { useState } from 'react'
import {
  Search, Play, X, ChevronDown, ChevronUp,
  Mail, MessageCircle, Loader2,
} from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import {
  useHelpArticles,
  extractYouTubeId,
  CATEGORY_LABELS,
  CATEGORY_COLORS,
  type HelpArticle,
} from '@/hooks/useHelpArticles'

// ─── Config ───────────────────────────────────────────────────────────────────
// Substitua pelo ID do vídeo YouTube de boas-vindas da Injediesel
const WELCOME_VIDEO_ID = 'dQw4w9WgXcQ'

// ─── VideoModal ───────────────────────────────────────────────────────────────
function VideoModal({ videoId, onClose }: { videoId: string; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8"
      style={{ background: 'rgba(0,0,0,0.88)' }}
      onClick={onClose}
    >
      <div className="relative w-full max-w-4xl" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={onClose}
          className="absolute -top-9 right-0 flex items-center gap-1.5 text-sm transition-colors"
          style={{ color: 'rgba(255,255,255,0.5)' }}
          onMouseEnter={(e) => { e.currentTarget.style.color = '#fff' }}
          onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(255,255,255,0.5)' }}
        >
          <X size={15} /> Fechar
        </button>
        <div className="w-full rounded-2xl overflow-hidden shadow-2xl" style={{ aspectRatio: '16/9' }}>
          <iframe
            src={`https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`}
            allow="autoplay; encrypted-media; fullscreen"
            allowFullScreen
            className="w-full h-full"
            title="Vídeo de boas-vindas"
          />
        </div>
      </div>
    </div>
  )
}

// ─── WelcomeVideo ─────────────────────────────────────────────────────────────
function WelcomeVideo({ videoId }: { videoId: string }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="relative w-full rounded-2xl overflow-hidden group text-left"
        style={{
          aspectRatio: '16/6',
          background: 'hsl(var(--pm-gray-900))',
          border: '1px solid rgba(255,255,255,0.06)',
          minHeight: 140,
        }}
      >
        <img
          src={`https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`}
          alt=""
          aria-hidden
          className="absolute inset-0 w-full h-full object-cover opacity-30 group-hover:opacity-40 transition-opacity duration-300"
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
        />
        <div
          className="absolute inset-0"
          style={{ background: 'linear-gradient(135deg, hsl(var(--pm-gray-950)/0.9) 0%, hsl(var(--pm-red-500)/0.08) 100%)' }}
        />
        <div className="absolute bottom-0 left-0 right-0 h-0.5"
          style={{ background: 'linear-gradient(90deg, hsl(var(--pm-red-500)) 0%, transparent 100%)' }} />
        <div className="absolute inset-0 flex items-center gap-6 px-8">
          <div
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full transition-transform duration-200 group-hover:scale-110"
            style={{ background: 'hsl(var(--pm-red-500))', boxShadow: '0 0 28px hsl(var(--pm-red-500)/0.45)' }}
          >
            <Play size={22} fill="white" className="text-white ml-1" />
          </div>
          <div>
            <p
              className="text-base md:text-xl font-black uppercase tracking-wide text-white"
              style={{ fontFamily: 'var(--pm-font-display)' }}
            >
              Boas-vindas à Injediesel System
            </p>
            <p className="text-xs md:text-sm mt-1" style={{ color: 'hsl(var(--pm-gray-400))' }}>
              Conheça a plataforma em uma apresentação rápida · ~3 min
            </p>
          </div>
        </div>
      </button>
      {open && <VideoModal videoId={videoId} onClose={() => setOpen(false)} />}
    </>
  )
}

// ─── ArticleModal ─────────────────────────────────────────────────────────────
function ArticleModal({ article, onClose }: { article: HelpArticle; onClose: () => void }) {
  const ytId = article.youtube_url ? extractYouTubeId(article.youtube_url) : null
  const { color, bg } = CATEGORY_COLORS[article.category] ?? CATEGORY_COLORS.geral

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8"
      style={{ background: 'rgba(0,0,0,0.8)' }}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl max-h-[88vh] overflow-y-auto rounded-2xl"
        style={{ background: 'hsl(var(--pm-gray-900))', border: '1px solid rgba(255,255,255,0.08)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cover */}
        {article.cover_url && (
          <img
            src={article.cover_url}
            alt=""
            className="w-full object-cover rounded-t-2xl"
            style={{ maxHeight: 200 }}
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
          />
        )}

        <div className="p-6 space-y-4">
          {/* Category + close */}
          <div className="flex items-center justify-between">
            <span
              className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full"
              style={{ color, background: bg }}
            >
              {CATEGORY_LABELS[article.category]}
            </span>
            <button
              onClick={onClose}
              className="transition-colors"
              style={{ color: 'hsl(var(--pm-gray-500))' }}
              onMouseEnter={(e) => { e.currentTarget.style.color = '#fff' }}
              onMouseLeave={(e) => { e.currentTarget.style.color = 'hsl(var(--pm-gray-500))' }}
            >
              <X size={18} />
            </button>
          </div>

          {/* Title */}
          <h2
            className="text-xl font-black text-white leading-tight"
            style={{ fontFamily: 'var(--pm-font-display)' }}
          >
            {article.title}
          </h2>

          {/* Video */}
          {ytId && (
            <div className="rounded-xl overflow-hidden" style={{ aspectRatio: '16/9' }}>
              <iframe
                src={`https://www.youtube.com/embed/${ytId}?rel=0`}
                allow="encrypted-media; fullscreen"
                allowFullScreen
                className="w-full h-full"
                title={article.title}
              />
            </div>
          )}

          {/* Body */}
          {article.body && (
            <div
              className="text-sm leading-relaxed whitespace-pre-wrap"
              style={{ color: 'hsl(var(--pm-gray-300))' }}
            >
              {article.body}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── ArticleCard ──────────────────────────────────────────────────────────────
function ArticleCard({ article, onClick }: { article: HelpArticle; onClick: () => void }) {
  const { color, bg } = CATEGORY_COLORS[article.category] ?? CATEGORY_COLORS.geral
  const ytId = article.youtube_url ? extractYouTubeId(article.youtube_url) : null
  const thumb = article.cover_url ?? (ytId ? `https://img.youtube.com/vi/${ytId}/hqdefault.jpg` : null)

  return (
    <button
      onClick={onClick}
      className="w-full text-left rounded-xl overflow-hidden flex flex-col transition-all duration-150 group"
      style={{
        background: 'hsl(var(--pm-gray-900))',
        border: '1px solid rgba(255,255,255,0.05)',
      }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.12)' }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.05)' }}
    >
      {thumb && (
        <div className="w-full overflow-hidden" style={{ aspectRatio: '16/7', background: 'hsl(var(--pm-gray-800))' }}>
          <img
            src={thumb}
            alt=""
            className="w-full h-full object-cover opacity-60 group-hover:opacity-75 transition-opacity"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
          />
        </div>
      )}
      <div className="p-4 flex flex-col gap-2 flex-1">
        <span
          className="text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded self-start"
          style={{ color, background: bg }}
        >
          {CATEGORY_LABELS[article.category]}
        </span>
        <p className="text-sm font-bold text-white leading-snug line-clamp-2"
          style={{ fontFamily: 'var(--pm-font-display)' }}>
          {article.title}
        </p>
        {article.excerpt && (
          <p className="text-xs leading-relaxed line-clamp-2" style={{ color: 'hsl(var(--pm-gray-400))' }}>
            {article.excerpt}
          </p>
        )}
      </div>
    </button>
  )
}

// ─── FaqItem ──────────────────────────────────────────────────────────────────
function FaqItem({ article, onClick }: { article: HelpArticle; onClick: () => void }) {
  const [open, setOpen] = useState(false)
  return (
    <button
      onClick={() => { setOpen(!open); if (!open && article.body) onClick() }}
      className="w-full text-left rounded-xl p-4 transition-all duration-150"
      style={{
        background: open ? 'hsl(var(--pm-gray-800))' : 'hsl(var(--pm-gray-900))',
        border: `1px solid ${open ? 'hsl(var(--pm-red-500)/0.2)' : 'rgba(255,255,255,0.05)'}`,
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-white">{article.title}</p>
        {open
          ? <ChevronUp size={15} className="shrink-0 mt-0.5" style={{ color: 'hsl(var(--pm-red-500))' }} />
          : <ChevronDown size={15} className="shrink-0 mt-0.5" style={{ color: 'hsl(var(--pm-gray-500))' }} />
        }
      </div>
      {open && article.excerpt && (
        <p className="mt-3 text-sm leading-relaxed pt-3" style={{
          color: 'hsl(var(--pm-gray-400))',
          borderTop: '1px solid rgba(255,255,255,0.05)',
        }}>
          {article.excerpt}
        </p>
      )}
    </button>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function AjudaPage() {
  const [search, setSearch]     = useState('')
  const [selected, setSelected] = useState<HelpArticle | null>(null)

  const { data: articles = [], isLoading } = useHelpArticles({
    status: 'published',
    for_units: true,
  })

  const q = search.toLowerCase()
  const filtered = articles.filter(
    (a) => !q || a.title.toLowerCase().includes(q) || (a.excerpt ?? '').toLowerCase().includes(q),
  )

  // Separate articles with body/video (card style) from excerpt-only (FAQ style)
  const cardArticles = filtered.filter((a) => a.cover_url || a.youtube_url || (a.body && a.body.length > 120))
  const faqArticles  = filtered.filter((a) => !a.cover_url && !a.youtube_url && (!a.body || a.body.length <= 120))

  return (
    <div className="space-y-8">
      <PageHeader title="Central de Ajuda" />

      <WelcomeVideo videoId={WELCOME_VIDEO_ID} />

      {/* Search */}
      <div className="relative">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
          style={{ color: 'hsl(var(--pm-gray-500))' }} />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar na base de conhecimento..."
          className="w-full rounded-xl pl-10 pr-4 py-3 text-sm text-white outline-none transition-all"
          style={{ background: 'hsl(var(--pm-gray-900))', border: '1px solid rgba(255,255,255,0.08)' }}
          onFocus={(e) => { e.currentTarget.style.borderColor = 'hsl(var(--pm-red-500)/0.4)' }}
          onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)' }}
        />
        {search && (
          <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2"
            style={{ color: 'hsl(var(--pm-gray-500))' }}>
            <X size={14} />
          </button>
        )}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={22} className="animate-spin" style={{ color: 'hsl(var(--pm-gray-600))' }} />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <span className="text-3xl opacity-20">🔍</span>
          <p className="text-sm" style={{ color: 'hsl(var(--pm-gray-500))' }}>
            {articles.length === 0
              ? 'Nenhum conteúdo publicado ainda.'
              : `Nenhum resultado para "${search}".`}
          </p>
        </div>
      ) : (
        <>
          {/* Card articles (com imagem/vídeo/conteúdo longo) */}
          {cardArticles.length > 0 && (
            <section>
              <h2 className="text-[10px] font-bold uppercase tracking-widest mb-4"
                style={{ color: 'hsl(var(--pm-gray-500))' }}>
                Artigos
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {cardArticles.map((a) => (
                  <ArticleCard key={a.id} article={a} onClick={() => setSelected(a)} />
                ))}
              </div>
            </section>
          )}

          {/* FAQ articles (texto curto) */}
          {faqArticles.length > 0 && (
            <section>
              <h2 className="text-[10px] font-bold uppercase tracking-widest mb-4"
                style={{ color: 'hsl(var(--pm-gray-500))' }}>
                Perguntas Frequentes
              </h2>
              <div className="space-y-2">
                {faqArticles.map((a) => (
                  <FaqItem key={a.id} article={a} onClick={() => setSelected(a)} />
                ))}
              </div>
            </section>
          )}
        </>
      )}

      {/* Contact */}
      <section>
        <h2 className="text-[10px] font-bold uppercase tracking-widest mb-4"
          style={{ color: 'hsl(var(--pm-gray-500))' }}>
          Fale Conosco
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <a href="mailto:suporte@inje.tech"
            className="flex items-center gap-3 rounded-xl p-4 transition-colors"
            style={{ background: 'hsl(var(--pm-gray-900))', border: '1px solid rgba(255,255,255,0.05)' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(96,165,250,0.3)' }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.05)' }}
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
              style={{ background: 'rgba(96,165,250,0.12)' }}>
              <Mail size={15} className="text-blue-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">E-mail de Suporte</p>
              <p className="text-xs" style={{ color: 'hsl(var(--pm-gray-500))' }}>suporte@inje.tech</p>
            </div>
          </a>
          <a href="https://wa.me/5500000000000" target="_blank" rel="noreferrer"
            className="flex items-center gap-3 rounded-xl p-4 transition-colors"
            style={{ background: 'hsl(var(--pm-gray-900))', border: '1px solid rgba(255,255,255,0.05)' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(52,211,153,0.3)' }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.05)' }}
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
              style={{ background: 'rgba(52,211,153,0.12)' }}>
              <MessageCircle size={15} className="text-green-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">WhatsApp</p>
              <p className="text-xs" style={{ color: 'hsl(var(--pm-gray-500))' }}>Atendimento em horário comercial</p>
            </div>
          </a>
        </div>
      </section>

      {/* Article detail modal */}
      {selected && <ArticleModal article={selected} onClose={() => setSelected(null)} />}
    </div>
  )
}
