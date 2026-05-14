import { NavLink } from 'react-router-dom'
import { cn } from '@/lib/utils'
import type { LucideIcon } from 'lucide-react'

interface NavItemProps {
  to: string
  icon: LucideIcon
  label: string
  collapsed?: boolean
}

export function NavItem({ to, icon: Icon, label, collapsed }: NavItemProps) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn('pm-sidebar-item', isActive && 'active')
      }
    >
      <Icon className="pm-sidebar-icon" size={16} />
      {!collapsed && <span>{label}</span>}
    </NavLink>
  )
}
