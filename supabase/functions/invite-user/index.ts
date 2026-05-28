import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import { requireAuth } from '../_shared/auth.ts'

const FRANCHISE_ROLES = ['franchise_manager', 'unit_manager', 'ecu_technician', 'unit_seller', 'receptionist', 'finance_staff']
const MATRIX_ROLES    = ['company_admin', 'operations_admin', 'finance_admin', 'support_agent', 'seller']

serve(async (req) => {
  const CORS = corsHeaders(req)
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceKey  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

  const auth = await requireAuth(req, 'role, active').catch(() => null)
  if (!auth) return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: CORS })
  const { callerClient, user, profile: callerProfile } = auth

  const body = await req.json()
  const { email, name, role, unit_id, commission_rate = 0, max_discount_pct = 0, permissions = null } = body

  if (!email || !role) {
    return new Response(JSON.stringify({ error: 'email e role são obrigatórios' }), { status: 400, headers: CORS })
  }

  // SECURITY: allowlist explícita — rejeita qualquer role fora do conjunto válido,
  // incluindo 'system_ti' que não pertence a nenhum dos dois arrays acima.
  const ALL_VALID_ROLES = [...FRANCHISE_ROLES, ...MATRIX_ROLES]
  if (!ALL_VALID_ROLES.includes(role)) {
    return new Response(JSON.stringify({ error: 'Role inválido ou não permitido via convite' }), { status: 400, headers: CORS })
  }

  const isFranchiseRole = FRANCHISE_ROLES.includes(role)
  const isMatrixRole    = MATRIX_ROLES.includes(role)
  const callerRole      = callerProfile.role

  const canManageMatrix    = ['company_admin', 'system_ti'].includes(callerRole)
  const canManageFranchise = ['company_admin', 'system_ti', 'franchise_manager', 'unit_manager'].includes(callerRole)

  if (isFranchiseRole && !canManageFranchise) {
    return new Response(JSON.stringify({ error: 'Sem permissão para criar usuários de franquia' }), { status: 403, headers: CORS })
  }
  if (isMatrixRole && !canManageMatrix) {
    return new Response(JSON.stringify({ error: 'Apenas administradores podem criar usuários de matriz' }), { status: 403, headers: CORS })
  }

  // SECURITY (VULN-02): franchise_manager/unit_manager só podem convidar para suas próprias unidades
  if (['franchise_manager', 'unit_manager'].includes(callerRole) && isFranchiseRole) {
    if (!unit_id) {
      return new Response(JSON.stringify({ error: 'unit_id é obrigatório para usuários de franquia' }), { status: 400, headers: CORS })
    }
    const { data: callerUnit } = await callerClient
      .from('user_unit_roles')
      .select('unit_id')
      .eq('user_id', user.id)
      .eq('unit_id', unit_id)
      .single()
    if (!callerUnit) {
      return new Response(JSON.stringify({ error: 'Forbidden: unidade fora do seu escopo' }), { status: 403, headers: CORS })
    }
  }

  // company_admin/system_ti can create franchise-role users without a unit (matrix-based collaborator)
  if (isFranchiseRole && !unit_id && !canManageMatrix) {
    return new Response(JSON.stringify({ error: 'unit_id é obrigatório para usuários de franquia' }), { status: 400, headers: CORS })
  }

  // Rate limit: max 10 invites per admin per hour
  const adminClient = createClient(supabaseUrl, serviceKey)
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
  const { count: recentInvites } = await adminClient
    .from('audit_logs')
    .select('*', { count: 'exact', head: true })
    .eq('actor_id', user.id)
    .eq('action', 'invited')
    .gte('created_at', oneHourAgo)
  if ((recentInvites ?? 0) >= 10) {
    return new Response(
      JSON.stringify({ error: 'Limite de convites atingido. Aguarde 1 hora antes de enviar novos convites.' }),
      { status: 429, headers: CORS },
    )
  }

  const siteUrl = Deno.env.get('SITE_URL') ?? 'http://localhost:5173'

  const { data: invited, error: inviteErr } = await adminClient.auth.admin.inviteUserByEmail(email, {
    data: { role, unit_id: unit_id ?? null },
    redirectTo: `${siteUrl}/login`,
  })

  let userId: string

  if (inviteErr) {
    const alreadyExists =
      inviteErr.message.toLowerCase().includes('already been registered') ||
      inviteErr.message.toLowerCase().includes('already registered')

    if (!alreadyExists) {
      return new Response(JSON.stringify({ error: inviteErr.message }), { status: 400, headers: CORS })
    }

    const { data: existingProfile } = await adminClient
      .from('profiles')
      .select('id')
      .eq('email', email)
      .single()

    if (existingProfile) {
      // Email já pertence a um usuário ativo — não sobrescrever perfil existente.
      return new Response(
        JSON.stringify({ error: 'Este e-mail já está cadastrado no sistema. Edite o usuário existente para alterar permissões.' }),
        { status: 409, headers: CORS },
      )
    } else {
      const { data: { users: authUsers } } = await adminClient.auth.admin.listUsers({ perPage: 1000 })
      const authUser = authUsers.find((u: { email?: string }) => u.email === email)
      if (!authUser) {
        return new Response(JSON.stringify({ error: 'Usuário não encontrado no sistema.' }), { status: 404, headers: CORS })
      }
      userId = authUser.id
    }
  } else {
    userId = invited.user.id
  }

  await adminClient.from('profiles').upsert({
    id: userId,
    email,
    name: name || email.split('@')[0],
    role,
    active: true,
    commission_rate,
    max_discount_pct,
    permissions,
  }, { onConflict: 'id', ignoreDuplicates: false })

  if (isFranchiseRole && unit_id) {
    await adminClient.from('user_unit_roles').upsert({
      user_id: userId,
      unit_id,
      role,
    }, { onConflict: 'user_id,unit_id' })
  }

  return new Response(JSON.stringify({ ok: true, user_id: userId }), {
    status: 200,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
})
