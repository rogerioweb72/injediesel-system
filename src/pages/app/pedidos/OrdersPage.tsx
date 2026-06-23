import { useState } from 'react'
import { PageHeader } from '@/components/shared/PageHeader'
import { DataTable, type Column } from '@/components/shared/DataTable'
import { usePosSales, type PosSale } from '@/hooks/useOrders'

function formatCurrency(n: number) {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

const PAYMENT_LABEL: Record<string, string> = {
  dinheiro: 'Dinheiro',
  cartao: 'Cartão',
  pix: 'PIX',
}

const COLUMNS: Column<PosSale>[] = [
  {
    key: 'id',
    header: '#',
    cell: (sale) => (
      <span className="font-mono text-xs text-muted-foreground">
        {sale.id.slice(0, 8).toUpperCase()}
      </span>
    ),
  },
  {
    key: 'created_at',
    header: 'Data',
    cell: (sale) => (
      <span className="text-sm text-foreground">{formatDateTime(sale.created_at)}</span>
    ),
  },
  {
    key: 'customers',
    header: 'Cliente',
    cell: (sale) => (
      <span className="text-sm text-foreground">
        {(sale.customers as { name: string } | null)?.name ?? 'Avulso'}
      </span>
    ),
  },
  {
    key: 'payment_method',
    header: 'Pagamento',
    cell: (sale) => (
      <span className="text-sm text-foreground">
        {PAYMENT_LABEL[sale.payment_method] ?? sale.payment_method}
      </span>
    ),
  },
  {
    key: 'total',
    header: 'Total',
    cell: (sale) => (
      <span className="text-sm font-bold" style={{ color: 'hsl(var(--pm-red-500))' }}>
        {formatCurrency(sale.total)}
      </span>
    ),
  },
]

export default function OrdersPage() {
  const [page, setPage] = useState(0)
  const [search, setSearch] = useState('')
  const PAGE_SIZE = 20

  const { data, isLoading } = usePosSales({ page, pageSize: PAGE_SIZE })

  const sales = (data?.data ?? []).filter((s) => {
    if (!search) return true
    const q = search.toLowerCase()
    const customerName = (s.customers as { name: string } | null)?.name ?? ''
    return (
      customerName.toLowerCase().includes(q) ||
      s.id.toLowerCase().includes(q) ||
      s.payment_method.toLowerCase().includes(q)
    )
  })

  return (
    <div>
      <PageHeader title="Vendas PDV" subtitle="Histórico de vendas realizadas no ponto de venda" />

      <DataTable
        columns={COLUMNS}
        data={sales}
        isLoading={isLoading}
        total={data?.total ?? 0}
        page={page}
        pageSize={PAGE_SIZE}
        onPageChange={setPage}
        onSearch={setSearch}
        searchValue={search}
        searchPlaceholder="Buscar por cliente, ID ou pagamento..."
        emptyTitle="Nenhuma venda encontrada"
        emptyDescription="Realize vendas no PDV para visualizá-las aqui."
      />
    </div>
  )
}
