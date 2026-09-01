import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useRoutePrefix } from '@/contexts/RoutePrefixContext'
import { Plus, Building2, FileSignature } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { RoleGuard } from '@/components/auth/RoleGuard'
import { PageHeader } from '@/components/shared/PageHeader'
import { DataTable, type Column } from '@/components/shared/DataTable'
import { FranchiseeWizard } from './wizard/FranchiseeWizard'
import { FranchiseChoiceCard } from './FranchiseChoiceCard'
import { useFranchiseUnits, type FranchiseUnit, type UnitStatus } from '@/hooks/useFranchiseUnits'
import { useSaldoFranquias, useFaturamentoPorUnidade, fmtBRL, diasEmAberto } from '@/hooks/useFranquiasFinanceiro'

// Critério de dívida = fechamento MENSAL (regra de negócio confirmada pelo Rogério).
// Cobranças acumulam do dia 1 ao fim do mês; ao virar o mês, o débito do mês fechado
// deve estar pago. Mês da cobrança = mês do created_at do job (a vw_saldo_franquias
// expõe MIN(created_at) como data_mais_antiga). Débito cuja cobrança mais antiga é de
// mês ANTERIOR ao corrente e ainda em aberto = ATRASADO (honesto, não é proxy de idade).
function isAtrasado(iso: string): boolean {
  const d = new Date(iso)
  const h = new Date()
  return d.getFullYear() < h.getFullYear()
    || (d.getFullYear() === h.getFullYear() && d.getMonth() < h.getMonth())
}
function mesRefAbrev(iso: string): string {
  const d = new Date(iso)
  return `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getFullYear()).slice(2)}`
}

interface DebtInfo { total: number; qtd: number; dataMaisAntiga: string; dias: number }

const CONTRACT_LABELS: Record<string, string> = { full: 'Full', linha_leve: 'Linha Leve' }

const STATUS_COLORS: Record<UnitStatus, { bg: string; color: string; label: string }> = {
  em_implantacao: { bg: 'rgba(96,165,250,0.1)', color: '#60A5FA', label: 'Em Implantação' },
  ativa:          { bg: 'rgba(52,211,153,0.1)', color: '#34D399',  label: 'Ativa' },
  suspensa:       { bg: 'rgba(251,191,36,0.1)', color: '#FBBF24',  label: 'Suspensa' },
  encerrada:      { bg: 'rgba(100,116,139,0.1)', color: '#64748B', label: 'Encerrada' },
}

const COLUMNS: Column<FranchiseUnit>[] = [
  { key: 'name', header: 'Nome' },
  {
    key: 'location', header: 'Localidade',
    cell: (r) => r.city && r.state ? `${r.city} — ${r.state}` : r.city ?? r.state ?? '—',
  },
  {
    key: 'manager', header: 'Gestor',
    // Gestor = responsável legal (dono/CEO, 1º acesso full). Fallback: conta vinculada.
    cell: (r) => r.responsavel_legal_nome?.trim() || r.manager_name?.trim() || '—',
  },
  {
    key: 'contract_type', header: 'Contrato',
    cell: (r) => {
      const isFullContract = r.contract_type === 'full'
      return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 9px', borderRadius: 999, background: isFullContract ? 'rgba(177,40,37,0.1)' : 'rgba(96,165,250,0.1)', color: isFullContract ? '#B12825' : '#60A5FA', fontSize: 11, fontWeight: 600 }}>
          <span style={{ width: 5, height: 5, borderRadius: '50%', background: isFullContract ? '#B12825' : '#60A5FA', flexShrink: 0 }} />
          {CONTRACT_LABELS[r.contract_type]}
        </span>
      )
    },
  },
  {
    key: 'status', header: 'Status',
    cell: (r) => {
      if (r.contract_blocked) {
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 9px', borderRadius: 999, background: 'rgba(251,191,36,0.1)', color: '#FBBF24', fontSize: 11, fontWeight: 600 }}>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#FBBF24', flexShrink: 0 }} />
            Bloqueada
          </span>
        )
      }
      const s = STATUS_COLORS[r.status ?? 'em_implantacao'] ?? STATUS_COLORS['em_implantacao']
      return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 9px', borderRadius: 999, background: s.bg, color: s.color, fontSize: 11, fontWeight: 600 }}>
          <span style={{ width: 5, height: 5, borderRadius: '50%', background: s.color, flexShrink: 0 }} />
          {s.label}
        </span>
      )
    },
  },
]

export default function FranchiseesPage() {
  const navigate = useNavigate()
  const prefix = useRoutePrefix()
  const [q, setQ] = useState('')
  const [page, setPage] = useState(0)
  const [formOpen, setFormOpen] = useState(false)
  const [choiceOpen, setChoiceOpen] = useState(false)
  const PAGE_SIZE = 20

  const { data, isLoading } = useFranchiseUnits({ q, page, pageSize: PAGE_SIZE })

  // Dívida por unidade (mesma fonte da ficha: ecu_jobs em aberto, via vw_saldo_franquias).
  // A view só traz unidades COM dívida > 0; as demais ficam sem entrada (dívida 0).
  const { data: saldos = [] } = useSaldoFranquias()
  const debtByUnit = useMemo(() => {
    const m = new Map<string, DebtInfo>()
    for (const s of saldos) {
      m.set(s.unit_id, { total: s.total_em_aberto, qtd: s.qtd_abertos, dataMaisAntiga: s.data_mais_antiga, dias: diasEmAberto(s.data_mais_antiga) })
    }
    return m
  }, [saldos])

  // Faturamento total por unidade (Σ amount_charged_to_customer, todo histórico).
  const { data: faturamentoMap } = useFaturamentoPorUnidade()

  const columns = useMemo<Column<FranchiseUnit>[]>(() => [
    ...COLUMNS,
    {
      key: 'faturamento', header: 'Faturamento',
      cell: (r) => {
        const f = faturamentoMap?.get(r.id) ?? 0
        return f > 0
          ? <span style={{ color: 'hsl(var(--pm-gray-200))', fontWeight: 600, whiteSpace: 'nowrap' }}>{fmtBRL(f)}</span>
          : <span style={{ color: 'hsl(var(--pm-gray-600))' }}>—</span>
      },
    },
    {
      key: 'divida', header: 'Dívida',
      cell: (r) => {
        const d = debtByUnit.get(r.id)
        if (!d || d.total <= 0) return <span style={{ color: 'hsl(var(--pm-gray-600))' }}>—</span>
        const overdue = isAtrasado(d.dataMaisAntiga)
        const color = overdue ? '#F87171' : '#FBBF24'
        const bg = overdue ? 'rgba(248,113,113,0.1)' : 'rgba(251,191,36,0.1)'
        const label = overdue ? `atrasado · desde ${mesRefAbrev(d.dataMaisAntiga)}` : 'em aberto'
        return (
          <span
            title={`${d.qtd} cobrança${d.qtd > 1 ? 's' : ''} em aberto · mais antiga há ${d.dias} dias`}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 9px', borderRadius: 999, background: bg, color, fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap' }}
          >
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: color, flexShrink: 0 }} />
            {fmtBRL(d.total)} · {label}
          </span>
        )
      },
    },
  ], [debtByUnit, faturamentoMap])

  // Destaque de linha: vermelho (mês fechado/atrasado) precede âmbar (mês corrente).
  const rowClassName = (r: FranchiseUnit): string | undefined => {
    const d = debtByUnit.get(r.id)
    if (!d || d.total <= 0) return undefined
    return isAtrasado(d.dataMaisAntiga)
      ? 'bg-[rgba(248,113,113,0.06)]'
      : 'bg-[rgba(251,191,36,0.05)]'
  }

  return (
    <div>
      <PageHeader
        title="Franqueados"
        subtitle="Unidades da rede Injediesel System"
        actions={
          <Button onClick={() => setChoiceOpen(true)} style={{ background: 'var(--pm-accent-gradient)' }}>
            <Plus size={16} className="mr-2" />Nova Franquia
          </Button>
        }
      />

      <DataTable
        columns={columns}
        data={data?.data ?? []}
        isLoading={isLoading}
        total={data?.total ?? 0}
        page={page}
        pageSize={PAGE_SIZE}
        onPageChange={setPage}
        onSearch={(v) => { setQ(v); setPage(0) }}
        searchValue={q}
        searchPlaceholder="Buscar por nome, cidade, CNPJ, e-mail, gestor..."
        onRowClick={(r) => navigate(`${prefix}/franqueados/${r.id}`)}
        rowClassName={rowClassName}
        emptyTitle="Nenhuma unidade"
        emptyDescription="Clique em Nova Unidade para adicionar."
      />

      <FranchiseeWizard open={formOpen} onOpenChange={setFormOpen} />

      {/* Fase 1 — bifurcação: cadastrar unidade existente OU vender novo contrato */}
      <Dialog open={choiceOpen} onOpenChange={setChoiceOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Nova Franquia</DialogTitle>
          </DialogHeader>
          <p className="text-sm" style={{ color: 'hsl(var(--pm-gray-500))' }}>
            Escolha o tipo de cadastro:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
            {/* A — Cadastrar existente (fluxo atual, só admin da matriz) */}
            <RoleGuard roles={['company_admin', 'operations_admin', 'system_ti']}>
              <FranchiseChoiceCard
                icon={<Building2 size={20} />}
                accent="#60A5FA"
                title="Cadastrar Existente"
                description="Unidade já operando — dados + convite por e-mail."
                cta="Cadastrar"
                onClick={() => { setChoiceOpen(false); setFormOpen(true) }}
              />
            </RoleGuard>

            {/* B — Novo contrato (venda de franquia; matriz: admins + vendedor) */}
            <RoleGuard roles={['company_admin', 'operations_admin', 'system_ti', 'seller']}>
              <FranchiseChoiceCard
                icon={<FileSignature size={20} />}
                accent="#F59E0B"
                title="Novo Contrato"
                description="Venda de franquia — contrato, pagamento e comissão."
                cta="Vender franquia"
                onClick={() => { setChoiceOpen(false); navigate(`${prefix}/franqueados/novo-contrato`) }}
              />
            </RoleGuard>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
