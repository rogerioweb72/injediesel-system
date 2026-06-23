import { AlertTriangle, X } from 'lucide-react'

interface ContractBlockedModalProps {
  open: boolean
  onClose: () => void
  reason?: string | null
}

export function ContractBlockedModal({ open, onClose, reason }: ContractBlockedModalProps) {
  if (!open) return null

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,0.85)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '16px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#F59E0B',
          border: '3px solid #000',
          maxWidth: '480px', width: '100%',
          padding: '32px',
          boxShadow: '0 0 0 6px rgba(245,158,11,0.3), 0 24px 64px rgba(0,0,0,0.8)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Close */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute', top: '12px', right: '12px',
            background: 'rgba(0,0,0,0.15)', border: 'none', cursor: 'pointer',
            padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <X size={16} color="#000" />
        </button>

        {/* Icon */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
          <div style={{
            background: '#000', borderRadius: '50%',
            width: '64px', height: '64px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <AlertTriangle size={32} color="#F59E0B" />
          </div>
        </div>

        {/* Title */}
        <h2 style={{
          fontFamily: '"Barlow Condensed", "Arial Narrow", sans-serif',
          fontWeight: 900, fontSize: '28px', textTransform: 'uppercase',
          letterSpacing: '0.04em', color: '#000', textAlign: 'center',
          marginBottom: '12px', lineHeight: 1.1,
        }}>
          Unidade Bloqueada
        </h2>

        <p style={{
          fontFamily: '"DM Sans", sans-serif', fontSize: '14px',
          color: '#1a1a1a', textAlign: 'center', lineHeight: 1.6, marginBottom: '16px',
        }}>
          Esta unidade está <strong>bloqueada pela Matriz</strong> e não pode enviar arquivos ECU no momento.
        </p>

        {reason && (
          <div style={{
            background: 'rgba(0,0,0,0.1)', border: '1px solid rgba(0,0,0,0.25)',
            padding: '12px 16px', marginBottom: '16px',
          }}>
            <p style={{ fontSize: '11px', fontFamily: '"JetBrains Mono", monospace', color: '#333', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>
              Motivo
            </p>
            <p style={{ fontSize: '13px', color: '#000', fontFamily: '"DM Sans", sans-serif' }}>
              {reason}
            </p>
          </div>
        )}

        <p style={{
          fontFamily: '"DM Sans", sans-serif', fontSize: '12px',
          color: '#333', textAlign: 'center', lineHeight: 1.5,
        }}>
          Entre em contato com a Matriz Injediesel System para regularizar a situação e reativar sua unidade.
        </p>

        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '24px' }}>
          <button
            onClick={onClose}
            style={{
              background: '#000', color: '#F59E0B', border: 'none', cursor: 'pointer',
              padding: '10px 32px',
              fontFamily: '"Barlow Condensed", sans-serif', fontWeight: 800,
              fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.1em',
            }}
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  )
}
