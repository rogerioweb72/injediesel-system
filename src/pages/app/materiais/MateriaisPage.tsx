import { useState } from 'react'
import {
  Download, FileImage, FileText, Layers, Image,
  ChevronRight, Loader2, FileIcon,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import {
  useMarketingMaterials,
  MKT_CATEGORIES,
  type MktCategory,
  type MarketingMaterial,
  downloadMktMaterial,
  formatBytes,
} from '@/hooks/useMarketingMaterials'

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

function FileRow({ material }: { material: MarketingMaterial }) {
  const [loading, setLoading] = useState(false)

  async function handleDownload() {
    setLoading(true)
    try {
      await downloadMktMaterial(material)
    } catch {
      // silently fail
    } finally {
      setLoading(false)
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
        </p>
      </div>

      <button
        onClick={handleDownload}
        disabled={loading}
        className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all"
        style={{
          background: loading ? 'hsl(var(--pm-gray-800))' : 'hsl(var(--pm-red-500)/0.12)',
          border: '1px solid hsl(var(--pm-red-500)/0.35)',
          color: loading ? 'hsl(var(--pm-gray-500))' : 'hsl(var(--pm-red-500))',
          cursor: loading ? 'not-allowed' : 'pointer',
        }}
      >
        {loading ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
        {loading ? 'Aguarde...' : 'Baixar'}
      </button>
    </div>
  )
}

function CategoryPanel({ category }: { category: MktCategory }) {
  const { data, isLoading, isError } = useMarketingMaterials(category)
  const Icon = CATEGORY_ICONS[category]

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 size={24} className="animate-spin" style={{ color: 'hsl(var(--pm-gray-500))' }} />
      </div>
    )
  }

  if (isError || !data || data.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-12">
        <div
          className="flex items-center justify-center rounded-full"
          style={{ width: 52, height: 52, background: 'hsl(var(--pm-gray-800))' }}
        >
          <Icon size={22} style={{ color: 'hsl(var(--pm-gray-600))' }} />
        </div>
        <div className="text-center">
          <p className="text-sm font-medium" style={{ color: 'hsl(var(--pm-gray-400))' }}>
            Em breve
          </p>
          <p className="text-xs mt-1" style={{ color: 'hsl(var(--pm-gray-600))' }}>
            Materiais desta categoria serão disponibilizados em breve.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      {data.map(m => <FileRow key={m.id} material={m} />)}
    </div>
  )
}

export default function MateriaisPage() {
  const [active, setActive] = useState<MktCategory>('logo')
  const activeMeta = MKT_CATEGORIES.find(c => c.value === active)!
  const color = CATEGORY_COLORS[active]

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
          Baixe os materiais disponibilizados pela Promax Tuner para sua franquia.
        </p>
      </div>

      {/* Category cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {MKT_CATEGORIES.map(cat => {
          const Icon = CATEGORY_ICONS[cat.value]
          const catColor = CATEGORY_COLORS[cat.value]
          const isActive = active === cat.value

          return (
            <button
              key={cat.value}
              onClick={() => setActive(cat.value)}
              className="flex flex-col items-start gap-2 p-4 rounded-xl text-left transition-all"
              style={{
                background: isActive ? `${catColor}18` : 'hsl(var(--pm-gray-900))',
                border: `1.5px solid ${isActive ? catColor : 'hsl(var(--pm-gray-800))'}`,
                cursor: 'pointer',
              }}
            >
              <div
                className="flex items-center justify-center rounded-lg"
                style={{ width: 36, height: 36, background: isActive ? `${catColor}22` : 'hsl(var(--pm-gray-800))' }}
              >
                <Icon size={18} style={{ color: isActive ? catColor : 'hsl(var(--pm-gray-400))' }} />
              </div>
              <div>
                <p
                  className="text-sm font-semibold"
                  style={{ color: isActive ? catColor : 'hsl(var(--pm-gray-200))' }}
                >
                  {cat.label}
                </p>
                <p className="text-[10px] leading-tight mt-0.5" style={{ color: 'hsl(var(--pm-gray-500))' }}>
                  {cat.description}
                </p>
              </div>
            </button>
          )
        })}
      </div>

      {/* Content panel */}
      <div
        className="rounded-xl"
        style={{
          background: 'hsl(var(--pm-gray-950))',
          border: '1px solid hsl(var(--pm-gray-800))',
        }}
      >
        <div
          className="flex items-center gap-3 px-5 py-4"
          style={{ borderBottom: '1px solid hsl(var(--pm-gray-800))' }}
        >
          {(() => {
            const Icon = CATEGORY_ICONS[active]
            return (
              <div
                className="flex items-center justify-center rounded-lg"
                style={{ width: 32, height: 32, background: `${color}22` }}
              >
                <Icon size={16} style={{ color }} />
              </div>
            )
          })()}
          <div>
            <p className="text-sm font-semibold" style={{ color: 'hsl(var(--pm-gray-100))' }}>
              {activeMeta.label}
            </p>
            <p className="text-xs" style={{ color: 'hsl(var(--pm-gray-500))' }}>
              {activeMeta.description}
            </p>
          </div>
          <ChevronRight size={14} className="ml-auto" style={{ color: 'hsl(var(--pm-gray-600))' }} />
        </div>

        <div className="p-4">
          <CategoryPanel category={active} />
        </div>
      </div>
    </div>
  )
}
