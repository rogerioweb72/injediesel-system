import { useState } from 'react'
import {
  LayoutDashboard, Files, Users, Building2,
  ShoppingCart, Package, ShoppingBag,
  BarChart3, Headphones, Settings,
  Database, ClipboardList, Megaphone, HelpCircle, BookOpen,
} from 'lucide-react'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { NavItem } from './NavItem'
import { useProfile } from '@/hooks/useProfile'
import { useUnseenJobs } from '@/hooks/useUnseenJobs'
import { useUnreadSupportCount } from '@/hooks/useSupportTickets'
import { usePendingB2BCount } from '@/hooks/useNotifications'
import { supabase } from '@/lib/supabase'
import { TunerLogo } from '@/components/branding/TunerLogo'
import { useRoutePrefix } from '@/contexts/RoutePrefixContext'
import type { SidebarMode } from './AppShell'

interface SidebarProps {
  mode: SidebarMode
  onTogglePin: () => void
}

export function Sidebar({ mode, onTogglePin }: SidebarProps) {
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const { hasRole } = useProfile()
  const prefix = useRoutePrefix()
  const logout = () => supabase.auth.signOut()
  const { count: unseenJobs } = useUnseenJobs()
  const { data: unreadSupport = 0 } = useUnreadSupportCount()
  const { data: b2bPending = 0 } = usePendingB2BCount()

  const isExpanded = mode === 'pinned'
  const collapsed  = !isExpanded

  const headerClass = isExpanded
    ? 'pm-sidebar-header'
    : 'pm-sidebar-header pm-sidebar-header--collapsed'

  return (
    <>
    <aside
      className="pm-sidebar"
      style={{ width: isExpanded ? 'var(--pm-sidebar-width)' : 'var(--pm-sidebar-width-collapsed)' }}
    >
      {/* Header — logo + toggle */}
      <div className={headerClass}>
        <div
          className="pm-sidebar-logo-wrap"
          aria-hidden={!isExpanded}
          style={{
            opacity: isExpanded ? 1 : 0,
            maxWidth: isExpanded ? '180px' : '0px',
            overflow: 'hidden',
            transition: `opacity var(--pm-duration-base) var(--pm-ease-out),
                         max-width var(--pm-duration-base) var(--pm-ease-out)`,
            flexShrink: 0,
          }}
        >
          <a href={`${prefix}/dashboard`} aria-label="Promax Tuner — Dashboard" tabIndex={isExpanded ? 0 : -1}>
            <TunerLogo className="pm-sidebar-logo" />
          </a>
        </div>

        <button
          onClick={onTogglePin}
          className={['pm-sidebar-toggle', collapsed ? 'pm-sidebar-toggle--pulse' : ''].join(' ')}
          style={collapsed ? { color: '#ffffff', borderColor: 'rgba(255,255,255,0.18)' } : undefined}
          aria-label={isExpanded ? 'Recolher menu' : 'Expandir menu'}
        >
          {isExpanded
            ? <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path fillRule="evenodd" clipRule="evenodd" d="M11.9426 1.25H12.0574C14.3658 1.24999 16.1748 1.24998 17.5863 1.43975C19.031 1.63399 20.1711 2.03933 21.0659 2.93414C21.9607 3.82895 22.366 4.96897 22.5603 6.41371C22.75 7.82519 22.75 9.63423 22.75 11.9426V12.0574C22.75 14.3658 22.75 16.1748 22.5603 17.5863C22.366 19.031 21.9607 20.1711 21.0659 21.0659C20.1711 21.9607 19.031 22.366 17.5863 22.5603C16.1748 22.75 14.3658 22.75 12.0574 22.75H11.9426C9.63423 22.75 7.82519 22.75 6.41371 22.5603C4.96897 22.366 3.82895 21.9607 2.93414 21.0659C2.03933 20.1711 1.63399 19.031 1.43975 17.5863C1.24998 16.1748 1.24999 14.3658 1.25 12.0574V11.9426C1.24999 9.63423 1.24998 7.82519 1.43975 6.41371C1.63399 4.96897 2.03933 3.82895 2.93414 2.93414C3.82895 2.03933 4.96897 1.63399 6.41371 1.43975C7.82519 1.24998 9.63423 1.24999 11.9426 1.25ZM6.61358 2.92637C5.33517 3.09825 4.56445 3.42514 3.9948 3.9948C3.42514 4.56445 3.09825 5.33517 2.92637 6.61358C2.75159 7.91356 2.75 9.62178 2.75 12C2.75 14.3782 2.75159 16.0864 2.92637 17.3864C3.09825 18.6648 3.42514 19.4355 3.9948 20.0052C4.56445 20.5749 5.33517 20.9018 6.61358 21.0736C7.91356 21.2484 9.62177 21.25 12 21.25C14.3782 21.25 16.0864 21.2484 17.3864 21.0736C18.6648 20.9018 19.4355 20.5749 20.0052 20.0052C20.5749 19.4355 20.9018 18.6648 21.0736 17.3864C21.2484 16.0864 21.25 14.3782 21.25 12C21.25 9.62178 21.2484 7.91356 21.0736 6.61358C20.9018 5.33517 20.5749 4.56445 20.0052 3.9948C19.4355 3.42514 18.6648 3.09825 17.3864 2.92637C16.0864 2.75159 14.3782 2.75 12 2.75C9.62177 2.75 7.91356 2.75159 6.61358 2.92637ZM14.0303 8.46967C14.3232 8.76256 14.3232 9.23744 14.0303 9.53033L11.5607 12L14.0303 14.4697C14.3232 14.7626 14.3232 15.2374 14.0303 15.5303C13.7374 15.8232 13.2626 15.8232 12.9697 15.5303L9.96967 12.5303C9.67678 12.2374 9.67678 11.7626 9.96967 11.4697L12.9697 8.46967C13.2626 8.17678 13.7374 8.17678 14.0303 8.46967Z" fill="#B0B0B0"/></svg>
            : <svg width="25" height="24" viewBox="0 0 25 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4.32031 4.75C3.62996 4.75 3.07031 5.30964 3.07031 6C3.07031 6.69036 3.62996 7.25 4.32031 7.25H4.33031C5.02067 7.25 5.58031 6.69036 5.58031 6C5.58031 5.30964 5.02067 4.75 4.33031 4.75H4.32031Z" fill="#B0B0B0"/><path d="M8.31055 5.25C7.89633 5.25 7.56055 5.58579 7.56055 6C7.56055 6.41421 7.89633 6.75 8.31055 6.75L20.3105 6.75C20.7248 6.75 21.0605 6.41421 21.0605 6C21.0605 5.58579 20.7248 5.25 20.3105 5.25H8.31055Z" fill="#B0B0B0"/><path d="M8.31055 17.25C7.89633 17.25 7.56055 17.5858 7.56055 18C7.56055 18.4142 7.89633 18.75 8.31055 18.75L20.3105 18.75C20.7248 18.75 21.0605 18.4142 21.0605 18C21.0605 17.5858 20.7248 17.25 20.3105 17.25L8.31055 17.25Z" fill="#B0B0B0"/><path d="M7.56055 12C7.56055 11.5858 7.89633 11.25 8.31055 11.25L20.3105 11.25C20.7248 11.25 21.0605 11.5858 21.0605 12C21.0605 12.4142 20.7248 12.75 20.3105 12.75L8.31055 12.75C7.89633 12.75 7.56055 12.4142 7.56055 12Z" fill="#B0B0B0"/><path d="M3.07031 12C3.07031 11.3096 3.62996 10.75 4.32031 10.75H4.33031C5.02067 10.75 5.58031 11.3096 5.58031 12C5.58031 12.6904 5.02067 13.25 4.33031 13.25H4.32031C3.62996 13.25 3.07031 12.6904 3.07031 12Z" fill="#B0B0B0"/><path d="M4.32031 16.75C3.62996 16.75 3.07031 17.3096 3.07031 18C3.07031 18.6904 3.62996 19.25 4.32031 19.25H4.33031C5.02067 19.25 5.58031 18.6904 5.58031 18C5.58031 17.3096 5.02067 16.75 4.33031 16.75H4.32031Z" fill="#B0B0B0"/></svg>
          }
        </button>
      </div>

      {/* Navegação */}
      <nav className="flex-1 py-3 overflow-y-auto overflow-x-hidden">
        {!collapsed && <div className="pm-sidebar-group-title">Operação</div>}
        {collapsed  && <div className="h-px mx-3 my-2 bg-[hsl(var(--pm-gray-800))]" />}
        <NavItem to={`${prefix}/dashboard`}    icon={LayoutDashboard} label="Dashboard"    collapsed={collapsed} />
        <NavItem to={`${prefix}/arquivos`}     icon={Files}           label="Arquivos ECU" collapsed={collapsed} badge={unseenJobs} />
        <NavItem to={`${prefix}/tabela-remap`} icon={Database}        label="Tabela Remap" collapsed={collapsed} />
        <NavItem to={`${prefix}/clientes`}     icon={Users}           label="Clientes"     collapsed={collapsed} />
        {hasRole('company_admin', 'operations_admin') && (
          <NavItem to={`${prefix}/franqueados`} icon={Building2} label="Franqueados" collapsed={collapsed} />
        )}

        {!collapsed && <div className="pm-sidebar-group-title">Loja</div>}
        {collapsed  && <div className="h-px mx-3 my-2 bg-[hsl(var(--pm-gray-800))]" />}
        <NavItem to={`${prefix}/pdv`}      icon={ShoppingBag}  label="PDV"      collapsed={collapsed} />
        <NavItem to={`${prefix}/pedidos`}     icon={ShoppingCart}  label="Pedidos"      collapsed={collapsed} />
        <NavItem to={`${prefix}/pedidos-b2b`} icon={ClipboardList} label="Pedidos B2B"  collapsed={collapsed} badge={b2bPending} />
        <NavItem to={`${prefix}/produtos`} icon={Package}      label="Produtos" collapsed={collapsed} />

        {!collapsed && <div className="pm-sidebar-group-title">Gestão</div>}
        {collapsed  && <div className="h-px mx-3 my-2 bg-[hsl(var(--pm-gray-800))]" />}
        {hasRole('company_admin', 'finance_admin') && (
          <NavItem to={`${prefix}/financeiro`} icon={BarChart3} label="Financeiro" collapsed={collapsed} />
        )}
        <NavItem to={`${prefix}/cadastros`} icon={BookOpen} label="Cadastros" collapsed={collapsed} />
        <NavItem to={`${prefix}/suporte`}   icon={Headphones} label="Suporte"       collapsed={collapsed} badge={unreadSupport} />
        <NavItem to={`${prefix}/materiais`} icon={Megaphone}  label="Materiais MKT" collapsed={collapsed} />
      </nav>

      {/* Footer — configurações + power */}
      <div className="flex flex-col">
        {hasRole('company_admin', 'franchise_manager') && (
          <NavItem to={`${prefix}/configuracoes`} icon={Settings} label="Configurações" collapsed={collapsed} />
        )}
        <NavItem to={`${prefix}/ajuda`} icon={HelpCircle} label="Ajuda" collapsed={collapsed} />
        <div className="h-px mx-3 my-1 bg-[hsl(var(--pm-gray-800))]" />
        <div className={['flex items-center py-3', collapsed ? 'justify-center px-0' : 'px-4 gap-3'].join(' ')}>
          {!collapsed && <span className="text-xs text-muted-foreground flex-1">v1.0.0 — MVP</span>}
          <button
            onClick={() => setShowLogoutConfirm(true)}
            style={{
              width: 34, height: 34, borderRadius: '50%',
              background: 'hsl(var(--pm-red-500)/0.12)',
              border: '1.5px solid hsl(var(--pm-red-500)/0.35)',
              color: 'hsl(var(--pm-red-500))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', flexShrink: 0,
              transition: 'background 150ms ease, box-shadow 150ms ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'hsl(var(--pm-red-500)/0.22)'
              e.currentTarget.style.boxShadow = '0 0 0 3px hsl(var(--pm-red-500)/0.15)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'hsl(var(--pm-red-500)/0.12)'
              e.currentTarget.style.boxShadow = 'none'
            }}
            aria-label="Sair"
            title="Sair"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24"><g fill="none" fillRule="evenodd"><path d="M24 0v24H0V0zM12.593 23.258l-.011.002-.071.035-.02.004-.014-.004-.071-.035c-.01-.004-.019-.001-.024.005l-.004.01-.017.428.005.02.01.013.104.074.015.004.012-.004.104-.074.012-.016.004-.017-.017-.427c-.002-.01-.009-.017-.017-.018m.265-.113-.013.002-.185.093-.01.01-.003.011.018.43.005.012.008.007.201.093c.012.004.023 0 .029-.008l.004-.014-.034-.614c-.003-.012-.01-.02-.02-.022m-.715.002a.023.023 0 0 0-.027.006l-.006.014-.034.614c0 .012.007.02.017.024l.015-.002.201-.093.01-.008.004-.011.017-.43-.003-.012-.01-.01z"/><path fill="currentColor" d="M13.5 3a1.5 1.5 0 0 0-3 0v10a1.5 1.5 0 0 0 3 0zM7.854 5.75a1.5 1.5 0 1 0-1.661-2.5A10.492 10.492 0 0 0 1.5 12c0 5.799 4.701 10.5 10.5 10.5S22.5 17.799 22.5 12c0-3.654-1.867-6.87-4.693-8.75a1.5 1.5 0 0 0-1.66 2.5 7.5 7.5 0 1 1-8.292 0Z"/></g></svg>
          </button>
        </div>
      </div>
    </aside>

    <Dialog open={showLogoutConfirm} onOpenChange={setShowLogoutConfirm}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Sair da conta</DialogTitle>
          <DialogDescription>
            Deseja realmente sair? Você precisará fazer login novamente para acessar o sistema.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setShowLogoutConfirm(false)}>
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={() => { setShowLogoutConfirm(false); logout() }}
          >
            Sair
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  )
}
