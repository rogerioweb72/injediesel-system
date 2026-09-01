import { useQuery } from '@tanstack/react-query'
import { Users, UserCog, FileStack, TrendingUp, TrendingDown, Wallet, AlertTriangle, CalendarClock } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useCustomers } from '@/hooks/useCustomers'
import { useUnitUsers, type FranchiseUnit } from '@/hooks/useFranchiseUnits'
import { useSaldoFranquias, useFaturamentoPorUnidade, fmtBRL } from '@/hooks/useFranquiasFinanceiro'
import { contractDaysRemaining } from '@/components/shared/ContractProgressBar'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sb = () => supabase as any

// Caixa interno da unidade: Σ receitas − Σ despesas (financial_entries do unit_id).
function useUnitCashSummary(unitId: string) {
  return useQuery({
    queryKey: ['unit-cash', unitId],
    enabled: !!unitId,
    queryFn: async () => {
      const { data, error } = await sb().from('financial_entries').select('type, amount').eq('unit_id', unitId)
      if (error) throw error
      let receitas = 0, despesas = 0
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      for (const r of ((data ?? []) as any[])) {
        if (r.type === 'receita') receitas += Number(r.amount ?? 0)
        else despesas += Number(r.amount ?? 0)
      }
      return { receitas, despesas, saldo: receitas - despesas }
    },
  })
}

export function VisaoUnidadeTab({ unit }: { unit: FranchiseUnit }) {
  const { data: clientes } = useCustomers({ unitId: unit.id, pageSize: 1 })
  const { data: colaboradores = [] } = useUnitUsers(unit.id)
  const { data: saldos = [] } = useSaldoFranquias()
  const { data: faturamentoMap } = useFaturamentoPorUnidade()
  const { data: caixa } = useUnitCashSummary(unit.id)

  const saldo = saldos.find((s) => s.unit_id === unit.id)
  const dividaMatriz = saldo?.total_em_aberto ?? 0
  const jobsAbertos = saldo?.qtd_abertos ?? 0
  const faturamento = faturamentoMap?.get(unit.id) ?? 0
  const diasContrato = unit.contract_end_date ? contractDaysRemaining(unit.contract_end_date) : null

  return (
    <div className="space-y-6">
      {/* Operação */}
      <section className="space-y-2">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Operação</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Kpi icon={<Users size={15} />} label="Clientes" value={String(clientes?.total ?? 0)} />
          <Kpi icon={<UserCog size={15} />} label="Colaboradores" value={String(colaboradores.length)} />
          <Kpi icon={<FileStack size={15} />} label="Faturamento (ECU)" value={fmtBRL(faturamento)} color="#34D399" />
          <Kpi icon={<CalendarClock size={15} />} label="Contrato" value={diasContrato != null ? `${diasContrato} dias` : '—'}
            color={diasContrato != null && diasContrato < 30 ? '#F87171' : undefined} />
        </div>
      </section>

      {/* Financeiro — com a Matriz */}
      <section className="space-y-2">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Financeiro — com a Matriz (ECU)</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Kpi icon={<AlertTriangle size={15} />} label="Dívida em aberto" value={fmtBRL(dividaMatriz)}
            color={dividaMatriz > 0 ? '#F87171' : '#34D399'} />
          <Kpi icon={<FileStack size={15} />} label="Jobs em aberto" value={String(jobsAbertos)}
            color={jobsAbertos > 0 ? '#F59E0B' : undefined} />
        </div>
        <p className="text-[11px] text-muted-foreground">O que a unidade deve à matriz pelo processamento de arquivos de ECU.</p>
      </section>

      {/* Financeiro — Caixa interno da unidade */}
      <section className="space-y-2">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Financeiro — Caixa interno da unidade</p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <Kpi icon={<TrendingUp size={15} />} label="Receitas" value={fmtBRL(caixa?.receitas ?? 0)} color="#34D399" />
          <Kpi icon={<TrendingDown size={15} />} label="Despesas" value={fmtBRL(caixa?.despesas ?? 0)} color="#F87171" />
          <Kpi icon={<Wallet size={15} />} label="Saldo" value={fmtBRL(caixa?.saldo ?? 0)}
            color={(caixa?.saldo ?? 0) >= 0 ? '#34D399' : '#F87171'} />
        </div>
        <p className="text-[11px] text-muted-foreground">Movimento de caixa próprio da unidade (lançamentos do financeiro dela).</p>
      </section>
    </div>
  )
}

function Kpi({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color?: string }) {
  return (
    <div className="rounded-lg px-3 py-3" style={{ background: 'hsl(var(--pm-gray-900))', border: '1px solid rgba(255,255,255,0.06)' }}>
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-zinc-500">
        <span style={{ color: color ?? '#94A3B8' }}>{icon}</span> {label}
      </div>
      <p className="mt-1 text-lg font-semibold" style={{ color: color ?? '#fff' }}>{value}</p>
    </div>
  )
}
