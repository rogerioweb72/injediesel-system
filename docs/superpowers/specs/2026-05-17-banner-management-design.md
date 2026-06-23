# Banner Management System — Design Spec
Date: 2026-05-17

## Overview

Two-part feature: an admin CRUD page in the matriz sidebar for managing promotional banners, and a carousel strip displayed below the TopBar exclusively on franqueado routes (`/franqueado/*`).

## Data Model

### Table: `promo_banners`

Migration file: `supabase/migrations/015_promo_banners.sql`

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | uuid | PK, DEFAULT gen_random_uuid() |
| `titulo` | text | NOT NULL, max 80 chars (CHECK) |
| `corpo` | text | nullable, max 200 chars (CHECK) |
| `icone` | text | nullable — emoji string |
| `cta_url` | text | nullable |
| `cta_label` | text | DEFAULT 'Ver mais' |
| `ativo` | boolean | NOT NULL DEFAULT true |
| `ordem` | smallint | NOT NULL DEFAULT 0 |
| `expira_em` | timestamptz | nullable |
| `created_at` | timestamptz | DEFAULT now() |

Index: `(ativo, ordem)` for efficient active-banner queries.

### RLS Policies

- `SELECT`: all authenticated users — WHERE `ativo = true AND (expira_em IS NULL OR expira_em > now())`
- `INSERT / UPDATE / DELETE`: roles `company_admin`, `operations_admin` only

## Architecture

### Approach: FranqueadoLayout (dedicated nested layout)

The franqueado routes are wrapped in a new `FranqueadoLayout` component inside the router. This layout renders `<BannerCarousel />` above `<Outlet />`. No changes to `AppShell`, `Sidebar`, or `TopBar`.

```
ProtectedLayout (AuthGuard + AppShell)
└── FranqueadoLayout  ← new, adds BannerCarousel
    ├── /franqueado/dashboard
    ├── /franqueado/arquivos/novo
    └── /franqueado/tabela-remap
```

## Components

### `BannerCarousel` — `src/components/banners/BannerCarousel.tsx`

Display-only. Fetches active banners via `useBanners()`. Renders a compact strip.

**Behavior:**
- Height: ~44px when visible, `null` (no render) when 0 active banners
- Auto-advances every 5s; pauses on mouse hover
- Prev/next arrows rendered only when banner count > 1
- Dot indicators (one per banner)
- If `cta_url` is set: entire strip is an `<a>` tag with `target="_blank" rel="noopener noreferrer"`; shows `›` arrow at right edge
- If `expira_em` is in the past, banner is excluded server-side (RLS) — client sees only valid ones
- Styled: dark background `hsl(var(--pm-gray-900))`, thin bottom border, text in `DM Sans`, icon left if present

### `BannerForm` — `src/components/banners/BannerForm.tsx`

Used in a Dialog (shadcn/ui) for both create and edit.

Fields: título (required), corpo (optional), icone (emoji picker — free text input), cta_url, cta_label (default "Ver mais"), ativo toggle, ordem (number input), expira_em (datetime-local input).

Validation via Zod. Save button disabled while invalid.

### `BannersPage` — `src/pages/app/banners/BannersPage.tsx`

Route: `/matriz/banners`

Layout:
- Page header: "Banners" + subtitle showing active count
- "Novo banner" button → opens BannerForm dialog
- Table columns: Ordem | Ícone | Título | Status (ativo badge) | Expira em | Ações (editar / excluir)
- Toggle ativo inline in the table row (no full edit required)
- Delete: requires ConfirmDialog before execution
- Empty state when no banners exist

### `FranqueadoLayout` — `src/components/layout/FranqueadoLayout.tsx`

```tsx
export function FranqueadoLayout() {
  return (
    <>
      <BannerCarousel />
      <Outlet />
    </>
  )
}
```

## Hook: `useBanners`

File: `src/hooks/useBanners.ts`

**Queries:**
- `useBannersActive()` — SELECT active, non-expired, ordered by `ordem ASC`. Used by `BannerCarousel`.
- `useBannersAdmin()` — SELECT all (no filter), for admin table.

**Mutations:**
- `useCreateBanner()` — INSERT
- `useUpdateBanner()` — UPDATE by id
- `useToggleBanner()` — UPDATE ativo only (for inline toggle)
- `useDeleteBanner()` — DELETE by id

All mutations call `queryClient.invalidateQueries(['promo_banners'])`.

## Routing Changes — `src/router/index.tsx`

Add lazy import for `BannersPage` and `FranqueadoLayout`. Wrap franqueado children in new nested route:

```tsx
{
  element: <FranqueadoLayout />,
  children: [
    { path: '/franqueado/dashboard',     element: <S><FranqueadoDashboard /></S> },
    { path: '/franqueado/arquivos/novo', element: <S><EcuJobForm /></S> },
    { path: '/franqueado/tabela-remap',  element: <S><FranqueadoCatalogPage /></S> },
  ]
}
// Add to matriz routes:
{ path: '/matriz/banners', element: <S><BannersPage /></S> }
```

## Sidebar Change — `src/components/layout/Sidebar.tsx`

Add `Megaphone` icon import from lucide-react. Add `NavItem` under "Loja" group:

```tsx
<NavItem to="/matriz/banners" icon={Megaphone} label="Banners" collapsed={collapsed} />
```

Visible to roles: `company_admin`, `operations_admin` (same as other loja items — no extra guard needed as RLS enforces write restrictions).

## Files to Create

| File | Purpose |
|------|---------|
| `supabase/migrations/015_promo_banners.sql` | Table + RLS |
| `src/hooks/useBanners.ts` | TanStack Query hook |
| `src/components/banners/BannerCarousel.tsx` | Display carousel strip |
| `src/components/banners/BannerForm.tsx` | Create/edit dialog form |
| `src/pages/app/banners/BannersPage.tsx` | Admin CRUD page |
| `src/components/layout/FranqueadoLayout.tsx` | Nested layout for franqueado routes |

## Files to Modify

| File | Change |
|------|--------|
| `src/router/index.tsx` | Add FranqueadoLayout nesting + /matriz/banners route |
| `src/components/layout/Sidebar.tsx` | Add Megaphone import + Banners NavItem |

## Error & Edge Cases

- 0 active banners: `BannerCarousel` returns `null` — no layout shift
- 1 banner: no arrows/dots rendered, no auto-advance
- Banner with no link: strip is non-interactive (no cursor-pointer, no arrow)
- Banner with expired `expira_em`: excluded via RLS, client never sees it
- Network error fetching banners: carousel silently hidden (no error shown to franqueado)
