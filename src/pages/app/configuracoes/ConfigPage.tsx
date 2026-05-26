import { useState } from 'react'
import { PageHeader } from '@/components/shared/PageHeader'
import { UsersTab } from './UsersTab'
import { CompanyTab } from './CompanyTab'

type Tab = 'usuarios' | 'empresa'

const TABS: { id: Tab; label: string }[] = [
  { id: 'usuarios', label: 'Usuários' },
  { id: 'empresa',  label: 'Empresa' },
]

export default function ConfigPage() {
  const [tab, setTab] = useState<Tab>('usuarios')

  return (
    <div>
      <PageHeader title="Configurações" subtitle="Usuários e configurações gerais da empresa" />

      {/* Tab strip */}
      <div className="flex gap-1 border-b border-[hsl(var(--pm-gray-700))] mb-6">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              tab === t.id
                ? 'text-foreground border-b-2 border-[hsl(var(--pm-red-500))] -mb-px'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'usuarios' && <UsersTab />}
      {tab === 'empresa'  && <CompanyTab />}
    </div>
  )
}
