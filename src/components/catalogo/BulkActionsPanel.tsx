// src/components/catalogo/BulkActionsPanel.tsx
import { useState } from 'react'
import { Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useBulkUpdatePrice } from '@/hooks/useEcuCatalog'
import type { BulkPricePayload } from '@/types/ecu-catalog'

const CATEGORIAS = [
  { slug: 'all',           label: 'Todas as categorias' },
  { slug: 'carros-e-suvs', label: 'Carros & SUVs' },
  { slug: 'pickups',       label: 'Pickups' },
  { slug: 'trucks',        label: 'Trucks' },
  { slug: 'agricola',      label: 'Agrícola' },
  { slug: 'maquinas',      label: 'Máquinas' },
  { slug: 'motos',         label: 'Motos' },
]

export function BulkActionsPanel() {
  const [target, setTarget]   = useState<BulkPricePayload['target']>('preco_franqueado')
  const [catSlug, setCatSlug] = useState('all')
  const [pct, setPct]         = useState('')
  const [mode, setMode]       = useState<'add' | 'sub'>('add')
  const [confirm, setConfirm] = useState(false)
  const [result, setResult]   = useState<string | null>(null)

  const bulk = useBulkUpdatePrice()
  const percentual = parseFloat(pct)
  const valid = !isNaN(percentual) && percentual > 0

  function handleConfirm() {
    bulk.mutate(
      { target, categoriaSlug: catSlug, percentual: mode === 'add' ? percentual : -percentual },
      {
        onSuccess: (data) => {
          setResult(`✓ ${data.affected} registros atualizados`)
          setConfirm(false)
          setPct('')
          setTimeout(() => setResult(null), 4000)
        },
      },
    )
  }

  return (
    <div className="rounded-lg border border-[hsl(var(--pm-gray-700))] bg-[hsl(var(--pm-gray-900))] p-4">
      <div className="flex items-center gap-2 mb-3">
        <Zap size={14} className="text-[hsl(var(--pm-red-500))]" />
        <span className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
          Atualização em massa
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-[1fr_1fr_1fr_auto_auto] gap-3 items-end">
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Coluna alvo</label>
          <Select value={target} onValueChange={v => setTarget(v as typeof target)}>
            <SelectTrigger className="w-full h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="preco_franqueado">Franqueado</SelectItem>
              <SelectItem value="preco_cliente_final">Cliente Final</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Categoria</label>
          <Select value={catSlug} onValueChange={setCatSlug}>
            <SelectTrigger className="w-full h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIAS.map(c => (
                <SelectItem key={c.slug} value={c.slug}>{c.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Operação</label>
          <Select value={mode} onValueChange={v => setMode(v as 'add' | 'sub')}>
            <SelectTrigger className="w-full h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="add">+ Acréscimo %</SelectItem>
              <SelectItem value="sub">- Desconto %</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Percentual</label>
          <Input
            className="w-full h-8 text-xs font-mono"
            placeholder="ex: 10"
            value={pct}
            onChange={e => setPct(e.target.value.replace(/[^0-9.]/g, ''))}
          />
        </div>

        <Button
          size="sm"
          className="h-8 w-full sm:w-auto bg-[hsl(var(--pm-red-500))] hover:bg-[hsl(var(--pm-red-600))] col-span-2 sm:col-span-1 lg:col-span-1"
          disabled={!valid || bulk.isPending}
          onClick={() => setConfirm(true)}
        >
          Aplicar
        </Button>
      </div>

      {confirm && (
        <div className="mt-3 flex items-center gap-3 rounded border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-sm text-amber-400">
          <span>
            Isso recalculará <strong>{mode === 'add' ? '+' : '-'}{pct}%</strong> em{' '}
            <strong>{CATEGORIAS.find(c => c.slug === catSlug)?.label}</strong>{' '}
            (coluna: {target === 'preco_franqueado' ? 'Franqueado' : 'Cliente Final'}).
            Valores nulos/zero são ignorados.
          </span>
          <Button size="sm" variant="ghost" className="h-7 text-amber-400" onClick={() => setConfirm(false)}>
            Cancelar
          </Button>
          <Button
            size="sm"
            className="h-7 bg-amber-500 hover:bg-amber-600 text-black font-bold"
            onClick={handleConfirm}
            disabled={bulk.isPending}
          >
            {bulk.isPending ? 'Aplicando...' : 'Confirmar'}
          </Button>
        </div>
      )}

      {result && (
        <p className="mt-2 text-xs text-green-400 font-mono">{result}</p>
      )}
    </div>
  )
}
