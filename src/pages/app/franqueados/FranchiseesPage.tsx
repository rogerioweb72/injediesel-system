import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useRoutePrefix } from '@/contexts/RoutePrefixContext'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/shared/PageHeader'
import { DataTable, type Column } from '@/components/shared/DataTable'
import { FranchiseeWizard } from './wizard/FranchiseeWizard'
import { useFranchiseUnits, type FranchiseUnit, type UnitStatus } from '@/hooks/useFranchiseUnits'

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

  return (
    <div>
      <PageHeader
        title="Franqueados"
        subtitle="Unidades da rede Promax Tuner"
        actions={
          <Button onClick={() => setFormOpen(true)} style={{ background: 'var(--pm-accent-gradient)' }}>
            <Plus size={16} className="mr-2" />Nova Unidade
          </Button>
        }
      />

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
        onRowClick={(r) => navigate(`${prefix}/franqueados/${r.id}`)}
        emptyTitle="Nenhuma unidade"
        emptyDescription="Clique em Nova Unidade para adicionar."
      />

      <FranchiseeWizard open={formOpen} onOpenChange={setFormOpen} />
    </div>
  )
}
