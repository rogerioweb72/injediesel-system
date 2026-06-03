import { PageHeader } from '@/components/shared/PageHeader'
import { useAdminTelemetry } from '@/hooks/useAdminTelemetry'
import {
  ShieldAlert, Activity, Server, Cloud,
  RefreshCw, Loader2, AlertTriangle, CheckCircle,
} from 'lucide-react'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatBytes(bytes: number): string {
  if (!bytes) return '0 B'
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`
}

function formatRelative(iso: string): string {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (m < 1) return 'agora'
  if (m < 60) return `${m}min atrás`
  return `${Math.floor(m / 60)}h atrás`
}

const ACTION_LABELS: Record<string, string> = {
  rls_violation:          'Violação RLS',
  forbidden_role:         'Role Proibida',
  cross_tenant_attempt:   'Acesso Cross-Tenant',
  malware_detected:       'Malware',
  scan_error:             'Erro de Scan',
  unit_role_revoked:      'Papel Revogado',
}

// ─── Style tokens ─────────────────────────────────────────────────────────────

const card: React.CSSProperties = {
  background: 'hsl(var(--pm-gray-900))',
  border: '1px solid hsl(var(--pm-gray-800))',
  borderRadius: 12,
  padding: '1.25rem 1.5rem',
}

const miniCard: React.CSSProperties = {
  flex: 1,
  background: 'hsl(var(--pm-gray-800))',
  borderRadius: 8,
  padding: '0.75rem',
  textAlign: 'center',
}

const bigNum: React.CSSProperties = {
  fontFamily: 'var(--pm-font-display)',
  fontSize: '2.25rem',
  fontWeight: 800,
  lineHeight: 1,
}

const label: React.CSSProperties = {
  fontSize: '0.6875rem',
  color: 'hsl(var(--pm-gray-400))',
  marginTop: 4,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
}

const sectionTitle: React.CSSProperties = {
  fontFamily: 'var(--pm-font-display)',
  fontSize: '0.875rem',
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  color: 'hsl(var(--pm-gray-300))',
}

const colHeader: React.CSSProperties = {
  fontSize: '0.6875rem',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  color: 'hsl(var(--pm-gray-500))',
  marginBottom: '0.375rem',
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function CardHeader({ icon: Icon, title, color }: { icon: React.ElementType; title: string; color: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
      <Icon size={16} color={color} />
      <span style={sectionTitle}>{title}</span>
    </div>
  )
}

function StatRow({ label: lbl, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.3125rem 0', borderBottom: '1px solid hsl(var(--pm-gray-800))' }}>
      <span style={{ fontSize: '0.875rem', color: 'hsl(var(--pm-gray-400))' }}>{lbl}</span>
      <span style={{ fontSize: '0.875rem', fontWeight: 600, color: color ?? 'hsl(var(--pm-gray-50))' }}>{value}</span>
    </div>
  )
}

function QuotaMeter({ pct }: { pct: number }) {
  const color = pct >= 80 ? '#F87171' : pct >= 50 ? '#FBBF24' : '#4ADE80'
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.375rem' }}>
        <span style={{ fontSize: '0.75rem', color: 'hsl(var(--pm-gray-400))' }}>Cota diária VT</span>
        <span style={{ fontSize: '0.75rem', fontWeight: 700, color }}>{pct.toFixed(1)}%</span>
      </div>
      <div style={{ height: 8, background: 'hsl(var(--pm-gray-800))', borderRadius: 4, overflow: 'hidden' }}>
        <div style={{ width: `${Math.min(pct, 100)}%`, height: '100%', background: color, borderRadius: 4, transition: 'width 0.4s ease' }} />
      </div>
    </div>
  )
}

function AlertBadge({ text }: { text: string }) {
  return (
    <div style={{ fontSize: '0.75rem', color: '#FBBF24', background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)', borderRadius: 6, padding: '0.375rem 0.625rem', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
      <AlertTriangle size={12} />
      {text}
    </div>
  )
}

// ─── Section: Security ────────────────────────────────────────────────────────

function SecuritySection({ data }: { data: ReturnType<typeof useAdminTelemetry>['data'] }) {
  if (!data) return null
  const s = data.security
  return (
    <div style={card}>
      <CardHeader icon={ShieldAlert} title="Segurança — 24h" color="#F87171" />

      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
        <div style={miniCard}>
          <div style={{ ...bigNum, color: (s.login_failures_24h ?? 0) > 0 ? '#FBBF24' : '#4ADE80' }}>
            {s.login_failures_24h ?? '–'}
          </div>
          <div style={label}>Logins falhos</div>
        </div>
        <div style={miniCard}>
          <div style={{ ...bigNum, color: s.rls_violations_24h > 0 ? '#F87171' : '#4ADE80' }}>
            {s.rls_violations_24h}
          </div>
          <div style={label}>Violações RLS</div>
        </div>
        <div style={miniCard}>
          <div style={{ ...bigNum, color: s.malware_blocked_24h > 0 ? '#F87171' : '#4ADE80' }}>
            {s.malware_blocked_24h}
          </div>
          <div style={label}>Malware bloqueado</div>
        </div>
      </div>

      {s.warning && <AlertBadge text={s.warning} />}

      {s.critical_events?.length > 0 ? (
        <div style={{ marginTop: '0.75rem', fontSize: '0.8125rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: '0.25rem 0.75rem', ...colHeader }}>
            <span>Evento</span><span>Total</span><span>Último</span>
          </div>
          {(s.critical_events).slice(0, 6).map((ev, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: '0.25rem 0.75rem', padding: '0.3125rem 0', borderTop: '1px solid hsl(var(--pm-gray-800))' }}>
              <span style={{ color: 'hsl(var(--pm-gray-200))' }}>{ACTION_LABELS[ev.action] ?? ev.action}</span>
              <span style={{ color: '#F87171', fontWeight: 700 }}>{ev.total}</span>
              <span style={{ color: 'hsl(var(--pm-gray-500))' }}>{formatRelative(ev.last_seen)}</span>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ marginTop: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#4ADE80', fontSize: '0.875rem' }}>
          <CheckCircle size={14} />
          Nenhum evento crítico nas últimas 24h
        </div>
      )}
    </div>
  )
}

// ─── Section: VT Quota ────────────────────────────────────────────────────────

function VtQuotaSection({ data }: { data: ReturnType<typeof useAdminTelemetry>['data'] }) {
  if (!data) return null
  const vt = data.vt_quota
  const unavailable = 'error' in vt
  return (
    <div style={card}>
      <CardHeader icon={Activity} title="VirusTotal / Quotas API" color="#FBBF24" />
      {unavailable ? (
        <span style={{ color: 'hsl(var(--pm-gray-500))' }}>Dados indisponíveis</span>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <div style={miniCard}>
              <div style={{ ...bigNum, color: '#FBBF24' }}>{vt.calls_24h}</div>
              <div style={label}>Calls 24h / {vt.daily_limit}</div>
            </div>
            <div style={miniCard}>
              <div style={{ ...bigNum, color: vt.calls_last_minute >= vt.rate_limit_per_minute ? '#F87171' : '#4ADE80' }}>
                {vt.calls_last_minute}
              </div>
              <div style={label}>Calls/min (lim: {vt.rate_limit_per_minute})</div>
            </div>
          </div>

          <QuotaMeter pct={vt.pct_daily_quota} />

          {vt.upgrade_recommended && (
            <AlertBadge text="Uso acima de 80% — considere upgrade para plano pago" />
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
            <StatRow label="Erros de scan 24h" value={vt.scan_errors_24h} color={vt.scan_errors_24h > 0 ? '#F87171' : undefined} />
            <StatRow label="Arquivos infectados (total)" value={vt.infected_total} color={vt.infected_total > 0 ? '#F87171' : '#4ADE80'} />
            <StatRow label="Pendentes de análise" value={vt.pending_total} color={vt.pending_total > 10 ? '#FBBF24' : undefined} />
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Section: Infrastructure ──────────────────────────────────────────────────

function InfraSection({ data }: { data: ReturnType<typeof useAdminTelemetry>['data'] }) {
  if (!data) return null
  const infra = data.infra
  const unavailable = 'error' in infra
  return (
    <div style={card}>
      <CardHeader icon={Server} title="Infraestrutura" color="#60A5FA" />
      {unavailable ? (
        <span style={{ color: 'hsl(var(--pm-gray-500))' }}>Dados indisponíveis</span>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <div style={miniCard}>
              <div style={{ ...bigNum, color: '#60A5FA' }}>{infra.active_sessions}</div>
              <div style={label}>Sessões ativas</div>
            </div>
            <div style={miniCard}>
              <div style={{ ...bigNum }}>{infra.active_users}</div>
              <div style={label}>Usuários ativos</div>
            </div>
            <div style={miniCard}>
              <div style={{ ...bigNum }}>{infra.franchise_units}</div>
              <div style={label}>Unidades</div>
            </div>
          </div>

          {infra.db_connections?.length > 0 && (
            <div>
              <div style={colHeader}>Conexões DB</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                {infra.db_connections.map((c, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem' }}>
                    <span style={{ color: 'hsl(var(--pm-gray-400))' }}>{c.state}</span>
                    <span style={{ fontWeight: 600, color: c.state === 'active' ? '#60A5FA' : 'hsl(var(--pm-gray-300))' }}>{c.count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {infra.storage?.length > 0 && (
            <div>
              <div style={colHeader}>Storage R2</div>
              {infra.storage.map((s, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', fontSize: '0.8125rem', padding: '0.3125rem 0', borderTop: i > 0 ? '1px solid hsl(var(--pm-gray-800))' : undefined }}>
                  <span style={{ color: 'hsl(var(--pm-gray-300))' }}>bucket/{s.bucket}</span>
                  <span style={{ color: 'hsl(var(--pm-gray-400))' }}>
                    {s.files} arq · {formatBytes(s.used_bytes)}
                    {(s.infected ?? 0) > 0 && <span style={{ color: '#F87171', marginLeft: 6 }}>{s.infected} infect.</span>}
                    {(s.pending ?? 0) > 0 && <span style={{ color: '#FBBF24', marginLeft: 6 }}>{s.pending} pend.</span>}
                  </span>
                </div>
              ))}
            </div>
          )}

          {infra.edge_errors_24h > 0 && (
            <StatRow label="Erros Edge 24h" value={infra.edge_errors_24h} color="#F87171" />
          )}
        </div>
      )}
    </div>
  )
}

// ─── Section: Cloudflare ──────────────────────────────────────────────────────

function CloudflareSection({ data }: { data: ReturnType<typeof useAdminTelemetry>['data'] }) {
  if (!data) return null
  const cf = data.cloudflare
  const unavailable = 'error' in cf
  return (
    <div style={card}>
      <CardHeader icon={Cloud} title="Cloudflare R2" color="#A78BFA" />
      {unavailable ? (
        <div style={{ color: 'hsl(var(--pm-gray-500))', fontSize: '0.875rem' }}>
          {cf.error === 'CF credentials not configured'
            ? 'Credenciais não configuradas (CF_API_TOKEN / CF_ACCOUNT_ID).'
            : `Erro: ${cf.error}`}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <div style={miniCard}>
              <div style={{ ...bigNum, color: '#A78BFA', fontSize: '1.5rem' }}>{formatBytes(cf.egress_bytes_24h)}</div>
              <div style={label}>Egress 24h</div>
            </div>
            <div style={miniCard}>
              <div style={{ ...bigNum, fontSize: '1.5rem' }}>{formatBytes(cf.storage_bytes_total)}</div>
              <div style={label}>Storage total</div>
            </div>
          </div>
          <StatRow label="Operações 24h" value={cf.operations_24h.toLocaleString('pt-BR')} />
        </div>
      )}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ControlTowerPage() {
  const { data, isLoading, isError, error, refetch, isFetching, dataUpdatedAt } = useAdminTelemetry()

  return (
    <div style={{ padding: '1.5rem', maxWidth: 1280, margin: '0 auto' }}>
      <PageHeader
        title="Control Tower"
        subtitle="Segurança, infra e cotas — atualizado a cada 60s."
        actions={
          <button
            onClick={() => void refetch()}
            disabled={isFetching}
            style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.8125rem', color: 'hsl(var(--pm-gray-400))', background: 'none', border: 'none', cursor: isFetching ? 'not-allowed' : 'pointer', padding: '0.25rem 0.5rem', borderRadius: 6, opacity: isFetching ? 0.5 : 1 }}
          >
            {isFetching
              ? <Loader2 size={14} className="animate-spin" />
              : <RefreshCw size={14} />}
            {dataUpdatedAt ? formatRelative(new Date(dataUpdatedAt).toISOString()) : 'Atualizar'}
          </button>
        }
      />

      {isLoading && (
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '4rem' }}>
          <Loader2 size={32} className="animate-spin" style={{ color: 'hsl(var(--pm-gray-500))' }} />
        </div>
      )}

      {isError && (
        <div style={{ ...card, color: '#F87171', display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '1.5rem' }}>
          <AlertTriangle size={16} />
          <span>Falha ao carregar telemetria: {String(error)}</span>
        </div>
      )}

      {data && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.25rem', marginTop: '1.5rem' }}>
            <SecuritySection data={data} />
            <VtQuotaSection data={data} />
            <InfraSection data={data} />
            <CloudflareSection data={data} />
          </div>

          <div style={{ marginTop: '0.75rem', textAlign: 'right', fontSize: '0.75rem', color: 'hsl(var(--pm-gray-600))' }}>
            Snapshot: {new Date(data.timestamp).toLocaleString('pt-BR')} · auto-refresh 60s
          </div>
        </>
      )}
    </div>
  )
}
