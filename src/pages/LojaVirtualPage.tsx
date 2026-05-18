import { useState, useMemo, useCallback, Fragment } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Search, X, ChevronRight, ChevronLeft, Zap, Package, ShoppingBag, ImageIcon,
} from 'lucide-react'
import { useEcuCategories } from '@/hooks/useEcuCategories'
import {
  useLojaEcuCatalog, useLojaEcuBrands,
  useLojaProducts, useLojaProductCategories,
  useLojaFeaturedEcu, useLojaFeaturedProducts,
  type LojaEcuItem, type LojaProductItem,
} from '@/hooks/useLojaData'

const PAGE_SIZE = 20
const RED    = '#E72B2B'
const BG     = '#141416'
const CARD   = '#161819'
const BORDER = 'rgba(255,255,255,0.07)'

function fmtCurrency(n: number | null): string {
  if (!n || n === 0) return 'Consultar'
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function whatsApp(text: string) {
  const num = import.meta.env.VITE_WHATSAPP_NUMBER || '5511999999999'
  window.open(`https://wa.me/${num}?text=${encodeURIComponent(text)}`, '_blank')
}

// ─── ECU Detail Modal ──────────────────────────────────────────────────────────
function EcuModal({ item, onClose }: { item: LojaEcuItem; onClose: () => void }) {
  const hasGains = item.cv_original != null && item.cv_tuned != null

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}
      onClick={onClose}
    >
      <div
        style={{ background: '#1a1a1d', border: `1px solid #2a2a2d`, borderRadius: '12px', maxWidth: '520px', width: '100%', maxHeight: '90vh', overflowY: 'auto' }}
        onClick={e => e.stopPropagation()}
      >
        {item.foto_url && (
          <div style={{ height: '220px', overflow: 'hidden', background: '#111113', borderRadius: '12px 12px 0 0' }}>
            <img src={item.foto_url} alt={item.marca} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { (e.target as HTMLImageElement).parentElement!.style.display = 'none' }} />
          </div>
        )}
        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <span style={{ fontSize: '9px', fontFamily: 'JetBrains Mono,monospace', color: '#666', textTransform: 'uppercase', letterSpacing: '0.1em', border: `1px solid rgba(255,255,255,0.08)`, padding: '2px 6px', marginBottom: '8px', display: 'inline-block' }}>
                {item.categoria}
              </span>
              <p style={{ fontFamily: '"Barlow Condensed",sans-serif', fontWeight: 800, fontSize: '22px', color: '#fff', textTransform: 'uppercase', lineHeight: 1.1 }}>
                {item.marca}
              </p>
              <p style={{ fontSize: '13px', color: '#888', marginTop: '4px' }}>
                {[item.secao_original, item.modelo_descricao, item.ano ? `(${item.ano})` : ''].filter(Boolean).join(' · ')}
              </p>
            </div>
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#555', padding: '4px' }}>
              <X size={18} />
            </button>
          </div>

          {hasGains && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '12px', alignItems: 'center', background: 'rgba(231,43,43,0.06)', border: `1px solid rgba(231,43,43,0.2)`, padding: '16px' }}>
              <div>
                <p style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: '9px', color: '#555', textTransform: 'uppercase', marginBottom: '4px' }}>Original</p>
                <p style={{ fontFamily: '"Barlow Condensed",sans-serif', fontWeight: 800, fontSize: '28px', color: '#fff', lineHeight: 1 }}>{item.cv_original} <span style={{ fontSize: '14px', fontWeight: 400 }}>CV</span></p>
                {item.kgfm_original && <p style={{ fontSize: '11px', color: '#666', marginTop: '2px' }}>{item.kgfm_original} kgfm</p>}
              </div>
              <ChevronRight size={16} color={RED} />
              <div>
                <p style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: '9px', color: '#555', textTransform: 'uppercase', marginBottom: '4px' }}>Reprogramado</p>
                <p style={{ fontFamily: '"Barlow Condensed",sans-serif', fontWeight: 800, fontSize: '28px', color: RED, lineHeight: 1 }}>{item.cv_tuned} <span style={{ fontSize: '14px', fontWeight: 400 }}>CV</span></p>
                {item.kgfm_tuned && <p style={{ fontSize: '11px', color: '#888', marginTop: '2px' }}>{item.kgfm_tuned} kgfm</p>}
              </div>
            </div>
          )}

          {item.ganho && !hasGains && (
            <div style={{ background: 'rgba(231,43,43,0.06)', border: `1px solid rgba(231,43,43,0.2)`, padding: '12px', fontFamily: '"Barlow Condensed",sans-serif', fontWeight: 700, fontSize: '16px', color: RED }}>
              {item.ganho}
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: `1px solid rgba(255,255,255,0.07)`, paddingTop: '16px' }}>
            <div>
              <p style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: '9px', color: '#555', textTransform: 'uppercase', marginBottom: '2px' }}>Preço</p>
              <p style={{ fontFamily: '"Barlow Condensed",sans-serif', fontWeight: 800, fontSize: '24px', color: item.preco_cliente_final ? '#fff' : '#666' }}>
                {fmtCurrency(item.preco_cliente_final)}
              </p>
            </div>
            <button
              onClick={() => whatsApp(`Olá! Tenho interesse no remap para ${item.marca} ${item.secao_original ?? ''} ${item.modelo_descricao ?? ''}.`)}
              className="pm-buy-btn"
              style={{ padding: '10px 20px', fontSize: '13px' }}
            >
              <Zap size={13} /> Solicitar via WhatsApp
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Product Detail Modal ──────────────────────────────────────────────────────
function ProductModal({ item, onClose }: { item: LojaProductItem; onClose: () => void }) {
  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}
      onClick={onClose}
    >
      <div
        style={{ background: '#1a1a1d', border: `1px solid #2a2a2d`, borderRadius: '12px', maxWidth: '480px', width: '100%', maxHeight: '90vh', overflowY: 'auto' }}
        onClick={e => e.stopPropagation()}
      >
        {item.image_url && (
          <div style={{ height: '200px', overflow: 'hidden', background: '#111113', borderRadius: '12px 12px 0 0' }}>
            <img src={item.image_url} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { (e.target as HTMLImageElement).parentElement!.style.display = 'none' }} />
          </div>
        )}
        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <span style={{ fontSize: '9px', fontFamily: 'JetBrains Mono,monospace', color: '#666', textTransform: 'uppercase', letterSpacing: '0.1em', border: `1px solid rgba(255,255,255,0.08)`, padding: '2px 6px', marginBottom: '8px', display: 'inline-block' }}>
                {item.category}
              </span>
              <p style={{ fontFamily: '"Barlow Condensed",sans-serif', fontWeight: 800, fontSize: '20px', color: '#fff', textTransform: 'uppercase', lineHeight: 1.2 }}>
                {item.name}
              </p>
              <p style={{ fontSize: '10px', fontFamily: 'JetBrains Mono,monospace', color: 'rgba(255,255,255,0.35)', marginTop: '2px' }}>SKU: {item.sku}</p>
            </div>
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#555', padding: '4px' }}><X size={18} /></button>
          </div>

          {item.description && (
            <p style={{ fontSize: '13px', color: '#888', lineHeight: 1.6, borderTop: `1px solid rgba(255,255,255,0.07)`, paddingTop: '14px' }}>{item.description}</p>
          )}

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: `1px solid rgba(255,255,255,0.07)`, paddingTop: '14px' }}>
            <div>
              <p style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: '9px', color: '#555', textTransform: 'uppercase', marginBottom: '2px' }}>
                {item.stock > 0 ? `Estoque: ${item.stock}` : 'Sob encomenda'}
              </p>
              <p style={{ fontFamily: '"Barlow Condensed",sans-serif', fontWeight: 800, fontSize: '24px', color: item.preco_cliente_final ? '#fff' : '#666' }}>
                {fmtCurrency(item.preco_cliente_final)}
              </p>
            </div>
            <button
              onClick={() => whatsApp(`Olá! Quero comprar: ${item.name} (SKU: ${item.sku})`)}
              className="pm-buy-btn"
              style={{ padding: '10px 20px', fontSize: '13px' }}
            >
              <ShoppingBag size={13} /> Comprar via WhatsApp
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Featured ECU Card (larger, full-bleed image) ──────────────────────────────
function FeaturedEcuCard({ item, onClick }: { item: LojaEcuItem; onClick: () => void }) {
  const hasGains = item.cv_original != null && item.cv_tuned != null
  return (
    <div
      style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: '12px', display: 'flex', flexDirection: 'column', cursor: 'pointer', overflow: 'hidden', transition: 'border-color 180ms cubic-bezier(0.16,1,0.3,1), transform 180ms cubic-bezier(0.16,1,0.3,1)' }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(231,43,43,0.35)'; e.currentTarget.style.transform = 'translateY(-2px)' }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = BORDER; e.currentTarget.style.transform = 'translateY(0)' }}
      onClick={onClick}
    >
      <div style={{ height: '200px', position: 'relative', background: '#0f0f11', overflow: 'hidden', flexShrink: 0 }}>
        {item.foto_url ? (
          <img src={item.foto_url} alt={item.marca} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
            <ImageIcon size={36} color="#2a2a2d" />
          </div>
        )}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(22,24,25,0.9) 0%, transparent 50%)', pointerEvents: 'none' }} />
        <span style={{ position: 'absolute', top: '10px', right: '10px', background: 'rgba(0,0,0,0.75)', color: RED, fontFamily: 'JetBrains Mono,monospace', fontSize: '8px', textTransform: 'uppercase', letterSpacing: '0.1em', padding: '3px 7px' }}>
          DESTAQUE
        </span>
        <span style={{ position: 'absolute', top: '10px', left: '10px', background: 'rgba(0,0,0,0.75)', color: '#aaa', fontFamily: 'JetBrains Mono,monospace', fontSize: '8px', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '3px 7px' }}>
          {item.categoria}
        </span>
      </div>

      {hasGains && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '8px', alignItems: 'center', background: 'rgba(231,43,43,0.06)', borderBottom: `1px solid rgba(231,43,43,0.15)`, padding: '10px 16px', flexShrink: 0 }}>
          <div>
            <p style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: '8px', color: '#555', textTransform: 'uppercase', marginBottom: '2px' }}>Original</p>
            <p style={{ fontFamily: '"Barlow Condensed",sans-serif', fontWeight: 800, fontSize: '20px', color: '#fff', lineHeight: 1 }}>{item.cv_original} <span style={{ fontSize: '11px', fontWeight: 400 }}>CV</span></p>
          </div>
          <ChevronRight size={14} color={RED} />
          <div>
            <p style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: '8px', color: '#555', textTransform: 'uppercase', marginBottom: '2px' }}>Reprogramado</p>
            <p style={{ fontFamily: '"Barlow Condensed",sans-serif', fontWeight: 800, fontSize: '20px', color: RED, lineHeight: 1 }}>{item.cv_tuned} <span style={{ fontSize: '11px', fontWeight: 400 }}>CV</span></p>
          </div>
        </div>
      )}

      <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
        <p style={{ fontFamily: '"Barlow Condensed",sans-serif', fontWeight: 800, fontSize: '16px', color: '#fff', textTransform: 'uppercase', lineHeight: 1.2 }}>
          {item.marca} {item.secao_original ?? ''}
        </p>
        {item.modelo_descricao && (
          <p style={{ fontSize: '11px', color: '#666', lineHeight: 1.3 }}>{item.modelo_descricao}{item.ano ? ` (${item.ano})` : ''}</p>
        )}
        <div style={{ flex: 1 }} />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', paddingTop: '10px', borderTop: `1px solid rgba(255,255,255,0.05)` }}>
          <p style={{ fontFamily: '"Barlow Condensed",sans-serif', fontWeight: 800, fontSize: '22px', color: item.preco_cliente_final ? '#fff' : '#555' }}>
            {fmtCurrency(item.preco_cliente_final)}
          </p>
          <button
            className="pm-buy-btn"
            onClick={e => { e.stopPropagation(); whatsApp(`Olá! Tenho interesse no remap para ${item.marca} ${item.secao_original ?? ''}.`) }}
          >
            <Zap size={11} /> Solicitar
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Featured Product Card ─────────────────────────────────────────────────────
function FeaturedProductCard({ item, onClick }: { item: LojaProductItem; onClick: () => void }) {
  return (
    <div
      style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: '12px', display: 'flex', flexDirection: 'column', cursor: 'pointer', overflow: 'hidden', transition: 'border-color 180ms cubic-bezier(0.16,1,0.3,1), transform 180ms cubic-bezier(0.16,1,0.3,1)' }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(231,43,43,0.35)'; e.currentTarget.style.transform = 'translateY(-2px)' }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = BORDER; e.currentTarget.style.transform = 'translateY(0)' }}
      onClick={onClick}
    >
      <div style={{ height: '200px', position: 'relative', background: '#0f0f11', overflow: 'hidden', flexShrink: 0 }}>
        {item.image_url ? (
          <img src={item.image_url} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
            <Package size={36} color="#2a2a2d" />
          </div>
        )}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(22,24,25,0.9) 0%, transparent 50%)', pointerEvents: 'none' }} />
        <span style={{ position: 'absolute', top: '10px', right: '10px', background: 'rgba(0,0,0,0.75)', color: RED, fontFamily: 'JetBrains Mono,monospace', fontSize: '8px', textTransform: 'uppercase', letterSpacing: '0.1em', padding: '3px 7px' }}>
          DESTAQUE
        </span>
        <span style={{ position: 'absolute', top: '10px', left: '10px', background: 'rgba(0,0,0,0.75)', color: '#aaa', fontFamily: 'JetBrains Mono,monospace', fontSize: '8px', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '3px 7px' }}>
          {item.category}
        </span>
      </div>

      <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
        <p style={{ fontFamily: '"Barlow Condensed",sans-serif', fontWeight: 800, fontSize: '16px', color: '#fff', textTransform: 'uppercase', lineHeight: 1.2 }}>
          {item.name}
        </p>
        <p style={{ fontSize: '9px', fontFamily: 'JetBrains Mono,monospace', color: 'rgba(255,255,255,0.35)', marginTop: '-2px' }}>
          SKU: {item.sku}
        </p>
        <div style={{ flex: 1 }} />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', paddingTop: '10px', borderTop: `1px solid rgba(255,255,255,0.05)` }}>
          <p style={{ fontFamily: '"Barlow Condensed",sans-serif', fontWeight: 800, fontSize: '22px', color: item.preco_cliente_final ? '#fff' : '#555' }}>
            {fmtCurrency(item.preco_cliente_final)}
          </p>
          <button
            className="pm-buy-btn"
            onClick={e => { e.stopPropagation(); whatsApp(`Olá! Quero comprar: ${item.name} (SKU: ${item.sku})`) }}
          >
            <ShoppingBag size={11} /> Comprar
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Standard ECU Card ─────────────────────────────────────────────────────────
function EcuCard({ item, onClick }: { item: LojaEcuItem; onClick: () => void }) {
  return (
    <div
      style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: '12px', display: 'flex', flexDirection: 'column', cursor: 'pointer', overflow: 'hidden', transition: 'border-color 180ms cubic-bezier(0.16,1,0.3,1), transform 180ms cubic-bezier(0.16,1,0.3,1)' }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(231,43,43,0.35)'; e.currentTarget.style.transform = 'translateY(-2px)' }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = BORDER; e.currentTarget.style.transform = 'translateY(0)' }}
      onClick={onClick}
    >
      <div style={{ height: '160px', background: '#0f0f11', padding: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', flexShrink: 0 }}>
        {item.foto_url ? (
          <img src={item.foto_url} alt={item.marca} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
        ) : (
          <ImageIcon size={32} color="#2a2a2d" />
        )}
        <span style={{ position: 'absolute', top: '8px', left: '8px', background: 'rgba(0,0,0,0.8)', color: '#aaa', fontFamily: 'JetBrains Mono,monospace', fontSize: '8px', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '2px 6px' }}>
          {item.categoria}
        </span>
      </div>

      <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
        <p style={{ fontFamily: '"Barlow Condensed",sans-serif', fontWeight: 800, fontSize: '14px', color: '#fff', textTransform: 'uppercase', lineHeight: 1.2 }}>
          {item.marca} {item.secao_original ?? ''}
        </p>
        {item.modelo_descricao && (
          <p style={{ fontSize: '10px', color: '#666', lineHeight: 1.3 }}>{item.modelo_descricao}{item.ano ? ` (${item.ano})` : ''}</p>
        )}
        <div style={{ flex: 1 }} />
        <div style={{ borderTop: `1px solid rgba(255,255,255,0.05)`, paddingTop: '10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
          <p style={{ fontFamily: '"Barlow Condensed",sans-serif', fontWeight: 800, fontSize: '17px', color: item.preco_cliente_final ? '#fff' : '#555' }}>
            {fmtCurrency(item.preco_cliente_final)}
          </p>
          <button
            className="pm-buy-btn"
            style={{ fontSize: '10px', padding: '7px 12px' }}
            onClick={e => { e.stopPropagation(); whatsApp(`Olá! Tenho interesse no remap para ${item.marca} ${item.secao_original ?? ''}.`) }}
          >
            <Zap size={10} /> Solicitar
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Standard Product Card ─────────────────────────────────────────────────────
function ProductCard({ item, onClick }: { item: LojaProductItem; onClick: () => void }) {
  return (
    <div
      style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: '12px', display: 'flex', flexDirection: 'column', cursor: 'pointer', overflow: 'hidden', transition: 'border-color 180ms cubic-bezier(0.16,1,0.3,1), transform 180ms cubic-bezier(0.16,1,0.3,1)' }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(231,43,43,0.35)'; e.currentTarget.style.transform = 'translateY(-2px)' }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = BORDER; e.currentTarget.style.transform = 'translateY(0)' }}
      onClick={onClick}
    >
      <div style={{ height: '160px', background: '#0f0f11', padding: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', flexShrink: 0 }}>
        {item.image_url ? (
          <img src={item.image_url} alt={item.name} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
        ) : (
          <Package size={32} color="#2a2a2d" />
        )}
        <span style={{ position: 'absolute', top: '8px', left: '8px', background: 'rgba(0,0,0,0.8)', color: '#aaa', fontFamily: 'JetBrains Mono,monospace', fontSize: '8px', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '2px 6px' }}>
          {item.category}
        </span>
      </div>

      <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
        <p style={{ fontFamily: '"Barlow Condensed",sans-serif', fontWeight: 800, fontSize: '14px', color: '#fff', textTransform: 'uppercase', lineHeight: 1.2 }}>
          {item.name}
        </p>
        <p style={{ fontSize: '9px', fontFamily: 'JetBrains Mono,monospace', color: 'rgba(255,255,255,0.35)' }}>
          SKU: {item.sku}
        </p>
        <div style={{ flex: 1 }} />
        <div style={{ borderTop: `1px solid rgba(255,255,255,0.05)`, paddingTop: '10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
          <p style={{ fontFamily: '"Barlow Condensed",sans-serif', fontWeight: 800, fontSize: '17px', color: item.preco_cliente_final ? '#fff' : '#555' }}>
            {fmtCurrency(item.preco_cliente_final)}
          </p>
          <button
            className="pm-buy-btn"
            style={{ fontSize: '10px', padding: '7px 12px' }}
            onClick={e => { e.stopPropagation(); whatsApp(`Olá! Quero comprar: ${item.name} (SKU: ${item.sku})`) }}
          >
            <ShoppingBag size={10} /> Comprar
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Category section header ───────────────────────────────────────────────────
function CatHeader({ label, count }: { label: string; count: number }) {
  return (
    <div style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: '12px', padding: '28px 0 10px' }}>
      <span style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: '9px', color: RED, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
        //
      </span>
      <p style={{ fontFamily: '"Barlow Condensed",sans-serif', fontWeight: 800, fontSize: '20px', color: '#fff', textTransform: 'uppercase' }}>
        {label}
      </p>
      <span style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: '10px', color: '#444' }}>
        {count}
      </span>
      <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.06)' }} />
    </div>
  )
}

// ─── Pagination ────────────────────────────────────────────────────────────────
function Pagination({ page, total, onChange }: { page: number; total: number; onChange: (p: number) => void }) {
  const pages = Math.ceil(total / PAGE_SIZE)
  if (pages <= 1) return null
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '32px 0' }}>
      <button
        onClick={() => onChange(page - 1)}
        disabled={page === 0}
        style={{ background: 'rgba(255,255,255,0.05)', border: `1px solid ${BORDER}`, borderRadius: '6px', color: page === 0 ? '#333' : '#888', cursor: page === 0 ? 'default' : 'pointer', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '4px', fontFamily: '"Barlow Condensed",sans-serif', fontWeight: 700, fontSize: '12px', textTransform: 'uppercase' }}
      >
        <ChevronLeft size={13} /> Anterior
      </button>

      <div style={{ display: 'flex', gap: '4px' }}>
        {Array.from({ length: Math.min(pages, 7) }).map((_, i) => {
          const p = pages <= 7 ? i : (
            page < 4 ? i :
            page > pages - 5 ? pages - 7 + i :
            page - 3 + i
          )
          const isActive = p === page
          return (
            <button
              key={p}
              onClick={() => onChange(p)}
              style={{ background: isActive ? RED : 'rgba(255,255,255,0.04)', border: `1px solid ${isActive ? RED : BORDER}`, borderRadius: '4px', color: isActive ? '#fff' : '#666', cursor: 'pointer', padding: '6px 11px', fontFamily: 'JetBrains Mono,monospace', fontSize: '11px', minWidth: '36px' }}
            >
              {p + 1}
            </button>
          )
        })}
      </div>

      <button
        onClick={() => onChange(page + 1)}
        disabled={page >= pages - 1}
        style={{ background: 'rgba(255,255,255,0.05)', border: `1px solid ${BORDER}`, borderRadius: '6px', color: page >= pages - 1 ? '#333' : '#888', cursor: page >= pages - 1 ? 'default' : 'pointer', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '4px', fontFamily: '"Barlow Condensed",sans-serif', fontWeight: 700, fontSize: '12px', textTransform: 'uppercase' }}
      >
        Próxima <ChevronRight size={13} />
      </button>

      <span style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: '10px', color: '#444', marginLeft: '8px' }}>
        {page + 1}/{pages} · {total} itens
      </span>
    </div>
  )
}

// ─── Shared input styles ───────────────────────────────────────────────────────
const INPUT_BASE: React.CSSProperties = {
  background: 'rgba(255,255,255,0.05)',
  border: `1px solid rgba(255,255,255,0.08)`,
  borderRadius: '8px',
  color: '#fff',
  padding: '8px 12px',
  fontSize: '12px',
  fontFamily: '"DM Sans",sans-serif',
  outline: 'none',
}

const SELECT_BASE: React.CSSProperties = {
  ...INPUT_BASE,
  cursor: 'pointer',
  appearance: 'none' as const,
  paddingRight: '28px',
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23555' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'right 8px center',
  backgroundSize: '12px',
}

// ─── Pill filter row ───────────────────────────────────────────────────────────
function PillRow({ options, active, onSelect }: {
  options: { value: string; label: string }[]
  active: string
  onSelect: (v: string) => void
}) {
  return (
    <div className="pm-pill-row" style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '4px' }}>
      {options.map(opt => (
        <button
          key={opt.value}
          onClick={() => onSelect(opt.value)}
          style={{
            padding: '6px 14px',
            borderRadius: '999px',
            border: `1px solid ${active === opt.value ? 'rgba(231,43,43,0.4)' : 'rgba(255,255,255,0.08)'}`,
            background: active === opt.value ? 'rgba(231,43,43,0.12)' : 'rgba(255,255,255,0.04)',
            color: active === opt.value ? '#fff' : '#666',
            fontFamily: '"DM Sans",sans-serif',
            fontSize: '12px',
            cursor: 'pointer',
            whiteSpace: 'nowrap' as const,
            transition: 'all 120ms ease-out',
            flexShrink: 0,
          }}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

// ─── DESTAQUES section ─────────────────────────────────────────────────────────
function DestaquesSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{
      background: '#0d0d0f',
      backgroundImage: 'radial-gradient(ellipse at 50% 100%, rgba(231,43,43,0.07) 0%, transparent 55%)',
      borderBottom: `1px solid rgba(255,255,255,0.05)`,
      padding: '32px 0',
    }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
          <span style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: '8px', color: RED, textTransform: 'uppercase', letterSpacing: '0.15em', border: `1px solid rgba(231,43,43,0.3)`, padding: '2px 6px' }}>
            DESTAQUES
          </span>
          <p style={{ fontFamily: '"Barlow Condensed",sans-serif', fontWeight: 800, fontSize: '22px', color: '#fff', textTransform: 'uppercase' }}>
            {title}
          </p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '24px' }}>
          {children}
        </div>
      </div>
    </div>
  )
}

// ─── Main page ─────────────────────────────────────────────────────────────────
type Tab = 'remap' | 'acessorios'

export default function LojaVirtualPage() {
  const navigate = useNavigate()
  const [tab, setTab] = useState<Tab>('remap')

  const [remapQ,     setRemapQ]     = useState('')
  const [remapCat,   setRemapCat]   = useState('all')
  const [remapMarca, setRemapMarca] = useState('')
  const [remapPage,  setRemapPage]  = useState(0)
  const [ecuModal,   setEcuModal]   = useState<LojaEcuItem | null>(null)

  const [acessQ,    setAcessQ]    = useState('')
  const [acessCat,  setAcessCat]  = useState('')
  const [acessPage, setAcessPage] = useState(0)
  const [prodModal, setProdModal] = useState<LojaProductItem | null>(null)

  const { data: ecuCats  = [] } = useEcuCategories()
  const { data: remapBrands = [] } = useLojaEcuBrands(remapCat)
  const { data: allEcu  = [], isLoading: loadEcu  } = useLojaEcuCatalog(remapCat, remapMarca, remapQ)
  const { data: allProd = [], isLoading: loadProd } = useLojaProducts(acessCat || undefined, acessQ)
  const { data: acessCats = [] } = useLojaProductCategories()
  const { data: featuredEcu  = [] } = useLojaFeaturedEcu()
  const { data: featuredProd = [] } = useLojaFeaturedProducts()

  const ecuPage = useMemo(() => {
    const start = remapPage * PAGE_SIZE
    return allEcu.slice(start, start + PAGE_SIZE)
  }, [allEcu, remapPage])

  const ecuCatHeaders = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const r of allEcu) counts[r.categoria] = (counts[r.categoria] ?? 0) + 1
    return counts
  }, [allEcu])

  const ecuPageCategories = useMemo(() => {
    const seen = new Set<string>()
    const before = allEcu.slice(0, remapPage * PAGE_SIZE)
    for (const r of before) seen.add(r.categoria)
    const result: Record<number, string> = {}
    for (let i = 0; i < ecuPage.length; i++) {
      const cat = ecuPage[i].categoria
      if (!seen.has(cat)) { result[i] = cat; seen.add(cat) }
    }
    return result
  }, [ecuPage, allEcu, remapPage])

  const prodPage = useMemo(() => {
    const start = acessPage * PAGE_SIZE
    return allProd.slice(start, start + PAGE_SIZE)
  }, [allProd, acessPage])

  const prodPageCategories = useMemo(() => {
    const seen = new Set<string>()
    const before = allProd.slice(0, acessPage * PAGE_SIZE)
    for (const r of before) seen.add(r.category)
    const result: Record<number, string> = {}
    for (let i = 0; i < prodPage.length; i++) {
      const cat = prodPage[i].category
      if (!seen.has(cat)) { result[i] = cat; seen.add(cat) }
    }
    return result
  }, [prodPage, allProd, acessPage])

  const prodCatCounts = useMemo(() => {
    const c: Record<string, number> = {}
    for (const r of allProd) c[r.category] = (c[r.category] ?? 0) + 1
    return c
  }, [allProd])

  const resetRemapFilters = useCallback(() => {
    setRemapQ(''); setRemapCat('all'); setRemapMarca(''); setRemapPage(0)
  }, [])
  const resetAcessFilters = useCallback(() => {
    setAcessQ(''); setAcessCat(''); setAcessPage(0)
  }, [])

  const hasRemapFilter = remapQ !== '' || remapCat !== 'all' || remapMarca !== ''
  const hasAcessFilter = acessQ !== '' || acessCat !== ''

  const remapPillOptions = [
    { value: 'all', label: 'Todos' },
    ...ecuCats.map(c => ({ value: c.slug, label: c.label })),
  ]

  const acessPillOptions = [
    { value: '', label: 'Todos' },
    ...acessCats.map(c => ({ value: c, label: c })),
  ]

  return (
    <div style={{ minHeight: '100vh', background: BG, color: '#fff', fontFamily: '"DM Sans",sans-serif' }}>

      {/* NAV */}
      <nav style={{ position: 'sticky', top: 0, zIndex: 50, background: 'rgba(20,20,22,0.92)', backdropFilter: 'blur(12px)', borderBottom: `1px solid ${BORDER}`, padding: '0 32px', height: '54px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <button onClick={() => navigate('/')} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <img src="/tuner-logo.svg" alt="Promax Tuner" style={{ height: '26px' }} onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
          <span style={{ fontFamily: '"Barlow Condensed",sans-serif', fontWeight: 800, fontSize: '16px', color: '#fff', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Promax Tuner</span>
        </button>

        <div style={{ display: 'flex', gap: '2px' }}>
          {([
            { key: 'remap'      as const, label: 'Remap & Tuning', icon: Zap     },
            { key: 'acessorios' as const, label: 'Acessórios',     icon: Package },
          ]).map(({ key, label, icon: Icon }) => (
            <button key={key} onClick={() => setTab(key)} style={{ background: tab === key ? RED : 'transparent', border: 'none', cursor: 'pointer', color: tab === key ? '#fff' : '#666', padding: '6px 16px', fontFamily: '"Barlow Condensed",sans-serif', fontWeight: 800, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'flex', alignItems: 'center', gap: '5px', transition: 'background 0.15s,color 0.15s' }}>
              <Icon size={12} /> {label}
            </button>
          ))}
        </div>
      </nav>

      {/* HERO */}
      <div style={{ background: 'linear-gradient(90deg,#1a0a0a 0%,#141416 60%)', borderBottom: `1px solid ${BORDER}`, padding: '40px 32px' }}>
        <p style={{ fontFamily: '"Barlow Condensed",sans-serif', fontWeight: 900, fontSize: 'clamp(24px,4vw,42px)', textTransform: 'uppercase', lineHeight: 1, color: '#fff', marginBottom: '4px' }}>
          {tab === 'remap' ? 'Catálogo de Remap ECU' : 'Loja de Acessórios'}
        </p>
        <p style={{ fontSize: '12px', color: '#555' }}>
          {tab === 'remap'
            ? `${allEcu.length} soluções · clique em qualquer card para ver detalhes`
            : `${allProd.length} produtos · clique em qualquer card para ver detalhes`}
        </p>
      </div>

      {/* DESTAQUES */}
      {tab === 'remap' && featuredEcu.length > 0 && (
        <DestaquesSection title="Remap em Evidência">
          {featuredEcu.map(item => (
            <FeaturedEcuCard key={item.id} item={item} onClick={() => setEcuModal(item)} />
          ))}
        </DestaquesSection>
      )}

      {tab === 'acessorios' && featuredProd.length > 0 && (
        <DestaquesSection title="Produtos em Evidência">
          {featuredProd.map(item => (
            <FeaturedProductCard key={item.id} item={item} onClick={() => setProdModal(item)} />
          ))}
        </DestaquesSection>
      )}

      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '28px 32px' }}>

        {/* ══ REMAP TAB ══ */}
        {tab === 'remap' && (
          <>
            {/* Row 1: search + brand */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '8px', alignItems: 'center' }}>
              <div style={{ position: 'relative', flex: '1 1 200px', minWidth: '160px' }}>
                <Search size={12} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#444', pointerEvents: 'none' }} />
                <input
                  type="text"
                  value={remapQ}
                  onChange={e => { setRemapQ(e.target.value); setRemapPage(0) }}
                  placeholder="Buscar marca, modelo..."
                  style={{ ...INPUT_BASE, width: '100%', paddingLeft: '30px', paddingRight: remapQ ? '28px' : '12px', boxSizing: 'border-box' }}
                />
                {remapQ && (
                  <button onClick={() => { setRemapQ(''); setRemapPage(0) }} style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#555' }}>
                    <X size={11} />
                  </button>
                )}
              </div>
              <div style={{ position: 'relative', flex: '0 0 150px' }}>
                <select value={remapMarca} onChange={e => { setRemapMarca(e.target.value); setRemapPage(0) }} style={{ ...SELECT_BASE, width: '100%', boxSizing: 'border-box' }}>
                  <option value="">Todas as Marcas</option>
                  {remapBrands.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              {hasRemapFilter && (
                <button onClick={resetRemapFilters} style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid rgba(255,255,255,0.08)`, borderRadius: '8px', color: '#777', cursor: 'pointer', padding: '7px 12px', fontSize: '10px', fontFamily: '"Barlow Condensed",sans-serif', fontWeight: 700, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <X size={10} /> Limpar
                </button>
              )}
              <span style={{ marginLeft: 'auto', fontFamily: 'JetBrains Mono,monospace', fontSize: '10px', color: '#444' }}>
                {loadEcu ? '...' : `${allEcu.length} registros`}
              </span>
            </div>

            {/* Row 2: category pills */}
            <div style={{ marginBottom: '20px' }}>
              <PillRow
                options={remapPillOptions}
                active={remapCat}
                onSelect={v => { setRemapCat(v); setRemapMarca(''); setRemapPage(0) }}
              />
            </div>

            {/* Grid */}
            {loadEcu ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(240px,1fr))', gap: '20px' }}>
                {Array.from({ length: PAGE_SIZE }).map((_, i) => (
                  <div key={i} style={{ background: CARD, height: '280px', borderRadius: '12px', animation: 'pulse 1.5s ease-in-out infinite' }} />
                ))}
              </div>
            ) : allEcu.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '64px 0', color: '#444' }}>
                <Zap size={28} style={{ marginBottom: '10px', opacity: 0.3 }} />
                <p style={{ fontSize: '13px' }}>Nenhum item encontrado.</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(240px,1fr))', gap: '20px' }}>
                {ecuPage.map((item, i) => (
                  <Fragment key={item.id}>
                    {ecuPageCategories[i] !== undefined && (
                      <CatHeader label={ecuPageCategories[i]} count={ecuCatHeaders[ecuPageCategories[i]] ?? 0} />
                    )}
                    <EcuCard item={item} onClick={() => setEcuModal(item)} />
                  </Fragment>
                ))}
              </div>
            )}

            <Pagination page={remapPage} total={allEcu.length} onChange={p => { setRemapPage(p); window.scrollTo({ top: 0, behavior: 'smooth' }) }} />
          </>
        )}

        {/* ══ ACESSÓRIOS TAB ══ */}
        {tab === 'acessorios' && (
          <>
            {/* Row 1: search */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '8px', alignItems: 'center' }}>
              <div style={{ position: 'relative', flex: '1 1 200px', minWidth: '160px' }}>
                <Search size={12} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#444', pointerEvents: 'none' }} />
                <input
                  type="text"
                  value={acessQ}
                  onChange={e => { setAcessQ(e.target.value); setAcessPage(0) }}
                  placeholder="Buscar produto..."
                  style={{ ...INPUT_BASE, width: '100%', paddingLeft: '30px', paddingRight: acessQ ? '28px' : '12px', boxSizing: 'border-box' }}
                />
                {acessQ && (
                  <button onClick={() => { setAcessQ(''); setAcessPage(0) }} style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#555' }}>
                    <X size={11} />
                  </button>
                )}
              </div>
              {hasAcessFilter && (
                <button onClick={resetAcessFilters} style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid rgba(255,255,255,0.08)`, borderRadius: '8px', color: '#777', cursor: 'pointer', padding: '7px 12px', fontSize: '10px', fontFamily: '"Barlow Condensed",sans-serif', fontWeight: 700, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <X size={10} /> Limpar
                </button>
              )}
              <span style={{ marginLeft: 'auto', fontFamily: 'JetBrains Mono,monospace', fontSize: '10px', color: '#444' }}>
                {loadProd ? '...' : `${allProd.length} produtos`}
              </span>
            </div>

            {/* Row 2: category pills */}
            <div style={{ marginBottom: '20px' }}>
              <PillRow
                options={acessPillOptions}
                active={acessCat}
                onSelect={v => { setAcessCat(v); setAcessPage(0) }}
              />
            </div>

            {/* Grid */}
            {loadProd ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(240px,1fr))', gap: '20px' }}>
                {Array.from({ length: PAGE_SIZE }).map((_, i) => (
                  <div key={i} style={{ background: CARD, height: '280px', borderRadius: '12px', animation: 'pulse 1.5s ease-in-out infinite' }} />
                ))}
              </div>
            ) : allProd.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '64px 0', color: '#444' }}>
                <Package size={28} style={{ marginBottom: '10px', opacity: 0.3 }} />
                <p style={{ fontSize: '13px' }}>Nenhum produto encontrado.</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(240px,1fr))', gap: '20px' }}>
                {prodPage.map((item, i) => (
                  <Fragment key={item.id}>
                    {prodPageCategories[i] !== undefined && (
                      <CatHeader label={prodPageCategories[i]} count={prodCatCounts[prodPageCategories[i]] ?? 0} />
                    )}
                    <ProductCard item={item} onClick={() => setProdModal(item)} />
                  </Fragment>
                ))}
              </div>
            )}

            <Pagination page={acessPage} total={allProd.length} onChange={p => { setAcessPage(p); window.scrollTo({ top: 0, behavior: 'smooth' }) }} />
          </>
        )}
      </div>

      <div style={{ borderTop: `1px solid ${BORDER}`, padding: '20px 32px', textAlign: 'center', marginTop: '32px' }}>
        <p style={{ fontSize: '10px', color: '#333', fontFamily: 'JetBrains Mono,monospace' }}>© Promax Tuner — Todos os direitos reservados</p>
      </div>

      {ecuModal  && <EcuModal     item={ecuModal}  onClose={() => setEcuModal(null)}  />}
      {prodModal && <ProductModal item={prodModal} onClose={() => setProdModal(null)} />}

      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.4} }
        input::placeholder { color:#444 }
        select option { background:#1a1a1d; color:#fff }
        .pm-pill-row::-webkit-scrollbar { display: none }
      `}</style>
    </div>
  )
}
