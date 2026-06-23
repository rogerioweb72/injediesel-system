import { useState } from 'react'
import {
  LayoutDashboard, Files, FileText, ShoppingBag, ShoppingCart,
  Users, BarChart3, Headphones,
  Megaphone, User, HelpCircle, BookOpen,
} from 'lucide-react'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

function IconHistoricoPedidos({ className, size = 24 }: { className?: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <path d="M19 10.5V9.99995C19 6.22876 18.9999 4.34311 17.8284 3.17154C16.6568 2 14.7712 2 11 2C7.22889 2 5.34326 2.00006 4.17169 3.17159C3.00015 4.34315 3.00013 6.22872 3.0001 9.99988L3.00006 14.5C3.00003 17.7874 3.00002 19.4312 3.90794 20.5375C4.07418 20.7401 4.25992 20.9258 4.46249 21.0921C5.56883 22 7.21255 22 10.5 22" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M7 7H15M7 11H11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M18 18.5L16.5 17.95V15.5M12 17.5C12 19.9853 14.0147 22 16.5 22C18.9853 22 21 19.9853 21 17.5C21 15.0147 18.9853 13 16.5 13C14.0147 13 12 15.0147 12 17.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

function IconTabelaRemap({ className, size = 24 }: { className?: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <path fillRule="evenodd" clipRule="evenodd" d="M12 4.75C10.9396 4.75 10.0907 5.07796 8.06584 5.88789L5.25737 7.01128C4.24694 7.41545 3.54677 7.69659 3.09295 7.93451C3.0486 7.95776 3.00863 7.97959 2.97267 8C3.00863 8.02041 3.0486 8.04224 3.09295 8.06549C3.54677 8.30341 4.24694 8.58455 5.25737 8.98872L8.06584 10.1121C10.0907 10.922 10.9396 11.25 12 11.25C13.0604 11.25 13.9093 10.922 15.9342 10.1121L18.7426 8.98872C19.7531 8.58455 20.4532 8.30341 20.9071 8.06549C20.9514 8.04224 20.9914 8.02041 21.0273 8C20.9914 7.97959 20.9514 7.95776 20.9071 7.93451C20.4532 7.69659 19.7531 7.41545 18.7426 7.01128L15.9342 5.88789C13.9093 5.07796 13.0604 4.75 12 4.75ZM7.62442 4.4489C9.50121 3.69796 10.6208 3.25 12 3.25C13.3792 3.25 14.4988 3.69796 16.3756 4.4489C16.4138 4.4642 16.4524 4.47962 16.4912 4.49517L19.3451 5.6367C20.2996 6.01851 21.0728 6.32776 21.6035 6.60601C21.8721 6.74683 22.1323 6.90648 22.333 7.09894C22.5392 7.29668 22.75 7.59658 22.75 8C22.75 8.40342 22.5392 8.70332 22.333 8.90106C22.1323 9.09352 21.8721 9.25317 21.6035 9.39399C21.2519 9.57835 20.7938 9.77632 20.247 10C20.7938 10.2237 21.2519 10.4216 21.6035 10.606C21.8721 10.7468 22.1323 10.9065 22.333 11.0989C22.5392 11.2967 22.75 11.5966 22.75 12C22.75 12.4034 22.5392 12.7033 22.333 12.9011C22.1323 13.0935 21.8721 13.2532 21.6035 13.394C21.2519 13.5784 20.7938 13.7763 20.247 14C20.7938 14.2237 21.2519 14.4216 21.6035 14.606C21.8721 14.7468 22.1323 14.9065 22.333 15.0989C22.5392 15.2967 22.75 15.5966 22.75 16C22.75 16.4034 22.5392 16.7033 22.333 16.9011C22.1323 17.0935 21.8721 17.2532 21.6035 17.394C21.0728 17.6722 20.2997 17.9815 19.3451 18.3633L16.4912 19.5048C16.4524 19.5204 16.4138 19.5358 16.3756 19.5511C14.4988 20.302 13.3792 20.75 12 20.75C10.6208 20.75 9.50121 20.302 7.62443 19.5511C7.58619 19.5358 7.54763 19.5204 7.50875 19.5048L4.6549 18.3633C3.70034 17.9815 2.9272 17.6722 2.39647 17.394C2.12786 17.2532 1.86765 17.0935 1.66701 16.9011C1.46085 16.7033 1.25 16.4034 1.25 16C1.25 15.5966 1.46085 15.2967 1.66701 15.0989C1.86765 14.9065 2.12786 14.7468 2.39647 14.606C2.74813 14.4216 3.20621 14.2237 3.75299 14C3.20621 13.7763 2.74813 13.5784 2.39647 13.394C2.12786 13.2532 1.86765 13.0935 1.66701 12.9011C1.46085 12.7033 1.25 12.4034 1.25 12C1.25 11.5966 1.46085 11.2967 1.66701 11.0989C1.86765 10.9065 2.12786 10.7468 2.39647 10.606C2.74813 10.4216 3.20621 10.2237 3.75299 10C3.20621 9.77632 2.74813 9.57835 2.39647 9.39399C2.12786 9.25317 1.86765 9.09352 1.66701 8.90106C1.46085 8.70332 1.25 8.40342 1.25 8C1.25 7.59658 1.46085 7.29668 1.66701 7.09894C1.86765 6.90648 2.12786 6.74683 2.39647 6.60601C2.92721 6.32776 3.70037 6.01851 4.65496 5.63669L7.50875 4.49517C7.54763 4.47962 7.58618 4.4642 7.62442 4.4489ZM5.76613 10.8078L5.25737 11.0113C4.24694 11.4154 3.54677 11.6966 3.09295 11.9345C3.0486 11.9578 3.00863 11.9796 2.97268 12C3.00863 12.0204 3.0486 12.0422 3.09295 12.0655C3.54677 12.3034 4.24694 12.5845 5.25737 12.9887L8.06584 14.1121C10.0907 14.922 10.9396 15.25 12 15.25C13.0604 15.25 13.9093 14.922 15.9342 14.1121L18.7426 12.9887C19.7531 12.5845 20.4532 12.3034 20.9071 12.0655C20.9514 12.0422 20.9914 12.0204 21.0273 12C20.9914 11.9796 20.9514 11.9578 20.9071 11.9345C20.4532 11.6966 19.7531 11.4154 18.7426 11.0113L18.2339 10.8078L16.4912 11.5048C16.4524 11.5204 16.4138 11.5358 16.3756 11.5511C14.4988 12.302 13.3792 12.75 12 12.75C10.6208 12.75 9.50121 12.302 7.62443 11.5511C7.58619 11.5358 7.54763 11.5204 7.50875 11.5048L5.76613 10.8078ZM5.76613 14.8078L5.25737 15.0113C4.24694 15.4154 3.54678 15.6966 3.09295 15.9345C3.0486 15.9578 3.00863 15.9796 2.97268 16C3.00863 16.0204 3.0486 16.0422 3.09295 16.0655C3.54677 16.3034 4.24694 16.5845 5.25737 16.9887L8.06584 18.1121C10.0907 18.922 10.9396 19.25 12 19.25C13.0604 19.25 13.9093 18.922 15.9342 18.1121L18.7426 16.9887C19.7531 16.5845 20.4532 16.3034 20.9071 16.0655C20.9514 16.0422 20.9914 16.0204 21.0273 16C20.9914 15.9796 20.9514 15.9578 20.9071 15.9345C20.4532 15.6966 19.7531 15.4154 18.7426 15.0113L18.2339 14.8078L16.4912 15.5048C16.4524 15.5204 16.4138 15.5358 16.3756 15.5511C14.4988 16.302 13.3792 16.75 12 16.75C10.6208 16.75 9.50121 16.302 7.62443 15.5511C7.58619 15.5358 7.54763 15.5204 7.50875 15.5048L5.76613 14.8078Z" fill="currentColor"/>
    </svg>
  )
}

function IconEnviarArquivo({ className, size = 24 }: { className?: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <path d="M17.9999 21.9999C19.4001 21.9999 20.1001 21.9999 20.6349 21.7275C21.1053 21.4878 21.4878 21.1053 21.7275 20.6349C21.9999 20.1001 21.9999 19.4001 21.9999 17.9999C21.9999 16.5998 21.9999 15.8997 21.7275 15.365C21.4878 14.8946 21.1053 14.5121 20.6349 14.2724C20.1001 13.9999 19.4001 13.9999 17.9999 13.9999L5.99994 13.9999C4.59981 13.9999 3.89974 13.9999 3.36496 14.2724C2.89456 14.5121 2.51211 14.8946 2.27242 15.365C1.99994 15.8997 1.99994 16.5998 1.99994 17.9999C1.99994 19.4001 1.99994 20.1001 2.27242 20.6349C2.51211 21.1053 2.89456 21.4878 3.36496 21.7275C3.89974 21.9999 4.59981 21.9999 5.99994 21.9999L17.9999 21.9999Z" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M11.9999 5.99994L11.9999 13.9999M11.9999 5.99994C11.2997 5.99994 9.99147 7.99424 9.49994 8.49994M11.9999 5.99994C12.7002 5.99994 14.0084 7.99424 14.4999 8.49994" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M1.99994 7.99994C1.99994 5.66105 1.99994 4.49161 2.5364 3.63783C2.81615 3.19261 3.19261 2.81615 3.63783 2.5364C4.49161 1.99994 5.66105 1.99994 7.99994 1.99994L15.9999 1.99994C18.3388 1.99994 19.5083 1.99994 20.3621 2.5364C20.8073 2.81615 21.1837 3.19261 21.4635 3.63783C21.9999 4.49161 21.9999 5.66105 21.9999 7.99994" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  )
}

function CaixaIcon({ className, size = 24 }: { className?: string; size?: number }) {
  return (
    <svg height={size} width={size} fill="none" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className={className}>
      <path d="M11 2h2v4h6v2H7v3H5V6h6V2zM5 18h6v4h2v-4h6v-2H5v2zm14-7H5v2h12v3h2v-5z" fill="currentColor"/>
    </svg>
  )
}

function IconAtualizacoes({ className, size = 24 }: { className?: string; size?: number }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      className={className}
    >
      <path d="M20 11a8.1 8.1 0 0 0 -15.5 -2m-.5 -4v4h4" />
      <path d="M4 13a8.1 8.1 0 0 0 15.5 2m.5 4v-4h-4" />
      <path d="M12 9l0 3" />
      <path d="M12 15l.01 0" />
    </svg>
  )
}
import { NavItem } from './NavItem'
import { useModulePermission } from '@/hooks/usePermissions'
import { useSignOut } from '@/hooks/useSignOut'
import { TunerLogo } from '@/components/branding/TunerLogo'
import { useMyUnit } from '@/hooks/useMyUnit'
import { useUnreadSupportCount } from '@/hooks/useSupportTickets'
import { useUnseenJobs } from '@/hooks/useUnseenJobs'
import { useFranchiseOrderUpdatesCount } from '@/hooks/useNotifications'
import { useRoutePrefix } from '@/contexts/RoutePrefixContext'
import type { SidebarMode } from './AppShell'

interface FranqueadoSidebarProps {
  mode: SidebarMode
  onTogglePin: () => void
}

export function FranqueadoSidebar({ mode, onTogglePin }: FranqueadoSidebarProps) {
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const { data: myUnit } = useMyUnit()
  const unit = myUnit?.franchise_units
  const prefix = useRoutePrefix()
  const permEcu      = useModulePermission('ecu_arquivos')
  const permRemap    = useModulePermission('tabela_remap')
  const permPdv      = useModulePermission('pdv')
  const permClientes = useModulePermission('clientes')
  const permRelat    = useModulePermission('relatorios')
  const permConfig   = useModulePermission('configuracoes')
  const permFinanceiro = useModulePermission('financeiro')
  const { data: unreadSupport = 0 } = useUnreadSupportCount()
  const { count: unseenJobs } = useUnseenJobs()
  const { data: orderUpdates = 0 } = useFranchiseOrderUpdatesCount()
  const { signOut: logout } = useSignOut()

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
          <a href={`${prefix}/dashboard`} aria-label="Injediesel System — Painel Franqueado" tabIndex={isExpanded ? 0 : -1}>
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

      {isExpanded && unit?.city && (
        <p style={{
          margin: '0 10px 8px',
          fontSize: 11,
          fontFamily: 'var(--pm-font-mono)',
          fontWeight: 600,
          letterSpacing: '0.06em',
          color: 'hsl(var(--pm-gray-500))',
          textTransform: 'uppercase',
          textAlign: 'center',
        }}>
          {unit.city}{unit.state ? `-${unit.state}` : ''}
        </p>
      )}

      <nav className="flex-1 py-3 overflow-y-auto overflow-x-hidden">
        {!collapsed && <div className="pm-sidebar-group-title">Principal</div>}
        {collapsed  && <div className="h-px mx-3 my-2 bg-[hsl(var(--pm-gray-800))]" />}
        <NavItem to={`${prefix}/dashboard`} icon={LayoutDashboard} label="Dashboard" collapsed={collapsed} />

        {permEcu.canView && <>
          {!collapsed && <div className="pm-sidebar-group-title">ECU</div>}
          {collapsed  && <div className="h-px mx-3 my-2 bg-[hsl(var(--pm-gray-800))]" />}
          <NavItem to={`${prefix}/arquivos/novo`} icon={IconEnviarArquivo} label="Enviar Arquivo" collapsed={collapsed} end />
          <NavItem to={`${prefix}/arquivos`}      icon={Files}  label="Meus Arquivos"  collapsed={collapsed} badge={unseenJobs} end />
          {permRemap.canView && (
            <NavItem to={`${prefix}/tabela-remap`} icon={IconTabelaRemap} label="Tabela de Remap" collapsed={collapsed} />
          )}
        </>}

        {permPdv.canView && <>
          {!collapsed && <div className="pm-sidebar-group-title">Loja</div>}
          {collapsed  && <div className="h-px mx-3 my-2 bg-[hsl(var(--pm-gray-800))]" />}
          <NavItem to={`${prefix}/loja`}     icon={ShoppingBag}   label="Loja Injediesel"          collapsed={collapsed} />
          <NavItem to={`${prefix}/carrinho`} icon={ShoppingCart}  label="Meu Carrinho"          collapsed={collapsed} />
          <NavItem to={`${prefix}/pedidos`}  icon={IconHistoricoPedidos} label="Histórico de Compras"  collapsed={collapsed} badge={orderUpdates} />
        </>}

        {(permClientes.canView || permRelat.canView || permConfig.canView || permFinanceiro.canView) && <>
          {!collapsed && <div className="pm-sidebar-group-title">Gestão</div>}
          {collapsed  && <div className="h-px mx-3 my-2 bg-[hsl(var(--pm-gray-800))]" />}
          {permClientes.canView && (
            <NavItem to={`${prefix}/clientes`}   icon={Users}     label="Clientes"   collapsed={collapsed} />
          )}
          {permFinanceiro.canView && (
            <NavItem to={`${prefix}/caixa`} icon={CaixaIcon} label="Caixa" collapsed={collapsed} />
          )}
          {permFinanceiro.canView && (
            <NavItem to={`${prefix}/faturas`} icon={FileText} label="Faturas" collapsed={collapsed} />
          )}
          {permRelat.canView && (
            <NavItem to={`${prefix}/relatorios`} icon={BarChart3} label="Relatórios" collapsed={collapsed} />
          )}
          {permConfig.canView && (
            <NavItem to={`${prefix}/cadastros`}  icon={BookOpen}  label="Cadastros"  collapsed={collapsed} />
          )}
        </>}

        {!collapsed && <div className="pm-sidebar-group-title">Suporte</div>}
        {collapsed  && <div className="h-px mx-3 my-2 bg-[hsl(var(--pm-gray-800))]" />}
        <NavItem to={`${prefix}/atualizacoes`} icon={IconAtualizacoes} label="Atualizações"  collapsed={collapsed} />
        <NavItem to={`${prefix}/suporte`}      icon={Headphones} label="Suporte"       collapsed={collapsed} badge={unreadSupport} />
        <NavItem to={`${prefix}/materiais`}    icon={Megaphone}  label="Materiais MKT" collapsed={collapsed} />
      </nav>

      <div className="flex flex-col">
        <NavItem to={`${prefix}/perfil`} icon={User}       label="Perfil" collapsed={collapsed} />
        <NavItem to={`${prefix}/ajuda`}  icon={HelpCircle} label="Ajuda"  collapsed={collapsed} />
        <div className="h-px mx-3 my-1 bg-[hsl(var(--pm-gray-800))]" />
        <div className={['flex items-center py-3', collapsed ? 'justify-center px-0' : 'px-4 gap-3'].join(' ')}>
          {!collapsed && <span className="text-xs text-muted-foreground flex-1">v1.0</span>}
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
            <svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24"><g fill="none" fillRule="evenodd"><path d="M24 0v24H0V0zM12.593 23.258l-.011.002-.071.035-.02.004-.014-.004-.071-.035c-.01-.004-.019-.001-.024.005l-.004.01-.017.428.005.02.01.013.104.074.015.004.012-.004.104-.074.012-.016.004-.017-.017-.427c-.002-.01-.009-.017-.017-.018m.265-.113-.013.002-.185.093-.01.01-.003.011.018.43.005.012.008.007.201.093c.012.004.023 0 .029-.008l.004-.014-.034-.614c-.003-.012-.01-.02-.02-.022m-.715.002a.023.023 0 0 0-.027.006l-.006.014-.034.614c0 .012.007.02.017.024l.015-.002.201-.093.01-.008.004-.011.017-.43-.003-.012-.01-.01z"/><path fill="currentColor" d="M13.5 3a1.5 1.5 0 0 0-3 0v10a1.5 1.5 0 0 0 3 0zM7.854 5.75a1.5 1.5 0 1 0-1.661-2.5A10.492 10.492 0 0 0 1.5 12c0 5.799 4.701 10.5 10.5 10.5S22.5 17.799 22.5 12c0-3.654-1.867-6.70-4.693-8.75a1.5 1.5 0 0 0-1.66 2.5 7.5 7.5 0 1 1-8.292 0Z"/></g></svg>
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
