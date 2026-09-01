// franchise-signature — Módulo comercial (Fase 5)
// Uma função, 3 ações (body.action):
//   view  — PÚBLICO: dados do contrato + URL assinada do PDF, para a página /assinar/:token
//   send  — AUTH (admin matriz): aprova o contrato, gera token+expiração e envia o link por e-mail (Resend)
//   sign  — PÚBLICO: registra a assinatura (nome+IP+timestamp+hash), ATIVA a unidade,
//           gera a comissão do vendedor e convida o representante (best-effort)
//
// Deploy com --no-verify-jwt (view/sign são públicos). O "send" é protegido por requireAuth internamente.
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { PUBLIC_CORS as CORS } from '../_shared/cors.ts'
import { requireAuth } from '../_shared/auth.ts'

const JSON_HEADERS = { ...CORS, 'Content-Type': 'application/json' }
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: JSON_HEADERS })

const ADMIN_ROLES = ['company_admin', 'operations_admin', 'system_ti']

function admin() {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )
}

function newToken() {
  return (crypto.randomUUID() + crypto.randomUUID()).replace(/-/g, '')
}

async function sha256Hex(buf: ArrayBuffer): Promise<string> {
  const h = await crypto.subtle.digest('SHA-256', buf)
  return Array.from(new Uint8Array(h)).map((b) => b.toString(16).padStart(2, '0')).join('')
}

// Último PDF gerado da unidade (kind=contract_generated). Retorna { path } ou null.
async function latestContractPath(sb: ReturnType<typeof admin>, unitId: string): Promise<string | null> {
  const { data } = await sb
    .from('unit_documents')
    .select('storage_path')
    .eq('unit_id', unitId)
    .eq('kind', 'contract_generated')
    .order('created_at', { ascending: false })
    .limit(1)
  return data?.[0]?.storage_path ?? null
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  let body: Record<string, unknown>
  try { body = await req.json() } catch { return json({ error: 'JSON inválido' }, 400) }
  const action = String(body.action ?? '')

  const sb = admin()
  const siteUrl = Deno.env.get('SITE_URL') ?? 'http://localhost:5173'

  // ─────────────────────────────────────────────────────────────── VIEW (público)
  if (action === 'view') {
    const token = String(body.token ?? '')
    if (!token) return json({ error: 'token obrigatório' }, 400)

    const { data: unit } = await sb
      .from('franchise_units')
      .select('id, name, city, state, contract_type, franchise_fee, payment_plan, sale_payment_method, responsavel_legal_nome, responsavel_legal_email, sale_status, sign_token_expires_at, signed_at')
      .eq('sign_token', token)
      .maybeSingle()

    if (!unit) return json({ error: 'not_found', message: 'Link inválido.' }, 404)
    if (unit.signed_at || unit.sale_status === 'active') {
      return json({ status: 'signed', message: 'Contrato já assinado.', unit: { name: unit.name } })
    }
    if (unit.sign_token_expires_at && new Date(unit.sign_token_expires_at as string) < new Date()) {
      return json({ status: 'expired', message: 'Link expirado. Solicite um novo à Injediesel.' }, 410)
    }

    let pdfUrl: string | null = null
    const path = await latestContractPath(sb, unit.id as string)
    if (path) {
      const { data: signed } = await sb.storage.from('unit-documents').createSignedUrl(path, 600)
      pdfUrl = signed?.signedUrl ?? null
    }

    return json({
      status: 'ready',
      unit: {
        name: unit.name, city: unit.city, state: unit.state,
        contract_type: unit.contract_type, franchise_fee: unit.franchise_fee,
        payment_plan: unit.payment_plan, sale_payment_method: unit.sale_payment_method,
        responsavel_nome: unit.responsavel_legal_nome,
        responsavel_email: unit.responsavel_legal_email,
      },
      pdf_url: pdfUrl,
    })
  }

  // ─────────────────────────────────────────────────────────── SEND (admin matriz)
  if (action === 'send') {
    const auth = await requireAuth(req, 'role, active').catch(() => null)
    if (!auth || !ADMIN_ROLES.includes(auth.profile.role as string)) {
      return json({ error: 'Forbidden: apenas a matriz pode aprovar e enviar o contrato' }, 403)
    }
    const unitId = String(body.unit_id ?? '')
    if (!unitId) return json({ error: 'unit_id obrigatório' }, 400)

    const { data: unit } = await sb
      .from('franchise_units')
      .select('id, name, sale_status, responsavel_legal_nome, responsavel_legal_email')
      .eq('id', unitId)
      .maybeSingle()

    if (!unit) return json({ error: 'Unidade não encontrada' }, 404)
    if (!['pending', 'approved'].includes(unit.sale_status as string)) {
      return json({ error: `Contrato não está em estado de aprovação (atual: ${unit.sale_status}).` }, 409)
    }
    const email = unit.responsavel_legal_email as string | null
    if (!email) return json({ error: 'Unidade sem e-mail do responsável legal.' }, 400)

    const token = newToken()
    const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 dias

    const { error: upErr } = await sb
      .from('franchise_units')
      .update({
        sale_status: 'approved',
        sign_token: token,
        sign_token_expires_at: expires,
        approved_at: new Date().toISOString(),
        approved_by: auth.user.id,
      })
      .eq('id', unitId)
    if (upErr) return json({ error: upErr.message }, 500)

    const signUrl = `${siteUrl}/assinar/${token}`

    // Envio por e-mail (Resend). Best-effort: se falhar, devolve o link para envio manual.
    let emailSent = false
    const resendKey = Deno.env.get('RESEND_API_KEY')
    if (resendKey) {
      try {
        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${resendKey}` },
          body: JSON.stringify({
            from: Deno.env.get('RESEND_FROM') ?? 'Injediesel <noreply@inje.tech>',
            to: [email],
            subject: 'Contrato para assinatura — Injediesel',
            html: `
              <p>Olá, ${unit.responsavel_legal_nome ?? ''}.</p>
              <p>Seu contrato de parceria com a <strong>Injediesel</strong> (unidade <strong>${unit.name}</strong>) está pronto para assinatura eletrônica.</p>
              <p>Revise o documento e assine clicando no botão abaixo:</p>
              <p><a href="${signUrl}" style="background:#D97706;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block;font-weight:600;">Revisar e assinar o contrato</a></p>
              <p>O link expira em 7 dias. Ao assinar, seu acesso ao sistema será liberado automaticamente.</p>
              <p>Injediesel Power Chip</p>
            `,
          }),
        })
        emailSent = res.ok
      } catch { emailSent = false }
    }

    return json({ ok: true, email_sent: emailSent, sign_url: signUrl, expires_at: expires })
  }

  // ─────────────────────────────────────────────────────────────── SIGN (público)
  if (action === 'sign') {
    const token = String(body.token ?? '')
    const signerName = String(body.name ?? '').trim()
    if (!token) return json({ error: 'token obrigatório' }, 400)
    if (signerName.length < 3) return json({ error: 'Informe o nome completo de quem assina.' }, 400)

    const { data: unit } = await sb
      .from('franchise_units')
      .select('id, name, contract_type, franchise_fee, sale_seller_id, sale_status, sign_token_expires_at, signed_at, responsavel_legal_email, responsavel_legal_nome, contract_start_date')
      .eq('sign_token', token)
      .maybeSingle()

    if (!unit) return json({ error: 'Link inválido.' }, 404)
    if (unit.signed_at || unit.sale_status === 'active') return json({ error: 'Contrato já assinado.' }, 409)
    if (unit.sale_status !== 'approved') return json({ error: 'Contrato não está liberado para assinatura.' }, 409)
    if (unit.sign_token_expires_at && new Date(unit.sign_token_expires_at as string) < new Date()) {
      return json({ error: 'Link expirado.' }, 410)
    }

    // Hash do documento assinado (âncora de integridade). Se não houver PDF, hash do resumo.
    let signedHash = ''
    const path = await latestContractPath(sb, unit.id as string)
    if (path) {
      const { data: file } = await sb.storage.from('unit-documents').download(path)
      if (file) signedHash = await sha256Hex(await file.arrayBuffer())
    }
    if (!signedHash) {
      const canonical = `${unit.id}|${unit.name}|${unit.franchise_fee}|${signerName}`
      signedHash = await sha256Hex(new TextEncoder().encode(canonical))
    }

    const ip = (req.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() || 'desconhecido'
    const today = new Date().toISOString().slice(0, 10)

    // ATIVAÇÃO — o passo crítico. Feito primeiro; os demais são best-effort.
    const { error: actErr } = await sb
      .from('franchise_units')
      .update({
        sale_status: 'active',
        active: true,
        status: 'ativa',
        signed_at: new Date().toISOString(),
        signed_by_name: signerName,
        signed_ip: ip,
        signed_hash: signedHash,
        contract_start_date: unit.contract_start_date ?? today,
      })
      .eq('id', unit.id)
      .eq('sale_status', 'approved') // guarda contra corrida/duplo-clique
    if (actErr) return json({ error: actErr.message }, 500)

    const warnings: string[] = []

    // Comissão do vendedor (server-side). Best-effort.
    try {
      const { data: prod } = await sb
        .from('franchise_products')
        .select('commission_type, commission_value')
        .eq('contract_type', unit.contract_type)
        .maybeSingle()
      if (prod && unit.sale_seller_id) {
        const base = Number(unit.franchise_fee ?? 0)
        const cval = Number(prod.commission_value ?? 0)
        const amount = prod.commission_type === 'percent' ? +(base * cval / 100).toFixed(2) : cval
        const { error: cErr } = await sb.from('franchise_sale_commissions').upsert({
          unit_id: unit.id,
          seller_id: unit.sale_seller_id,
          base_amount: base,
          commission_type: prod.commission_type,
          commission_value: cval,
          amount,
          status: 'pendente',
        }, { onConflict: 'unit_id' })
        if (cErr) warnings.push('comissão: ' + cErr.message)
      } else {
        warnings.push('comissão não gerada (produto ou vendedor ausente)')
      }
    } catch (e) { warnings.push('comissão: ' + (e as Error).message) }

    // Convite do representante (best-effort — não bloqueia a ativação).
    try {
      const email = unit.responsavel_legal_email as string | null
      if (email) {
        const { data: invited, error: invErr } =
          await sb.auth.admin.inviteUserByEmail(email, {
            data: { unit_id: unit.id, role: 'franchise_manager', must_set_password: true },
            redirectTo: `${siteUrl}/login`,
          })
        let userId: string | null = invited?.user?.id ?? null
        if (invErr && /already/i.test(invErr.message)) {
          const { data: prof } = await sb.from('profiles').select('id').eq('email', email).maybeSingle()
          userId = prof?.id ?? null
        } else if (invErr) {
          warnings.push('convite: ' + invErr.message)
        }
        if (userId) {
          await sb.from('profiles').upsert({
            id: userId, email, name: unit.responsavel_legal_nome ?? email.split('@')[0],
            role: 'franchise_manager', active: true,
          }, { onConflict: 'id', ignoreDuplicates: false })
          await sb.from('user_unit_roles').upsert(
            { user_id: userId, unit_id: unit.id, role: 'franchise_manager' },
            { onConflict: 'user_id,unit_id' },
          )
          await sb.from('franchise_units').update({ manager_id: userId }).eq('id', unit.id)
        }
      } else {
        warnings.push('convite não enviado (sem e-mail)')
      }
    } catch (e) { warnings.push('convite: ' + (e as Error).message) }

    return json({ ok: true, unit_name: unit.name, signed_hash: signedHash, warnings })
  }

  return json({ error: 'ação desconhecida' }, 400)
})
