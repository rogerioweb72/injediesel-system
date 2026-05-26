import { useState, useCallback } from 'react'
import { AlertTriangle } from 'lucide-react'
import { FranqueadoSidebar } from './FranqueadoSidebar'
import { TopBar } from './TopBar'
import { PageHeaderProvider } from '@/contexts/PageHeaderContext'
import { Toaster } from '@/components/ui/sonner'
import { useMyUnit } from '@/hooks/useMyUnit'
import type { SidebarMode } from './AppShell'

function UnitBlockedBanner() {
  const { data: myUnit } = useMyUnit()
  const unit = myUnit?.franchise_units

  if (!unit?.contract_blocked) return null

  return (
    <div style={{
      background: '#F59E0B',
      borderBottom: '2px solid #000',
      padding: '8px 24px',
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      zIndex: 45,
    }}>
      <AlertTriangle size={15} color="#000" style={{ flexShrink: 0 }} />
      <p style={{
        fontFamily: '"DM Sans", sans-serif',
        fontSize: 12,
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

interface FranqueadoShellProps {
  children: React.ReactNode
}

export function FranqueadoShell({ children }: FranqueadoShellProps) {
  const [mode, setMode] = useState<SidebarMode>('collapsed')

  const onTogglePin = useCallback(() => {
    setMode(m => m === 'pinned' ? 'collapsed' : 'pinned')
  }, [])

  const isExpanded = mode === 'pinned'

  return (
    <PageHeaderProvider>
      <div className="flex min-h-screen bg-background">
        <FranqueadoSidebar mode={mode} onTogglePin={onTogglePin} />
        <div
          className="flex flex-col flex-1 min-w-0"
          style={{
            marginLeft: isExpanded
              ? 'var(--pm-sidebar-width)'
              : 'var(--pm-sidebar-width-collapsed)',
            transition: `margin-left var(--pm-duration-base) var(--pm-ease-out)`,
          }}
        >
          <TopBar sidebarExpanded={isExpanded} />
          <UnitBlockedBanner />
          <main className="flex-1 pm-page pm-animate-fade-in">
            {children}
          </main>
        </div>
      </div>
      <Toaster richColors position="top-right" />
    </PageHeaderProvider>
  )
}
