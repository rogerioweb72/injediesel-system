# Loja Virtual Redesign

**Date:** 2026-05-18
**Status:** Approved
**Scope:** `LojaVirtualPage.tsx` + schema migration + admin toggle

---

## Problem

`LojaVirtualPage.tsx` is visually cramped and amateur:

- Grid uses `gap: '1px', background: BORDER` — produces a spreadsheet-like prison grid
- Card thumbnails only 120px tall, no image padding, no border-radius
- Category filter uses native `<select>` — not on-brand
- No visual hierarchy between product types
- No way to surface featured/hero products

---

## Goals

1. Premium card redesign: grafite `#161819`, border-radius 12px, breathing image container
2. DESTAQUES section at top: featured products in larger cards with radial gradient bg
3. Pill filters for categories (ECU and accessories)
4. COMPRAR button with animated red bar at base (60% → 100% on hover)
5. Proper grid spacing (20px gap, 240px min card width)
6. `featured` boolean in DB for curated highlights

---

## Architecture

### Files changed

| File | Change |
|---|---|
| `supabase/migrations/028_featured_flag.sql` | New migration |
| `src/hooks/useLojaData.ts` | Add `featured` to types; add 2 hooks |
| `src/pages/LojaVirtualPage.tsx` | Full redesign |
| `src/pages/app/produtos/ProductForm.tsx` | Add featured Switch |
| `src/index.css` | Add `.pm-buy-btn` utility class |

---

## Migration: 028_featured_flag.sql

```sql
-- Add featured flag to both tables
ALTER TABLE public.ecu_catalog
  ADD COLUMN featured boolean NOT NULL DEFAULT false;

ALTER TABLE public.products
  ADD COLUMN featured boolean NOT NULL DEFAULT false;

-- Recreate public view to expose featured
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

No RLS change needed: `ecu_catalog_public` is a public view (anon access already granted). `products.featured` is read by the store query which already selects all active products with `cliente_final` price.

---

## Hook changes: useLojaData.ts

### Type updates

```ts
export interface LojaEcuItem {
  // ... existing fields ...
  featured: boolean
}

export interface LojaProductItem {
  // ... existing fields ...
  featured: boolean
}
```

### New hooks

```ts
export function useLojaFeaturedEcu(): UseQueryResult<LojaEcuItem[]>
// Queries ecu_catalog_public WHERE featured = true
// queryKey: ['loja-ecu-featured']
// staleTime: 60_000

export function useLojaFeaturedProducts(): UseQueryResult<LojaProductItem[]>
// Queries products WHERE featured = true AND active = true
// Joins product_prices WHERE tier = 'cliente_final'
// Maps same shape as useLojaProducts
// queryKey: ['loja-products-featured']
// staleTime: 60_000
```

Update `useLojaProducts` queryFn to include `featured` in the mapped output.

---

## LojaVirtualPage.tsx — Redesign

### Constants

```ts
const RED    = '#E72B2B'
const BG     = '#141416'
const CARD   = '#161819'      // was #1a1a1d
const BORDER = 'rgba(255,255,255,0.07)'  // was #242528
```

### DESTAQUES section

- Rendered between hero and filter bar when `featuredItems.length > 0`
- Section bg: `#0d0d0f` with `radial-gradient(ellipse at 50% 100%, rgba(231,43,43,0.07) 0%, transparent 55%)`
- Label: JetBrains Mono 9px `DESTAQUES` chip + Barlow Condensed 800 heading
- Grid: `repeat(auto-fill, minmax(280px, 1fr))`, gap `24px`, max 4 columns
- Each tab (remap / acessórios) has its own featured query; section only renders when `featured.length > 0`

### FeaturedCard component

Distinct from the standard `EcuCard`/`ProductCard`:

- Image: `height: 200px`, `objectFit: cover`, full-bleed (no padding)
- Bottom image overlay: `linear-gradient(to top, rgba(22,24,25,0.9) 0%, transparent 50%)`
- Badge `DESTAQUE` top-right: mono 8px, `background: rgba(0,0,0,0.75)`, red text
- For ECU with gain data: gain bar below image (`original → tuned CV`) in red
- Price: Barlow 800 22px white
- Button: `.pm-buy-btn` full width
- Card bg: `#161819`, border-radius `12px`, border `rgba(255,255,255,0.07)`
- Hover: `border-color: rgba(231,43,43,0.35)`, `translateY(-2px)`, transition 180ms ease-out

### Standard EcuCard / ProductCard

| Property | Value |
|---|---|
| Background | `#161819` |
| Border-radius | `12px` |
| Border | `1px solid rgba(255,255,255,0.07)` |
| Hover border | `rgba(231,43,43,0.35)` |
| Hover transform | `translateY(-2px)` |
| Transition | `180ms cubic-bezier(0.16,1,0.3,1)` |
| Image container height | `160px` |
| Image container padding | `12px` |
| Image bg | `#0f0f11` |
| objectFit | `contain` |
| Title font | Barlow Condensed 800, 14px, uppercase |
| Price font | Barlow Condensed 800, 17px, white |
| SKU/ref | `rgba(255,255,255,0.35)`, JetBrains Mono 9px |
| Button | `.pm-buy-btn` |

### Grid

```
gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))'
gap: '20px'
background: transparent  // remove the 1px border-grid trick
```

Remove `background: BORDER` from grid wrapper — was the source of the prison-grid appearance.

### CatHeader

Remove `border-left: 3px solid RED` side-stripe (violates shared design law). Replace with:

```tsx
<div style={{ gridColumn: '1/-1', display: 'flex', alignItems: 'center', gap: '12px', padding: '28px 0 10px' }}>
  <span style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: RED, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
    //
  </span>
  <p style={{ fontFamily: 'Barlow Condensed', fontWeight: 800, fontSize: '20px', color: '#fff', textTransform: 'uppercase' }}>
    {label}
  </p>
  <span style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', color: '#444' }}>
    {count}
  </span>
  <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.06)' }} />
</div>
```

### Pill filters

Replace `<select>` for ECU categories and product categories with horizontal pill row:

```tsx
<div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '2px' }}>
  {categories.map(cat => (
    <button
      key={cat.slug}
      onClick={() => setRemapCat(cat.slug)}
      style={{
        padding: '6px 14px',
        borderRadius: '999px',
        border: `1px solid ${active === cat.slug ? 'rgba(231,43,43,0.4)' : 'rgba(255,255,255,0.08)'}`,
        background: active === cat.slug ? 'rgba(231,43,43,0.12)' : 'rgba(255,255,255,0.04)',
        color: active === cat.slug ? '#fff' : '#666',
        fontFamily: 'DM Sans',
        fontSize: '12px',
        cursor: 'pointer',
        whiteSpace: 'nowrap',
        transition: 'all 120ms ease-out',
      }}
    >
      {cat.label}
    </button>
  ))}
</div>
```

Brand filter (ECU): stays as `<select>` — too many dynamic options for pills.

### Search bar

Minor update only: add `borderRadius: '8px'` to input wrapper. Existing functionality unchanged.

### Filter bar layout

Replace the single-row flexbox filter bar with a two-row layout:

1. Row 1: search input + brand select (for ECU) or search alone (for accessories)
2. Row 2: category pills + item count

This gives pills more horizontal space and avoids wrapping.

---

## ProductForm.tsx — featured toggle

Add after the `active` Switch:

```tsx
<div className="flex items-center gap-3">
  <Switch
    checked={form.watch('featured')}
    onCheckedChange={v => form.setValue('featured', v)}
    id="featured"
  />
  <label htmlFor="featured" className="text-sm text-muted-foreground">
    Destaque na loja virtual
  </label>
</div>
```

Zod schema: `featured: z.boolean().default(false)`.
Supabase insert/update: include `featured` field.

---

## index.css — pm-buy-btn

```css
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
  display: flex;
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
  border-color: rgba(231,43,43,0.3);
  color: #fff;
}

.pm-buy-btn:hover::after {
  width: 100%;
}
```

---

## Out of scope

- ECU catalog admin UI for toggling `featured` on individual ECU records — set via Supabase Studio or SQL for now; can be added to a future catalog management page
- Modal redesign — current modals are acceptable; redesign deferred
- Pagination component — functional, not visually broken; deferred
- Dark/light theme toggle — stays dark; forced by product personality

---

## Definition of done

- [ ] Migration 028 runs cleanly on local Supabase
- [ ] `ecu_catalog_public` view includes `featured` column
- [ ] `useLojaFeaturedEcu` and `useLojaFeaturedProducts` return data when items are marked featured
- [ ] DESTAQUES section renders when featured items exist; hidden when none
- [ ] Standard cards have border-radius 12px, 20px grid gap, no 1px border-grid trick
- [ ] Category pills render horizontally for both tabs
- [ ] COMPRAR button shows red bar at base (60% rest, 100% hover)
- [ ] ProductForm has featured toggle that persists to DB
- [ ] `prefers-reduced-motion`: hover transforms and bar animation disabled
- [ ] No side-stripe borders anywhere in the redesigned components
