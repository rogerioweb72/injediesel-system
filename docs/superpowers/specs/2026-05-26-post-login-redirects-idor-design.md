# Post-Login Redirects + Anti-IDOR — Design

**Date:** 2026-05-26  
**Scope:** LoginParceiro.tsx, router/index.tsx (FranqueadoLayout)

---

## Context

This app uses React Router v6 with slug-based URLs:
- Matrix routes: `/:agentSlug/*` — protected by `ProtectedLayout` (SYSTEM_ROLES + MATRIX_ROLES)
- Franchise routes: `/:unitSlug/:agentSlug/*` — protected by `FranqueadoLayout` (FRANCHISE_ROLES)

The spec (section 9) was written using `/appmax/dashboard` and `/unidades/[id]` notation, but the actual routing architecture uses name-based slugs. The intent maps as:
- Matrix → `/${agentSlug}/dashboard` (already works)
- Franchise → `/${unitSlug}/${agentSlug}/dashboard` (already works)

---

## Gaps to Fix

### Gap 1 — Matrix user at `/login` (LoginParceiro.tsx)

**Current:** Matrix user logs into `/login`, gets silently redirected to `/${agentSlug}/dashboard`.  
**Fix:** Reject with a "wrong page" card (sign out + show error UI), mirroring what `Login.tsx` already does for franchise users at `/appmax`.

Implementation:
- Add `matrixRejected` state (boolean)
- In `onSubmit` and `useEffect`: if `!FRANCHISE_ROLES.includes(role)` → `supabase.auth.signOut()`, set `matrixRejected = true`
- Show rejection card with link to `/appmax`

### Gap 2 — Franchise user without unit (LoginParceiro.tsx)

**Current:** If `user_unit_roles` returns no unit, `unitName` is `null`, code falls back to `toSlug(profile.id)` as unitSlug — user gets routed to a broken URL.  
**Fix:** Show a friendly `serverError` message: "Sua conta ainda não está vinculada a uma unidade. Entre em contato com a matriz." Sign out the user.

Implementation:
- In `onSubmit`: if `FRANCHISE_ROLES.includes(role)` and `unitName === null` → signOut + set error message
- In `useEffect`: if `FRANCHISE_ROLES.includes(profile.role)` and `!unitLoading` and `!myUnit` → signOut + navigate to `/login`

### Gap 3 — Anti-IDOR in franchise routes (router/index.tsx)

**Current:** `FranqueadoLayout` checks role only. A franchise user from unit A can manually navigate to unit B's URL and see its data.  
**Fix:** New `UnitGuard` component inside `FranqueadoLayout`, placed after `AuthGuard` + `RoleGuard`.

---

## UnitGuard Design

```
FranqueadoLayout:
  AuthGuard (loginPath="/login") — ensures session
    RoleGuard (FRANCHISE_ROLES) — ensures franchise role
      UnitGuard ← NEW
        RoutePrefixProvider + FranqueadoShell
          Outlet
```

**UnitGuard behavior:**
1. Reads `session` + `profile` from `useAuthStore`
2. Fires `useEffect` on mount / unitSlug change
3. Raw fetch (bypasses supabase-js per project pattern):
   ```
   GET /rest/v1/user_unit_roles?user_id=eq.{userId}&select=franchise_units(name)&limit=1
   Authorization: Bearer {accessToken}
   ```
4. Computes `expectedSlug = toSlug(rows[0].franchise_units.name)`
5. Compares to `unitSlug` URL param
6. **Match** → `setVerified(true)` → renders children
7. **Mismatch or error** → `<Navigate to="/login" replace />`
8. **Loading** → shows same skeleton spinner as AuthGuard

**Error handling:**
- Network error → redirect to `/login` (fail safe)
- `user_unit_roles` returns empty → redirect to `/login`
- `franchise_units.name` missing → redirect to `/login`

**No bypass for matrix users** — matrix users already cannot reach franchise routes (RoleGuard blocks them). No exception needed.

---

## Files Changed

| File | Change |
|------|--------|
| `src/pages/LoginParceiro.tsx` | Add `matrixRejected` state + no-unit error handling |
| `src/router/index.tsx` | Add `UnitGuard` component, wire into `FranqueadoLayout` |

No schema changes. No new routes. No changes to auth store.

---

## Out of Scope

- `system_ti` accessing franchise unit routes (not needed, no current pattern)
- Supabase redirect URL configuration (infra task, done separately)
- Password reset flow
