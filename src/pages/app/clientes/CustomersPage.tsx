import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useRoutePrefix } from '@/contexts/RoutePrefixContext'
import { UserPlus, Building2, ChevronRight } from 'lucide-react'
import { PermissionGuard } from '@/components/auth/PermissionGuard'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/shared/PageHeader'
import { DataTable, type Column } from '@/components/shared/DataTable'
import { PriceTierBadge } from '@/components/shared/PriceTierBadge'
import { useCustomers, type Customer } from '@/hooks/useCustomers'
import { useListFilters } from '@/hooks/useListFilters'
import { useProfile } from '@/hooks/useProfile'
import { useFranchiseUnitsList } from '@/hooks/useFranchiseUnits'

const COLUMNS: Column<Customer>[] = [
  { key: 'name', header: 'Nome' },
  { key: 'email', header: 'E-mail', cell: (r) => r.email ?? '—' },
  { key: 'phone', header: 'Telefone', cell: (r) => r.phone ?? '—' },
  { key: 'document', header: 'CPF/CNPJ', cell: (r) => r.document ?? '—' },
  { key: 'price_tier', header: 'Tier', cell: (r) => <PriceTierBadge tier={r.price_tier} /> },
  {
    key: 'active', header: 'Status',
    cell: (r) => (
      <span style={{ fontSize: 12, fontWeight: 500, color: r.active ? '#34D399' : '#475569' }}>
        {r.active ? 'Ativo' : 'Inativo'}
      </span>
    ),
  },
]

const PAGE_SIZE = 20

type TabId = 'matriz' | 'franquias'

// ── Aba Franquias — lista de unidades ──────────────────────────────────────────

function FranquiasTab({ onSelectUnit }: { onSelectUnit: (id: string, name: string) => void }) {
  const { data: units = [] } = useFranchiseUnitsList()

  if (!units.length) {
    return (
      <div className="flex items-center justify-center py-16 rounded-xl"
        style={{ background: 'hsl(var(--pm-gray-900))', border: '1px dashed rgba(255,255,255,0.08)' }}>
        <p className="text-sm" style={{ color: 'hsl(var(--pm-gray-600))' }}>Nenhuma unidade franqueada</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {units.map((u) => (
        <button
          key={u.id}
          onClick={() => onSelectUnit(u.id, u.name)}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left hover:bg-white/[0.03] transition-colors"
          style={{ background: 'hsl(var(--pm-gray-900))', border: '1px solid rgba(255,255,255,0.06)' }}
        >
          <Building2 size={15} style={{ color: '#60A5FA', flexShrink: 0 }} />
          <span className="text-sm font-medium text-white flex-1">{u.name}</span>
          <ChevronRight size={14} style={{ color: 'hsl(var(--pm-gray-600))' }} />
        </button>
      ))}
    </div>
  )
}

// ── Clientes de uma unidade ────────────────────────────────────────────────────

function UnitCustomers({
  unitId, unitName, onBack,
}: { unitId: string; unitName: string; onBack: () => void }) {
  const navigate = useNavigate()
  const prefix = useRoutePrefix()
  const { filters, page, setPage, setFilter } = useListFilters({ q: '' })
  const { data, isLoading } = useCustomers({ q: filters.q, page, pageSize: PAGE_SIZE, unitId })

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <button
          onClick={onBack}
          className="text-xs underline"
          style={{ color: 'hsl(var(--pm-gray-500))' }}
        >
          ← Franquias
        </button>
        <span className="text-xs" style={{ color: 'hsl(var(--pm-gray-700))' }}>/</span>
        <span className="text-sm font-semibold text-white">{unitName}</span>
      </div>
      <DataTable
        columns={COLUMNS}
        data={data?.data ?? []}
        isLoading={isLoading}
        total={data?.total ?? 0}
        page={page}
        pageSize={PAGE_SIZE}
        onPageChange={setPage}
        onSearch={(v) => setFilter('q', v)}
        searchValue={filters.q}
        searchPlaceholder="Buscar por nome, CPF ou telefone..."
        onRowClick={(r) => navigate(`${prefix}/clientes/${r.id}`)}
        emptyTitle="Nenhum cliente"
        emptyDescription="Esta unidade ainda não possui clientes cadastrados."
      />
    </div>
  )
}

// ── Página principal ───────────────────────────────────────────────────────────

export default function CustomersPage() {
  const navigate = useNavigate()
  const prefix = useRoutePrefix()
  const { isMatrixUser } = useProfile()
  const { filters, page, setPage, setFilter } = useListFilters({ q: '' })

  const [activeTab, setActiveTab] = useState<TabId>('matriz')
  const [selectedUnit, setSelectedUnit] = useState<{ id: string; name: string } | null>(null)

  const isMatrix = isMatrixUser()
  const hasSearch = filters.q.trim().length > 0

  // scope: when searching, show all; otherwise filter by tab
  const scope = hasSearch ? 'all' : (activeTab === 'matriz' ? 'matrix' : undefined)

  const { data, isLoading } = useCustomers({
    q: filters.q,
    page,
    pageSize: PAGE_SIZE,
    scope: isMatrix ? scope : undefined,
  })

  const tabStyle = (id: TabId): React.CSSProperties => ({
    padding: '6px 16px',
    borderRadius: 8,
    fontSize: 13,
    fontWeight: 500,
    cursor: 'pointer',
    border: 'none',
    background: activeTab === id ? 'hsl(var(--pm-red-500)/0.15)' : 'transparent',
    color: activeTab === id ? '#fff' : 'hsl(var(--pm-gray-500))',
    borderBottom: activeTab === id ? '2px solid hsl(var(--pm-red-500))' : '2px solid transparent',
  })

  function handleSelectUnit(id: string, name: string) {
    setSelectedUnit({ id, name })
  }

  return (
    <div>
      <PageHeader
        title="Clientes"
        subtitle="Gerencie os clientes cadastrados"
        actions={
          <PermissionGuard module="clientes" action="create">
            <Button
              onClick={() => navigate(`${prefix}/clientes/novo`)}
              style={{ background: 'var(--pm-accent-gradient)' }}
            >
              <UserPlus size={16} className="mr-2" />
              Novo Cliente
            </Button>
          </PermissionGuard>
        }
      />

      {/* Tabs — só para usuários da matriz */}
      {isMatrix && !hasSearch && (
        <div className="flex items-center gap-1 mb-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <button style={tabStyle('matriz')} onClick={() => { setActiveTab('matriz'); setSelectedUnit(null) }}>
            Matriz
          </button>
          <button style={tabStyle('franquias')} onClick={() => { setActiveTab('franquias'); setSelectedUnit(null) }}>
            Franquias
          </button>
        </div>
      )}

      {/* Aba Franquias — lista de unidades ou clientes da unidade selecionada */}
      {isMatrix && !hasSearch && activeTab === 'franquias' ? (
        selectedUnit ? (
          <UnitCustomers
            unitId={selectedUnit.id}
            unitName={selectedUnit.name}
            onBack={() => setSelectedUnit(null)}
          />
        ) : (
          <div>
            <FranquiasTab onSelectUnit={handleSelectUnit} />
          </div>
        )
      ) : (
        /* Aba Matriz (default) ou busca global ou usuário franqueado */
        <DataTable
          columns={COLUMNS}
          data={data?.data ?? []}
          isLoading={isLoading}
          total={data?.total ?? 0}
          page={page}
          pageSize={PAGE_SIZE}
          onPageChange={setPage}
          onSearch={(v) => { setFilter('q', v); setPage(0) }}
          searchValue={filters.q}
          searchPlaceholder={
            isMatrix
              ? 'Buscar por nome, CPF ou telefone (busca em todas as unidades)...'
              : 'Buscar por nome, CPF ou telefone...'
          }
          onRowClick={(r) => navigate(`${prefix}/clientes/${r.id}`)}
          emptyTitle="Nenhum cliente"
          emptyDescription={
            hasSearch
              ? 'Nenhum resultado para a busca.'
              : 'Clique em Novo Cliente para adicionar o primeiro.'
          }
        />
      )}
    </div>
  )
}
