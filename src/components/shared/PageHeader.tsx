import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { usePageHeaderContext } from '@/contexts/PageHeaderContext'

interface PageHeaderProps {
  title: string
  highlight?: string
  subtitle?: string
  actions?: React.ReactNode
}

export function PageHeader({ title, highlight, subtitle, actions }: PageHeaderProps) {
  const { setPageHeader, clearPageHeader } = usePageHeaderContext()
  const fullTitle = title + (highlight ? ` ${highlight}` : '')

  useEffect(() => {
    setPageHeader({ title: fullTitle, subtitle })
    return () => clearPageHeader()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fullTitle, subtitle])

  const slot = document.getElementById('topbar-actions')
  if (!actions || !slot) return null
  return createPortal(actions, slot)
}
