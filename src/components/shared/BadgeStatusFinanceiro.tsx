// src/components/shared/BadgeStatusFinanceiro.tsx
type FinancialStatus = 'em_aberto' | 'pago' | null | undefined

interface Props {
  status: FinancialStatus
}

export function BadgeStatusFinanceiro({ status }: Props) {
  if (!status) return null

  if (status === 'pago') {
    return (
      <span
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap"
        style={{
          background: '#0f2a1a',
          color: '#22c55e',
          border: '1px solid #166534',
        }}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e] inline-block" />
        PAGO
      </span>
    )
  }

  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap"
      style={{
        background: '#2a0f0f',
        color: '#ef4444',
        border: '1px solid #991b1b',
      }}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-[#ef4444] inline-block" />
      EM ABERTO
    </span>
  )
}
