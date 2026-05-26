import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ShoppingCart, Plus, Search, Package } from 'lucide-react'
import { useRoutePrefix } from '@/contexts/RoutePrefixContext'
import { PageHeader } from '@/components/shared/PageHeader'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useProducts } from '@/hooks/useProducts'
import { useMyUnit } from '@/hooks/useMyUnit'
import { useCart } from '@/stores/cart'
import { formatCurrency } from '@/lib/utils'
import type { PriceTier } from '@/types/app'
import { toast } from 'sonner'

const CATEGORIES = [
  'Aditivos',
  'Downpipe',
  'Filtro de ar',
  'Filtro de Combustível',
  'Grife',
  'Man. e Acessórios',
  'Piggy Back',
  'Pro Booster',
  'Refil de Filtros',
]

function tierFromContract(contractType: string | undefined): PriceTier {
  if (contractType === 'linha_leve') return 'franqueado_linha_leve'
  return 'franqueado_full'
}

export default function FranqueadoLojaPage() {
  const prefix = useRoutePrefix()
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const [category, setCategory] = useState('')
  const { data: myUnit } = useMyUnit()
  const { data: productsData, isLoading } = useProducts({ q, pageSize: 200 })
  const { items, add } = useCart()

  const tier = tierFromContract(myUnit?.franchise_units?.contract_type)
  const allActive = (productsData?.data ?? []).filter(p => p.active)
  const filtered = category ? allActive.filter(p => p.category === category) : allActive
  const cartCount = items.reduce((s, i) => s + i.quantity, 0)

  // desktop: 4 cols × 7 rows = 28 | mobile: 20
  const DESKTOP_LIMIT = 48
  const MOBILE_LIMIT  = 20

  function getPrice(product: typeof allActive[0]): number | null {
    const pp = product.product_prices?.find(p => p.tier === tier)
    return pp?.price ?? null
  }

  function handleAdd(product: typeof allActive[0]) {
    const price = getPrice(product)
    if (price === null) return
    add({ productId: product.id, sku: product.sku, name: product.name, price, imageUrl: product.image_url })
    toast.success(`${product.name} adicionado ao carrinho`)
  }

  return (
    <div>
      <PageHeader title="Loja Promax" subtitle="Produtos disponíveis para sua unidade" />

      {/* Toolbar */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Buscar produto..."
            className="pl-8"
          />
        </div>
        <Button
          variant="outline"
          className="relative shrink-0"
          onClick={() => navigate(`${prefix}/carrinho`)}
        >
          <ShoppingCart size={16} className="mr-2" />
          Carrinho
          {cartCount > 0 && (
            <span
              className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full text-[10px] font-bold flex items-center justify-center text-white"
              style={{ background: 'hsl(var(--pm-red-500))' }}
            >
              {cartCount}
            </span>
          )}
        </Button>
      </div>

      {/* Categorias */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-5 scrollbar-none">
        <button
          onClick={() => setCategory('')}
          className={[
            'shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors',
            category === ''
              ? 'text-white'
              : 'bg-[hsl(var(--pm-gray-800))] text-muted-foreground hover:text-foreground',
          ].join(' ')}
          style={category === '' ? { background: 'hsl(var(--pm-red-500))' } : undefined}
        >
          Todos
        </button>
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => setCategory(cat === category ? '' : cat)}
            className={[
              'shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap',
              category === cat
                ? 'text-white'
                : 'bg-[hsl(var(--pm-gray-800))] text-muted-foreground hover:text-foreground',
            ].join(' ')}
            style={category === cat ? { background: 'hsl(var(--pm-red-500))' } : undefined}
          >
            {cat}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="pm-skeleton h-52 rounded-xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
          <Package size={36} className="text-muted-foreground opacity-40" />
          <p className="text-sm text-muted-foreground">Nenhum produto encontrado.</p>
        </div>
      ) : (
        <>
          {/* Mobile: limita 20 */}
          <div className="grid grid-cols-2 gap-3 sm:hidden">
            {filtered.slice(0, MOBILE_LIMIT).map(product => (
              <ProductCard
                key={product.id}
                product={product}
                price={getPrice(product)}
                inCart={items.find(i => i.productId === product.id)}
                onAdd={() => handleAdd(product)}
              />
            ))}
          </div>

          {/* Desktop: 6 colunas, 8 linhas = 48 itens */}
          <div className="hidden sm:grid grid-cols-4 lg:grid-cols-6 gap-4">
            {filtered.slice(0, DESKTOP_LIMIT).map(product => (
              <ProductCard
                key={product.id}
                product={product}
                price={getPrice(product)}
                inCart={items.find(i => i.productId === product.id)}
                onAdd={() => handleAdd(product)}
              />
            ))}
          </div>

          {filtered.length > DESKTOP_LIMIT && (
            <p className="text-xs text-muted-foreground text-center mt-4">
              Exibindo {DESKTOP_LIMIT} de {filtered.length} produtos. Use a busca ou filtre por categoria.
            </p>
          )}
        </>
      )}
    </div>
  )
}

interface ProductCardProps {
  product: { id: string; name: string; category: string; description: string | null; image_url: string | null }
  price: number | null
  inCart: { quantity: number } | undefined
  onAdd: () => void
}

function ProductCard({ product, price, inCart, onAdd }: ProductCardProps) {
  return (
    <div className="pm-card flex flex-col gap-3 p-4">
      {product.image_url ? (
        <img
          src={product.image_url}
          alt={product.name}
          className="w-full h-28 object-contain rounded-lg bg-[hsl(var(--pm-gray-800))]"
        />
      ) : (
        <div className="w-full h-28 rounded-lg bg-[hsl(var(--pm-gray-800))] flex items-center justify-center">
          <Package size={28} className="text-muted-foreground opacity-30" />
        </div>
      )}

      <div className="flex-1">
        <p className="text-[10px] text-muted-foreground mb-0.5 uppercase tracking-wide">{product.category}</p>
        <p className="text-sm font-medium text-foreground leading-tight line-clamp-2">{product.name}</p>
      </div>

      <div className="flex items-center justify-between mt-auto pt-2 border-t border-white/[0.06]">
        {price !== null ? (
          <span className="text-sm font-bold text-foreground">{formatCurrency(price)}</span>
        ) : (
          <span className="text-[10px] text-muted-foreground">Indisponível</span>
        )}
        <Button
          size="sm"
          disabled={price === null}
          onClick={onAdd}
          className="h-7 text-xs px-2"
          style={inCart
            ? { background: 'rgba(52,211,153,0.15)', color: '#34D399', border: '1px solid rgba(52,211,153,0.25)' }
            : { background: 'var(--pm-accent-gradient)' }}
        >
          <Plus size={12} className="mr-0.5" />
          {inCart ? inCart.quantity : 'Add'}
        </Button>
      </div>
    </div>
  )
}
