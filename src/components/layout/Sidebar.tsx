import {
  LayoutDashboard, Files, Users, Building2,
  ShoppingCart, Store, Package, CreditCard,
  BarChart3, Headphones, Shield, Settings,
} from 'lucide-react'
import { NavItem } from './NavItem'
import { useProfile } from '@/hooks/useProfile'

export function Sidebar() {
  const { hasRole } = useProfile()

  return (
    <aside
      className="pm-sidebar"
      style={{ width: 'var(--pm-sidebar-width)' }}
    >
      {/* Logo */}
      <div className="flex items-center gap-2 px-4 py-5 border-b border-[hsl(var(--pm-gray-700))]">
        <span
          className="font-display text-xl font-black uppercase tracking-wider"
          style={{ color: 'hsl(var(--pm-red-500))' }}
        >
          PROMAX
        </span>
        <span className="font-display text-xl font-black uppercase tracking-wider text-foreground">
          TUNER
        </span>
      </div>

      {/* Navegação */}
      <nav className="flex-1 py-4 overflow-y-auto">
        <div className="pm-sidebar-group-title">Operação</div>
        <NavItem to="/matriz/dashboard" icon={LayoutDashboard} label="Dashboard" />
        <NavItem to="/matriz/arquivos" icon={Files} label="Arquivos ECU" />
        <NavItem to="/matriz/clientes" icon={Users} label="Clientes" />
        {hasRole('company_admin', 'operations_admin') && (
          <NavItem to="/matriz/franqueados" icon={Building2} label="Franqueados" />
        )}

        <div className="pm-sidebar-group-title">Loja</div>
        <NavItem to="/matriz/pdv" icon={CreditCard} label="PDV" />
        <NavItem to="/matriz/pedidos" icon={ShoppingCart} label="Pedidos" />
        <NavItem to="/matriz/produtos" icon={Package} label="Produtos" />
        <NavItem to="/matriz/loja" icon={Store} label="Loja Online" />

        <div className="pm-sidebar-group-title">Gestão</div>
        {hasRole('company_admin', 'finance_admin') && (
          <NavItem to="/matriz/financeiro" icon={BarChart3} label="Financeiro" />
        )}
        <NavItem to="/matriz/suporte" icon={Headphones} label="Suporte" />
        {hasRole('company_admin', 'auditor') && (
          <NavItem to="/matriz/auditoria" icon={Shield} label="Auditoria" />
        )}
        {hasRole('company_admin') && (
          <NavItem to="/matriz/configuracoes" icon={Settings} label="Configurações" />
        )}
      </nav>

      {/* Versão */}
      <div className="px-4 py-3 border-t border-[hsl(var(--pm-gray-700))]">
        <span className="text-xs text-muted-foreground">v1.0.0 — MVP</span>
      </div>
    </aside>
  )
}
