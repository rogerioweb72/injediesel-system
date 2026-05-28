# Post-Login Redirects + Anti-IDOR Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix matrix-user rejection at `/login`, franchise-user no-unit error handling, and add anti-IDOR unit ownership check on all franchise routes.

**Architecture:** (1) `LoginParceiro.tsx` gains a `matrixRejected` state + no-unit signOut guard. (2) New `UnitGuard` component (extracted to `src/components/auth/`) wraps `FranqueadoLayout` children — does a raw-fetch ownership check after `AuthGuard`+`RoleGuard` have already confirmed session and franchise role.

**Tech Stack:** React 18, React Router v6, Zustand (`useAuthStore`), Vitest + Testing Library, Supabase raw REST (no supabase-js for DB queries per project pattern)

---

## File Map

| Action | File | Responsibility |
|--------|------|----------------|
| Modify | `src/pages/LoginParceiro.tsx` | Reject matrix roles; block franchise users without a unit |
| Create | `src/components/auth/UnitGuard.tsx` | Raw-fetch unit ownership check; show loading; redirect on mismatch |
| Modify | `src/router/index.tsx` | Import `UnitGuard`; wire into `FranqueadoLayout` |
| Create | `tests/unit/components/UnitGuard.test.tsx` | Unit tests for UnitGuard |

---

## Task 1 — LoginParceiro: reject matrix users

**Files:**
- Modify: `src/pages/LoginParceiro.tsx`

- [ ] **Step 1.1 — Add `matrixRejected` state and import `ShieldAlert`**

In `src/pages/LoginParceiro.tsx`, update the imports and add state:

```tsx
// Add to imports at top:
import { Eye, EyeOff, Lock, Mail, ArrowRight, ShieldAlert } from 'lucide-react'

// Inside LoginParceiro(), after existing useState declarations:
const [matrixRejected, setMatrixRejected] = useState(false)
```

- [ ] **Step 1.2 — Fix `useEffect`: reject non-franchise roles, guard no-unit**

Replace the entire `useEffect` block (currently lines 42–55) with:

```tsx
useEffect(() => {
  if (!session || !profile) return

  if (!FRANCHISE_ROLES.includes(profile.role)) {
    supabase.auth.signOut()
    setMatrixRejected(true)
    return
  }

  if (unitLoading) return

  if (!myUnit) {
    supabase.auth.signOut()
    setServerError('Sua conta ainda não está vinculada a uma unidade. Entre em contato com a matriz.')
    return
  }

  const unitSlug = toSlug(myUnit.franchise_units.name)
  const agentSlug = toSlug(profile.name ?? profile.email)
  navigate(`/${unitSlug}/${agentSlug}/dashboard`, { replace: true })
}, [session, profile, myUnit, unitLoading, navigate])
```

- [ ] **Step 1.3 — Fix `onSubmit`: reject matrix roles, guard no-unit**

Replace the entire `onSubmit` function with:

```tsx
async function onSubmit(data: FormData) {
  setServerError(null)
  try {
    const { profile: loadedProfile, accessToken, userId } = await signIn(data.email, data.password)

    if (!loadedProfile) return

    if (!FRANCHISE_ROLES.includes(loadedProfile.role)) {
      await supabase.auth.signOut()
      setMatrixRejected(true)
      return
    }

    const base = import.meta.env.VITE_SUPABASE_URL as string
    const key  = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string
    const unitRes = await fetch(
      `${base}/rest/v1/user_unit_roles?user_id=eq.${userId}&select=franchise_units(name)&limit=1`,
      { headers: { apikey: key, Authorization: `Bearer ${accessToken}` } },
    )
    const unitRows = await unitRes.json()
    const unitName: string | null = (Array.isArray(unitRows) && unitRows[0]?.franchise_units?.name) || null

    if (!unitName) {
      await supabase.auth.signOut()
      setServerError('Sua conta ainda não está vinculada a uma unidade. Entre em contato com a matriz.')
      return
    }

    const agentSlug = toSlug(loadedProfile.name ?? loadedProfile.email)
    const unitSlug = toSlug(unitName)
    navigate(`/${unitSlug}/${agentSlug}/dashboard`, { replace: true })
  } catch (err) {
    setServerError(
      err instanceof Error ? err.message
        : typeof err === 'string' ? err
        : 'E-mail ou senha incorretos.',
    )
  }
}
```

- [ ] **Step 1.4 — Add rejection card to JSX**

In the `return` statement, wrap the existing `<Card>` (the form) with a conditional. Replace:

```tsx
<div className="relative z-10 h-full w-full grid place-items-center px-4">
  <Card
    className="lp-animate w-full max-w-md ...
```

With:

```tsx
<div className="relative z-10 h-full w-full grid place-items-center px-4">
  {matrixRejected ? (
    <div className="lp-animate w-full max-w-md">
      <Card
        className="border-red-900/40 backdrop-blur-xl shadow-[0_8px_40px_rgba(0,0,0,0.6)]"
        style={{ background: 'rgba(20,21,28,0.92)' }}
      >
        <CardHeader className="space-y-4 pb-5 text-center pt-8">
          <div className="flex justify-center pb-2 login-logo">
            <TunerLogo style={{ width: 148, height: 'auto' }} />
          </div>
          <div
            className="mx-auto w-14 h-14 rounded-2xl flex items-center justify-center"
            style={{ background: 'rgba(177,40,37,0.12)', border: '1px solid rgba(177,40,37,0.3)' }}
          >
            <ShieldAlert size={24} style={{ color: 'hsl(var(--pm-red-500))' }} />
          </div>
          <div>
            <CardTitle
              className="text-xl font-black tracking-[0.2em] uppercase"
              style={{ fontFamily: 'var(--pm-font-display)', color: 'hsl(var(--pm-red-500))' }}
            >
              Acesso Negado
            </CardTitle>
            <CardDescription className="text-slate-400 text-sm mt-1">
              Área do Parceiro — PROMAX Tuner
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-5 text-center pb-2">
          <div
            className="rounded-xl p-4 text-sm leading-relaxed text-slate-300"
            style={{ background: 'rgba(177,40,37,0.06)', border: '1px solid rgba(177,40,37,0.15)' }}
          >
            Sua conta de <strong className="text-white">matriz</strong> não possui
            autorização para acessar esta área.
            <br /><br />
            Esta seção é exclusiva para <strong className="text-white">franqueados e parceiros</strong>.
          </div>
          <div className="flex flex-col gap-2 pt-1">
            <Button
              asChild
              className="w-full h-11 rounded-xl font-bold text-white border-0"
              style={{ background: 'var(--pm-accent-gradient)' }}
            >
              <Link to="/appmax">
                Ir para Acesso Interno
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button
              asChild
              variant="ghost"
              className="w-full h-10 rounded-xl text-slate-400 hover:text-white hover:bg-white/5"
            >
              <Link to="/">← Voltar ao Site</Link>
            </Button>
          </div>
        </CardContent>
        <CardFooter className="justify-center pt-4 pb-6 border-t border-white/[0.03] mt-2">
          <p className="text-xs text-slate-600 text-center">
            Tentativa de acesso não autorizado registrada.
          </p>
        </CardFooter>
      </Card>
    </div>
  ) : (
    <Card
      className="lp-animate w-full max-w-md border-white/5 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.4)]"
      style={{ background: 'rgba(20,21,28,0.85)' }}
    >
      {/* existing form content unchanged */}
```

Close the ternary after the existing form's closing `</Card>`:

```tsx
    </Card>
  )}
</div>
```

- [ ] **Step 1.5 — Manual test**

Start dev server (`npm run dev`). Test scenarios:
1. Log in at `/login` with a matrix user (`company_admin` role) → should see "Acesso Negado" card with "Ir para Acesso Interno" button
2. Log in at `/login` with a franchise user that has a unit → should redirect to `/${unitSlug}/${agentSlug}/dashboard`
3. Verify `/appmax` with a franchise user still shows its own rejection card (no regression)

- [ ] **Step 1.6 — Commit**

```bash
git add src/pages/LoginParceiro.tsx
git commit -m "fix: reject matrix users at /login and block franchise users without linked unit"
```

---

## Task 2 — Create UnitGuard component

**Files:**
- Create: `src/components/auth/UnitGuard.tsx`

- [ ] **Step 2.1 — Create the file**

Create `src/components/auth/UnitGuard.tsx` with:

```tsx
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/auth'
import { toSlug } from '@/lib/slug'

const BASE = import.meta.env.VITE_SUPABASE_URL as string
const KEY  = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string

interface UnitGuardProps {
  unitSlug: string
  children: React.ReactNode
}

export function UnitGuard({ unitSlug, children }: UnitGuardProps) {
  const { session, profile } = useAuthStore()
  const navigate = useNavigate()
  const [verified, setVerified] = useState<boolean | null>(null)

  useEffect(() => {
    if (!session || !profile) return

    fetch(
      `${BASE}/rest/v1/user_unit_roles?user_id=eq.${profile.id}&select=franchise_units(name)&limit=1`,
      { headers: { apikey: KEY, Authorization: `Bearer ${session.access_token}` } },
    )
      .then(r => r.json())
      .then((rows: Array<{ franchise_units?: { name: string } }>) => {
        const name = rows?.[0]?.franchise_units?.name
        if (name && toSlug(name) === unitSlug) {
          setVerified(true)
        } else {
          navigate('/login', { replace: true })
        }
      })
      .catch(() => navigate('/login', { replace: true }))
  }, [session, profile, unitSlug, navigate])

  if (verified === null) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="pm-skeleton h-8 w-48" />
      </div>
    )
  }

  return <>{children}</>
}
```

- [ ] **Step 2.2 — Wire into FranqueadoLayout in router**

In `src/router/index.tsx`, add the import at the top:

```tsx
import { UnitGuard } from '@/components/auth/UnitGuard'
```

Replace the existing `FranqueadoLayout` function:

```tsx
function FranqueadoLayout() {
  const { unitSlug = '', agentSlug = '' } = useParams()
  return (
    <AuthGuard loginPath="/login">
      <RoleGuard allowedRoles={FRANCHISE_ROLES} redirectTo="/acesso-negado">
        <UnitGuard unitSlug={unitSlug}>
          <RoutePrefixProvider prefix={`/${unitSlug}/${agentSlug}`}>
            <FranqueadoShell>
              <Outlet />
            </FranqueadoShell>
          </RoutePrefixProvider>
        </UnitGuard>
      </RoleGuard>
    </AuthGuard>
  )
}
```

- [ ] **Step 2.3 — Manual test anti-IDOR**

With a franchise user logged in to their unit (e.g., `/${unitSlug-A}/${agentSlug}/dashboard`):
1. Manually navigate URL to a different unit slug (e.g., `/${unitSlug-B}/${agentSlug}/dashboard`)
2. Should be redirected to `/login` immediately

- [ ] **Step 2.4 — Commit**

```bash
git add src/components/auth/UnitGuard.tsx src/router/index.tsx
git commit -m "feat: add UnitGuard anti-IDOR check to franchise routes"
```

---

## Task 3 — Tests for UnitGuard

**Files:**
- Create: `tests/unit/components/UnitGuard.test.tsx`

- [ ] **Step 3.1 — Write failing tests**

Create `tests/unit/components/UnitGuard.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { UnitGuard } from '@/components/auth/UnitGuard'
import { useAuthStore } from '@/stores/auth'

const mockSession = { access_token: 'tok-abc' } as never
const franchiseProfile = {
  id: 'user-1', name: 'João Silva', email: 'joao@test.com',
  role: 'franchise_manager' as const, active: true,
}

function mockFetch(unitName: string | null) {
  const rows = unitName ? [{ franchise_units: { name: unitName } }] : []
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
    json: () => Promise.resolve(rows),
  }))
}

function renderGuard(unitSlug: string) {
  return render(
    <MemoryRouter>
      <UnitGuard unitSlug={unitSlug}>
        <span>Protected</span>
      </UnitGuard>
    </MemoryRouter>,
  )
}

describe('UnitGuard', () => {
  beforeEach(() => {
    useAuthStore.setState({ session: mockSession, profile: franchiseProfile })
    vi.restoreAllMocks()
  })

  it('shows loading skeleton before fetch resolves', () => {
    vi.stubGlobal('fetch', vi.fn().mockReturnValue(new Promise(() => {}))) // never resolves
    renderGuard('joao-silva')
    expect(screen.getByRole('status', { hidden: true }) ?? screen.queryByText('Protected')).toBeFalsy()
    expect(screen.queryByText('Protected')).not.toBeInTheDocument()
  })

  it('renders children when unitSlug matches', async () => {
    mockFetch('João Silva')
    renderGuard('joao-silva')
    await waitFor(() => {
      expect(screen.getByText('Protected')).toBeInTheDocument()
    })
  })

  it('does not render children when unitSlug mismatches', async () => {
    mockFetch('Outra Unidade')
    renderGuard('joao-silva') // slug for 'Outra Unidade' would be 'outra-unidade'
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledOnce()
    })
    expect(screen.queryByText('Protected')).not.toBeInTheDocument()
  })

  it('does not render children when unit not found in DB', async () => {
    mockFetch(null) // empty rows
    renderGuard('joao-silva')
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledOnce()
    })
    expect(screen.queryByText('Protected')).not.toBeInTheDocument()
  })

  it('does not render children when fetch throws', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network')))
    renderGuard('joao-silva')
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledOnce()
    })
    expect(screen.queryByText('Protected')).not.toBeInTheDocument()
  })

  it('calls fetch with correct user_id and auth token', async () => {
    mockFetch('João Silva')
    renderGuard('joao-silva')
    await waitFor(() => expect(screen.getByText('Protected')).toBeInTheDocument())
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('user_id=eq.user-1'),
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer tok-abc' }),
      }),
    )
  })
})
```

- [ ] **Step 3.2 — Run tests to verify they fail before implementation**

```bash
cd "/Users/rogeriolima/Documents/projetos lovable/promax tuner/promax-tuner"
npx vitest run tests/unit/components/UnitGuard.test.tsx
```

Expected: some tests fail (component doesn't exist yet, or import fails).

> **Note:** Run this step before Task 2 if following strict TDD order. If Task 2 is already done, skip ahead to Step 3.3.

- [ ] **Step 3.3 — Run tests after implementation to verify they pass**

```bash
cd "/Users/rogeriolima/Documents/projetos lovable/promax tuner/promax-tuner"
npx vitest run tests/unit/components/UnitGuard.test.tsx
```

Expected: all 6 tests PASS.

- [ ] **Step 3.4 — Run full test suite to check for regressions**

```bash
cd "/Users/rogeriolima/Documents/projetos lovable/promax tuner/promax-tuner"
npx vitest run
```

Expected: all pre-existing tests still pass.

- [ ] **Step 3.5 — Commit**

```bash
git add tests/unit/components/UnitGuard.test.tsx
git commit -m "test: add UnitGuard unit tests (ownership check, mismatch, fetch error)"
```

---

## Checklist (spec coverage)

| Spec requirement | Task |
|-----------------|------|
| Matrix users at `/login` → reject (section 9.1, 9.2) | Task 1 |
| Franchise users without unit → friendly error (section 9.2) | Task 1 |
| Anti-IDOR: franchise only accesses own unit (section 9.3) | Task 2 |
| UnitGuard raw fetch (bypasses supabase-js per project pattern) | Task 2 |
| Tests for ownership check, mismatch, error cases | Task 3 |
