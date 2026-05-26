// src/components/catalogo/DeleteConfirmModal.tsx
import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { AlertTriangle } from 'lucide-react'

interface Props {
  open: boolean
  onCancel: () => void
  onConfirm: () => void
  isLoading?: boolean
  description?: string
}

export function DeleteConfirmModal({ open, onCancel, onConfirm, isLoading, description }: Props) {
  const [typed, setTyped] = useState('')
  const confirmed = typed === 'EXCLUIR'

  return (
    <Dialog open={open} onOpenChange={o => { if (!o) { setTyped(''); onCancel() } }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle size={18} />
            Confirmar exclusão permanente
          </DialogTitle>
        </DialogHeader>

        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}

        <p className="text-sm">
          Esta ação é <strong>irreversível</strong>. Para confirmar, digite{' '}
          <code className="bg-muted px-1 py-0.5 rounded font-mono text-destructive">EXCLUIR</code>{' '}
          abaixo:
        </p>

        <Input
          placeholder="EXCLUIR"
          value={typed}
          onChange={e => setTyped(e.target.value)}
          className="font-mono"
          autoComplete="off"
        />

        <DialogFooter>
          <Button variant="ghost" onClick={() => { setTyped(''); onCancel() }}>
            Cancelar
          </Button>
          <Button
            variant="destructive"
            disabled={!confirmed || isLoading}
            onClick={onConfirm}
          >
            {isLoading ? 'Excluindo...' : 'Excluir registro'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
