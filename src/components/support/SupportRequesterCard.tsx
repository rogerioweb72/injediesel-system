// src/components/support/SupportRequesterCard.tsx
import { User } from 'lucide-react'
import { ROLE_LABELS, type UserRole } from '@/types/app'

interface RequesterProfile {
  name: string
  role: UserRole
  unit_id: string | null
  franchise_units?: { name: string } | null
}

interface Props {
  requester: RequesterProfile | null | undefined
}

export function SupportRequesterCard({ requester }: Props) {
  if (!requester) return null

  return (
    <div className="space-y-1">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Solicitante
      </p>
      <div className="flex items-center gap-2">
        <User size={14} className="shrink-0 text-muted-foreground" />
        <span className="text-sm font-medium">{requester.name}</span>
      </div>
      <p className="pl-5 text-xs text-muted-foreground">{ROLE_LABELS[requester.role]}</p>
      {requester.franchise_units?.name && (
        <p className="pl-5 text-xs text-muted-foreground">{requester.franchise_units.name}</p>
      )}
    </div>
  )
}
