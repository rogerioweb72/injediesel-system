// src/pages/app/arquivos/EcuValueEditModal.tsx
import { useState } from 'react'
import { AlertTriangle, Loader2 } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useRequestValueEdit } from '@/hooks/useEcuValueEdit'

const CHIPS = [
  'Erro de digitação no valor original',
  'Ajuste após renegociação com a unidade',
  'Correção de tipo de serviço aplicado',
  'Outro motivo',
]

function fmtBRL(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

interface Props {
  open: boolean
  onClose: () => void
  jobId: string
  jobCode: string
  valorAtual: number
}

export function EcuValueEditModal({ open, onClose, jobId, jobCode, valorAtual }: Props) {
  const [novoValor, setNovoValor] = useState('')
  const [motivo, setMotivo] = useState('')
  const request = useRequestValueEdit()

  const valorNum = parseFloat(novoValor.replace(',', '.'))
  const valorValido = !isNaN(valorNum) && valorNum > 0 && valorNum !== valorAtual
  const motivoValido = motivo.trim().length >= 20
  const canSubmit = valorValido && motivoValido && !request.isPending

  function handleClose() {
    if (request.isPending) return
    setNovoValor('')
    setMotivo('')
    onClose()
  }

  async function handleSubmit() {
    if (!canSubmit) return
    await request.mutateAsync({
      jobId,
      valorAnterior: valorAtual,
      valorNovo:     valorNum,
      motivo:        motivo.trim(),
    })
    handleClose()
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Editar valor do arquivo</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-1">
          {/* Identificação */}
          <p className="text-xs font-mono" style={{ color: 'hsl(var(--pm-gray-500))' }}>
            {jobCode}
          </p>

          {/* Aviso */}
          <div className="flex items-start gap-2.5 px-3 py-2.5 rounded-lg"
            style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.25)' }}>
            <AlertTriangle size={14} className="shrink-0 mt-0.5" style={{ color: '#FBBF24' }} />
            <p className="text-xs leading-relaxed" style={{ color: '#FBBF24' }}>
              Este arquivo já foi enviado para a franquia/cliente.
              A alteração de valor exige aprovação do financeiro.
            </p>
          </div>

          {/* Valor atual */}
          <div>
            <p className="text-xs text-muted-foreground mb-1">Valor atual</p>
            <p className="text-sm font-semibold" style={{ color: '#F87171' }}>{fmtBRL(valorAtual)}</p>
          </div>

          {/* Novo valor */}
          <div>
            <label className="text-xs text-muted-foreground block mb-1">
              Novo valor <span style={{ color: '#F87171' }}>*</span>
            </label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              placeholder="0,00"
              value={novoValor}
              onChange={(e) => setNovoValor(e.target.value)}
              className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1"
              style={{
                background: 'hsl(var(--pm-gray-800))',
                border: '1px solid rgba(255,255,255,0.08)',
                color: 'hsl(var(--pm-gray-200))',
                '--tw-ring-color': 'hsl(var(--pm-red-500))',
              } as React.CSSProperties}
            />
            {novoValor && !isNaN(valorNum) && valorNum === valorAtual && (
              <p className="text-[11px] mt-1" style={{ color: '#F87171' }}>
                O novo valor deve ser diferente do valor atual.
              </p>
            )}
          </div>

          {/* Motivo */}
          <div>
            <label className="text-xs text-muted-foreground block mb-1">
              Motivo da edição <span style={{ color: '#F87171' }}>*</span>
              <span className="ml-2" style={{ color: motivo.trim().length >= 20 ? '#4ADE80' : 'hsl(var(--pm-gray-600))' }}>
                ({motivo.trim().length}/20 mín.)
              </span>
            </label>
            <textarea
              rows={3}
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Descreva o motivo da alteração..."
              className="w-full rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1"
              style={{
                background: 'hsl(var(--pm-gray-800))',
                border: '1px solid rgba(255,255,255,0.08)',
                color: 'hsl(var(--pm-gray-200))',
              } as React.CSSProperties}
            />
            {/* Chips de sugestão */}
            <div className="flex flex-wrap gap-1.5 mt-2">
              {CHIPS.map((chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => setMotivo(chip)}
                  className="px-2 py-0.5 rounded-full text-[11px] transition-colors"
                  style={{
                    background: motivo === chip ? 'hsl(var(--pm-red-500)/0.2)' : 'hsl(var(--pm-gray-800))',
                    color: motivo === chip ? '#fff' : 'hsl(var(--pm-gray-400))',
                    border: `1px solid ${motivo === chip ? 'hsl(var(--pm-red-500)/0.4)' : 'rgba(255,255,255,0.08)'}`,
                  }}
                >
                  {chip}
                </button>
              ))}
            </div>
          </div>

          {/* Ações */}
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={handleClose} disabled={request.isPending}>
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!canSubmit}
              style={{ background: canSubmit ? 'hsl(var(--pm-red-500))' : undefined }}
              className="text-white border-0 min-w-[140px]"
            >
              {request.isPending
                ? <Loader2 size={14} className="animate-spin" />
                : 'Solicitar alteração'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
