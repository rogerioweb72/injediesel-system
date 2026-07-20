import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import { requireAuth } from '../_shared/auth.ts'

serve(async (req) => {
  const CORS = corsHeaders(req)
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceKey  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

  const auth = await requireAuth(req, 'role, active').catch(() => null)
  if (!auth || !['company_admin', 'system_ti', 'operations_admin'].includes(auth.profile.role as string)) {
    return new Response(JSON.stringify({ error: 'Forbidden: apenas company_admin pode convidar franqueados' }), {
      status: 403, headers: CORS,
    })
  }
  // Parse body
  const { email, name, unit_id, role = 'franchise_manager' } = await req.json()
  if (!email || !unit_id) {
    return new Response(JSON.stringify({ error: 'email e unit_id são obrigatórios' }), {
      status: 400, headers: CORS,
    })
  }

  const adminClient = createClient(supabaseUrl, serviceKey)

  // Send invite via Supabase Auth
  const siteUrl = Deno.env.get('SITE_URL') ?? 'http://localhost:5173'
  const { data: invited, error: inviteErr } = await adminClient.auth.admin.inviteUserByEmail(email, {
    data: { unit_id, role, must_set_password: true },
    redirectTo: `${siteUrl}/login`,
  })

  if (inviteErr) {
    const alreadyExists = inviteErr.message.toLowerCase().includes('already been registered') ||
                          inviteErr.message.toLowerCase().includes('already registered')

    if (!alreadyExists) {
      return new Response(JSON.stringify({ error: inviteErr.message }), { status: 400, headers: CORS })
    }

    // Usuário já tem conta — buscar ID via profiles ou auth.users
    let userId: string

    const { data: existingProfile } = await adminClient
      .from('profiles')
      .select('id')
      .eq('email', email)
      .single()

    if (existingProfile) {
      userId = existingProfile.id
    } else {
      // Perfil não existe — buscar em auth.users e criar
      const { data: { users: authUsers } } = await adminClient.auth.admin.listUsers({ perPage: 1000 })
      const authUser = authUsers.find(u => u.email === email)

      if (!authUser) {
        return new Response(JSON.stringify({ error: 'Usuário não encontrado no sistema de autenticação.' }), {
          status: 404, headers: CORS,
        })
      }

      userId = authUser.id

      // Criar perfil faltante
      await adminClient.from('profiles').upsert({
        id: authUser.id,
        email,
        name: name || email.split('@')[0],
        role,
        active: true,
      }, { onConflict: 'id', ignoreDuplicates: false })
    }

    const { error: roleErr } = await adminClient.from('user_unit_roles').upsert({
      user_id: userId,
      unit_id,
      role,
    }, { onConflict: 'user_id,unit_id' })

    if (roleErr) {
      return new Response(JSON.stringify({ error: roleErr.message }), { status: 500, headers: CORS })
    }

    // Gerar link de recuperação de senha e enviar via Resend
    const siteUrlForRecovery = Deno.env.get('SITE_URL') ?? 'http://localhost:5173'
    const { data: linkData } = await adminClient.auth.admin.generateLink({
      type: 'magiclink',
      email,
      options: { redirectTo: `${siteUrlForRecovery}/login?setup=1` },
    })

    const resendKey = Deno.env.get('RESEND_API_KEY')
    if (resendKey && linkData?.properties?.action_link) {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${resendKey}`,
        },
        body: JSON.stringify({
          from: 'Injediesel <noreply@web72.com.br>',
          to: [email],
          subject: 'Acesso liberado — Injediesel',
          html: `
            <p>Olá,</p>
            <p>Seu acesso ao sistema <strong>Injediesel</strong> foi liberado para uma nova unidade.</p>
            <p>Clique no botão abaixo para entrar diretamente (sem precisar de senha):</p>
            <p><a href="${linkData.properties.action_link}" style="background:#E72B2B;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block;">Acessar o Sistema</a></p>
            <p>O link expira em 1 hora. Use em modo anônimo ou deslogado.</p>
            <p>Injediesel</p>
          `,
        }),
      })
    }

    return new Response(JSON.stringify({ ok: true, user_id: userId, already_registered: true }), {
      status: 200,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }

  // Create profile if not exists (profile já existe via trigger handle_new_user;
  // este upsert só enriquece email/name/role — falha aqui é logada, não fatal)
  const { error: profileErr } = await adminClient.from('profiles').upsert({
    id:     invited.user.id,
    email,
    name:   name || email.split('@')[0],
    role,
    active: true,
  }, { onConflict: 'id', ignoreDuplicates: false })

  if (profileErr) {
    console.error('profile upsert falhou (não fatal):', profileErr.message)
  }

  // Associate user with unit
  const { error: roleErr } = await adminClient.from('user_unit_roles').upsert({
    user_id: invited.user.id,
    unit_id,
    role,
  }, { onConflict: 'user_id,unit_id' })

  if (roleErr) {
    return new Response(JSON.stringify({ error: roleErr.message }), { status: 500, headers: CORS })
  }

  return new Response(JSON.stringify({ ok: true, user_id: invited.user.id, profile_warning: profileErr?.message ?? null }), {
    status: 200,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
})
