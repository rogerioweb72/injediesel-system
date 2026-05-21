import { useNavigate } from 'react-router-dom'
import { useRoutePrefix } from '@/contexts/RoutePrefixContext'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { PageHeader } from '@/components/shared/PageHeader'
import { useCreateSupportTicket } from '@/hooks/useSupportTickets'
import { useCustomers } from '@/hooks/useCustomers'
import { useAuthStore } from '@/stores/auth'
import { CATEGORY_LABELS } from '@/types/app'
import type { TicketCategory } from '@/types/app'

const schema = z.object({
  title:       z.string().min(5, 'Título deve ter pelo menos 5 caracteres'),
  customer_id: z.string().optional(),
  category:    z.enum(['tecnico', 'financeiro', 'operacional', 'ecu_arquivo', 'outro'] as [TicketCategory, ...TicketCategory[]]),
  priority:    z.enum(['baixa', 'media', 'alta', 'critica']),
  body:        z.string().min(10, 'Descreva o problema (mín. 10 caracteres)'),
  unit_id:     z.string().nullable().optional(),
})

type FormData = z.infer<typeof schema>

export default function SupportTicketForm() {
  const navigate = useNavigate()
  const prefix = useRoutePrefix()
  const create = useCreateSupportTicket()
  const { data: customersData } = useCustomers({ pageSize: 200 })
  const customers = customersData?.data ?? []
  const profile = useAuthStore((s) => s.profile)
  const isFranchise = profile?.role && ['franchise_manager', 'unit_operator'].includes(profile.role)

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      priority: 'media',
      category: 'outro',
      unit_id: isFranchise ? (profile?.unit_id ?? null) : null,
    },
  })

  const priority = watch('priority')
  const category = watch('category')
  const customerId = watch('customer_id')

  async function onSubmit(data: FormData) {
    const ticket = await create.mutateAsync({
      title:       data.title,
      customer_id: data.customer_id || null,
      category:    data.category as TicketCategory,
      priority:    data.priority,
      body:        data.body,
      unit_id:     isFranchise ? (profile?.unit_id ?? null) : (data.unit_id ?? null),
    })
    navigate(`${prefix}/suporte/${ticket.id}`)
  }

  return (
    <div>
      <PageHeader title="Novo Ticket" subtitle="Abrir chamado de suporte" />

      <form onSubmit={handleSubmit(onSubmit)} className="max-w-2xl space-y-6">

        <div className="pm-card space-y-4">
          <p className="text-sm font-medium text-foreground">Informações do Chamado</p>

          {/* Título */}
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Título *</label>
            <Input
              {...register('title')}
              placeholder="Resumo do problema em uma linha"
            />
            {errors.title && <p className="text-xs text-red-400">{errors.title.message}</p>}
          </div>

          {/* Cliente */}
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Cliente (opcional)</label>
            <Select value={customerId || '_none'} onValueChange={(v) => setValue('customer_id', v === '_none' ? '' : v)}>
              <SelectTrigger><SelectValue placeholder="Sem cliente associado" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="_none">Sem cliente</SelectItem>
                {customers.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Categoria */}
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Categoria *</label>
              <Select value={category || 'outro'} onValueChange={(v) => setValue('category', v as TicketCategory)}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {(Object.entries(CATEGORY_LABELS) as [TicketCategory, string][]).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.category && <p className="text-xs text-red-400">{errors.category.message}</p>}
            </div>

            {/* Prioridade */}
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Prioridade *</label>
              <Select value={priority} onValueChange={(v) => setValue('priority', v as FormData['priority'])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="baixa">Baixa</SelectItem>
                  <SelectItem value="media">Média</SelectItem>
                  <SelectItem value="alta">Alta</SelectItem>
                  <SelectItem value="critica">Crítica</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="pm-card space-y-4">
          <p className="text-sm font-medium text-foreground">Descrição do Problema</p>
          <div className="space-y-1">
            <textarea
              {...register('body')}
              rows={6}
              placeholder="Descreva detalhadamente o problema ou dúvida..."
              className="w-full resize-none rounded-md border border-[hsl(var(--pm-gray-700))] bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-[hsl(var(--pm-red-500))]"
            />
            {errors.body && <p className="text-xs text-red-400">{errors.body.message}</p>}
          </div>
        </div>

        <div className="flex gap-3">
          <Button
            type="submit"
            disabled={create.isPending}
            style={{ background: 'var(--pm-accent-gradient)' }}
          >
            {create.isPending ? 'Abrindo...' : 'Abrir Ticket'}
          </Button>
          <Button type="button" variant="outline" onClick={() => navigate(`${prefix}/suporte`)}>
            Cancelar
          </Button>
        </div>
      </form>
    </div>
  )
}
