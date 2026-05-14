import { useNavigate } from 'react-router-dom'
import { Files, UserPlus, ShoppingCart, Clock, CheckCircle, AlertCircle } from 'lucide-react'
import { MetricCard } from '@/components/shared/MetricCard'
import { CommandCard } from '@/components/shared/CommandCard'
import { PageHeader } from '@/components/shared/PageHeader'
import { useProfile } from '@/hooks/useProfile'

const MOCK_KPIS = [
  { label: 'Arquivos Recebidos Hoje', value: '12', trend: 'up' as const, trendValue: '+3 vs ontem' },
  { label: 'Em Processamento',        value: '5',  trend: 'neutral' as const },
  { label: 'Concluídos no Mês',       value: '87', trend: 'up' as const, trendValue: '+12%' },
  { label: 'Receita do Mês',          value: 'R$ 42.800', trend: 'up' as const, trendValue: '+8%' },
]

const MOCK_RECENT = [
  { id: '1', client: 'João Silva',   vehicle: 'VW Golf 1.4 TSI', status: 'em_processamento', time: '5min' },
  { id: '2', client: 'Maria Santos', vehicle: 'BMW 320i',         status: 'recebido',         time: '18min' },
  { id: '3', client: 'Carlos Lima',  vehicle: 'Toyota Hilux',     status: 'concluido',        time: '1h' },
]

export default function Dashboard() {
  const navigate = useNavigate()
  const { hasRole } = useProfile()

  return (
    <div>
      <PageHeader
        title="Command"
        highlight="Center"
        subtitle="Visão geral da operação Promax Tuner"
      />

      {/* Ações rápidas */}
      <div className="pm-accent-line">Ações Rápidas</div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8 pm-stagger pm-animate-fade-in">
        <CommandCard
          title="Enviar Arquivo"
          description="Novo arquivo ECU"
          icon={Files}
          color="red"
          onClick={() => navigate('/matriz/arquivos/novo')}
        />
        <CommandCard
          title="Novo Cliente"
          description="Cadastrar cliente"
          icon={UserPlus}
          color="blue"
          onClick={() => navigate('/matriz/clientes/novo')}
        />
        <CommandCard
          title="Nova Venda"
          description="Abrir PDV"
          icon={ShoppingCart}
          color="green"
          onClick={() => navigate('/matriz/pdv')}
        />
      </div>

      {/* KPIs */}
      <div className="pm-accent-line">Indicadores do Dia</div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8 pm-stagger pm-animate-fade-in">
        {MOCK_KPIS.map((kpi) => (
          <MetricCard key={kpi.label} {...kpi} />
        ))}
      </div>

      {/* Atividade recente */}
      <div className="pm-accent-line">Atividade Recente</div>
      <div className="pm-card">
        <div className="space-y-0">
          {MOCK_RECENT.map((item, i) => (
            <div
              key={item.id}
              className={`flex items-center justify-between py-3 ${
                i < MOCK_RECENT.length - 1 ? 'border-b border-[hsl(var(--pm-gray-700))]' : ''
              }`}
            >
              <div className="flex items-center gap-3">
                {item.status === 'concluido' ? (
                  <CheckCircle size={16} className="text-green-500" />
                ) : item.status === 'em_processamento' ? (
                  <Clock size={16} style={{ color: 'hsl(var(--pm-blue-400))' }} />
                ) : (
                  <AlertCircle size={16} style={{ color: 'hsl(var(--pm-amber-400))' }} />
                )}
                <div>
                  <div className="text-sm font-medium text-foreground">{item.client}</div>
                  <div className="text-xs text-muted-foreground">{item.vehicle}</div>
                </div>
              </div>
              <span className="text-xs text-muted-foreground">{item.time} atrás</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
