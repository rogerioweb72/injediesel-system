import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'

interface AppShellProps {
  children: React.ReactNode
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <div
        className="flex flex-col flex-1 min-w-0"
        style={{ marginLeft: 'var(--pm-sidebar-width)' }}
      >
        <TopBar />
        <main className="flex-1 pm-page pm-animate-fade-in">
          {children}
        </main>
      </div>
    </div>
  )
}
