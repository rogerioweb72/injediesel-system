import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useRoutePrefix } from '@/contexts/RoutePrefixContext'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/shared/PageHeader'
import { DataTable, type Column } from '@/components/shared/DataTable'
import { FranchiseeWizard } from './wizard/FranchiseeWizard'
import { useFranchiseUnits, type FranchiseUnit, type UnitStatus } from '@/hooks/useFranchiseUnits'
import { useSaldoFranquias, fmtBRL, diasEmAberto } from '@/hooks/useFranquiasFinanceiro'

// Sem campo de vencimento em ecu_jobs: NÃO existe "atraso" real (vencido). O que
// destacamos é a IDADE da dívida — cobrança aberta há mais dias que este limite
// ganha ênfase vermelha (dívida antiga); abaixo fica âmbar. Rótulo honesto:
// "aberto há Nd", nunca "atrasado". Trocar por vencimento real se um dia existir.
const DEBT_AGING_DAYS = 30

interface DebtInfo { total: number; qtd: number; dias: number }

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
  const PAGE_SIZE = 20

  const { data, isLoading } = useFranchiseUnits({ q, page, pageSize: PAGE_SIZE })

  // Dívida por unidade (mesma fonte da ficha: ecu_jobs em aberto, via vw_saldo_franquias).
  // A view só traz unidades COM dívida > 0; as demais ficam sem entrada (dívida 0).
  const { data: saldos = [] } = useSaldoFranquias()
  const debtByUnit = useMemo(() => {
    const m = new Map<string, DebtInfo>()
    for (const s of saldos) {
      m.set(s.unit_id, { total: s.total_em_aberto, qtd: s.qtd_abertos, dias: diasEmAberto(s.data_mais_antiga) })
    }
    return m
  }, [saldos])

  const columns = useMemo<Column<FranchiseUnit>[]>(() => [
    ...COLUMNS,
    {
      key: 'divida', header: 'Dívida',
      cell: (r) => {
        const d = debtByUnit.get(r.id)
        if (!d || d.total <= 0) return <span style={{ color: 'hsl(var(--pm-gray-600))' }}>—</span>
        const aging = d.dias > DEBT_AGING_DAYS
        const color = aging ? '#F87171' : '#FBBF24'
        const bg = aging ? 'rgba(248,113,113,0.1)' : 'rgba(251,191,36,0.1)'
        return (
          <span
            title={`${d.qtd} cobrança${d.qtd > 1 ? 's' : ''} em aberto · mais antiga há ${d.dias} dias`}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 9px', borderRadius: 999, background: bg, color, fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap' }}
          >
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: color, flexShrink: 0 }} />
            {fmtBRL(d.total)} · aberto há {d.dias}d
          </span>
        )
      },
    },
  ], [debtByUnit])

  // Destaque de linha: vermelho (dívida antiga) tem precedência sobre âmbar (recente).
  const rowClassName = (r: FranchiseUnit): string | undefined => {
    const d = debtByUnit.get(r.id)
    if (!d || d.total <= 0) return undefined
    return d.dias > DEBT_AGING_DAYS
      ? 'bg-[rgba(248,113,113,0.06)]'
      : 'bg-[rgba(251,191,36,0.05)]'
  }

  return (
    <div>
      <PageHeader
        title="Franqueados"
        subtitle="Unidades da rede Injediesel System"
        actions={
          <Button onClick={() => setFormOpen(true)} style={{ background: 'var(--pm-accent-gradient)' }}>
            <Plus size={16} className="mr-2" />Nova Unidade
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
        searchPlaceholder="Buscar por unidade ou gestor..."
        onRowClick={(r) => navigate(`${prefix}/franqueados/${r.id}`)}
        rowClassName={rowClassName}
        emptyTitle="Nenhuma unidade"
        emptyDescription="Clique em Nova Unidade para adicionar."
      />

      <FranchiseeWizard open={formOpen} onOpenChange={setFormOpen} />
    </div>
  )
}
