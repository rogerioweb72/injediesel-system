import { useState, useEffect } from 'react'
import { BookOpen } from 'lucide-react'
import { useMyUnit } from '@/hooks/useMyUnit'
import { useModulePermission } from '@/hooks/usePermissions'
import { TabFornecedores } from './tabs/TabFornecedores'
import { TabFormasPagamento } from './tabs/TabFormasPagamento'
import { TabServicos } from './tabs/TabServicos'
import { TabCategorias } from './tabs/TabCategorias'
import { UsersTab } from '@/pages/app/configuracoes/UsersTab'

type TabId = 'fornecedores' | 'formas-pagamento' | 'servicos' | 'categorias' | 'usuarios'

export default function CadastrosPage() {
  const { data: myUnit, isLoading } = useMyUnit()
  const [activeTab, setActiveTab] = useState<TabId>('fornecedores')
  const permConfig = useModulePermission('configuracoes')
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 1024)
    check()
    window.addEventListener('resize', check, { passive: true })
    return () => window.removeEventListener('resize', check)
  }, [])

  // undefined = loading, null = matrix, string = franchise
  const unitId: string | null | undefined = isLoading ? undefined : (myUnit?.unit_id ?? null)

  const TABS: { id: TabId; label: string }[] = [
    { id: 'fornecedores',     label: 'Fornecedores' },
    { id: 'formas-pagamento', label: 'Formas de Pagamento' },
    { id: 'servicos',         label: 'Serviços' },
    { id: 'categorias',       label: 'Categorias' },
    ...(permConfig.canView ? [{ id: 'usuarios' as TabId, label: 'Usuários' }] : []),
  ]

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <BookOpen className="h-5 w-5 text-blue-400" />
        <h1 className="text-xl font-bold text-white">Cadastros</h1>
      </div>

      {isMobile ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 4 }}>
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '8px 4px', fontSize: 11, fontWeight: 600, cursor: 'pointer',
                textAlign: 'center', border: '1px solid',
                borderRadius: 6,
                borderColor: activeTab === tab.id ? 'hsl(var(--pm-red-500))' : 'rgba(255,255,255,0.1)',
                background: activeTab === tab.id ? 'hsl(var(--pm-red-500)/0.15)' : 'transparent',
                color: activeTab === tab.id ? '#fff' : 'hsl(var(--muted-foreground))',
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      ) : (
        <div className="flex gap-0 overflow-x-auto border-b border-zinc-700">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`whitespace-nowrap px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
                activeTab === tab.id
                  ? 'border-blue-500 text-white'
                  : 'border-transparent text-zinc-400 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {activeTab === 'fornecedores'     && <TabFornecedores    unitId={unitId} />}
      {activeTab === 'formas-pagamento' && <TabFormasPagamento unitId={unitId} />}
      {activeTab === 'servicos'         && <TabServicos        unitId={unitId} />}
      {activeTab === 'categorias'       && <TabCategorias />}
      {activeTab === 'usuarios'         && <UsersTab />}
    </div>
  )
}
