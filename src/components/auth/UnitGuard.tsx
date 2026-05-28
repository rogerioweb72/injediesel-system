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
    let cancelled = false

    fetch(
      `${BASE}/rest/v1/user_unit_roles?user_id=eq.${profile.id}&select=franchise_units(name)&limit=1`,
      { headers: { apikey: KEY, Authorization: `Bearer ${session.access_token}` } },
    )
      .then(r => {
        if (!r.ok) throw new Error(r.statusText)
        return r.json()
      })
      .then((rows: Array<{ franchise_units?: { name: string } }>) => {
        if (cancelled) return
        const name = rows?.[0]?.franchise_units?.name
        if (name && toSlug(name) === unitSlug) {
          setVerified(true)
        } else {
          navigate('/login', { replace: true })
        }
      })
      .catch(() => { if (!cancelled) navigate('/login', { replace: true }) })

    return () => { cancelled = true }
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
