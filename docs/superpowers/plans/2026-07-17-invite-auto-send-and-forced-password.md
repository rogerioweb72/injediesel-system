# Auto-Invite on Unit Creation + Mandatory First-Access Password Modal — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** (1) Creating a franchise unit via the wizard automatically sends the manager invite, without a separate manual click. (2) On first access via any invite link (matrix or franchise), the user is forced to set a password before using the app — one non-dismissible modal, on top of the dashboard, no bypass.

**Architecture:**
- Spec 1 fires `useInviteFranchisee().mutateAsync(...)` right after the unit insert succeeds inside `ConfirmSummaryDialog.tsx`'s create branch, in its own try/catch so invite failure never rolls back or masks unit creation.
- Spec 2 uses a `must_set_password: true` flag written into Supabase Auth `user_metadata` by the two invite edge functions at account-creation time. The app reads it off `session.user.user_metadata` (already in the Zustand auth store) via a new `useMustSetPassword()` hook, and forces a non-dismissible variant of the existing "Meu Perfil" modal (`ProfileDialog`, rendered once in the shared `TopBar.tsx`) until `supabase.auth.updateUser({ password, data: { must_set_password: false } })` succeeds. A hash-derived fallback (`type=invite` in the URL, same detection already used in `Login.tsx`/`LoginParceiro.tsx` today) covers accounts invited before this change ships, which never got the metadata flag. The existing inline "set password" screens on the login pages are removed for the invite case (kept for the unrelated password-recovery case) so there is one experience: log in → land on dashboard → forced modal on top.

**Tech Stack:** React 19 + TypeScript, TanStack Query, Zustand, Supabase JS v2 (`auth.admin.inviteUserByEmail`, `auth.updateUser`), sonner toasts, Deno Edge Functions.

## Global Constraints

- No DB migrations, no new columns, no new secrets, no `db push` — user_metadata only (explicit user instruction).
- Do not touch the ECU file/scan/financial flow that was just stabilized.
- Do not touch the webhook.
- Do not manually edit `src/components/ui/*` (shadcn — CLI only). The forced-modal work routes around this by not using the shared `<Dialog>` primitive for the forced render path.
- Branch from `main`, implement, `npm run build` clean, checkpoint with a diff summary + the detection-mechanism justification, wait for approval before merge/push/redeploy.
- Only `invite-user` and `invite-franchisee` edge functions need redeploying (`--project-ref`, after approval) — they're the only backend files touched.
- Final end-to-end test (new unit, clean email) is done by Rogério, not part of this plan's automated verification.

## File Structure

| File | Change |
|---|---|
| `src/stores/auth.ts` | Add transient `hashInviteFlow` flag + setter (fallback signal for pre-flag invites) |
| `src/hooks/useMustSetPassword.ts` | **New.** Derives "must force password modal" from metadata flag OR hash fallback |
| `supabase/functions/invite-user/index.ts` | Add `must_set_password: true` to the fresh-invite `data:` payload |
| `supabase/functions/invite-franchisee/index.ts` | Same |
| `src/components/shared/ProfileDialog.tsx` | Add `forced?: boolean` prop — renders a non-dismissible plain overlay (no Radix Dialog) instead of the normal closable dialog |
| `src/components/layout/TopBar.tsx` | Wire `useMustSetPassword()` into the existing `<ProfileDialog>` mount |
| `src/pages/Login.tsx` | Remove invite-blocks-navigation gating + inline invite password screen; capture hash flag into store; recovery flow untouched |
| `src/pages/LoginParceiro.tsx` | Same |
| `src/pages/app/franqueados/wizard/ConfirmSummaryDialog.tsx` | Fire `useInviteFranchisee()` after successful unit creation; own try/catch; combined/fallback toasts |

---

### Task 1: Auth store — transient hash-invite fallback flag

**Files:**
- Modify: `src/stores/auth.ts`

**Interfaces:**
- Produces: `useAuthStore.getState().setHashInviteFlow(value: boolean): void`, `useAuthStore(s => s.hashInviteFlow): boolean` — consumed by Task 2's hook and Tasks 6/7's login pages.

- [ ] **Step 1: Add the field, setter, and reset wiring**

Replace the full contents of `src/stores/auth.ts`:

```ts
import { create } from 'zustand'
import type { Session, User } from '@supabase/supabase-js'
import type { AppUser } from '@/types/app'

interface AuthState {
  session: Session | null
  user: User | null
  profile: AppUser | null
  loading: boolean
  impersonating: AppUser | null
  impersonationSessionId: string | null
  hashInviteFlow: boolean
  setSession: (session: Session | null) => void
  setProfile: (profile: AppUser | null) => void
  setLoading: (loading: boolean) => void
  setHashInviteFlow: (value: boolean) => void
  startImpersonation: (target: AppUser, sessionId: string) => void
  stopImpersonation: () => void
  reset: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  user: null,
  profile: null,
  loading: true,
  impersonating: null,
  impersonationSessionId: null,
  hashInviteFlow: false,
  setSession: (session) => set({ session, user: session?.user ?? null }),
  setProfile: (profile) => set({ profile }),
  setLoading: (loading) => set({ loading }),
  setHashInviteFlow: (value) => set({ hashInviteFlow: value }),
  startImpersonation: (target, sessionId) =>
    set({ impersonating: target, impersonationSessionId: sessionId }),
  stopImpersonation: () =>
    set({ impersonating: null, impersonationSessionId: null }),
  reset: () =>
    set({ session: null, user: null, profile: null, loading: false, impersonating: null, impersonationSessionId: null, hashInviteFlow: false }),
}))
```

- [ ] **Step 2: Typecheck**

Run: `npm run build`
Expected: no new TS errors referencing `auth.ts`.

- [ ] **Step 3: Commit**

```bash
git add src/stores/auth.ts
git commit -m "feat(auth): add transient hashInviteFlow flag to auth store"
```

---

### Task 2: `useMustSetPassword` hook

**Files:**
- Create: `src/hooks/useMustSetPassword.ts`

**Interfaces:**
- Consumes: `useAuthStore(s => s.user)`, `useAuthStore(s => s.hashInviteFlow)` (Task 1).
- Produces: `useMustSetPassword(): boolean` — consumed by Task 5 (`TopBar.tsx`).

- [ ] **Step 1: Write the hook**

```ts
import { useAuthStore } from '@/stores/auth'

export function useMustSetPassword(): boolean {
  const user = useAuthStore(s => s.user)
  const hashInviteFlow = useAuthStore(s => s.hashInviteFlow)
  const metadataFlag =
    (user?.user_metadata as { must_set_password?: boolean } | undefined)?.must_set_password === true
  return metadataFlag || hashInviteFlow
}
```

- [ ] **Step 2: Typecheck**

Run: `npm run build`
Expected: compiles clean.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useMustSetPassword.ts
git commit -m "feat(auth): add useMustSetPassword hook"
```

---

### Task 3: Edge functions — set `must_set_password` on fresh invites

**Files:**
- Modify: `supabase/functions/invite-user/index.ts:91-94`
- Modify: `supabase/functions/invite-franchisee/index.ts:31-34`

**Interfaces:**
- Produces: `auth.users.raw_user_meta_data.must_set_password === true` on any brand-new account created via `inviteUserByEmail` from either function. NOT set on the "already registered"/orphaned-account branches in either function (those are existing accounts, not first access) — do not touch those branches.

- [ ] **Step 1: `invite-user/index.ts` — add the flag**

In `supabase/functions/invite-user/index.ts`, replace:

```ts
  const { data: invited, error: inviteErr } = await adminClient.auth.admin.inviteUserByEmail(email, {
    data: { role, unit_id: unit_id ?? null },
    redirectTo: `${siteUrl}${inviteRedirectPath}`,
  })
```

with:

```ts
  const { data: invited, error: inviteErr } = await adminClient.auth.admin.inviteUserByEmail(email, {
    data: { role, unit_id: unit_id ?? null, must_set_password: true },
    redirectTo: `${siteUrl}${inviteRedirectPath}`,
  })
```

- [ ] **Step 2: `invite-franchisee/index.ts` — add the flag**

In `supabase/functions/invite-franchisee/index.ts`, replace:

```ts
  const { data: invited, error: inviteErr } = await adminClient.auth.admin.inviteUserByEmail(email, {
    data: { unit_id, role },
    redirectTo: `${siteUrl}/login`,
  })
```

with:

```ts
  const { data: invited, error: inviteErr } = await adminClient.auth.admin.inviteUserByEmail(email, {
    data: { unit_id, role, must_set_password: true },
    redirectTo: `${siteUrl}/login`,
  })
```

- [ ] **Step 3: Local sanity check (no live deploy yet)**

Run: `cd supabase/functions && deno check invite-user/index.ts invite-franchisee/index.ts` (or `npx supabase functions serve` if you want to hit it locally). No behavior change beyond the extra metadata key — no new imports, no new error paths.

- [ ] **Step 4: Commit**

```bash
git add supabase/functions/invite-user/index.ts supabase/functions/invite-franchisee/index.ts
git commit -m "feat(invite): flag fresh invited accounts with must_set_password metadata"
```

(Redeploy happens after checkpoint approval — see Task 9.)

---

### Task 4: `ProfileDialog` — non-dismissible forced mode

**Files:**
- Modify: `src/components/shared/ProfileDialog.tsx`

**Interfaces:**
- Consumes: `useAuthStore.getState().setHashInviteFlow` (Task 1).
- Produces: `ProfileDialog({ open, onOpenChange, forced?: boolean })` — when `forced` is `true`, ignores Radix `Dialog` entirely (no ESC/outside-click/X close paths exist in that render path since it's a plain `<div>`), requires the password fields, and clears both the metadata flag and the store's hash fallback flag on success. Consumed by Task 5 (`TopBar.tsx`).

- [ ] **Step 1: Replace the full file**

```tsx
import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { supabase } from '@/lib/supabase'
import { useProfile } from '@/hooks/useProfile'
import { useAuthStore } from '@/stores/auth'
import { toast } from 'sonner'
import { translateError } from '@/lib/errors'
import { useQueryClient } from '@tanstack/react-query'

interface ProfileDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  forced?: boolean
}

export function ProfileDialog({ open, onOpenChange, forced = false }: ProfileDialogProps) {
  const { profile } = useProfile()
  const queryClient = useQueryClient()
  const [name, setName] = useState(profile?.name ?? '')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [saving, setSaving] = useState(false)

  function handleOpenChange(v: boolean) {
    if (!v) {
      setPassword('')
      setConfirmPassword('')
    }
    onOpenChange(v)
  }

  async function handleSave() {
    if (forced) {
      if (!password || password.length < 6) {
        toast.error('Senha deve ter pelo menos 6 caracteres')
        return
      }
      if (password !== confirmPassword) {
        toast.error('As senhas não coincidem')
        return
      }
    } else {
      if (password && password !== confirmPassword) {
        toast.error('As senhas não coincidem')
        return
      }
      if (password && password.length < 6) {
        toast.error('Senha deve ter pelo menos 6 caracteres')
        return
      }
    }

    setSaving(true)
    try {
      if (name !== profile?.name) {
        const { error } = await supabase
          .from('profiles')
          .update({ name })
          .eq('id', profile!.id)
        if (error) throw error
        queryClient.invalidateQueries({ queryKey: ['profile'] })
      }

      if (password) {
        const { error } = await supabase.auth.updateUser(
          forced ? { password, data: { must_set_password: false } } : { password }
        )
        if (error) throw error
        if (forced) useAuthStore.getState().setHashInviteFlow(false)
      }

      toast.success(forced ? 'Senha definida com sucesso' : 'Perfil atualizado com sucesso')
      handleOpenChange(false)
    } catch (err: unknown) {
      toast.error(translateError(err))
    } finally {
      setSaving(false)
    }
  }

  if (forced) {
    if (!open) return null
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.85)' }}>
        <div className="w-full max-w-sm rounded-lg border p-6 shadow-lg space-y-4" style={{ background: '#141416', borderColor: 'rgba(255,255,255,0.08)' }}>
          <div className="space-y-1">
            <h2 className="text-lg font-semibold leading-none tracking-tight">Primeiro acesso</h2>
            <p className="text-sm text-muted-foreground">Defina sua senha para continuar.</p>
          </div>

          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Nova senha</Label>
              <Input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                autoComplete="new-password"
                autoFocus
              />
            </div>
            <div className="space-y-1">
              <Label>Confirmar nova senha</Label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="Repita a senha"
                autoComplete="new-password"
              />
            </div>
          </div>

          <Button
            onClick={handleSave}
            disabled={saving || !password || !confirmPassword}
            className="w-full"
            style={{ background: 'var(--pm-accent-gradient)' }}
          >
            {saving ? 'Salvando...' : 'Definir senha e continuar'}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Meu Perfil</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1">
            <Label>Nome completo</Label>
            <Input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Seu nome"
            />
          </div>

          <div className="border-t border-white/[0.06] pt-4 space-y-3">
            <p className="text-xs text-muted-foreground">
              Deixe em branco para manter a senha atual
            </p>
            <div className="space-y-1">
              <Label>Nova senha</Label>
              <Input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                autoComplete="new-password"
              />
            </div>
            <div className="space-y-1">
              <Label>Confirmar nova senha</Label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="Repita a senha"
                autoComplete="new-password"
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => handleOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || !name}
            style={{ background: 'var(--pm-accent-gradient)' }}
          >
            {saving ? 'Salvando...' : 'Salvar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Step 2: Typecheck**

Run: `npm run build`
Expected: compiles clean (note: `supabase.auth.updateUser`'s `data` field is part of supabase-js v2's `UserAttributes` type — no cast needed).

- [ ] **Step 3: Commit**

```bash
git add src/components/shared/ProfileDialog.tsx
git commit -m "feat(profile): add non-dismissible forced mode to ProfileDialog"
```

---

### Task 5: Wire the forced modal into `TopBar`

**Files:**
- Modify: `src/components/layout/TopBar.tsx`

**Interfaces:**
- Consumes: `useMustSetPassword()` (Task 2), `ProfileDialog`'s `forced` prop (Task 4).

- [ ] **Step 1: Import the hook**

In `src/components/layout/TopBar.tsx`, replace:

```tsx
import { ProfileDialog } from '@/components/shared/ProfileDialog'
```

with:

```tsx
import { ProfileDialog } from '@/components/shared/ProfileDialog'
import { useMustSetPassword } from '@/hooks/useMustSetPassword'
```

- [ ] **Step 2: Read the flag**

Replace:

```tsx
  const [profileOpen, setProfileOpen] = useState(false)
  const [lancamentoOpen, setLancamentoOpen] = useState(false)
```

with:

```tsx
  const [profileOpen, setProfileOpen] = useState(false)
  const [lancamentoOpen, setLancamentoOpen] = useState(false)
  const mustSetPassword = useMustSetPassword()
```

- [ ] **Step 3: Pass it to `ProfileDialog`**

Replace:

```tsx
      <ProfileDialog open={profileOpen} onOpenChange={setProfileOpen} />
```

with:

```tsx
      <ProfileDialog
        open={profileOpen || mustSetPassword}
        onOpenChange={mustSetPassword ? () => {} : setProfileOpen}
        forced={mustSetPassword}
      />
```

- [ ] **Step 4: Typecheck**

Run: `npm run build`
Expected: compiles clean. `TopBar` is rendered by both `AppShell.tsx` and `FranqueadoShell.tsx`, so this covers matrix and franchise with one change.

- [ ] **Step 5: Commit**

```bash
git add src/components/layout/TopBar.tsx
git commit -m "feat(auth): force password modal in TopBar when must_set_password is set"
```

---

### Task 6: `Login.tsx` — drop invite gating, feed the hash fallback

**Files:**
- Modify: `src/pages/Login.tsx`

**Interfaces:**
- Produces: calls `useAuthStore.getState().setHashInviteFlow(true)` on mount when the invite hash is present (consumed by Task 2's hook via the store).
- Recovery flow (`isRecoveryFlow`/`recoveryDone`) is untouched — out of scope for this spec.

- [ ] **Step 1: Push the hash flag into the store**

Replace:

```tsx
  // Capture hash before supabase-js clears it
  const isInviteFlow = useRef(window.location.hash.includes('type=invite')).current
  const [isRecoveryFlow, setIsRecoveryFlow] = useState(
    window.location.hash.includes('type=recovery')
  )
```

with:

```tsx
  // Capture hash before supabase-js clears it
  const isInviteFlow = useRef(window.location.hash.includes('type=invite')).current
  const [isRecoveryFlow, setIsRecoveryFlow] = useState(
    window.location.hash.includes('type=recovery')
  )

  useEffect(() => {
    if (isInviteFlow) useAuthStore.getState().setHashInviteFlow(true)
  }, [isInviteFlow])
```

- [ ] **Step 2: Drop the local `inviteDone` state**

Replace:

```tsx
  // Invite (set password)
  const [inviteDone, setInviteDone] = useState(false)

  // Recovery (reset password)
```

with:

```tsx
  // Recovery (reset password)
```

- [ ] **Step 3: Simplify `handleSetPassword` (recovery-only now)**

Replace:

```tsx
  async function handleSetPassword(data: { password: string; password2: string }) {
    setSetPassError(null)
    setSettingPass(true)
    try {
      const { error } = await supabase.auth.updateUser({ password: data.password })
      if (error) throw error
      if (isRecoveryFlow) setRecoveryDone(true)
      else setInviteDone(true)
    } catch (err) {
      setSetPassError(err instanceof Error ? err.message : 'Erro ao definir senha.')
    } finally {
      setSettingPass(false)
    }
  }
```

with:

```tsx
  async function handleSetPassword(data: { password: string; password2: string }) {
    setSetPassError(null)
    setSettingPass(true)
    try {
      const { error } = await supabase.auth.updateUser({ password: data.password })
      if (error) throw error
      setRecoveryDone(true)
    } catch (err) {
      setSetPassError(err instanceof Error ? err.message : 'Erro ao definir senha.')
    } finally {
      setSettingPass(false)
    }
  }
```

- [ ] **Step 4: Stop gating navigation on the invite flow**

Replace:

```tsx
  useEffect(() => {
    if (!session || !profile) return
    if (rejectingRef.current) return
    if (isInviteFlow && !inviteDone) return
    if (isRecoveryFlow && !recoveryDone) return
```

with:

```tsx
  useEffect(() => {
    if (!session || !profile) return
    if (rejectingRef.current) return
    if (isRecoveryFlow && !recoveryDone) return
```

- [ ] **Step 5: Delete the inline invite "set password" card**

Delete this entire block (currently lines 234-274):

```tsx
        {/* ── CONVITE: definir senha ── */}
        {isInviteFlow && !inviteDone && session && (
          <Card className="lm-animate w-full max-w-md border-white/5 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.4)]" style={{ background: 'rgba(20,21,28,0.85)' }}>
            <CardHeader className="items-center text-center space-y-3 pb-5 pt-7">
              <div className="login-logo mb-1"><TunerLogo style={{ width: 280, height: 'auto' }} /></div>
              <div>
                <CardTitle className="text-xl font-bold text-white tracking-tight">Bem-vindo(a)! Defina sua senha</CardTitle>
                <CardDescription className="text-slate-400 text-sm mt-1">Crie uma senha para acessar o sistema.</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={pwForm.handleSubmit(handleSetPassword)} className="grid gap-5">
                <div className="grid gap-2">
                  <Label className="text-slate-300 text-xs font-medium uppercase tracking-wider">Nova senha</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 pointer-events-none" />
                    <Input type={showPassword ? 'text' : 'password'} placeholder="••••••••" {...pwForm.register('password')}
                      className="pl-10 pr-10 h-11 border-white/5 text-white placeholder:text-slate-600 rounded-xl" style={{ background: '#0B0C10' }} />
                    <button type="button" className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-md text-slate-500 hover:text-slate-300 transition-colors" onClick={() => setShowPassword(v => !v)}>
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {pwForm.formState.errors.password && <p className="text-xs text-red-400">{pwForm.formState.errors.password.message}</p>}
                </div>
                <div className="grid gap-2">
                  <Label className="text-slate-300 text-xs font-medium uppercase tracking-wider">Confirmar senha</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 pointer-events-none" />
                    <Input type={showPassword ? 'text' : 'password'} placeholder="••••••••" {...pwForm.register('password2')}
                      className="pl-10 h-11 border-white/5 text-white placeholder:text-slate-600 rounded-xl" style={{ background: '#0B0C10' }} />
                  </div>
                  {pwForm.formState.errors.password2 && <p className="text-xs text-red-400">{pwForm.formState.errors.password2.message}</p>}
                </div>
                {setPassError && <div className="rounded-xl px-4 py-3 text-sm text-red-400" style={{ background: 'rgba(37,99,235,0.08)', border: '1px solid rgba(37,99,235,0.2)' }}>{setPassError}</div>}
                <Button type="submit" disabled={settingPass} className="w-full h-11 rounded-xl text-white font-bold border-0" style={{ background: 'var(--pm-accent-gradient)' }}>
                  {settingPass ? 'Salvando...' : 'Definir senha e entrar'}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

```

(Leave the blank line separating it from the `{/* ── ESQUECI SENHA ── */}` block that follows.)

- [ ] **Step 6: Simplify the final render guard**

Replace:

```tsx
        {!isRecoveryFlow && (!isInviteFlow || inviteDone) && !forgotMode && (rejected ? (
```

with:

```tsx
        {!isRecoveryFlow && !forgotMode && (rejected ? (
```

- [ ] **Step 7: Typecheck + lint**

Run: `npm run build && npm run lint`
Expected: clean. `isInviteFlow` remains used (Step 1's effect); no unused-variable errors expected since no icon imports become orphaned in this file (all icons used elsewhere too, e.g. `Lock` in the recovery card).

- [ ] **Step 8: Commit**

```bash
git add src/pages/Login.tsx
git commit -m "refactor(login): drop inline invite password screen, forced modal takes over"
```

---

### Task 7: `LoginParceiro.tsx` — same treatment

**Files:**
- Modify: `src/pages/LoginParceiro.tsx`

**Interfaces:**
- Same as Task 6, franchise side.

- [ ] **Step 1: Push the hash flag into the store**

Replace:

```tsx
  // Capture hash before supabase-js clears it
  const isInviteFlow = useRef(window.location.hash.includes('type=invite')).current
  const [isRecoveryFlow, setIsRecoveryFlow] = useState(
    window.location.hash.includes('type=recovery')
  )
```

with:

```tsx
  // Capture hash before supabase-js clears it
  const isInviteFlow = useRef(window.location.hash.includes('type=invite')).current
  const [isRecoveryFlow, setIsRecoveryFlow] = useState(
    window.location.hash.includes('type=recovery')
  )

  useEffect(() => {
    if (isInviteFlow) useAuthStore.getState().setHashInviteFlow(true)
  }, [isInviteFlow])
```

- [ ] **Step 2: Drop the local `inviteDone` state**

Replace:

```tsx
  const [matrixRejected, setMatrixRejected] = useState(false)
  const [inviteDone, setInviteDone]   = useState(false)
  const [recoveryDone, setRecoveryDone] = useState(false)
```

with:

```tsx
  const [matrixRejected, setMatrixRejected] = useState(false)
  const [recoveryDone, setRecoveryDone] = useState(false)
```

- [ ] **Step 3: Stop gating navigation on the invite flow**

Replace:

```tsx
  useEffect(() => {
    if (!session || !profile) return
    if (isInviteFlow   && !inviteDone)   return
    if (isRecoveryFlow && !recoveryDone) return
```

with:

```tsx
  useEffect(() => {
    if (!session || !profile) return
    if (isRecoveryFlow && !recoveryDone) return
```

- [ ] **Step 4: Simplify `handleSetPassword` (recovery-only now)**

Replace:

```tsx
  async function handleSetPassword(data: { password: string; password2: string }) {
    setSetPassError(null)
    setSettingPass(true)
    try {
      const { error } = await supabase.auth.updateUser({ password: data.password })
      if (error) throw error
      if (isRecoveryFlow) setRecoveryDone(true)
      else setInviteDone(true)
    } catch (err) {
      setSetPassError(translateError(err))
    } finally {
      setSettingPass(false)
    }
  }
```

with:

```tsx
  async function handleSetPassword(data: { password: string; password2: string }) {
    setSetPassError(null)
    setSettingPass(true)
    try {
      const { error } = await supabase.auth.updateUser({ password: data.password })
      if (error) throw error
      setRecoveryDone(true)
    } catch (err) {
      setSetPassError(translateError(err))
    } finally {
      setSettingPass(false)
    }
  }
```

- [ ] **Step 5: Delete the inline invite "set password" card**

Delete this entire block (currently lines 228-306):

```tsx
        {/* ── CONVITE: definir senha ── */}
        {isInviteFlow && !inviteDone && session && (
          <Card
            className="lp-animate w-full max-w-md border-white/5 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.4)]"
            style={{ background: 'rgba(20,21,28,0.85)' }}
          >
            <CardHeader className="items-center text-center space-y-3 pb-5 pt-7">
              <div className="login-logo mb-1">
                <TunerLogo style={{ width: 156, height: 'auto' }} />
              </div>
              <div>
                <CardTitle className="text-xl font-bold text-white tracking-tight">
                  Bem-vindo(a)! Defina sua senha
                </CardTitle>
                <CardDescription className="text-slate-400 text-sm mt-1">
                  Crie uma senha para acessar o sistema.
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={pwForm.handleSubmit(handleSetPassword)} className="grid gap-5">
                <div className="grid gap-2">
                  <Label className="text-slate-300 text-xs font-medium uppercase tracking-wider">Nova senha</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 pointer-events-none" />
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      {...pwForm.register('password')}
                      className="pl-10 pr-10 h-11 border-white/5 text-white placeholder:text-slate-600 rounded-xl"
                      style={{ background: '#0B0C10' }}
                    />
                    <button type="button" className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-md text-slate-500 hover:text-slate-300 transition-colors"
                      onClick={() => setShowPassword(v => !v)}>
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {pwForm.formState.errors.password && <p className="text-xs text-red-400">{pwForm.formState.errors.password.message}</p>}
                </div>
                <div className="grid gap-2">
                  <Label className="text-slate-300 text-xs font-medium uppercase tracking-wider">Confirmar senha</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 pointer-events-none" />
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      {...pwForm.register('password2')}
                      className="pl-10 h-11 border-white/5 text-white placeholder:text-slate-600 rounded-xl"
                      style={{ background: '#0B0C10' }}
                    />
                  </div>
                  {pwForm.formState.errors.password2 && <p className="text-xs text-red-400">{pwForm.formState.errors.password2.message}</p>}
                </div>
                {setPassError && (
                  <div className="rounded-xl px-4 py-3 text-sm text-red-400" style={{ background: 'rgba(177,40,37,0.08)', border: '1px solid rgba(177,40,37,0.2)' }}>
                    {setPassError}
                  </div>
                )}
                <Button
                  type="submit"
                  disabled={settingPass}
                  className="w-full h-11 rounded-xl text-white font-bold mt-1 border-0"
                  style={{ background: 'var(--pm-accent-gradient)' }}
                >
                  {settingPass ? (
                    <span className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Salvando...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4" /> Definir senha e entrar
                    </span>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

```

(Leave the blank line separating it from the `{/* ── LOGIN NORMAL ── */}` block that follows.)

- [ ] **Step 6: Simplify the final render guard**

Replace:

```tsx
        {/* ── LOGIN NORMAL ── */}
        {(!isInviteFlow || inviteDone || !session) && (
        matrixRejected ? (
```

with:

```tsx
        {/* ── LOGIN NORMAL ── */}
        {matrixRejected ? (
```

And replace the closing of that block:

```tsx
        </Card>
        ))}
      </div>
```

with:

```tsx
        </Card>
        )}
      </div>
```

- [ ] **Step 7: Remove the now-unused `CheckCircle2` import**

Replace:

```tsx
import { Eye, EyeOff, Lock, Mail, ArrowRight, CheckCircle2, ShieldAlert } from 'lucide-react'
```

with:

```tsx
import { Eye, EyeOff, Lock, Mail, ArrowRight, ShieldAlert } from 'lucide-react'
```

- [ ] **Step 8: Typecheck + lint**

Run: `npm run build && npm run lint`
Expected: clean, no unused-import errors.

- [ ] **Step 9: Commit**

```bash
git add src/pages/LoginParceiro.tsx
git commit -m "refactor(login-parceiro): drop inline invite password screen, forced modal takes over"
```

---

### Task 8: Auto-invite on unit creation (Spec 1)

**Files:**
- Modify: `src/pages/app/franqueados/wizard/ConfirmSummaryDialog.tsx`

**Interfaces:**
- Consumes: `useInviteFranchisee()` (existing hook, `src/hooks/useInviteFranchisee.ts` — `mutateAsync({ email, name, unit_id, role })`, unchanged).
- Edit branch (`isEdit && unit`) is untouched — this only affects the create branch.

- [ ] **Step 1: Import the invite hook**

Replace:

```tsx
import { useWizard } from './WizardContext'
import { useCreateFranchiseUnit, useUpdateFranchiseUnit, uploadLogo, type FranchiseUnit } from '@/hooks/useFranchiseUnits'
```

with:

```tsx
import { useWizard } from './WizardContext'
import { useCreateFranchiseUnit, useUpdateFranchiseUnit, uploadLogo, type FranchiseUnit } from '@/hooks/useFranchiseUnits'
import { useInviteFranchisee } from '@/hooks/useInviteFranchisee'
```

- [ ] **Step 2: Instantiate the hook**

Replace:

```tsx
  const create = useCreateFranchiseUnit()
  const update = useUpdateFranchiseUnit()
  const [submitting, setSubmitting] = useState(false)
```

with:

```tsx
  const create = useCreateFranchiseUnit()
  const update = useUpdateFranchiseUnit()
  const invite = useInviteFranchisee()
  const [submitting, setSubmitting] = useState(false)
```

- [ ] **Step 3: Fire the invite after successful creation**

Replace:

```tsx
      } else {
        const created = await create.mutateAsync(payload)
        if (logoFile) {
          const logo_url = await uploadLogo(created.id, logoFile)
          await update.mutateAsync({ id: created.id, logo_url })
        }
        toast.success('Unidade criada com sucesso')
        onSuccess()
        navigate(`${prefix}/franqueados/${created.id}`)
      }
```

with:

```tsx
      } else {
        const created = await create.mutateAsync(payload)
        if (logoFile) {
          const logo_url = await uploadLogo(created.id, logoFile)
          await update.mutateAsync({ id: created.id, logo_url })
        }

        let inviteOk = false
        try {
          await invite.mutateAsync({
            email: values.responsavel_legal_email,
            name: values.responsavel_legal_nome,
            unit_id: created.id,
            role: 'franchise_manager',
          })
          inviteOk = true
        } catch (inviteErr) {
          console.error('Falha ao enviar convite automático:', inviteErr)
        }

        if (inviteOk) {
          toast.success(`Unidade criada e convite enviado para ${values.responsavel_legal_email}`)
        } else {
          toast.warning('Unidade criada, mas o convite falhou — reenvie pelo botão no topo da página')
        }
        onSuccess()
        navigate(`${prefix}/franqueados/${created.id}`)
      }
```

Note: this invite call is deliberately in its own inner try/catch, separate from the outer one that wraps unit creation — an invite failure must never trigger the outer catch's `toast.error('Erro ao salvar unidade...')`, since the unit itself was created successfully. `values.responsavel_legal_email`/`values.responsavel_legal_nome` are guaranteed non-empty strings here (zod-validated at Step 4 of the wizard, re-validated via `form.trigger()` before this dialog opens — see `FranchiseeWizard.tsx`).

- [ ] **Step 4: Typecheck**

Run: `npm run build`
Expected: clean. `InvitePayload.email`/`.name` are typed `string`; `values.responsavel_legal_email`/`values.responsavel_legal_nome` are typed `string` (required in `wizardSchema`), so no cast needed.

- [ ] **Step 5: Commit**

```bash
git add src/pages/app/franqueados/wizard/ConfirmSummaryDialog.tsx
git commit -m "feat(franqueados): auto-send manager invite on unit creation"
```

---

### Task 9: Full verification + checkpoint

**Files:** none (verification only)

- [ ] **Step 1: Full build**

Run: `npm run build`
Expected: `tsc -b && vite build` completes with zero errors.

- [ ] **Step 2: Lint**

Run: `npm run lint`
Expected: zero errors (warnings pre-existing elsewhere are fine, don't fix unrelated files).

- [ ] **Step 3: Existing e2e specs — confirm nothing references the removed inline invite UI**

Run: `grep -rn "Defina sua senha\|Bem-vindo(a)! Defina" tests/e2e/`
Expected: no matches (already confirmed during planning — no e2e spec touches the invite password screen text, so removing it doesn't break `01-auth.spec.ts`, `13-franquia-login.spec.ts`, `10-franqueados.spec.ts`, or `debug-login.spec.ts`).

- [ ] **Step 4: Manual smoke test in dev (mock mode won't exercise Supabase auth — use a real dev Supabase project)**

Run: `npm run dev`, then by hand:
- Matrix: `invite-user` → open the emailed invite link → land on `/appinjediesel` with `type=invite` in the hash → confirm you're navigated straight to `/{agent}/dashboard` (no inline password card) → confirm the forced "Primeiro acesso" modal appears immediately, centered, with no visible close affordance → try ESC and clicking outside → confirm nothing closes it → set a password < 6 chars → confirm inline error, modal stays open → set matching passwords ≥ 6 chars → submit → confirm modal disappears and normal TopBar/dropdown "Meu Perfil" still opens the normal dismissible dialog afterward.
- Franchise: same via `invite-franchisee` fresh-invite path, landing on `/login`, redirecting into `/{unit}/{agent}/dashboard`.
- Wizard: create a new franchise unit with a fresh/never-used e-mail as the legal responsible → confirm the toast reads "Unidade criada e convite enviado para <email>" → confirm the invited user's `auth.users.raw_user_meta_data.must_set_password` is `true` (Supabase dashboard) → confirm the existing "Enviar Convite" button on the unit detail page still works standalone (resend path unaffected).
- Recovery ("Esqueci minha senha"): confirm this flow is completely unaffected — inline reset-password card still gates navigation as before.

- [ ] **Step 5: Checkpoint**

Stop here. Summarize the diff (files touched, line counts) and restate the detection-mechanism justification below for approval before merge/push/redeploy:

> **Detection mechanism used:** `user_metadata.must_set_password: true`, written by `invite-user`/`invite-franchisee` at `inviteUserByEmail()` time, read from the existing Zustand `session.user.user_metadata` (no new fetch, no new column). Cleared via `updateUser({ password, data: { must_set_password: false } })` in the same call that sets the password — Supabase's `onAuthStateChange` picks up the updated session automatically, so no extra store plumbing is needed for the metadata path. A separate transient `hashInviteFlow` store flag (set from the pre-existing `type=invite` hash detection in `Login.tsx`/`LoginParceiro.tsx`) covers accounts invited before this change ships, which never received the metadata flag — this fallback only lives in memory for the current browser session (per spec, it's explicitly a fallback, not full persistence for pre-existing invites). No migration, no new column, no new secret.

- [ ] **Step 6: Merge, push, redeploy (only after explicit approval)**

```bash
git push -u origin <branch>
# after PR approval / merge to main:
supabase functions deploy invite-user --project-ref <ref>
supabase functions deploy invite-franchisee --project-ref <ref>
```

Only these two functions changed — no other function needs redeploying for this work.
