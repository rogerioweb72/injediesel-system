# Loja Virtual Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign `LojaVirtualPage.tsx` with premium cards, a featured-products (DESTAQUES) section, pill category filters, and an animated buy button, backed by a `featured` boolean in the database.

**Architecture:** A new migration adds `featured boolean DEFAULT false` to `ecu_catalog` and `products`, and updates the `ecu_catalog_public` view. Hook types are updated and two new featured-query hooks are added. The page component is fully rewritten: new sub-components (`FeaturedEcuCard`, `FeaturedProductCard`), updated `EcuCard`/`ProductCard`/`CatHeader`, pill filter rows, and a conditional DESTAQUES section. `ProductForm.tsx` gets a featured checkbox that writes to the DB.

**Tech Stack:** React 19, Vite, TypeScript ~6, Tailwind + shadcn/ui (components in `/src/components/ui/`), TanStack Query v5, React Hook Form + Zod v4, Supabase JS SDK v2, local Supabase (Docker).

---

## File Map

| File | Action |
|---|---|
| `supabase/migrations/028_featured_flag.sql` | Create |
| `src/hooks/useLojaData.ts` | Modify — add `featured` to interfaces, add 2 hooks, update `useLojaProducts` mapper |
| `src/hooks/useProducts.ts` | Modify — add `featured` to `Product` interface, `UpsertProductPayload`, and `mutationFn` |
| `src/index.css` | Modify — add `.pm-buy-btn` utility class with `::after` bar |
| `src/pages/LojaVirtualPage.tsx` | Rewrite — full redesign |
| `src/pages/app/produtos/ProductForm.tsx` | Modify — add `featured` to Zod schema, form fields, and submit payload |

---

### Task 1: Migration — add `featured` column to both tables

**Files:**
- Create: `supabase/migrations/028_featured_flag.sql`

- [ ] **Step 1: Create the migration file**

```sql
-- supabase/migrations/028_featured_flag.sql

-- Add featured flag to ecu_catalog and products
ALTER TABLE public.ecu_catalog
  ADD COLUMN featured boolean NOT NULL DEFAULT false;

ALTER TABLE public.products
  ADD COLUMN featured boolean NOT NULL DEFAULT false;

-- Recreate ecu_catalog_public to expose featured
CREATE OR REPLACE VIEW public.ecu_catalog_public
WITH (security_invoker = false) AS
SELECT
  id, categoria, categoria_slug, marca, secao_original,
  modelo_descricao, ano, ganho, cv_original, cv_tuned,
  kgfm_original, kgfm_tuned, preco_cliente_final, foto_url,
  featured
FROM public.ecu_catalog
WHERE ativo = true AND ativo_ecommerce = true;

GRANT SELECT ON public.ecu_catalog_public TO anon, authenticated;
```

- [ ] **Step 2: Apply migration to local Supabase**

Run from `promax-tuner/`:
```bash
supabase db reset
```

Expected: migration runs without errors. Verify with:
```bash
supabase db diff --local
```
Expected: no pending diff (schema matches migrations).

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/028_featured_flag.sql
git commit -m "feat(db): add featured flag to ecu_catalog and products, update public view"
```

---

### Task 2: Update `useLojaData.ts` — types + featured hooks

**Files:**
- Modify: `src/hooks/useLojaData.ts`

- [ ] **Step 1: Replace the entire file**

```typescript
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export interface LojaEcuItem {
  id: string
  categoria: string
  categoria_slug: string
  marca: string
  secao_original: string | null
  modelo_descricao: string | null
  ano: string | null
  ganho: string | null
  cv_original: number | null
  cv_tuned: number | null
  kgfm_original: number | null
  kgfm_tuned: number | null
  preco_cliente_final: number | null
  foto_url: string | null
  featured: boolean
}

export interface LojaProductItem {
  id: string
  sku: string
  name: string
  category: string
  description: string | null
  image_url: string | null
  stock: number
  preco_cliente_final: number | null
  featured: boolean
}

export function useLojaEcuCatalog(categoriaSlug?: string, marca?: string, q?: string) {
  return useQuery({
    queryKey: ['loja-ecu', categoriaSlug, marca, q],
    queryFn: async (): Promise<LojaEcuItem[]> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let query = (supabase as any)
        .from('ecu_catalog_public')
        .select('*')
        .order('categoria_slug', { ascending: true })
        .order('marca', { ascending: true })
        .order('secao_original', { ascending: true })

      if (categoriaSlug && categoriaSlug !== 'all') {
        query = query.eq('categoria_slug', categoriaSlug)
      }
      if (marca) {
        query = query.eq('marca', marca)
      }
      if (q?.trim()) {
        query = query.or(
          `marca.ilike.%${q}%,modelo_descricao.ilike.%${q}%,secao_original.ilike.%${q}%,ganho.ilike.%${q}%`
        )
      }

      const { data, error } = await query
      if (error) throw error
      return (data ?? []) as LojaEcuItem[]
    },
    staleTime: 60_000,
  })
}

export function useLojaFeaturedEcu() {
  return useQuery({
    queryKey: ['loja-ecu-featured'],
    queryFn: async (): Promise<LojaEcuItem[]> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('ecu_catalog_public')
        .select('*')
        .eq('featured', true)
        .order('marca', { ascending: true })
      if (error) throw error
      return (data ?? []) as LojaEcuItem[]
    },
    staleTime: 60_000,
  })
}

export function useLojaEcuBrands(categoriaSlug?: string) {
  return useQuery({
    queryKey: ['loja-ecu-brands', categoriaSlug],
    queryFn: async (): Promise<string[]> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let query = (supabase as any)
        .from('ecu_catalog_public')
        .select('marca')
        .order('marca', { ascending: true })

      if (categoriaSlug && categoriaSlug !== 'all') {
        query = query.eq('categoria_slug', categoriaSlug)
      }

      const { data, error } = await query
      if (error) throw error
      const unique = [...new Set((data ?? []).map((r: { marca: string }) => r.marca))] as string[]
      return unique
    },
    staleTime: 300_000,
  })
}

export function useLojaProducts(category?: string, q?: string) {
  return useQuery({
    queryKey: ['loja-products', category, q],
    queryFn: async (): Promise<LojaProductItem[]> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let query = (supabase as any)
        .from('products')
        .select('id, sku, name, category, description, image_url, stock, featured, product_prices!inner(tier, price)')
        .eq('active', true)
        .eq('product_prices.tier', 'cliente_final')

      if (category) query = query.eq('category', category)
      if (q?.trim()) query = query.ilike('name', `%${q}%`)

      const { data, error } = await query
      if (error) throw error

      return (data ?? []).map((p: {
        id: string; sku: string; name: string; category: string
        description: string | null; image_url: string | null; stock: number; featured: boolean
        product_prices: { tier: string; price: number }[]
      }) => ({
        id: p.id,
        sku: p.sku,
        name: p.name,
        category: p.category,
        description: p.description,
        image_url: p.image_url,
        stock: p.stock,
        featured: p.featured,
        preco_cliente_final: p.product_prices?.[0]?.price ?? null,
      })) as LojaProductItem[]
    },
    staleTime: 60_000,
  })
}

export function useLojaFeaturedProducts() {
  return useQuery({
    queryKey: ['loja-products-featured'],
    queryFn: async (): Promise<LojaProductItem[]> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('products')
        .select('id, sku, name, category, description, image_url, stock, featured, product_prices!inner(tier, price)')
        .eq('active', true)
        .eq('featured', true)
        .eq('product_prices.tier', 'cliente_final')
      if (error) throw error

      return (data ?? []).map((p: {
        id: string; sku: string; name: string; category: string
        description: string | null; image_url: string | null; stock: number; featured: boolean
        product_prices: { tier: string; price: number }[]
      }) => ({
        id: p.id,
        sku: p.sku,
        name: p.name,
        category: p.category,
        description: p.description,
        image_url: p.image_url,
        stock: p.stock,
        featured: p.featured,
        preco_cliente_final: p.product_prices?.[0]?.price ?? null,
      })) as LojaProductItem[]
    },
    staleTime: 60_000,
  })
}

export function useLojaProductCategories() {
  return useQuery({
    queryKey: ['loja-product-categories'],
    queryFn: async (): Promise<string[]> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('products')
        .select('category')
        .eq('active', true)
      if (error) throw error
      return [...new Set((data ?? []).map((r: { category: string }) => r.category))] as string[]
    },
    staleTime: 300_000,
  })
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npm run build 2>&1 | head -30
```

Expected: no type errors in `useLojaData.ts`.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useLojaData.ts
git commit -m "feat(hooks): add featured field to loja types and add featured query hooks"
```

---

### Task 3: Update `useProducts.ts` — add `featured` to Product, payload, and mutationFn

**Files:**
- Modify: `src/hooks/useProducts.ts`

- [ ] **Step 1: Add `featured` to `Product` interface**

In `src/hooks/useProducts.ts`, change the `Product` interface (around line 13):

```typescript
export interface Product {
  id: string
  sku: string
  name: string
  category: string
  description: string | null
  image_url: string | null
  active: boolean
  featured: boolean
  stock: number
  created_at: string
  product_prices?: ProductPrice[]
}
```

- [ ] **Step 2: Add `featured` to `UpsertProductPayload`**

Change `UpsertProductPayload` (around line 89):

```typescript
interface UpsertProductPayload {
  id?: string
  sku: string
  name: string
  category: string
  description: string | null
  image_url: string | null
  active: boolean
  featured: boolean
  stock: number
  prices: { tier: PriceTier; price: number }[]
}
```

- [ ] **Step 3: Add `featured` to insert and update in `mutationFn`**

Inside `useUpsertProduct`'s `mutationFn`, change the insert block (around line 112):

```typescript
const { data, error } = await sb.from('products').insert({
  sku: product.sku,
  name: product.name,
  category: product.category,
  description: product.description,
  image_url: product.image_url,
  active: product.active,
  featured: product.featured,
  stock: product.stock,
}).select('id').single()
```

Change the update block (around line 124):

```typescript
const { error } = await sb.from('products').update({
  sku: product.sku,
  name: product.name,
  category: product.category,
  description: product.description,
  image_url: product.image_url,
  active: product.active,
  featured: product.featured,
  stock: product.stock,
}).eq('id', product.id)
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
npm run build 2>&1 | head -30
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useProducts.ts
git commit -m "feat(hooks): add featured field to Product interface and upsert payload"
```

---

### Task 4: Add `.pm-buy-btn` to `index.css`

**Files:**
- Modify: `src/index.css`

- [ ] **Step 1: Add the utility class after the existing `.pm-skeleton` block**

Find the end of the `.pm-skeleton` definition in `src/index.css` and add after it:

```css
/* ── Buy button — transparent with animated red base bar ── */
.pm-buy-btn {
  position: relative;
  overflow: hidden;
  background: transparent;
  border: 1px solid rgba(255,255,255,0.08);
  color: #fff;
  font-family: var(--pm-font-display);
  font-weight: 800;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  cursor: pointer;
  padding: 9px 14px;
  border-radius: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  transition:
    border-color var(--pm-duration-base) var(--pm-ease-out),
    color var(--pm-duration-base) var(--pm-ease-out);
}

.pm-buy-btn::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 60%;
  height: 2px;
  background: hsl(var(--pm-red-500));
  transition: width var(--pm-duration-base) var(--pm-ease-out);
}

.pm-buy-btn:hover {
  border-color: rgba(231, 43, 43, 0.3);
}

.pm-buy-btn:hover::after {
  width: 100%;
}

@media (prefers-reduced-motion: reduce) {
  .pm-buy-btn,
  .pm-buy-btn::after {
    transition: none;
  }
}
```

- [ ] **Step 2: Verify no CSS parse errors**

```bash
npm run dev 2>&1 | head -20
```

Expected: Vite starts without CSS errors.

- [ ] **Step 3: Commit**

```bash
git add src/index.css
git commit -m "feat(css): add pm-buy-btn utility with animated red base bar"
```

---

### Task 5: Rewrite `LojaVirtualPage.tsx`

**Files:**
- Modify: `src/pages/LojaVirtualPage.tsx`

- [ ] **Step 1: Replace the entire file with the redesigned version**

```typescript
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
            { key: 'remap'     as const, label: 'Remap & Tuning', icon: Zap     },
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
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npm run build 2>&1 | head -40
```

Expected: zero type errors. If `Info` icon import was removed, verify it's not imported.

- [ ] **Step 3: Start dev server and do a visual check**

```bash
npm run dev
```

Navigate to `http://localhost:5173/loja`. Verify:
- Cards have rounded corners (12px), ~160px image area with padding
- Grid cards have visible gap (~20px) with no "prison bars"
- Category pills appear below the search row for both tabs
- Hovering a card lifts it slightly and turns the border red
- Hovering the COMPRAR/SOLICITAR button: red bar at base expands from 60% to full width

- [ ] **Step 4: Commit**

```bash
git add src/pages/LojaVirtualPage.tsx
git commit -m "feat(loja): full redesign — premium cards, DESTAQUES section, pill filters, pm-buy-btn"
```

---

### Task 6: Update `ProductForm.tsx` — add featured toggle

**Files:**
- Modify: `src/pages/app/produtos/ProductForm.tsx`

- [ ] **Step 1: Add `featured` to the Zod schema**

In the `schema` const (around line 28), add after `active`:

```typescript
const schema = z.object({
  sku:           z.string().min(1, 'SKU é obrigatório'),
  name:          z.string().min(2, 'Nome é obrigatório'),
  category:      z.string().min(1, 'Categoria é obrigatória'),
  description:   z.string().nullable(),
  image_url:     z.string().nullable(),
  stock:         z.preprocess((v) => Number(v), z.number().int().min(0)),
  active:        z.boolean(),
  featured:      z.boolean(),
  price_cliente_final:         z.preprocess((v) => Number(v), z.number().min(0)),
  price_franqueado_linha_leve: z.preprocess((v) => Number(v), z.number().min(0)),
  price_franqueado_full:       z.preprocess((v) => Number(v), z.number().min(0)),
})
```

- [ ] **Step 2: Add `featured: false` to `defaultValues`**

In the `useForm` call:

```typescript
defaultValues: {
  sku: '', name: '', category: '', description: null, image_url: null,
  stock: 0, active: true, featured: false,
  price_cliente_final: 0, price_franqueado_linha_leve: 0, price_franqueado_full: 0,
},
```

- [ ] **Step 3: Populate `featured` from loaded product in `useEffect`**

After `setValue('active', product.active)` add:

```typescript
setValue('featured', product.featured ?? false)
```

- [ ] **Step 4: Add `featured` checkbox to the form UI**

Replace the existing active checkbox block (around line 290):

```tsx
<div className="flex flex-col gap-3">
  <div className="flex items-center gap-2">
    <input id="active" type="checkbox" {...register('active')} className="h-4 w-4 rounded border-gray-600" />
    <Label htmlFor="active">Produto ativo</Label>
  </div>
  <div className="flex items-center gap-2">
    <input id="featured" type="checkbox" {...register('featured')} className="h-4 w-4 rounded border-gray-600" />
    <Label htmlFor="featured" className="text-muted-foreground">Destaque na loja virtual</Label>
  </div>
</div>
```

- [ ] **Step 5: Pass `featured` in `onSubmit`**

In the `onSubmit` function, change the `upsert.mutateAsync` call:

```typescript
async function onSubmit(values: FormValues) {
  await upsert.mutateAsync({
    ...(isEdit && id ? { id } : {}),
    sku: values.sku, name: values.name, category: values.category,
    description: values.description ?? null,
    image_url: values.image_url || null,
    stock: values.stock,
    active: values.active,
    featured: values.featured,
    prices: [
      { tier: 'cliente_final',         price: values.price_cliente_final },
      { tier: 'franqueado_linha_leve', price: values.price_franqueado_linha_leve },
      { tier: 'franqueado_full',       price: values.price_franqueado_full },
    ],
  })
  navigate('/matriz/produtos')
}
```

- [ ] **Step 6: TypeScript check + manual test**

```bash
npm run build 2>&1 | head -20
```

Then in the dev server:
1. Open `http://localhost:5173/matriz/produtos/novo` (authenticated)
2. Verify the "Destaque na loja virtual" checkbox appears
3. Create a test product with the checkbox checked
4. Open Supabase Studio (or `supabase db diff`) to confirm `featured = true` was saved
5. Check `http://localhost:5173/loja` — DESTAQUES section should appear with that product

- [ ] **Step 7: Commit**

```bash
git add src/pages/app/produtos/ProductForm.tsx
git commit -m "feat(admin): add featured toggle to ProductForm — marks products as loja destaque"
```

---

## Self-Review Notes

**Spec coverage check:**
- [x] Migration 028 — Task 1
- [x] `featured` field in both tables + view update — Task 1
- [x] `useLojaFeaturedEcu` + `useLojaFeaturedProducts` — Task 2
- [x] `LojaProductItem.featured` + `LojaEcuItem.featured` — Task 2
- [x] `useLojaProducts` maps `featured` — Task 2
- [x] `Product.featured` in admin hook — Task 3
- [x] `UpsertProductPayload.featured` — Task 3
- [x] `.pm-buy-btn` with 60%→100% bar — Task 4
- [x] `prefers-reduced-motion` for button — Task 4
- [x] `FeaturedEcuCard` + `FeaturedProductCard` — Task 5
- [x] DESTAQUES section, conditional render — Task 5
- [x] Standard card redesign: `#161819`, 12px radius, 160px image, padding, contain — Task 5
- [x] `CatHeader` side-stripe replaced with `//` prefix — Task 5
- [x] Pill filter row for both tabs — Task 5
- [x] Grid gap 20px, no border-grid trick — Task 5
- [x] Container padding 32px — Task 5
- [x] ProductForm featured checkbox — Task 6
- [x] ProductForm submit passes featured — Task 6
