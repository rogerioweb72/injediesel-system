import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { FinancialCategory } from '@/hooks/useFinancial'

const schema = z.object({
  type:        z.enum(['receita', 'despesa']),
  category_id: z.string().optional(),
  description: z.string().min(3, 'Descrição obrigatória'),
  amount:      z.preprocess((v) => Number(v), z.number().positive('Valor deve ser positivo')),
})

type FormData = z.infer<typeof schema>

interface EntryFormPayload {
  category_id: string | null
  type: 'receita' | 'despesa'
  amount: number
  description: string
  period_year: number
  period_month: number
}

interface Props {
  categories: FinancialCategory[]
  year: number
  month: number
  onSubmit: (data: EntryFormPayload) => Promise<void>
  isPending: boolean
  onClose: () => void
}

export function EntryForm({ categories, year, month, onSubmit, isPending, onClose }: Props) {
  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema) as never,
    defaultValues: { type: 'receita' },
  })

  // eslint-disable-next-line react-hooks/incompatible-library
  const type = watch('type')
  const categoryId = watch('category_id')

  const filteredCategories = categories.filter((c) => c.type === type)

  async function submit(data: FormData) {
    await onSubmit({
      type: data.type,
      category_id: data.category_id || null,
      description: data.description,
      amount: data.amount as number,
      period_year: year,
      period_month: month,
    })
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="pm-card w-full max-w-md space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-foreground">Novo Lançamento</p>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
            <X size={14} />
          </Button>
        </div>

        <form onSubmit={handleSubmit(submit)} className="space-y-4">
          {/* Type toggle */}
          <div className="flex gap-2">
            {(['receita', 'despesa'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => { setValue('type', t); setValue('category_id', '') }}
                style={{
                  flex: 1, padding: '8px', borderRadius: 8, fontSize: 13, fontWeight: 500,
                  border: type === t
                    ? t === 'receita' ? '1px solid rgba(52,211,153,0.3)' : '1px solid rgba(248,113,113,0.3)'
                    : '1px solid rgba(255,255,255,0.07)',
                  background: type === t
                    ? t === 'receita' ? 'rgba(52,211,153,0.08)' : 'rgba(248,113,113,0.08)'
                    : 'transparent',
                  color: type === t
                    ? t === 'receita' ? '#34D399' : '#F87171'
                    : 'hsl(var(--muted-foreground))',
                  cursor: 'pointer', transition: 'all 150ms ease',
                }}
              >
                {t === 'receita' ? '+ Receita' : '− Despesa'}
              </button>
            ))}
          </div>

          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Categoria</label>
            <Select value={categoryId || '_none'} onValueChange={(v) => setValue('category_id', v === '_none' ? '' : v)}>
              <SelectTrigger><SelectValue placeholder="Sem categoria" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="_none">Sem categoria</SelectItem>
                {filteredCategories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Descrição *</label>
            <Input {...register('description')} placeholder="Ex: Venda PDV, Aluguel, etc." />
            {errors.description && <p className="text-xs text-red-400">{errors.description.message}</p>}
          </div>

          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Valor (R$) *</label>
            <Input {...register('amount')} type="number" step="0.01" min="0.01" placeholder="0,00" />
            {errors.amount && <p className="text-xs text-red-400">{errors.amount.message as string}</p>}
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              type="submit"
              disabled={isPending}
              style={{ background: 'var(--pm-accent-gradient)' }}
              className="flex-1"
            >
              {isPending ? 'Salvando...' : 'Salvar'}
            </Button>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
