import { Bell, LogOut, UserCog, UserPlus, Plus } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useSignOut } from '@/hooks/useSignOut'
import { useProfile } from '@/hooks/useProfile'
import { useNotifications } from '@/hooks/useNotifications'
import { useMyUnit } from '@/hooks/useMyUnit'
import { NovoLancamentoModal } from '@/pages/app/caixa/NovoLancamentoModal'
import { FRANCHISE_ROLES } from '@/types/app'
import { TunerLogo } from '@/components/branding/TunerLogo'
import { usePageHeaderContext } from '@/contexts/PageHeaderContext'
import { useRoutePrefix } from '@/contexts/RoutePrefixContext'
import { ProfileDialog } from '@/components/shared/ProfileDialog'

const EXACT_TITLES: Record<string, string> = {
  '/matriz/dashboard':        'Command Center',
  '/matriz/arquivos':         'Arquivos ECU',
  '/matriz/arquivos/novo':    'Novo Arquivo',
  '/matriz/clientes':         'Clientes',
  '/matriz/clientes/novo':    'Novo Cliente',
  '/matriz/tabela-remap':     'Tabela Remap',
  '/franqueado/tabela-remap': 'Catálogo de Arquivos',
  '/matriz/franqueados':      'Franqueados',
  '/matriz/produtos':         'Produtos',
  '/matriz/produtos/novo':    'Novo Produto',
  '/matriz/pdv':              'PDV',
  '/matriz/pedidos':          'Vendas PDV',
  '/matriz/financeiro':       'Financeiro',
  '/matriz/suporte':          'Suporte',
  '/matriz/suporte/novo':     'Novo Ticket',
  '/matriz/auditoria':        'Auditoria',
  '/matriz/configuracoes':    'Configurações',
}

function getRouteTitle(pathname: string): string {
  if (EXACT_TITLES[pathname]) return EXACT_TITLES[pathname]
  if (/^\/matriz\/clientes\/[^/]+\/editar$/.test(pathname)) return 'Editar Cliente'
  if (/^\/matriz\/clientes\/[^/]+$/.test(pathname)) return 'Detalhe do Cliente'
  if (/^\/matriz\/produtos\/[^/]+\/editar$/.test(pathname)) return 'Editar Produto'
  if (/^\/matriz\/produtos\/[^/]+$/.test(pathname)) return 'Detalhe do Produto'
  if (/^\/matriz\/franqueados\/[^/]+$/.test(pathname)) return 'Detalhe da Unidade'
  if (/^\/matriz\/arquivos\/[^/]+$/.test(pathname)) return 'Detalhe do Arquivo'
  if (/^\/matriz\/suporte\/[^/]+$/.test(pathname)) return 'Ticket de Suporte'
  return 'Promax Tuner'
}

function getGreeting(): string {
  const h = new Date().getHours()
  if (h >= 5 && h < 12) return 'Bom dia'
  if (h >= 12 && h < 18) return 'Boa tarde'
  return 'Boa noite'
}

interface TopBarProps {
  sidebarExpanded: boolean
}

export function TopBar({ sidebarExpanded }: TopBarProps) {
  const location = useLocation()
  const { profile } = useProfile()
  const { state: pageHeader } = usePageHeaderContext()
  const navigate = useNavigate()
  const [profileOpen, setProfileOpen] = useState(false)
  const [lancamentoOpen, setLancamentoOpen] = useState(false)
  const { signOut: logout } = useSignOut()
  const { data: myUnit } = useMyUnit()

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    if (params.get('setup') === '1') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setProfileOpen(true)
      params.delete('setup')
      navigate({ search: params.toString() }, { replace: true })
    }
  }, [location.search, navigate])

  const prefix = useRoutePrefix()
  const { total: notifTotal, items: notifItems } = useNotifications(prefix)
  const isDashboard = location.pathname.endsWith('/dashboard')
  const firstName   = profile?.name?.split(' ')[0] ?? ''
  const initials    = profile?.name
    ?.split(' ')
    .map(n => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() ?? 'PT'

  const displayTitle    = pageHeader.title ?? getRouteTitle(location.pathname)
  const displaySubtitle = pageHeader.subtitle

  // prefix = '/slug' → matriz | '/unitSlug/agentSlug' → franquia
  const isFranchiseShell = prefix.split('/').filter(Boolean).length === 2

  return (
    <>
    <header className="pm-topbar">

      {/* Logo — aparece quando sidebar está recolhida */}
      <div
        className="pm-topbar-logo-wrap"
        data-show={String(!sidebarExpanded)}
        aria-hidden={sidebarExpanded}
      >
        <TunerLogo className="pm-topbar-logo" />
        <div className="pm-topbar-logo-sep" />
      </div>

      {/* Saudação (dashboard) ou nome da seção */}
      <div className="flex-1 min-w-0 flex flex-col justify-center">
        {isDashboard ? (
          <>
            <span className="pm-topbar-greeting">
              {getGreeting()}{', '}
              <span className="pm-topbar-greeting-name">{firstName}</span>
            </span>
            <span className="pm-topbar-greeting-sub">
              {FRANCHISE_ROLES.includes(profile?.role as never)
                ? 'Acompanhe os resultados da sua unidade'
                : 'Acompanhe sua rotina'}
            </span>
          </>
        ) : (
          <>
            <h1 className="pm-page-title">{displayTitle}</h1>
            {displaySubtitle && (
              <span className="pm-topbar-greeting-sub">{displaySubtitle}</span>
            )}
          </>
        )}
      </div>

      {/* Slot para ações da página (preenchido via portal em PageHeader) */}
      <div id="topbar-actions" className="flex items-center gap-2" />

      {/* Ações fixas */}
      <div className="flex items-center gap-2">
        {isFranchiseShell && (
          <>
            <Button
              size="sm"
              onClick={() => navigate(`${prefix}/clientes/novo`)}
              className="h-8 text-xs font-semibold gap-1.5"
              style={{ background: '#16A34A', color: '#fff', border: 'none' }}
            >
              <UserPlus size={13} />
              Novo Cliente
            </Button>
            <Button
              size="sm"
              onClick={() => setLancamentoOpen(true)}
              className="h-8 text-xs font-semibold gap-1.5"
              style={{ background: '#2563EB', color: '#fff', border: 'none' }}
            >
              <Plus size={13} />
              Novo Lançamento
            </Button>
          </>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative">
              <Bell size={18} />
              {notifTotal > 0 && (
                <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold text-white ring-2 ring-background"
                  style={{ background: '#ef4444' }}>
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-50" style={{ background: '#ef4444' }} />
                  <span className="relative">{notifTotal > 9 ? '9+' : notifTotal}</span>
                </span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-72">
            <div className="px-3 py-2 flex items-center justify-between">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Notificações</p>
              {notifTotal > 0 && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444' }}>
                  {notifTotal}
                </span>
              )}
            </div>
            <DropdownMenuSeparator />
            {notifItems.length > 0 ? (
              notifItems.map(item => (
                <DropdownMenuItem key={item.key} onClick={() => navigate(item.route)} className="flex items-start gap-3 py-2.5 px-3">
                  <span className="flex items-center justify-center min-w-[22px] h-[22px] rounded-full text-[10px] font-bold text-white mt-0.5 shrink-0" style={{ background: '#34D399' }}>
                    {item.count > 9 ? '9+' : item.count}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium leading-tight">{item.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{item.sub}</p>
                  </div>
                </DropdownMenuItem>
              ))
            ) : (
              <div className="px-3 py-5 text-center text-xs text-muted-foreground">
                Nenhuma notificação pendente
              </div>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="focus:outline-none rounded-full">
              <Avatar className="h-8 w-8 cursor-pointer">
                <AvatarFallback
                  className="text-xs font-bold"
                  style={{ background: 'hsl(var(--pm-red-500))', color: '#fff' }}
                >
                  {initials}
                </AvatarFallback>
              </Avatar>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <div className="px-2 py-1.5">
              <p className="text-sm font-medium truncate">{profile?.name}</p>
              <p className="text-xs text-muted-foreground truncate">{profile?.email}</p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setProfileOpen(true)}>
              <UserCog size={14} className="mr-2" />
              Meu Perfil
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={logout} className="text-destructive focus:text-destructive">
              <LogOut size={14} className="mr-2" />
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <ProfileDialog open={profileOpen} onOpenChange={setProfileOpen} />
    </header>

      {lancamentoOpen && (
        <NovoLancamentoModal
          unitId={myUnit?.unit_id ?? ''}
          onClose={() => setLancamentoOpen(false)}
          onSuccess={() => setLancamentoOpen(false)}
        />
      )}
    </>
  )
}
