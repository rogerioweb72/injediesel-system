import { useState } from 'react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface ConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  onConfirm: () => void
  isLoading?: boolean
  confirmLabel?: string
  requireTyped?: string
}

export function ConfirmDialog({
  open, onOpenChange, title, description, onConfirm, isLoading, confirmLabel = 'Confirmar', requireTyped,
}: ConfirmDialogProps) {
  const [typed, setTyped] = useState('')

  function handleOpenChange(v: boolean) {
    if (!v) setTyped('')
    onOpenChange(v)
  }

  const canConfirm = requireTyped ? typed === requireTyped : true

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        {requireTyped && (
          <div className="space-y-1.5 py-1">
            <p className="text-xs text-muted-foreground">
              Digite <span className="font-mono font-semibold text-foreground">"{requireTyped}"</span> para confirmar:
            </p>
            <Input
              value={typed}
              onChange={e => setTyped(e.target.value)}
              placeholder={requireTyped}
              autoComplete="off"
            />
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={() => handleOpenChange(false)} disabled={isLoading}>
            Cancelar
          </Button>
          <Button
            onClick={onConfirm}
            disabled={isLoading || !canConfirm}
            style={{ background: 'hsl(var(--pm-red-500))' }}
          >
            {isLoading ? 'Aguarde...' : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
