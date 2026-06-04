// src/pages/app/franqueados/RelatorioFranchiseeDrawer.tsx
import { useState } from 'react'
import { Loader2, FileSpreadsheet, FileText } from 'lucide-react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import {
  useRelatorioPerm,
  fetchEcuRelatorio, fetchFinanceiroRelatorio, fetchFranquiaRelatorio,
  exportToCSV, exportToXLSX, formatDateBR,
} from '@/hooks/useRelatorios'
import type { EcuExportRow, FinanceiroExportRow, FranquiaExportRow } from '@/hooks/useRelatorios'
import type { FranchiseUnit } from '@/hooks/useFranchiseUnits'

type Modulo = 'ecu' | 'financeiro' | 'franquia'

const PERIODO_ATALHOS = [
  {
    label: 'Este mês',
    fn: () => {
      const n = new Date()
      return {
        de: `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-01`,
        ate: n.toISOString().slice(0, 10),
      }
    },
  },
  {
    label: 'Mês anterior',
    fn: () => {
      const n = new Date()
      n.setMonth(n.getMonth() - 1)
      return {
        de: `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-01`,
        ate: new Date(n.getFullYear(), n.getMonth() + 1, 0).toISOString().slice(0, 10),
      }
    },
  },
  {
    label: 'Últimos 3m',
    fn: () => {
      const n = new Date()
      const i = new Date(n)
      i.setMonth(i.getMonth() - 3)
      return { de: i.toISOString().slice(0, 10), ate: n.toISOString().slice(0, 10) }
    },
  },
  {
    label: 'Este ano',
    fn: () => {
      const n = new Date()
      return { de: `${n.getFullYear()}-01-01`, ate: n.toISOString().slice(0, 10) }
    },
  },
]

const ECU_CAMPOS = [
  { key: 'unidade_nome', label: 'Unidade' },
  { key: 'cidade', label: 'Cidade' },
  { key: 'uf', label: 'UF' },
  { key: 'data_solicitacao', label: 'Data Solicitação' },
  { key: 'veiculo', label: 'Veículo' },
  { key: 'placa', label: 'Placa' },
  { key: 'tipo_remapeamento', label: 'Tipo de Remapeamento' },
  { key: 'status_financeiro', label: 'Status Financeiro' },
  { key: 'pago_em', label: 'Data Pagamento' },
]

const FIN_CAMPOS = [
  { key: 'unidade_nome', label: 'Unidade' },
  { key: 'cidade', label: 'Cidade' },
  { key: 'uf', label: 'UF' },
  { key: 'cnpj', label: 'CNPJ' },
  { key: 'data_cobranca', label: 'Data Cobrança' },
  { key: 'descricao', label: 'Descrição' },
  { key: 'valor_cobrado', label: 'Valor Cobrado' },
  { key: 'status_pagamento', label: 'Status' },
  { key: 'pago_em', label: 'Data Pagamento' },
]

const FRQ_CAMPOS = [
  { key: 'nome_fantasia', label: 'Nome Fantasia' },
  { key: 'razao_social', label: 'Razão Social' },
  { key: 'cnpj', label: 'CNPJ' },
  { key: 'cidade', label: 'Cidade' },
  { key: 'uf', label: 'UF' },
  { key: 'telefone', label: 'Telefone' },
  { key: 'email', label: 'E-mail' },
  { key: 'raio_km', label: 'Raio (km)' },
  { key: 'cidades_atendidas', label: 'Cidades Atendidas' },
  { key: 'tipo_contrato', label: 'Tipo de Contrato' },
  { key: 'contrato_inicio', label: 'Início Contrato' },
  { key: 'contrato_fim', label: 'Término Contrato' },
  { key: 'status_unidade', label: 'Status' },
]

function today() {
  return new Date().toISOString().slice(0, 10)
}

function firstOfMonth() {
  const n = new Date()
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-01`
}

function normalizarEcu(rows: EcuExportRow[]): Record<string, unknown>[] {
  return rows.map((r) => ({
    'Unidade': r.unidade_nome,
    'Cidade': r.cidade,
    'UF': r.uf,
    'Data Solicitação': formatDateBR(r.data_solicitacao),
    'Veículo': r.veiculo,
    'Placa': r.placa,
    'Tipo Remapeamento': r.tipo_remapeamento,
    'Status Financeiro': r.status_financeiro === 'pago' ? 'PAGO' : 'EM ABERTO',
    'Data Pagamento': formatDateBR(r.pago_em),
  }))
}

function normalizarFin(rows: FinanceiroExportRow[]): Record<string, unknown>[] {
  return rows.map((r) => ({
    'Unidade': r.unidade_nome,
    'Cidade': r.cidade,
    'UF': r.uf,
    'CNPJ': r.cnpj,
    'Data Cobrança': formatDateBR(r.data_cobranca),
    'Descrição': r.descricao,
    'Valor Cobrado': r.valor_cobrado,
    'Status': r.status_pagamento === 'pago' ? 'PAGO' : 'EM ABERTO',
    'Data Pagamento': formatDateBR(r.pago_em),
  }))
}

function normalizarFrq(rows: FranquiaExportRow[]): Record<string, unknown>[] {
  return rows.map((r) => ({
    'Nome Fantasia': r.nome_fantasia,
    'Razão Social': r.razao_social,
    'CNPJ': r.cnpj,
    'Cidade': r.cidade,
    'UF': r.uf,
    'Telefone': r.telefone,
    'E-mail': r.email,
    'Raio (km)': r.raio_km,
    'Cidades Atendidas': r.cidades_atendidas,
    'Tipo Contrato': r.tipo_contrato,
    'Início Contrato': formatDateBR(r.contrato_inicio),
    'Término Contrato': formatDateBR(r.contrato_fim),
    'Status': r.status_unidade,
  }))
}

function filtrarCampos(
  rows: Record<string, unknown>[],
  campos: { key: string; label: string }[],
  selected: Set<string>
): Record<string, unknown>[] {
  const labels = campos.filter((c) => selected.has(c.key)).map((c) => c.label)
  return rows.map((r) => {
    const out: Record<string, unknown> = {}
    labels.forEach((l) => { out[l] = r[l] })
    return out
  })
}

interface Props {
  open: boolean
  onClose: () => void
  unit: Pick<FranchiseUnit, 'id' | 'name' | 'city' | 'state'>
}

export function RelatorioFranchiseeDrawer({ open, onClose, unit }: Props) {
  const perm = useRelatorioPerm()
  const defaultModulo: Modulo = perm.ecu ? 'ecu' : perm.financeiro ? 'financeiro' : 'franquia'

  const [de, setDe] = useState(firstOfMonth)
  const [ate, setAte] = useState(today)
  const [modulo, setModulo] = useState<Modulo>(defaultModulo)
  const [camposAtivos, setCamposAtivos] = useState<Set<string>>(
    new Set(ECU_CAMPOS.map((c) => c.key))
  )
  const [loading, setLoading] = useState(false)
  const [preview, setPreview] = useState<Record<string, unknown>[] | null>(null)

  const inputStyle: React.CSSProperties = {
    background: 'hsl(var(--pm-gray-800))',
    border: '1px solid rgba(255,255,255,0.08)',
    color: 'hsl(var(--pm-gray-200))',
    borderRadius: 8,
    padding: '6px 10px',
    fontSize: 13,
    outline: 'none',
  }

  function selectModulo(m: Modulo) {
    setModulo(m)
    setPreview(null)
    const campos = m === 'ecu' ? ECU_CAMPOS : m === 'financeiro' ? FIN_CAMPOS : FRQ_CAMPOS
    setCamposAtivos(new Set(campos.map((c) => c.key)))
  }

  function toggleCampo(key: string) {
    setCamposAtivos((prev) => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }

  async function fetchData(): Promise<Record<string, unknown>[]> {
    if (modulo === 'ecu') {
      const rows = await fetchEcuRelatorio(unit.id, de, ate)
      return filtrarCampos(normalizarEcu(rows), ECU_CAMPOS, camposAtivos)
    }
    if (modulo === 'financeiro') {
      const rows = await fetchFinanceiroRelatorio(unit.id, de, ate)
      return filtrarCampos(normalizarFin(rows), FIN_CAMPOS, camposAtivos)
    }
    const rows = await fetchFranquiaRelatorio(unit.id)
    return filtrarCampos(normalizarFrq(rows), FRQ_CAMPOS, camposAtivos)
  }

  async function handlePreview() {
    setLoading(true)
    try {
      const data = await fetchData()
      if (!data.length) {
        toast.error('Nenhum registro encontrado para o período selecionado')
        return
      }
      setPreview(data)
    } catch (e) {
      toast.error(String(e))
    } finally {
      setLoading(false)
    }
  }

  async function handleExport(format: 'csv' | 'xlsx') {
    setLoading(true)
    try {
      const data = preview ?? await fetchData()
      if (!data.length) {
        toast.error('Nenhum registro encontrado para o período selecionado')
        return
      }
      const filename = `relatorio-${unit.name.replace(/\s+/g, '-')}-${modulo}-${de}-${ate}.${format}`
      if (format === 'csv') exportToCSV(data, filename)
      else exportToXLSX(data, filename)
      toast.success(`Relatório ${format.toUpperCase()} exportado`)
    } catch (e) {
      toast.error(String(e))
    } finally {
      setLoading(false)
    }
  }

  const camposAtual = modulo === 'ecu' ? ECU_CAMPOS : modulo === 'financeiro' ? FIN_CAMPOS : FRQ_CAMPOS

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader className="pb-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <SheetTitle className="text-white">
            Exportar Relatório
            <span className="block text-xs font-normal mt-0.5" style={{ color: 'hsl(var(--pm-gray-500))' }}>
              {unit.name} — {unit.city}/{unit.state}
            </span>
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-6 py-4">
          {/* Período */}
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'hsl(var(--pm-gray-500))' }}>
              Período
            </p>
            <div className="flex items-center gap-2 flex-wrap">
              <input type="date" value={de} max={ate} onChange={(e) => setDe(e.target.value)} style={inputStyle} />
              <span className="text-xs" style={{ color: 'hsl(var(--pm-gray-500))' }}>até</span>
              <input type="date" value={ate} min={de} max={today()} onChange={(e) => setAte(e.target.value)} style={inputStyle} />
            </div>
            <div className="flex flex-wrap gap-1.5">
              {PERIODO_ATALHOS.map((a) => (
                <button
                  key={a.label}
                  onClick={() => { const r = a.fn(); setDe(r.de); setAte(r.ate); setPreview(null) }}
                  className="px-2.5 py-1 rounded text-[11px] transition-colors"
                  style={{ background: 'hsl(var(--pm-gray-800))', color: 'hsl(var(--pm-gray-400))' }}
                >
                  {a.label}
                </button>
              ))}
            </div>
          </div>

          {/* Módulo */}
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'hsl(var(--pm-gray-500))' }}>
              Módulo
            </p>
            <div className="flex flex-col gap-1.5">
              {perm.ecu && (
                <button
                  onClick={() => selectModulo('ecu')}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors"
                  style={{
                    background: modulo === 'ecu' ? 'hsl(var(--pm-red-500)/0.15)' : 'hsl(var(--pm-gray-800))',
                    border: modulo === 'ecu' ? '1px solid hsl(var(--pm-red-500)/0.4)' : '1px solid transparent',
                    color: modulo === 'ecu' ? '#fff' : 'hsl(var(--pm-gray-400))',
                  }}
                >
                  <span className="text-sm font-medium">ECU — Histórico de Arquivos</span>
                </button>
              )}
              {perm.financeiro && (
                <button
                  onClick={() => selectModulo('financeiro')}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors"
                  style={{
                    background: modulo === 'financeiro' ? 'hsl(var(--pm-red-500)/0.15)' : 'hsl(var(--pm-gray-800))',
                    border: modulo === 'financeiro' ? '1px solid hsl(var(--pm-red-500)/0.4)' : '1px solid transparent',
                    color: modulo === 'financeiro' ? '#fff' : 'hsl(var(--pm-gray-400))',
                  }}
                >
                  <span className="text-sm font-medium">Financeiro — Faturas</span>
                </button>
              )}
              {perm.franquias && (
                <button
                  onClick={() => selectModulo('franquia')}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors"
                  style={{
                    background: modulo === 'franquia' ? 'hsl(var(--pm-red-500)/0.15)' : 'hsl(var(--pm-gray-800))',
                    border: modulo === 'franquia' ? '1px solid hsl(var(--pm-red-500)/0.4)' : '1px solid transparent',
                    color: modulo === 'franquia' ? '#fff' : 'hsl(var(--pm-gray-400))',
                  }}
                >
                  <span className="text-sm font-medium">Franquia — Cadastro</span>
                </button>
              )}
            </div>
          </div>

          {/* Campos */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'hsl(var(--pm-gray-500))' }}>
                Campos
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setCamposAtivos(new Set(camposAtual.map((c) => c.key)))}
                  className="text-[11px] underline"
                  style={{ color: 'hsl(var(--pm-gray-500))' }}
                >
                  Todos
                </button>
                <button
                  onClick={() => setCamposAtivos(new Set())}
                  className="text-[11px] underline"
                  style={{ color: 'hsl(var(--pm-gray-500))' }}
                >
                  Nenhum
                </button>
              </div>
            </div>
            <div className="space-y-1.5">
              {camposAtual.map((c) => (
                <label key={c.key} className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={camposAtivos.has(c.key)}
                    onChange={() => toggleCampo(c.key)}
                    className="accent-red-500"
                  />
                  <span className="text-sm" style={{ color: 'hsl(var(--pm-gray-300))' }}>{c.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Preview */}
          {preview && preview.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'hsl(var(--pm-gray-500))' }}>
                Preview ({Math.min(5, preview.length)} de {preview.length} registros)
              </p>
              <div className="overflow-x-auto rounded-lg" style={{ border: '1px solid rgba(255,255,255,0.06)' }}>
                <table className="text-[11px] w-full">
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' }}>
                      {Object.keys(preview[0]).map((k) => (
                        <th key={k} className="px-2 py-1.5 text-left font-semibold whitespace-nowrap"
                          style={{ color: 'hsl(var(--pm-gray-600))' }}>{k}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.slice(0, 5).map((row, i) => (
                      <tr key={i} style={{ borderTop: i === 0 ? 'none' : '1px solid rgba(255,255,255,0.04)' }}>
                        {Object.values(row).map((v, j) => (
                          <td key={j} className="px-2 py-1.5 whitespace-nowrap" style={{ color: 'hsl(var(--pm-gray-400))' }}>
                            {String(v ?? '—')}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Ações */}
          <div className="space-y-2 pt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            {!preview && (
              <Button
                onClick={handlePreview}
                disabled={loading || camposAtivos.size === 0}
                variant="outline"
                className="w-full gap-2"
              >
                {loading && <Loader2 size={14} className="animate-spin" />}
                Pré-visualizar dados
              </Button>
            )}
            <div className="flex gap-2">
              <Button
                onClick={() => handleExport('csv')}
                disabled={loading || camposAtivos.size === 0}
                className="flex-1 gap-2 text-white border-0"
                style={{ background: 'hsl(var(--pm-gray-700))' }}
              >
                {loading ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />}
                CSV
              </Button>
              <Button
                onClick={() => handleExport('xlsx')}
                disabled={loading || camposAtivos.size === 0}
                className="flex-1 gap-2 text-white border-0"
                style={{ background: 'hsl(var(--pm-red-500))' }}
              >
                {loading ? <Loader2 size={14} className="animate-spin" /> : <FileSpreadsheet size={14} />}
                XLSX
              </Button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
