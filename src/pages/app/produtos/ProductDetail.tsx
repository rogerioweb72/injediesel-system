import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useRoutePrefix } from '@/contexts/RoutePrefixContext'
import { ArrowLeft, Edit3, Trash2, Camera, Info, Layers, AlertCircle, CheckCircle2, XCircle, Barcode, Tag, Hash } from 'lucide-react'
import { PermissionGuard } from '@/components/auth/PermissionGuard'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { useProduct, useDeleteProduct } from '@/hooks/useProducts'
import type { PriceTier } from '@/types/app'

function formatCurrency(n: number) {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

const TIERS: { tier: PriceTier; label: string }[] = [
  { tier: 'cliente_final',        label: 'Cliente Final' },
  { tier: 'franqueado_linha_leve', label: 'Linha Leve' },
  { tier: 'franqueado_full',       label: 'Full' },
]

const GLASS_LINE: React.CSSProperties = {
  position: 'absolute', top: 0, left: 0, right: 0, height: 1,
  background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.09), transparent)',
}

const CARD: React.CSSProperties = {
  background: '#181920',
  border: '1px solid rgba(255,255,255,0.05)',
  borderRadius: 16,
  position: 'relative',
  overflow: 'hidden',
}

// suppress unused TIERS warning
void TIERS

export default function ProductDetail() {
  const navigate = useNavigate()
  const prefix = useRoutePrefix()
  const { id } = useParams<{ id: string }>()
  const [deleteOpen, setDeleteOpen] = useState(false)

  const { data: product, isLoading } = useProduct(id ?? '')
  const deleteProduct = useDeleteProduct()

  if (isLoading || !product) return <div className="pm-skeleton h-64 w-full rounded-xl" />

  async function handleDelete() {
    if (!product) return
    await deleteProduct.mutateAsync(product.id)
    setDeleteOpen(false)
    navigate(`${prefix}/produtos`)
  }

  const prices = product.product_prices ?? []

  return (
    <div>
      <PageHeader title="Produtos" />

      {/* Product identity */}
      <div className="mb-8">
        <button
          onClick={() => navigate(`${prefix}/produtos`)}
          className="group flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-5 transition-colors"
        >
          <ArrowLeft size={15} className="group-hover:-translate-x-1 transition-transform duration-200" />
          Voltar para lista
        </button>

        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 style={{ fontSize: 28, fontWeight: 700, color: '#F8FAFC', lineHeight: 1.25, marginBottom: 12 }}>
              {product.name}
            </h1>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 6, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)', fontSize: 12, fontWeight: 500, color: '#94A3B8' }}>
                <Barcode size={11} /> {product.sku}
              </span>
              {product.code && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 6, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)', fontSize: 12, fontWeight: 500, color: '#94A3B8' }}>
                  <Hash size={11} /> {product.code}
                </span>
              )}
              {product.category && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 6, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)', fontSize: 12, fontWeight: 500, color: '#94A3B8' }}>
                  <Tag size={11} /> {product.category}
                </span>
              )}
            </div>
          </div>

          {/* Action buttons — inside page, not header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            <PermissionGuard module="produtos" action="edit">
              <Button
                variant="outline"
                onClick={() => navigate(`${prefix}/produtos/${id}/editar`)}
                style={{ gap: 6, fontSize: 13 }}
              >
                <Edit3 size={14} style={{ color: '#B12825' }} />
                Editar
              </Button>
            </PermissionGuard>
            <PermissionGuard module="produtos" action="delete">
              <button
                onClick={() => setDeleteOpen(true)}
                style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 500, padding: '8px 14px', borderRadius: 8, border: 'none', background: 'rgba(239,68,68,0.1)', color: '#F87171', cursor: 'pointer', transition: 'background 150ms' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.18)' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.1)' }}
              >
                <Trash2 size={14} />
                Apagar
              </button>
            </PermissionGuard>
          </div>
        </div>
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">

        {/* ── Image col ── */}
        <div className="lg:col-span-3">
          <div className="group" style={{ ...CARD, padding: 8, aspectRatio: '1/1' }}>
            <div style={GLASS_LINE} />
            <div style={{ width: '100%', height: '100%', background: '#0F1015', borderRadius: 10, overflow: 'hidden', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Camera size={32} style={{ color: 'rgba(255,255,255,0.04)', position: 'absolute' }} />
              {product.image_url && (
                <img
                  src={product.image_url}
                  alt={product.name}
                  className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-110 transition-all duration-700 ease-in-out relative z-10"
                  onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
                />
              )}
            </div>
            <button
              onClick={() => navigate(`${prefix}/produtos/${id}/editar`)}
              title="Alterar imagem"
              className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-all duration-300 z-20"
              style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, padding: '8px', color: 'rgba(255,255,255,0.7)', cursor: 'pointer' }}
            >
              <Camera size={15} />
            </button>
          </div>
        </div>

        {/* ── Middle col ── */}
        <div className="lg:col-span-5 flex flex-col gap-5">

          {/* Status & stock */}
          <div style={CARD}>
            <div style={GLASS_LINE} />
            <div style={{ padding: '20px 22px' }}>
              <p style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#64748B', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Info size={13} /> Visão Geral
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                <div>
                  <p style={{ fontSize: 11, color: '#475569', marginBottom: 8 }}>Status</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    {product.active
                      ? <CheckCircle2 size={18} style={{ color: '#34D399' }} />
                      : <XCircle size={18} style={{ color: '#475569' }} />
                    }
                    <span style={{ fontSize: 16, fontWeight: 600, color: product.active ? '#F8FAFC' : '#64748B' }}>
                      {product.active ? 'Ativo' : 'Inativo'}
                    </span>
                  </div>
                </div>
                <div>
                  <p style={{ fontSize: 11, color: '#475569', marginBottom: 8 }}>Estoque</p>
                  <div style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    padding: '6px 12px', borderRadius: 8,
                    background: product.stock <= 0 ? 'rgba(251,191,36,0.1)' : product.stock <= 3 ? 'rgba(251,191,36,0.08)' : 'rgba(52,211,153,0.08)',
                    border: `1px solid ${product.stock <= 0 ? 'rgba(251,191,36,0.2)' : product.stock <= 3 ? 'rgba(251,191,36,0.15)' : 'rgba(52,211,153,0.15)'}`,
                  }}>
                    <AlertCircle size={14} style={{ color: product.stock <= 3 ? '#FBBF24' : '#34D399' }} />
                    <span style={{ fontSize: 13, fontWeight: 600, color: product.stock <= 3 ? '#FBBF24' : '#34D399' }}>
                      {product.stock} unid.
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Description */}
          {product.description && (
            <div style={CARD}>
              <div style={GLASS_LINE} />
              <div style={{ padding: '20px 22px' }}>
                <p style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#64748B', marginBottom: 14 }}>Descrição</p>
                <p style={{ fontSize: 13, color: '#94A3B8', lineHeight: 1.65 }}>{product.description}</p>
              </div>
            </div>
          )}
        </div>

        {/* ── Pricing col ── */}
        <div className="lg:col-span-4">
          <div style={{ ...CARD, height: '100%' }}>
            <div style={GLASS_LINE} />
            <div style={{ padding: '20px 22px' }}>
              <p style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#64748B', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Layers size={13} /> Preços por Tier
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

                {/* Custo */}
                {product.cost_price != null && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.04)', background: 'rgba(0,0,0,0.2)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#334155', flexShrink: 0 }} />
                      <span style={{ fontSize: 11, fontWeight: 500, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Custo</span>
                    </div>
                    <span style={{ fontSize: 14, fontWeight: 600, color: '#64748B' }}>{formatCurrency(product.cost_price)}</span>
                  </div>
                )}

                {/* Cliente Final */}
                {(() => {
                  const p = prices.find(x => x.tier === 'cliente_final')
                  return (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#475569', flexShrink: 0 }} />
                        <span style={{ fontSize: 13, fontWeight: 500, color: '#94A3B8' }}>Cliente Final</span>
                      </div>
                      <span style={{ fontSize: 18, fontWeight: 700, color: '#F8FAFC' }}>{p ? formatCurrency(p.price) : '—'}</span>
                    </div>
                  )
                })()}

                {/* Linha Leve */}
                {(() => {
                  const p = prices.find(x => x.tier === 'franqueado_linha_leve')
                  return (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderRadius: 12, border: '1px solid rgba(96,165,250,0.12)', background: 'rgba(96,165,250,0.05)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#60A5FA', boxShadow: '0 0 6px rgba(96,165,250,0.5)', flexShrink: 0 }} />
                        <span style={{ fontSize: 13, fontWeight: 500, color: '#BFDBFE' }}>Linha Leve</span>
                      </div>
                      <span style={{ fontSize: 18, fontWeight: 700, color: '#F8FAFC' }}>{p ? formatCurrency(p.price) : '—'}</span>
                    </div>
                  )
                })()}

                {/* Full */}
                {(() => {
                  const p = prices.find(x => x.tier === 'franqueado_full')
                  return (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderRadius: 12, border: '1px solid rgba(177,40,37,0.22)', background: 'linear-gradient(135deg, rgba(255,75,43,0.1) 0%, rgba(177,40,37,0.04) 100%)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#B12825', boxShadow: '0 0 8px rgba(177,40,37,0.7)', flexShrink: 0 }} />
                        <span style={{ fontSize: 13, fontWeight: 600, color: '#B12825' }}>Full</span>
                      </div>
                      <span style={{ fontSize: 20, fontWeight: 700, color: '#F8FAFC' }}>{p ? formatCurrency(p.price) : '—'}</span>
                    </div>
                  )
                })()}

              </div>

              <p style={{ marginTop: 20, fontSize: 11, color: '#334155', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                <Info size={11} /> Valores conforme tabela vigente
              </p>
            </div>
          </div>
        </div>

      </div>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Excluir Produto"
        description={`Tem certeza que deseja excluir "${product.name}"?`}
        onConfirm={handleDelete}
        isLoading={deleteProduct.isPending}
        confirmLabel="Excluir"
      />
    </div>
  )
}
