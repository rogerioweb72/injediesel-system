import { useState, useCallback, useEffect } from 'react'
import { AlertTriangle } from 'lucide-react'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'
import { ImpersonationBanner } from './ImpersonationBanner'
import { PageHeaderProvider } from '@/contexts/PageHeaderContext'
import { TooltipProvider } from '@/components/ui/tooltip'
import { Toaster } from '@/components/ui/sonner'
import { useMyUnit } from '@/hooks/useMyUnit'

export type SidebarMode = 'collapsed' | 'pinned'

interface AppShellProps {
  children: React.ReactNode
}

function UnitBlockedBanner() {
  const { data: myUnit } = useMyUnit()
  const unit = myUnit?.franchise_units

  if (!unit?.contract_blocked) return null

  return (
    <div
      style={{
        background: '#F59E0B',
        borderBottom: '2px solid #000',
        padding: '8px 24px',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        zIndex: 45,
      }}
    >
      <AlertTriangle size={15} color="#000" style={{ flexShrink: 0 }} />
      <p style={{
        fontFamily: '"DM Sans", sans-serif',
        fontSize: '12px',
        fontWeight: 600,
        color: '#000',
        flex: 1,
      }}>
        <strong>UNIDADE BLOQUEADA PELA MATRIZ</strong>
        {unit.contract_blocked_reason ? ` — ${unit.contract_blocked_reason}` : ''}
        {' '}· Envio de arquivos suspenso. Contate a Matriz para regularização.
      </p>
    </div>
  )
}

export function AppShell({ children }: AppShellProps) {
  const [mode, setMode] = useState<SidebarMode>('collapsed')
  const [isMobile, setIsMobile] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 1024)
    check()
    window.addEventListener('resize', check, { passive: true })
    return () => window.removeEventListener('resize', check)
  }, [])

  const onTogglePin = useCallback(() => {
    setMode(m => m === 'pinned' ? 'collapsed' : 'pinned')
  }, [])

  const isExpanded = mode === 'pinned'

  return (
    <PageHeaderProvider>
      <TooltipProvider>
      <Toaster richColors position="top-right" />
      <div className="flex min-h-screen bg-background">

        {/* Desktop sidebar */}
        {!isMobile && (
          <Sidebar mode={mode} onTogglePin={onTogglePin} />
        )}

        {/* Mobile sidebar overlay */}
        {isMobile && mobileOpen && (
          <>
            <div
              onClick={() => setMobileOpen(false)}
              style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 48 }}
            />
            <div style={{ position: 'fixed', left: 0, top: 0, bottom: 0, width: 'var(--pm-sidebar-width)', zIndex: 49, boxShadow: '4px 0 24px rgba(0,0,0,0.4)' }}>
              <Sidebar mode="pinned" onTogglePin={() => setMobileOpen(false)} onNavClick={() => setMobileOpen(false)} />
            </div>
          </>
        )}

        <div
          className="flex flex-col flex-1 min-w-0"
          style={{
            marginLeft: isMobile ? 0 : isExpanded
              ? 'var(--pm-sidebar-width)'
              : 'var(--pm-sidebar-width-collapsed)',
            transition: 'margin-left var(--pm-duration-base) var(--pm-ease-out)',
          }}
        >
          <ImpersonationBanner />
          <TopBar
            sidebarExpanded={isExpanded}
            isMobile={isMobile}
            onMobileMenuToggle={() => setMobileOpen(v => !v)}
          />
          <UnitBlockedBanner />
          <main className="flex-1 pm-page pm-animate-fade-in">
            {children}
          </main>
        </div>
      </div>
      </TooltipProvider>
    </PageHeaderProvider>
  )
}
