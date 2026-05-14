import { Bell, LogOut } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { useAuth } from '@/hooks/useAuth'
import { useProfile } from '@/hooks/useProfile'

const ROUTE_TITLES: Record<string, string> = {
  '/matriz/dashboard':     'Command Center',
  '/matriz/arquivos':      'Arquivos ECU',
  '/matriz/clientes':      'Clientes',
  '/matriz/franqueados':   'Franqueados',
  '/matriz/produtos':      'Produtos',
  '/matriz/pedidos':       'Pedidos',
  '/matriz/pdv':           'PDV',
  '/matriz/financeiro':    'Financeiro',
  '/matriz/suporte':       'Suporte',
  '/matriz/auditoria':     'Auditoria',
  '/matriz/configuracoes': 'Configurações',
}

export function TopBar() {
  const location = useLocation()
  const { logout } = useAuth()
  const { profile } = useProfile()

  const title = ROUTE_TITLES[location.pathname] ?? 'Promax Tuner'
  const initials = profile?.name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() ?? 'PT'

  return (
    <header className="pm-topbar">
      <h1 className="pm-page-title flex-1">{title}</h1>

      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon">
          <Bell size={18} />
        </Button>

        <Avatar className="h-8 w-8">
          <AvatarFallback
            className="text-xs font-bold"
            style={{ background: 'hsl(var(--pm-red-500))', color: '#fff' }}
          >
            {initials}
          </AvatarFallback>
        </Avatar>

        <Button variant="ghost" size="icon" onClick={logout} title="Sair">
          <LogOut size={16} />
        </Button>
      </div>
    </header>
  )
}
