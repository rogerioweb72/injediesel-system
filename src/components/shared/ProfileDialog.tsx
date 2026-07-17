import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
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
  recoveryMode?: boolean
}

export function ProfileDialog({ open, onOpenChange, forced = false, recoveryMode = false }: ProfileDialogProps) {
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
    if (forced || recoveryMode) {
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
        if (recoveryMode) useAuthStore.getState().setHashRecoveryFlow(false)
      }

      toast.success(
        forced ? 'Senha definida com sucesso'
          : recoveryMode ? 'Senha redefinida com sucesso'
          : 'Perfil atualizado com sucesso'
      )
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
      <ForcedPasswordCard
        password={password}
        setPassword={setPassword}
        confirmPassword={confirmPassword}
        setConfirmPassword={setConfirmPassword}
        saving={saving}
        onSave={handleSave}
      />
    )
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{recoveryMode ? 'Redefinir senha' : 'Meu Perfil'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {!recoveryMode && (
            <div className="space-y-1">
              <Label>Nome completo</Label>
              <Input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Seu nome"
              />
            </div>
          )}

          <div className={recoveryMode ? 'space-y-3' : 'border-t border-white/[0.06] pt-4 space-y-3'}>
            {!recoveryMode && (
              <p className="text-xs text-muted-foreground">
                Deixe em branco para manter a senha atual
              </p>
            )}
            <div className="space-y-1">
              <Label>Nova senha</Label>
              <Input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                autoComplete="new-password"
                autoFocus={recoveryMode}
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
            disabled={saving || (recoveryMode ? (!password || !confirmPassword) : !name)}
            style={{ background: 'var(--pm-accent-gradient)' }}
          >
            {saving ? 'Salvando...' : recoveryMode ? 'Salvar nova senha' : 'Salvar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

interface ForcedPasswordCardProps {
  password: string
  setPassword: (v: string) => void
  confirmPassword: string
  setConfirmPassword: (v: string) => void
  saving: boolean
  onSave: () => void
}

function ForcedPasswordCard({ password, setPassword, confirmPassword, setConfirmPassword, saving, onSave }: ForcedPasswordCardProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    containerRef.current?.querySelector<HTMLElement>('input')?.focus()
  }, [])

  function trapFocus(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key !== 'Tab' || !containerRef.current) return
    const focusable = Array.from(
      containerRef.current.querySelectorAll<HTMLElement>('input, button, [tabindex]:not([tabindex="-1"])')
    ).filter(el => !el.hasAttribute('disabled'))
    if (focusable.length === 0) return
    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault()
      last.focus()
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault()
      first.focus()
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto p-4" style={{ background: 'rgba(0,0,0,0.85)' }}>
      <div
        ref={containerRef}
        onKeyDown={trapFocus}
        role="dialog"
        aria-modal="true"
        aria-labelledby="forced-password-title"
        className="my-auto w-full max-w-sm max-h-[90vh] overflow-y-auto rounded-lg border p-6 shadow-lg space-y-4"
        style={{ background: '#141416', borderColor: 'rgba(255,255,255,0.08)' }}
      >
        <div className="space-y-1">
          <h2 id="forced-password-title" className="text-lg font-semibold leading-none tracking-tight">Primeiro acesso</h2>
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
          onClick={onSave}
          disabled={saving || !password || !confirmPassword}
          className="w-full"
          style={{ background: 'var(--pm-accent-gradient)' }}
        >
          {saving ? 'Salvando...' : 'Definir senha e continuar'}
        </Button>
      </div>
    </div>,
    document.body
  )
}
