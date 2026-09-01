import { useEffect, useState, type ReactNode } from 'react'
import { useParams } from 'react-router-dom'
import { FileSignature, CheckCircle2, AlertTriangle, Loader2, ShieldCheck } from 'lucide-react'
import { fetchSignatureView, submitSignature, type SignatureView } from '@/hooks/useFranchiseSignature'

const CT_LABEL: Record<string, string> = { full: 'Full', linha_leve: 'Linha Leve' }
const PLAN_LABEL: Record<string, string> = { a_vista: 'À vista', '3x': '3x', '6x': '6x', '12x': '12x' }
const METHOD_LABEL: Record<string, string> = { boleto: 'Boleto', pix: 'PIX', cartao: 'Cartão', transferencia: 'Transferência' }

function brl(v?: number | null) {
  if (v == null) return '—'
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export default function AssinarContrato() {
  const { token = '' } = useParams()
  const [view, setView] = useState<SignatureView | null>(null)
  const [loadErr, setLoadErr] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [accepted, setAccepted] = useState(false)
  const [signing, setSigning] = useState(false)
  const [signErr, setSignErr] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  useEffect(() => {
    let alive = true
    fetchSignatureView(token)
      .then((v) => { if (alive) setView(v) })
      .catch((e) => { if (alive) setLoadErr(e instanceof Error ? e.message : 'Erro ao carregar.') })
    return () => { alive = false }
  }, [token])

  async function handleSign() {
    setSignErr(null)
    if (name.trim().length < 3) { setSignErr('Informe seu nome completo.'); return }
    if (!accepted) { setSignErr('É necessário aceitar os termos.'); return }
    setSigning(true)
    try {
      await submitSignature(token, name.trim())
      setDone(true)
    } catch (e) {
      setSignErr(e instanceof Error ? e.message : 'Falha ao assinar.')
    } finally {
      setSigning(false)
    }
  }

  return (
    <div className="min-h-screen w-full" style={{ background: 'hsl(var(--pm-gray-950))' }}>
      <div className="max-w-3xl mx-auto px-4 py-10">
        <div className="flex items-center gap-2 mb-8">
          <FileSignature className="h-6 w-6 text-amber-400" />
          <span className="text-lg font-bold tracking-wide text-white" style={{ fontFamily: 'var(--pm-font-display)' }}>
            INJEDIESEL — Assinatura de Contrato
          </span>
        </div>

        {/* Loading */}
        {!view && !loadErr && (
          <div className="flex items-center gap-3 text-zinc-400"><Loader2 className="animate-spin" size={18} /> Carregando contrato…</div>
        )}

        {/* Erro de carregamento */}
        {loadErr && (
          <StatusBox icon={<AlertTriangle className="text-red-400" />} title="Link inválido" text={loadErr} />
        )}

        {/* Já assinado */}
        {view?.status === 'signed' && (
          <StatusBox icon={<CheckCircle2 className="text-emerald-400" />} title="Contrato já assinado"
            text="Este contrato já foi assinado. Se precisar de uma via, fale com a Injediesel." />
        )}

        {/* Expirado */}
        {view?.status === 'expired' && (
          <StatusBox icon={<AlertTriangle className="text-amber-400" />} title="Link expirado"
            text={view.message ?? 'Solicite um novo link à Injediesel.'} />
        )}

        {/* Sucesso pós-assinatura */}
        {done && (
          <StatusBox icon={<CheckCircle2 className="text-emerald-400" />} title="Contrato assinado com sucesso!"
            text="Sua unidade foi ativada. Você receberá um e-mail para definir a senha e acessar o sistema Injediesel." />
        )}

        {/* Pronto para assinar */}
        {view?.status === 'ready' && !done && (
          <div className="space-y-5">
            <div className="rounded-xl p-5" style={{ background: 'hsl(var(--pm-gray-900))', border: '1px solid rgba(255,255,255,0.07)' }}>
              <p className="text-xs uppercase tracking-widest text-amber-400/80 mb-3">Resumo do contrato</p>
              <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-sm">
                <Field label="Unidade" value={view.unit?.name} />
                <Field label="Cidade/UF" value={[view.unit?.city, view.unit?.state].filter(Boolean).join(' / ') || '—'} />
                <Field label="Tipo" value={CT_LABEL[view.unit?.contract_type ?? ''] ?? view.unit?.contract_type} />
                <Field label="Valor do contrato" value={brl(view.unit?.franchise_fee)} />
                <Field label="Plano" value={PLAN_LABEL[view.unit?.payment_plan ?? ''] ?? '—'} />
                <Field label="Forma de pagamento" value={METHOD_LABEL[view.unit?.sale_payment_method ?? ''] ?? '—'} />
                <Field label="Responsável" value={view.unit?.responsavel_nome} />
                <Field label="E-mail" value={view.unit?.responsavel_email} />
              </div>
            </div>

            {view.pdf_url ? (
              <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.07)' }}>
                <iframe src={view.pdf_url} title="Contrato" className="w-full" style={{ height: 520, background: '#fff' }} />
              </div>
            ) : (
              <p className="text-sm text-zinc-400">Documento em anexo indisponível no momento — o resumo acima reflete os termos.</p>
            )}

            <div className="rounded-xl p-5 space-y-4" style={{ background: 'hsl(var(--pm-gray-900))', border: '1px solid rgba(255,255,255,0.07)' }}>
              <div className="space-y-1">
                <label className="text-sm text-zinc-200">Nome completo (assinatura) *</label>
                <input value={name} onChange={(e) => setName(e.target.value)}
                  placeholder="Seu nome completo"
                  className="w-full rounded-lg px-3 py-2 text-white bg-black/30 border border-white/10 focus:border-amber-500/50 outline-none" />
              </div>
              <label className="flex items-start gap-2 cursor-pointer">
                <input type="checkbox" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} className="mt-0.5" />
                <span className="text-sm text-zinc-300">
                  Li o contrato e <strong>aceito seus termos</strong>. Reconheço que esta assinatura eletrônica
                  (nome, data, hora e IP) tem validade legal.
                </span>
              </label>

              {signErr && <p className="text-sm text-red-400">{signErr}</p>}

              <button onClick={handleSign} disabled={signing}
                className="w-full flex items-center justify-center gap-2 rounded-lg py-3 font-semibold text-white disabled:opacity-60"
                style={{ background: 'linear-gradient(135deg, #D97706 0%, #F59E0B 100%)' }}>
                {signing ? <Loader2 className="animate-spin" size={18} /> : <ShieldCheck size={18} />}
                {signing ? 'Assinando…' : 'Assinar contrato'}
              </button>
              <p className="text-[11px] text-zinc-500 flex items-center gap-1">
                <ShieldCheck size={12} /> Assinatura registrada com data, hora, IP e hash do documento.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wider text-zinc-500">{label}</p>
      <p className="text-zinc-100">{value || '—'}</p>
    </div>
  )
}

function StatusBox({ icon, title, text }: { icon: ReactNode; title: string; text: string }) {
  return (
    <div className="rounded-xl p-6 flex items-start gap-3" style={{ background: 'hsl(var(--pm-gray-900))', border: '1px solid rgba(255,255,255,0.07)' }}>
      <div className="mt-0.5">{icon}</div>
      <div>
        <p className="text-white font-semibold mb-1">{title}</p>
        <p className="text-sm text-zinc-400">{text}</p>
      </div>
    </div>
  )
}
