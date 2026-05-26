// src/components/catalogo/CatalogoFiltros.tsx
import { useCallback } from 'react'
import { Search } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'

const CATEGORIAS_STATIC = [
  { slug: 'carros-e-suvs', label: 'Carros & SUVs' },
  { slug: 'pickups',       label: 'Pickups' },
  { slug: 'trucks',        label: 'Trucks' },
  { slug: 'agricola',      label: 'Agrícola' },
  { slug: 'maquinas',      label: 'Máquinas' },
  { slug: 'motos',         label: 'Motos' },
]

export interface FiltrosValue {
  categoriaSlug: string
  marca: string
  modelo: string
  ano: string
  apenasAtivos?: boolean
}

interface Props {
  value: FiltrosValue
  onChange: (v: FiltrosValue) => void
  marcas?: string[]
  showStatusFilter?: boolean
  categoryCounts?: Record<string, number>
  categorias?: Array<{ slug: string; label: string }>
}

export function CatalogoFiltros({ value, onChange, marcas = [], showStatusFilter = false, categoryCounts, categorias }: Props) {
  const cats = categorias ?? CATEGORIAS_STATIC
  const set = useCallback(
    (patch: Partial<FiltrosValue>) => onChange({ ...value, ...patch }),
    [value, onChange],
  )

  return (
    <div className="flex flex-wrap gap-3 items-center">
      <Select value={value.categoriaSlug} onValueChange={v => set({ categoriaSlug: v, marca: '' })}>
        <SelectTrigger className="w-44">
          <SelectValue placeholder="Categoria" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todas as categorias</SelectItem>
          {cats.map(c => {
            const n = categoryCounts ? categoryCounts[c.slug] : undefined
            return (
              <SelectItem key={c.slug} value={c.slug}>
                {c.label}{n != null ? ` (${n})` : ''}
              </SelectItem>
            )
          })}
        </SelectContent>
      </Select>

      <Select value={value.marca || 'all'} onValueChange={v => set({ marca: v === 'all' ? '' : v })}>
        <SelectTrigger className="w-36">
          <SelectValue placeholder="Marca" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todas as marcas</SelectItem>
          {marcas.filter(m => m && m.trim() !== '').map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
        </SelectContent>
      </Select>

      <div className="relative">
        <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-8 w-48"
          placeholder="Modelo/Desc."
          value={value.modelo}
          onChange={e => set({ modelo: e.target.value })}
        />
      </div>

      <div className="relative">
        <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-8 w-28"
          placeholder="Ano"
          value={value.ano}
          onChange={e => set({ ano: e.target.value })}
        />
      </div>

      {showStatusFilter && (
        <Select
          value={value.apenasAtivos === undefined ? 'all' : value.apenasAtivos ? 'ativos' : 'inativos'}
          onValueChange={v => set({
            apenasAtivos: v === 'all' ? undefined : v === 'ativos',
          })}
        >
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="ativos">Apenas ativos</SelectItem>
            <SelectItem value="inativos">Desativados</SelectItem>
          </SelectContent>
        </Select>
      )}
    </div>
  )
}
