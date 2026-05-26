import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useRoutePrefix } from '@/contexts/RoutePrefixContext'
import { Plus } from 'lucide-react'
import { PermissionGuard } from '@/components/auth/PermissionGuard'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { PageHeader } from '@/components/shared/PageHeader'
import { DataTable, type Column } from '@/components/shared/DataTable'
import { useProducts, useProductCategories, useToggleProductActive, type ProductWithPrices } from '@/hooks/useProducts'

function formatCurrency(n: number) {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function ActiveToggle({ id, active }: { id: string; active: boolean }) {
  const toggle = useToggleProductActive()

  return (
    <button
      onClick={(e) => { e.stopPropagation(); toggle.mutate({ id, active: !active }) }}
      disabled={toggle.isPending}
      aria-label={active ? 'Desativar produto' : 'Ativar produto'}
      style={{
        position: 'relative',
        width: 21,
        height: 12,
        borderRadius: 6,
        border: 'none',
        cursor: toggle.isPending ? 'wait' : 'pointer',
        background: active ? '#22C55E' : '#EF4444',
        transition: 'background-color 280ms ease',
        opacity: toggle.isPending ? 0.65 : 1,
        flexShrink: 0,
        padding: 0,
      }}
    >
      <span
        style={{
          position: 'absolute',
          top: 1.5,
          left: active ? 10.5 : 1.5,
          width: 9,
          height: 9,
          borderRadius: '50%',
          background: 'white',
          boxShadow: '0 1px 3px rgba(0,0,0,0.35)',
          transition: 'left 280ms cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      />
    </button>
  )
}

const COLUMNS: Column<ProductWithPrices>[] = [
  {
    key: 'image_url', header: '',
    className: 'w-10 pr-0',
    cell: (r) => r.image_url
      ? <img src={r.image_url} alt="" className="h-8 w-8 object-cover rounded border border-white/10" onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
      : <div className="h-8 w-8 rounded border border-white/[0.06] bg-white/[0.03]" />,
  },
  { key: 'sku', header: 'SKU', className: 'font-mono text-xs w-24' },
  { key: 'name', header: 'Produto' },
  { key: 'category', header: 'Categoria' },
  {
    key: 'price_cf', header: 'Preço (CF)',
    cell: (r) => {
      const p = r.product_prices?.find((x) => x.tier === 'cliente_final')
      return p ? formatCurrency(p.price) : '—'
    },
  },
  {
    key: 'stock', header: 'Estoque',
    cell: (r) => (
      <span className={r.stock <= 0 ? 'text-amber-400' : 'text-foreground'}>{r.stock}</span>
    ),
  },
  {
    key: 'active', header: 'Ativo',
    className: 'w-20 text-right',
    cell: (r) => (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 10 }}>
        <div style={{ width: 1, height: 22, background: 'rgba(255,255,255,0.08)', flexShrink: 0 }} />
        <ActiveToggle id={r.id} active={r.active} />
      </div>
    ),
  },
]

export default function ProductsPage() {
  const navigate = useNavigate()
  const prefix = useRoutePrefix()
  const [q, setQ] = useState('')
  const [category, setCategory] = useState('')
  const [page, setPage] = useState(0)
  const PAGE_SIZE = 20

  const { data, isLoading } = useProducts({ q, category, page, pageSize: PAGE_SIZE })
  const { data: categories = [] } = useProductCategories()

  return (
    <div>
      <PageHeader
        title="Produtos"
        subtitle="Catálogo com 3 faixas de preço"
        actions={
          <PermissionGuard module="produtos" action="create">
            <Button
              onClick={() => navigate(`${prefix}/produtos/novo`)}
              style={{ background: 'var(--pm-accent-gradient)' }}
            >
              <Plus size={16} className="mr-2" />
              Novo Produto
            </Button>
          </PermissionGuard>
        }
      />

      <div className="mb-4 max-w-xs">
        <Select value={category || '_all'} onValueChange={(v) => { setCategory(v === '_all' ? '' : v); setPage(0) }}>
          <SelectTrigger><SelectValue placeholder="Filtrar por categoria..." /></SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">Todas as categorias</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat} value={cat}>{cat}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <DataTable
        columns={COLUMNS}
        data={data?.data ?? []}
        isLoading={isLoading}
        total={data?.total ?? 0}
        page={page}
        pageSize={PAGE_SIZE}
        onPageChange={setPage}
        onSearch={(v) => { setQ(v); setPage(0) }}
        searchValue={q}
        searchPlaceholder="Buscar por nome..."
        onRowClick={(r) => navigate(`${prefix}/produtos/${r.id}`)}
        emptyTitle="Nenhum produto"
        emptyDescription="Clique em Novo Produto para adicionar ao catálogo."
      />
    </div>
  )
}
