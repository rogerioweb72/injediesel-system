// src/pages/LoginParceiro.tsx — Área do Parceiro (Franqueado)
import { useState, useEffect, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, EyeOff, Lock, Mail, ArrowRight, CheckCircle2, ShieldAlert } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter,
} from '@/components/ui/card'
import { LoginBackground } from '@/components/auth/LoginBackground'
import { TunerLogo } from '@/components/branding/TunerLogo'
import { useAuthStore } from '@/stores/auth'
import { useProfile } from '@/hooks/useProfile'
import { useMyUnit } from '@/hooks/useMyUnit'
import { FRANCHISE_ROLES } from '@/types/app'
import { toSlug } from '@/lib/slug'
import { useSignIn } from '@/hooks/useSignIn'
import { useLoginThrottle } from '@/hooks/useLoginThrottle'
import { translateError } from '@/lib/errors'

const schema = z.object({
  email:    z.string().email('E-mail inválido'),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
})

type FormData = z.infer<typeof schema>

const passwordSchema = z.object({
  password:  z.string().min(6, 'Mínimo 6 caracteres'),
  password2: z.string().min(6, 'Mínimo 6 caracteres'),
}).refine(d => d.password === d.password2, {
  message: 'As senhas não coincidem', path: ['password2'],
})

export default function LoginParceiro() {
  const { session, profile } = useAuthStore()
  useProfile()
  const { data: myUnit, isLoading: unitLoading } = useMyUnit()
  const navigate = useNavigate()

  // Capture hash before supabase-js clears it
  const isInviteFlow = useRef(window.location.hash.includes('type=invite')).current

  const [showPassword, setShowPassword] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  const [matrixRejected, setMatrixRejected] = useState(false)
  const [inviteDone, setInviteDone] = useState(false)
  const [setPassError, setSetPassError] = useState<string | null>(null)
  const [settingPass, setSettingPass] = useState(false)

  const pwForm = useForm<{ password: string; password2: string }>({
    resolver: zodResolver(passwordSchema),
  })

  useEffect(() => {
    if (!session || !profile) return
    if (isInviteFlow && !inviteDone) return  // wait for user to set password

    if (!FRANCHISE_ROLES.includes(profile.role)) {
      supabase.auth.signOut()
      setMatrixRejected(true)
      return
    }

    if (unitLoading) return

    if (!myUnit) {
      supabase.auth.signOut()
      setServerError('Sua conta ainda não está vinculada a uma unidade. Entre em contato com a matriz.')
      return
    }

    const unitSlug = toSlug(myUnit.franchise_units?.name ?? myUnit.unit_id)
    const agentSlug = toSlug(profile.name ?? profile.email)
    navigate(`/${unitSlug}/${agentSlug}/dashboard`, { replace: true })
  }, [session, profile, myUnit, unitLoading, navigate])

  async function handleSetPassword(data: { password: string; password2: string }) {
    setSetPassError(null)
    setSettingPass(true)
    try {
      const { error } = await supabase.auth.updateUser({ password: data.password })
      if (error) throw error
      setInviteDone(true)
    } catch (err) {
      setSetPassError(translateError(err))
    } finally {
      setSettingPass(false)
    }
  }

  const { signIn } = useSignIn()
  const { isThrottled, cooldownLeft } = useLoginThrottle()

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  async function onSubmit(data: FormData) {
    if (isThrottled) return
    setServerError(null)
    try {
      const { profile: loadedProfile, accessToken, userId } = await signIn(data.email, data.password)

      if (!loadedProfile) return

      if (!FRANCHISE_ROLES.includes(loadedProfile.role)) {
        await supabase.auth.signOut()
        setMatrixRejected(true)
        return
      }

      const base = import.meta.env.VITE_SUPABASE_URL as string
      const key  = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string
      const unitRes = await fetch(
        `${base}/rest/v1/user_unit_roles?user_id=eq.${userId}&select=franchise_units(name)&limit=1`,
        { headers: { apikey: key, Authorization: `Bearer ${accessToken}` } },
      )
      const unitRows = await unitRes.json()
      const unitName: string | null = (Array.isArray(unitRows) && unitRows[0]?.franchise_units?.name) || null

      if (!unitName) {
        await supabase.auth.signOut()
        setServerError('Sua conta ainda não está vinculada a uma unidade. Entre em contato com a matriz.')
        return
      }

      const agentSlug = toSlug(loadedProfile.name ?? loadedProfile.email)
      const unitSlug = toSlug(unitName)
      navigate(`/${unitSlug}/${agentSlug}/dashboard`, { replace: true })
    } catch (err) {
      setServerError(translateError(err))
    }
  }

  return (
    <section className="fixed inset-0 text-slate-100 overflow-hidden" style={{ background: '#0B0C10' }}>
      <style>{`
        .lp-animate {
          opacity: 0;
          transform: translateY(24px);
          animation: lp-fadeUp 0.8s cubic-bezier(.22,.61,.36,1) 0.3s forwards;
        }
        @keyframes lp-fadeUp { to { opacity: 1; transform: translateY(0); } }
        .login-logo .st3 { fill: #ffffff; }
        .login-logo .st1 { fill: hsl(1 65% 42%); }
        .login-logo .st2 { fill: rgba(255,255,255,0.7); }
      `}</style>

      <LoginBackground />

      <div className="relative z-10 h-full w-full grid place-items-center px-4">

        {/* ── CONVITE: definir senha ── */}
        {isInviteFlow && !inviteDone && session && (
          <Card
            className="lp-animate w-full max-w-md border-white/5 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.4)]"
            style={{ background: 'rgba(20,21,28,0.85)' }}
          >
            <CardHeader className="items-center text-center space-y-3 pb-5 pt-7">
              <div className="login-logo mb-1">
                <TunerLogo style={{ width: 156, height: 'auto' }} />
              </div>
              <div>
                <CardTitle className="text-xl font-bold text-white tracking-tight">
                  Bem-vindo(a)! Defina sua senha
                </CardTitle>
                <CardDescription className="text-slate-400 text-sm mt-1">
                  Crie uma senha para acessar o sistema.
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={pwForm.handleSubmit(handleSetPassword)} className="grid gap-5">
                <div className="grid gap-2">
                  <Label className="text-slate-300 text-xs font-medium uppercase tracking-wider">Nova senha</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 pointer-events-none" />
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      {...pwForm.register('password')}
                      className="pl-10 pr-10 h-11 border-white/5 text-white placeholder:text-slate-600 rounded-xl"
                      style={{ background: '#0B0C10' }}
                    />
                    <button type="button" className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-md text-slate-500 hover:text-slate-300 transition-colors"
                      onClick={() => setShowPassword(v => !v)}>
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {pwForm.formState.errors.password && <p className="text-xs text-red-400">{pwForm.formState.errors.password.message}</p>}
                </div>
                <div className="grid gap-2">
                  <Label className="text-slate-300 text-xs font-medium uppercase tracking-wider">Confirmar senha</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 pointer-events-none" />
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      {...pwForm.register('password2')}
                      className="pl-10 h-11 border-white/5 text-white placeholder:text-slate-600 rounded-xl"
                      style={{ background: '#0B0C10' }}
                    />
                  </div>
                  {pwForm.formState.errors.password2 && <p className="text-xs text-red-400">{pwForm.formState.errors.password2.message}</p>}
                </div>
                {setPassError && (
                  <div className="rounded-xl px-4 py-3 text-sm text-red-400" style={{ background: 'rgba(177,40,37,0.08)', border: '1px solid rgba(177,40,37,0.2)' }}>
                    {setPassError}
                  </div>
                )}
                <Button
                  type="submit"
                  disabled={settingPass}
                  className="w-full h-11 rounded-xl text-white font-bold mt-1 border-0"
                  style={{ background: 'var(--pm-accent-gradient)' }}
                >
                  {settingPass ? (
                    <span className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Salvando...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4" /> Definir senha e entrar
                    </span>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {/* ── LOGIN NORMAL ── */}
        {(!isInviteFlow || inviteDone || !session) && (
        matrixRejected ? (
          <div className="lp-animate w-full max-w-md">
            <Card
              className="border-red-900/40 backdrop-blur-xl shadow-[0_8px_40px_rgba(0,0,0,0.6)]"
              style={{ background: 'rgba(20,21,28,0.92)' }}
            >
              <CardHeader className="space-y-4 pb-5 text-center pt-8">
                <div className="flex justify-center pb-2 login-logo">
                  <TunerLogo style={{ width: 148, height: 'auto' }} />
                </div>
                <div
                  className="mx-auto w-14 h-14 rounded-2xl flex items-center justify-center"
                  style={{ background: 'rgba(177,40,37,0.12)', border: '1px solid rgba(177,40,37,0.3)' }}
                >
                  <ShieldAlert size={24} style={{ color: 'hsl(var(--pm-red-500))' }} />
                </div>
                <div>
                  <CardTitle
                    className="text-xl font-black tracking-[0.2em] uppercase"
                    style={{ fontFamily: 'var(--pm-font-display)', color: 'hsl(var(--pm-red-500))' }}
                  >
                    Acesso Negado
                  </CardTitle>
                  <CardDescription className="text-slate-400 text-sm mt-1">
                    Área do Parceiro — PROMAX Tuner
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent className="space-y-5 text-center pb-2">
                <div
                  className="rounded-xl p-4 text-sm leading-relaxed text-slate-300"
                  style={{ background: 'rgba(177,40,37,0.06)', border: '1px solid rgba(177,40,37,0.15)' }}
                >
                  Sua conta de <strong className="text-white">matriz</strong> não possui
                  autorização para acessar esta área.
                  <br /><br />
                  Esta seção é exclusiva para <strong className="text-white">franqueados e parceiros</strong>.
                </div>
                <div className="flex flex-col gap-2 pt-1">
                  <Button
                    asChild
                    className="w-full h-11 rounded-xl font-bold text-white border-0"
                    style={{ background: 'var(--pm-accent-gradient)' }}
                  >
                    <Link to="/appmax">
                      Ir para Acesso Interno
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                  <Button
                    asChild
                    variant="ghost"
                    className="w-full h-10 rounded-xl text-slate-400 hover:text-white hover:bg-white/5"
                  >
                    <Link to="/">← Voltar ao Site</Link>
                  </Button>
                </div>
              </CardContent>
              <CardFooter className="justify-center pt-4 pb-6 border-t border-white/[0.03] mt-2">
                <p className="text-xs text-slate-600 text-center">
                  Tentativa de acesso não autorizado registrada.
                </p>
              </CardFooter>
            </Card>
          </div>
        ) : (
        <Card
          className="lp-animate w-full max-w-md border-white/5 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.4)]"
          style={{ background: 'rgba(20,21,28,0.85)' }}
        >
          <CardHeader className="items-center text-center space-y-3 pb-5 pt-7">
            {/* Logo */}
            <div className="login-logo mb-1">
              <TunerLogo style={{ width: 156, height: 'auto' }} />
            </div>
            <div>
              <CardTitle className="text-xl font-bold text-white tracking-tight">
                Área do Parceiro
              </CardTitle>
              <CardDescription className="text-slate-400 text-sm mt-1">
                Entre com suas credenciais para gerenciar sua unidade.
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="grid gap-5">
              <div className="grid gap-2">
                <Label htmlFor="email" className="text-slate-300 text-xs font-medium uppercase tracking-wider">
                  E-mail de Usuário
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 pointer-events-none" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="sua-unidade@promaxtuner.com"
                    {...register('email')}
                    className="pl-10 h-11 border-white/5 focus-visible:border-white/20 focus-visible:ring-1 focus-visible:ring-offset-0 text-white placeholder:text-slate-600 transition-all rounded-xl"
                    style={{ background: '#0B0C10' }}
                  />
                </div>
                {errors.email && <p className="text-xs text-red-400">{errors.email.message}</p>}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="password" className="text-slate-300 text-xs font-medium uppercase tracking-wider">
                  Senha de Acesso
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 pointer-events-none" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    {...register('password')}
                    className="pl-10 pr-10 h-11 border-white/5 focus-visible:border-white/20 focus-visible:ring-1 focus-visible:ring-offset-0 text-white placeholder:text-slate-600 transition-all rounded-xl"
                    style={{ background: '#0B0C10' }}
                  />
                  <button
                    type="button"
                    aria-label={showPassword ? 'Ocultar senha' : 'Exibir senha'}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-md text-slate-500 hover:text-slate-300 transition-colors"
                    onClick={() => setShowPassword(v => !v)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.password && <p className="text-xs text-red-400">{errors.password.message}</p>}
              </div>

              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    className="w-3.5 h-3.5 rounded border border-white/10 bg-transparent accent-[hsl(var(--pm-red-500))]"
                  />
                  <span className="text-slate-500 text-[11px]">Lembrar dados</span>
                </label>
                <button type="button" className="text-[11px] text-slate-500 hover:text-slate-300 transition-colors">
                  Esqueci minha senha
                </button>
              </div>

              {serverError && (
                <div
                  className="rounded-xl px-4 py-3 text-sm text-red-400"
                  style={{ background: 'rgba(177,40,37,0.08)', border: '1px solid rgba(177,40,37,0.2)' }}
                >
                  {serverError}
                </div>
              )}

              <Button
                type="submit"
                disabled={isSubmitting || isThrottled}
                className="w-full h-11 rounded-xl text-white font-bold hover:opacity-95 transition-all mt-1 border-0"
                style={{ background: 'var(--pm-accent-gradient)', boxShadow: '0 0 20px rgba(177,40,37,0.2)' }}
              >
                {isThrottled ? (
                  <span className="flex items-center gap-2">
                    Aguarde {cooldownLeft}s para tentar novamente
                  </span>
                ) : isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Entrando...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    Acessar Painel
                    <ArrowRight className="h-4 w-4" />
                  </span>
                )}
              </Button>
            </form>
          </CardContent>

          <CardFooter className="justify-center pt-3 pb-5 border-t border-white/[0.03]">
            <Link
              to="/"
              className="text-[11px] text-slate-600 hover:text-slate-400 transition-colors"
            >
              ← Voltar para o site
            </Link>
          </CardFooter>
        </Card>
        ))}
      </div>
    </section>
  )
}
