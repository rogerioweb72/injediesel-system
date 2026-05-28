import { useState, useEffect, useCallback, useRef } from 'react'
import { Loader2, RefreshCw, Check, X } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  useCreateLancamento,
  LANCAMENTO_CATEGORIAS,
  CATEGORIA_LABELS,
  RECORRENCIA_LABELS,
  type CreateLancamentoPayload,
  type LancamentoCategoria,
} from '@/hooks/useLancamentos'
import { useUnitCategories, useCreateUnitCategory } from '@/hooks/useUnitCategories'

const NEW_CAT_VALUE = '__new__'

const todayISO = () => new Date().toISOString().split('T')[0]

function fmtDate(iso: string): boolean {
  const d = new Date(iso)
  const today = new Date()
  const diff = Math.abs(d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  return diff > 30
}

const inputStyle: React.CSSProperties = {
  background: 'hsl(var(--pm-gray-800))',
  border: '1px solid rgba(255,255,255,0.08)',
  color: '#fff',
  borderRadius: 8,
  padding: '8px 12px',
  fontSize: 14,
  outline: 'none',
  width: '100%',
}

const labelStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  color: 'hsl(var(--pm-gray-500))',
  marginBottom: 4,
  display: 'block',
}

interface Props {
  unitId: string | null
  onClose: () => void
  onSuccess?: () => void
}

export function NovoLancamentoModal({ unitId, onClose, onSuccess }: Props) {
  const createLancamento = useCreateLancamento()
  const { data: customCats = [] } = useUnitCategories(unitId)
  const createCat = useCreateUnitCategory(unitId ?? '')
  const newCatInputRef = useRef<HTMLInputElement>(null)

  const [tipo, setTipo]                     = useState<'receita' | 'despesa' | 'ajuste'>('despesa')
  const [categoria, setCategoria]           = useState<string>('')
  const [subcategoria, setSubcategoria]     = useState('')
  const [status, setStatus]                 = useState<'rascunho' | 'lancado'>('lancado')
  const [valor, setValor]                   = useState('')
  const [dataComp, setDataComp]             = useState(todayISO())
  const [centroCusto, setCentroCusto]       = useState('')
  const [descricao, setDescricao]           = useState('')
  const [recorrente, setRecorrente]         = useState(false)
  const [periodicidade, setPeriodicidade]   = useState<'diario' | 'semanal' | 'mensal' | 'anual'>('mensal')
  const [repeticoes, setRepeticoes]         = useState('2')

  const [newCatName, setNewCatName]         = useState('')
  const [showNewCat, setShowNewCat]         = useState(false)

  const dateWarning = dataComp ? fmtDate(dataComp) : false
  const valorNum = parseFloat(valor.replace(',', '.')) || 0
  const canSave = categoria !== '' && categoria !== NEW_CAT_VALUE && valorNum > 0 && dataComp !== ''

  function handleCatChange(v: string) {
    if (v === NEW_CAT_VALUE) {
      setShowNewCat(true)
      setCategoria(NEW_CAT_VALUE)
      setTimeout(() => newCatInputRef.current?.focus(), 50)
    } else {
      setCategoria(v)
      setShowNewCat(false)
    }
  }

  async function handleCreateCat() {
    const name = newCatName.trim()
    if (!name) return
    try {
      const created = await createCat.mutateAsync(name)
      setCategoria(created.name)
      setNewCatName('')
      setShowNewCat(false)
    } catch {
      setCategoria(name)
      setNewCatName('')
      setShowNewCat(false)
    }
  }

  const handleSave = useCallback(async () => {
    if (!canSave) return
    const payload: CreateLancamentoPayload = {
      tipo,
      categoria: categoria as LancamentoCategoria,
      subcategoria: subcategoria.trim() || undefined,
      status,
      valor: valorNum,
      data_competencia: dataComp,
      centro_de_custo: centroCusto.trim() || undefined,
      descricao: descricao.trim() || undefined,
      recorrente,
      recorrencia: recorrente
        ? { periodicidade, repeticoes: Math.max(2, parseInt(repeticoes) || 2) }
        : undefined,
    }
    await createLancamento.mutateAsync({ payload, unitId })
    onSuccess?.()
    onClose()
  }, [canSave, tipo, categoria, subcategoria, status, valorNum, dataComp, centroCusto, descricao, recorrente, periodicidade, repeticoes, createLancamento, unitId, onSuccess, onClose])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') handleSave()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [handleSave])

  const tipoColor = tipo === 'receita' ? '#4ADE80' : tipo === 'despesa' ? '#F87171' : '#FBBF24'

  const hasCustom = customCats.length > 0
  const isCustomSelected = categoria !== '' && categoria !== NEW_CAT_VALUE &&
    !LANCAMENTO_CATEGORIAS.includes(categoria as LancamentoCategoria)

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent
        className="max-w-xl p-0 flex flex-col max-h-[90vh] overflow-hidden gap-0 [&>button:last-child]:hidden"
        style={{
          background: 'hsl(var(--pm-gray-900))',
          border: '1px solid rgba(255,255,255,0.09)',
          borderRadius: '1rem',
        }}
      >
        {/* Header */}
        <DialogHeader
          className="flex-row items-center justify-between px-6 py-4"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}
        >
          <DialogTitle className="font-semibold text-white text-base">
            Novo Lançamento
          </DialogTitle>
          <button onClick={onClose} style={{ color: 'hsl(var(--pm-gray-500))' }}>
            <X size={18} />
          </button>
        </DialogHeader>

        {/* Body */}
        <div className="overflow-y-auto px-6 py-5 space-y-4 flex-1">

          {/* Tipo + Status */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label style={labelStyle}>Tipo *</label>
              <select value={tipo} onChange={(e) => setTipo(e.target.value as typeof tipo)} style={{ ...inputStyle, color: tipoColor }}>
                <option value="receita" style={{ color: '#4ADE80' }}>Receita</option>
                <option value="despesa" style={{ color: '#F87171' }}>Despesa</option>
                <option value="ajuste"  style={{ color: '#FBBF24' }}>Ajuste</option>
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label style={labelStyle}>Status *</label>
              <select value={status} onChange={(e) => setStatus(e.target.value as typeof status)} style={inputStyle}>
                <option value="lancado">Lançado</option>
                <option value="rascunho">Rascunho</option>
              </select>
            </div>
          </div>

          {/* Categoria */}
          <div className="flex flex-col gap-1.5">
            <label style={labelStyle}>Categoria *</label>
            <select
              value={categoria}
              onChange={(e) => handleCatChange(e.target.value)}
              style={{
                ...inputStyle,
                color: isCustomSelected ? '#C4B5FD' : undefined,
              }}
            >
              <option value="" disabled>Selecione...</option>

              <optgroup label="Padrão">
                {LANCAMENTO_CATEGORIAS.map((c) => (
                  <option key={c} value={c}>{CATEGORIA_LABELS[c]}</option>
                ))}
              </optgroup>

              {hasCustom && (
                <optgroup label="Personalizadas">
                  {customCats.map((c) => (
                    <option key={c.id} value={c.name}>{c.name}</option>
                  ))}
                </optgroup>
              )}

              <optgroup label="">
                <option value={NEW_CAT_VALUE}>＋ Criar nova categoria...</option>
              </optgroup>
            </select>

            {showNewCat && (
              <div
                className="flex gap-2 mt-1 p-3 rounded-xl"
                style={{ background: 'hsl(var(--pm-gray-800))', border: '1px solid rgba(167,139,250,0.3)' }}
              >
                <input
                  ref={newCatInputRef}
                  type="text"
                  placeholder="Nome da nova categoria..."
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleCreateCat() } }}
                  style={{ ...inputStyle, flex: 1, width: 'auto' }}
                />
                <button
                  onClick={handleCreateCat}
                  disabled={!newCatName.trim() || createCat.isPending}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold disabled:opacity-40 shrink-0"
                  style={{ background: '#7C3AED', color: '#fff' }}
                >
                  {createCat.isPending
                    ? <Loader2 size={13} className="animate-spin" />
                    : <Check size={13} />}
                  Criar
                </button>
                <button
                  onClick={() => { setShowNewCat(false); setCategoria('') }}
                  className="px-2 py-2 rounded-lg text-sm shrink-0"
                  style={{ color: 'hsl(var(--pm-gray-500))' }}
                >
                  <X size={14} />
                </button>
              </div>
            )}
          </div>

          {/* Subcategoria */}
          <div className="flex flex-col gap-1.5">
            <label style={labelStyle}>Subcategoria <span style={{ color: 'hsl(var(--pm-gray-600))' }}>(opcional)</span></label>
            <input
              type="text"
              placeholder="Ex: Combustível, Aluguel..."
              value={subcategoria}
              onChange={(e) => setSubcategoria(e.target.value)}
              style={inputStyle}
            />
          </div>

          {/* Valor + Data */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label style={labelStyle}>Valor (R$) *</label>
              <input
                type="number"
                min={tipo === 'ajuste' ? undefined : 0}
                step="0.01"
                placeholder="0,00"
                value={valor}
                onChange={(e) => setValor(e.target.value)}
                style={{
                  ...inputStyle,
                  color: valor && valorNum > 0 ? tipoColor : '#fff',
                }}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label style={labelStyle}>Data de competência *</label>
              <input
                type="date"
                value={dataComp}
                onChange={(e) => setDataComp(e.target.value)}
                style={{ ...inputStyle, colorScheme: 'dark' }}
              />
              {dateWarning && (
                <p style={{ fontSize: 11, color: '#FBBF24' }}>Data fora dos últimos 30 dias</p>
              )}
            </div>
          </div>

          {/* Centro de custo */}
          <div className="flex flex-col gap-1.5">
            <label style={labelStyle}>Centro de custo <span style={{ color: 'hsl(var(--pm-gray-600))' }}>(opcional)</span></label>
            <input
              type="text"
              placeholder="Opcional"
              value={centroCusto}
              onChange={(e) => setCentroCusto(e.target.value)}
              style={inputStyle}
            />
          </div>

          {/* Descrição */}
          <div className="flex flex-col gap-1.5">
            <label style={labelStyle}>Descrição <span style={{ color: 'hsl(var(--pm-gray-600))' }}>(opcional)</span></label>
            <textarea
              placeholder="Detalhes do lançamento..."
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              rows={3}
              style={{ ...inputStyle, resize: 'vertical' }}
            />
          </div>

          {/* Recorrência */}
          <div
            className="rounded-xl p-4 space-y-4"
            style={{ background: 'hsl(var(--pm-gray-800))', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <RefreshCw size={14} style={{ color: 'hsl(var(--pm-gray-400))' }} />
                <span className="text-sm font-medium" style={{ color: 'hsl(var(--pm-gray-300))' }}>
                  Lançamento recorrente
                </span>
              </div>
              <Switch checked={recorrente} onCheckedChange={setRecorrente} />
            </div>

            {recorrente && (
              <div className="grid grid-cols-2 gap-4 pt-1">
                <div className="flex flex-col gap-1.5">
                  <label style={labelStyle}>Periodicidade</label>
                  <select value={periodicidade} onChange={(e) => setPeriodicidade(e.target.value as typeof periodicidade)} style={inputStyle}>
                    {Object.entries(RECORRENCIA_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label style={labelStyle}>Repetições</label>
                  <input
                    type="number"
                    min={2}
                    max={60}
                    placeholder="Ex: 12"
                    value={repeticoes}
                    onChange={(e) => setRepeticoes(e.target.value)}
                    style={inputStyle}
                  />
                </div>
              </div>
            )}
          </div>

        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-between gap-3 px-6 py-4"
          style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}
        >
          <p className="text-[11px]" style={{ color: 'hsl(var(--pm-gray-600))' }}>
            Ctrl+Enter para salvar · Esc para fechar
          </p>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium rounded-lg transition-colors"
              style={{
                background: 'transparent',
                border: '1px solid rgba(255,255,255,0.12)',
                color: 'hsl(var(--pm-gray-300))',
              }}
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={!canSave || createLancamento.isPending}
              className="flex items-center gap-2 px-5 py-2 text-sm font-semibold rounded-lg transition-all disabled:opacity-40"
              style={{ background: '#2563EB', color: '#fff' }}
            >
              {createLancamento.isPending ? (
                <Loader2 size={14} className="animate-spin" />
              ) : null}
              Salvar
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
