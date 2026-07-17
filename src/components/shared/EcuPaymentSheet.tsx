import { useState } from 'react'
import { X, Loader2, CheckCircle2 } from 'lucide-react'
import { useRegisterPayment, type PendingPayment } from '@/hooks/useCaixa'

const PAYMENT_METHODS = ['Dinheiro', 'Cartão Débito', 'Cartão Crédito', 'PIX', 'Transferência']

function fmtBRL(value: number) {
  return Math.abs(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
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

interface Props {
  payment: PendingPayment
  maxDiscountPct: number
  onClose: () => void
}

export function EcuPaymentSheet({ payment, maxDiscountPct, onClose }: Props) {
  const [method, setMethod] = useState(PAYMENT_METHODS[0])
  const [discountPct, setDiscountPct] = useState(0)
  const registerPayment = useRegisterPayment()

  const grossAmount = payment.amount
  const discountAmount = Number((grossAmount * (discountPct / 100)).toFixed(2))
  const netAmount = Number((grossAmount - discountAmount).toFixed(2))
  const discountExceeded = discountPct > maxDiscountPct
  const seller = payment.ecu_jobs?.seller ?? null
  const commissionRate = seller?.commission_rate ?? 0
  const commissionAmount = seller ? Number((netAmount * (commissionRate / 100)).toFixed(2)) : 0

  async function handleConfirm() {
    if (discountExceeded) return
    await registerPayment.mutateAsync({
      entryId: payment.id,
      paymentMethod: method,
      discountPct,
      jobId: payment.ecu_jobs?.id ?? '',
      sellerId: seller?.id ?? null,
      grossAmount,
      commissionRate,
    })
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.6)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-t-2xl sm:rounded-2xl p-6 space-y-5"
        style={{ background: 'hsl(var(--pm-gray-900))', border: '1px solid rgba(255,255,255,0.07)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-white">Registrar Pagamento ECU</h3>
          <button onClick={onClose} style={{ color: 'hsl(var(--pm-gray-500))' }}><X size={18} /></button>
        </div>

        <div className="rounded-lg p-3 space-y-1 text-sm" style={{ background: 'hsl(var(--pm-gray-800))' }}>
          <p className="font-medium text-white">{payment.ecu_jobs?.customers?.name ?? '—'}</p>
          <p style={{ color: 'hsl(var(--pm-gray-400))' }}>{payment.ecu_jobs?.service_type ?? payment.description}</p>
          {seller && (
            <p className="text-xs" style={{ color: 'hsl(var(--pm-gray-500))' }}>
              Vendedor: {seller.name} ({commissionRate}% comissão)
            </p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold uppercase" style={{ color: 'hsl(var(--pm-gray-500))' }}>
            Forma de pagamento
          </label>
          <select value={method} onChange={(e) => setMethod(e.target.value)} style={inputStyle}>
            {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold uppercase" style={{ color: 'hsl(var(--pm-gray-500))' }}>
            Desconto (%)
          </label>
          <input
            type="number" min={0} max={100} step={0.5}
            value={discountPct}
            onChange={(e) => setDiscountPct(Number(e.target.value))}
            style={{ ...inputStyle, border: discountExceeded ? '1px solid #F87171' : inputStyle.border }}
          />
          {discountExceeded && (
            <p className="text-xs" style={{ color: '#F87171' }}>
              Desconto acima do limite autorizado (máx {maxDiscountPct}%)
            </p>
          )}
        </div>

        <div className="rounded-lg p-3 space-y-1.5 text-sm" style={{ background: 'hsl(var(--pm-gray-800))' }}>
          <div className="flex justify-between" style={{ color: 'hsl(var(--pm-gray-400))' }}>
            <span>Valor original</span><span>{fmtBRL(grossAmount)}</span>
          </div>
          {discountAmount > 0 && (
            <div className="flex justify-between" style={{ color: '#F87171' }}>
              <span>Desconto ({discountPct}%)</span><span>- {fmtBRL(discountAmount)}</span>
            </div>
          )}
          <div className="flex justify-between font-semibold text-white border-t pt-1.5" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
            <span>Total a cobrar</span><span>{fmtBRL(netAmount)}</span>
          </div>
          {seller && commissionAmount > 0 && (
            <div className="flex justify-between text-xs" style={{ color: 'hsl(var(--pm-gray-500))' }}>
              <span>Comissão {seller.name}</span><span>{fmtBRL(commissionAmount)}</span>
            </div>
          )}
        </div>

        <button
          onClick={handleConfirm}
          disabled={discountExceeded || registerPayment.isPending}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-semibold text-sm disabled:opacity-40"
          style={{ background: 'hsl(var(--pm-red-500))', color: '#fff' }}
        >
          {registerPayment.isPending
            ? <Loader2 size={16} className="animate-spin" />
            : <CheckCircle2 size={16} />}
          Confirmar Pagamento
        </button>
      </div>
    </div>
  )
}
