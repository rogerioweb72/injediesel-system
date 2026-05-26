import { useNavigate } from 'react-router-dom'
import { useRoutePrefix } from '@/contexts/RoutePrefixContext'
import { UserPlus } from 'lucide-react'
import { PermissionGuard } from '@/components/auth/PermissionGuard'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/shared/PageHeader'
import { DataTable, type Column } from '@/components/shared/DataTable'
import { PriceTierBadge } from '@/components/shared/PriceTierBadge'
import { useCustomers, type Customer } from '@/hooks/useCustomers'
import { useListFilters } from '@/hooks/useListFilters'

const COLUMNS: Column<Customer>[] = [
  { key: 'name', header: 'Nome' },
  { key: 'email', header: 'E-mail', cell: (r) => r.email ?? '—' },
  { key: 'phone', header: 'Telefone', cell: (r) => r.phone ?? '—' },
  { key: 'document', header: 'CPF/CNPJ', cell: (r) => r.document ?? '—' },
  {
    key: 'price_tier', header: 'Tier',
    cell: (r) => <PriceTierBadge tier={r.price_tier} />,
  },
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

export default function CustomersPage() {
  const navigate = useNavigate()
  const prefix = useRoutePrefix()
  const { filters, page, setPage, setFilter } = useListFilters({ q: '' })

  const { data, isLoading } = useCustomers({ q: filters.q, page, pageSize: PAGE_SIZE })

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
        searchPlaceholder="Buscar por nome..."
        onRowClick={(r) => navigate(`${prefix}/clientes/${r.id}`)}
        emptyTitle="Nenhum cliente"
        emptyDescription="Clique em Novo Cliente para adicionar o primeiro."
      />
    </div>
  )
}
