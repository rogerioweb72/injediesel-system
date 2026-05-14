interface PageHeaderProps {
  title: string
  highlight?: string
  subtitle?: string
  actions?: React.ReactNode
}

export function PageHeader({ title, highlight, subtitle, actions }: PageHeaderProps) {
  return (
    <div className="flex items-start justify-between mb-6">
      <div>
        <h1 className="pm-page-title">
          {title}
          {highlight && <span> {highlight}</span>}
        </h1>
        {subtitle && <p className="pm-page-subtitle mt-1">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  )
}
