import { NavLink } from 'react-router-dom'
import { cn } from '@/lib/utils'

interface NavItemProps {
  to: string
  icon: React.ElementType
  label: string
  collapsed?: boolean
  end?: boolean
  badge?: number
  onNavigate?: () => void
}

export function NavItem({ to, icon: Icon, label, collapsed, end, badge, onNavigate }: NavItemProps) {
  const hasBadge = !!badge && badge > 0
  return (
    <NavLink
      to={to}
      title={label}
      end={end}
      onClick={onNavigate}
      {...(collapsed ? { 'data-label': label } : {})}
      className={({ isActive }) =>
        cn('pm-sidebar-item', isActive && 'active', collapsed && 'pm-sidebar-item--icon')
      }
    >
      <span className="relative shrink-0">
        <Icon className="pm-sidebar-icon" size={16} />
        {hasBadge && (
          <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5 items-center justify-center">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-70" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-green-500" />
          </span>
        )}
      </span>
      {!collapsed && (
        <span className="flex items-center gap-2 min-w-0">
          {label}
          {hasBadge && (
            <span className="ml-auto flex h-4 min-w-4 items-center justify-center rounded-full bg-green-500 px-1 text-[10px] font-bold text-white tabular-nums">
              {badge > 9 ? '9+' : badge}
            </span>
          )}
        </span>
      )}
    </NavLink>
  )
}
