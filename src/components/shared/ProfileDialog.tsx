import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { supabase } from '@/lib/supabase'
import { useProfile } from '@/hooks/useProfile'
import { toast } from 'sonner'
import { translateError } from '@/lib/errors'
import { useQueryClient } from '@tanstack/react-query'

interface ProfileDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ProfileDialog({ open, onOpenChange }: ProfileDialogProps) {
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
    if (password && password !== confirmPassword) {
      toast.error('As senhas não coincidem')
      return
    }
    if (password && password.length < 6) {
      toast.error('Senha deve ter pelo menos 6 caracteres')
      return
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
        const { error } = await supabase.auth.updateUser({ password })
        if (error) throw error
      }

      toast.success('Perfil atualizado com sucesso')
      handleOpenChange(false)
    } catch (err: unknown) {
      toast.error(translateError(err))
    } finally {
      setSaving(false)
    }
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
