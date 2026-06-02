// src/pages/Login.tsx — Acesso Interno (Matriz)
import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, EyeOff, Lock, Mail, ArrowRight, ShieldAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter,
} from '@/components/ui/card'
import { LoginBackground } from '@/components/auth/LoginBackground'
import { TunerLogo } from '@/components/branding/TunerLogo'
import { useAuthStore } from '@/stores/auth'
import { FRANCHISE_ROLES } from '@/types/app'
import { supabase } from '@/lib/supabase'
import { toSlug } from '@/lib/slug'
import { useSignIn } from '@/hooks/useSignIn'
import { useLoginThrottle } from '@/hooks/useLoginThrottle'

const schema = z.object({
  email:    z.string().email('E-mail inválido'),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
})

const passwordSchema = z.object({
  password:  z.string().min(6, 'Mínimo 6 caracteres'),
  password2: z.string().min(6, 'Mínimo 6 caracteres'),
}).refine(d => d.password === d.password2, { message: 'As senhas não coincidem', path: ['password2'] })

type FormData = z.infer<typeof schema>

export default function Login() {
  const { session, profile } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()

  const [isRecoveryFlow, setIsRecoveryFlow] = useState(
    window.location.hash.includes('type=recovery')
  )

  const [showPassword, setShowPassword] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  const [rejected, setRejected] = useState(false)
  const rejectingRef = useRef(false)
  const { recordFailure, reset: resetThrottle, isThrottled, cooldownLeft } = useLoginThrottle()

  // Forgot password
  const [forgotMode, setForgotMode] = useState(false)
  const [forgotEmail, setForgotEmail] = useState('')
  const [forgotSent, setForgotSent] = useState(false)
  const [forgotLoading, setForgotLoading] = useState(false)

  // Recovery (reset password)
  const [recoveryDone, setRecoveryDone] = useState(false)
  const [setPassError, setSetPassError] = useState<string | null>(null)
  const [settingPass, setSettingPass] = useState(false)
  const pwForm = useForm<{ password: string; password2: string }>({
    resolver: zodResolver(passwordSchema),
  })

  async function handleForgotPassword() {
    if (!forgotEmail) return
    setForgotLoading(true)
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
        redirectTo: `${window.location.origin}/appmax`,
      })
      if (error) throw error
      setForgotSent(true)
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Erro ao enviar e-mail.')
    } finally {
      setForgotLoading(false)
    }
  }

  async function handleSetPassword(data: { password: string; password2: string }) {
    setSetPassError(null)
    setSettingPass(true)
    try {
      const { error } = await supabase.auth.updateUser({ password: data.password })
      if (error) throw error
      setRecoveryDone(true)
    } catch (err) {
      setSetPassError(err instanceof Error ? err.message : 'Erro ao definir senha.')
    } finally {
      setSettingPass(false)
    }
  }

  // Detecta PASSWORD_RECOVERY via evento Supabase (hash pode ser limpo antes do render)
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setIsRecoveryFlow(true)
    })
    return () => subscription.unsubscribe()
  }, [])

  const explicitFrom = (location.state as { from?: { pathname: string } })?.from?.pathname

  useEffect(() => {
    if (!session || !profile) return
    if (rejectingRef.current) return
    if (isRecoveryFlow && !recoveryDone) return

    if (FRANCHISE_ROLES.includes(profile.role)) {
      rejectingRef.current = true
      supabase.auth.signOut().then(() => setRejected(true))
      return
    }

    // Use only the first word of the name to avoid multi-segment slugs (e.g. "rogerio-lima")
    // that could be captured by the /:unitSlug/:agentSlug (FranqueadoLayout) route.
    const namePart = (profile.name ?? '').split(' ')[0] || (profile.email ?? '').split('@')[0]
    const agentSlug = toSlug(namePart)
    navigate(explicitFrom ?? `/${agentSlug}/dashboard`, { replace: true })
  }, [session, profile, navigate, explicitFrom])

  const { signIn } = useSignIn()

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  async function onSubmit(data: FormData) {
    if (isThrottled) return
    setServerError(null)
    try {
      await signIn(data.email, data.password)
      resetThrottle()
    } catch (err) {
      recordFailure()
      setServerError(
        err instanceof Error ? err.message
          : typeof err === 'string' ? err
          : 'E-mail ou senha incorretos.',
      )
    }
  }

  return (
    <section className="fixed inset-0 text-slate-100 overflow-hidden" style={{ background: '#0B0C10' }}>
      <style>{`
        .lm-animate {
          opacity: 0;
          transform: translateY(24px);
          animation: lm-fadeUp 0.8s cubic-bezier(.22,.61,.36,1) 0.3s forwards;
        }
        @keyframes lm-fadeUp { to { opacity: 1; transform: translateY(0); } }
        .login-logo .st3 { fill: #ffffff; }
        .login-logo .st1 { fill: hsl(1 65% 42%); }
        .login-logo .st2 { fill: rgba(255,255,255,0.7); }
      `}</style>

      <LoginBackground />

      <div className="relative z-10 h-full w-full grid place-items-center px-4">

        {/* ── RECOVERY: definir nova senha ── */}
        {isRecoveryFlow && session && !recoveryDone && (
          <Card className="lm-animate w-full max-w-md border-white/5 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.4)]" style={{ background: 'rgba(20,21,28,0.85)' }}>
            <CardHeader className="items-center text-center space-y-3 pb-5 pt-7">
              <div className="login-logo mb-1"><TunerLogo style={{ width: 156, height: 'auto' }} /></div>
              <div>
                <CardTitle className="text-xl font-bold text-white tracking-tight">Redefinir Senha</CardTitle>
                <CardDescription className="text-slate-400 text-sm mt-1">Crie uma nova senha para sua conta.</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={pwForm.handleSubmit(handleSetPassword)} className="grid gap-5">
                <div className="grid gap-2">
                  <Label className="text-slate-300 text-xs font-medium uppercase tracking-wider">Nova senha</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 pointer-events-none" />
                    <Input type={showPassword ? 'text' : 'password'} placeholder="••••••••" {...pwForm.register('password')}
                      className="pl-10 pr-10 h-11 border-white/5 text-white placeholder:text-slate-600 rounded-xl" style={{ background: '#0B0C10' }} />
                    <button type="button" className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-md text-slate-500 hover:text-slate-300 transition-colors" onClick={() => setShowPassword(v => !v)}>
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {pwForm.formState.errors.password && <p className="text-xs text-red-400">{pwForm.formState.errors.password.message}</p>}
                </div>
                <div className="grid gap-2">
                  <Label className="text-slate-300 text-xs font-medium uppercase tracking-wider">Confirmar senha</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 pointer-events-none" />
                    <Input type={showPassword ? 'text' : 'password'} placeholder="••••••••" {...pwForm.register('password2')}
                      className="pl-10 h-11 border-white/5 text-white placeholder:text-slate-600 rounded-xl" style={{ background: '#0B0C10' }} />
                  </div>
                  {pwForm.formState.errors.password2 && <p className="text-xs text-red-400">{pwForm.formState.errors.password2.message}</p>}
                </div>
                {setPassError && <div className="rounded-xl px-4 py-3 text-sm text-red-400" style={{ background: 'rgba(177,40,37,0.08)', border: '1px solid rgba(177,40,37,0.2)' }}>{setPassError}</div>}
                <Button type="submit" disabled={settingPass} className="w-full h-11 rounded-xl text-white font-bold border-0" style={{ background: 'var(--pm-accent-gradient)' }}>
                  {settingPass ? 'Salvando...' : 'Salvar nova senha'}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {/* ── RECOVERY: senha salva ── */}
        {isRecoveryFlow && recoveryDone && (
          <Card className="lm-animate w-full max-w-md border-white/5 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.4)]" style={{ background: 'rgba(20,21,28,0.85)' }}>
            <CardContent className="pt-10 pb-8 text-center space-y-4">
              <div className="login-logo flex justify-center mb-4"><TunerLogo style={{ width: 140, height: 'auto' }} /></div>
              <p className="text-green-400 font-bold text-lg">Senha redefinida com sucesso!</p>
              <Button className="w-full h-11 rounded-xl text-white font-bold border-0" style={{ background: 'var(--pm-accent-gradient)' }}
                onClick={() => { window.location.href = '/appmax' }}>
                Fazer login <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        )}

        {/* ── ESQUECI SENHA ── */}
        {!isRecoveryFlow && forgotMode && (
          <Card className="lm-animate w-full max-w-md border-white/5 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.4)]" style={{ background: 'rgba(20,21,28,0.85)' }}>
            <CardHeader className="items-center text-center space-y-3 pb-5 pt-7">
              <div className="login-logo mb-1"><TunerLogo style={{ width: 156, height: 'auto' }} /></div>
              <CardTitle className="text-xl font-bold text-white tracking-tight">Recuperar Senha</CardTitle>
              <CardDescription className="text-slate-400 text-sm">Digite seu e-mail para receber o link de redefinição.</CardDescription>
            </CardHeader>
            <CardContent>
              {forgotSent ? (
                <div className="text-center space-y-4 py-4">
                  <p className="text-green-400 font-semibold">E-mail enviado!</p>
                  <p className="text-slate-400 text-sm">Verifique sua caixa de entrada e clique no link recebido.</p>
                  <Button variant="ghost" className="text-slate-400 hover:text-white" onClick={() => { setForgotMode(false); setForgotSent(false) }}>← Voltar</Button>
                </div>
              ) : (
                <div className="grid gap-5">
                  <div className="grid gap-2">
                    <Label className="text-slate-300 text-xs font-medium uppercase tracking-wider">E-mail</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 pointer-events-none" />
                      <Input type="email" placeholder="usuario@promaxtuner.com" value={forgotEmail}
                        onChange={e => setForgotEmail(e.target.value)}
                        className="pl-10 h-11 border-white/5 text-white placeholder:text-slate-600 rounded-xl" style={{ background: '#0B0C10' }} />
                    </div>
                  </div>
                  {serverError && <div className="rounded-xl px-4 py-3 text-sm text-red-400" style={{ background: 'rgba(177,40,37,0.08)', border: '1px solid rgba(177,40,37,0.2)' }}>{serverError}</div>}
                  <Button disabled={forgotLoading || !forgotEmail} onClick={handleForgotPassword}
                    className="w-full h-11 rounded-xl text-white font-bold border-0" style={{ background: 'var(--pm-accent-gradient)' }}>
                    {forgotLoading ? 'Enviando...' : 'Enviar link de recuperação'}
                  </Button>
                  <Button variant="ghost" className="text-slate-400 hover:text-white text-sm" onClick={() => setForgotMode(false)}>← Voltar ao login</Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {!isRecoveryFlow && !forgotMode && (rejected ? (
          /* ── ACESSO NEGADO ── */
          <div className="lm-animate w-full max-w-md">
            <Card
              className="border-red-900/40 backdrop-blur-xl shadow-[0_8px_40px_rgba(0,0,0,0.6)]"
              style={{ background: 'rgba(20,21,28,0.92)' }}
            >
              <CardHeader className="space-y-4 pb-5 text-center pt-8">
                {/* Logo */}
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
                    Área Restrita — Matriz PROMAX Tuner
                  </CardDescription>
                </div>
              </CardHeader>

              <CardContent className="space-y-5 text-center pb-2">
                <div
                  className="rounded-xl p-4 text-sm leading-relaxed text-slate-300"
                  style={{ background: 'rgba(177,40,37,0.06)', border: '1px solid rgba(177,40,37,0.15)' }}
                >
                  Sua conta de <strong className="text-white">franqueado</strong> não possui
                  autorização para acessar esta área restrita.
                  <br /><br />
                  Esta seção é exclusiva para a{' '}
                  <strong className="text-white">equipe interna da Matriz</strong>.
                  Retorne à sua área de acesso autorizada.
                </div>

                <div className="flex flex-col gap-2 pt-1">
                  <Button
                    asChild
                    className="w-full h-11 rounded-xl font-bold text-white border-0"
                    style={{ background: 'var(--pm-accent-gradient)' }}
                  >
                    <Link to="/login">
                      Ir para Área do Parceiro
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
          /* ── FORM LOGIN ── */
          <Card
            className="lm-animate w-full max-w-md border-white/5 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.4)]"
            style={{ background: 'rgba(20,21,28,0.85)' }}
          >
            <CardHeader className="items-center text-center space-y-3 pb-5 pt-7">
              {/* Logo */}
              <div className="login-logo mb-1">
                <TunerLogo style={{ width: 156, height: 'auto' }} />
              </div>
              <div>
                <CardTitle className="text-xl font-bold text-white tracking-tight">
                  Acesso Interno
                </CardTitle>
                <CardDescription className="text-slate-400 text-sm mt-1">
                  Área restrita para equipe interna PROMAX Tuner.
                </CardDescription>
              </div>
            </CardHeader>

            <CardContent>
              <form onSubmit={handleSubmit(onSubmit)} className="grid gap-5">
                <div className="grid gap-2">
                  <Label htmlFor="email" className="text-slate-300 text-xs font-medium uppercase tracking-wider">
                    E-mail
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 pointer-events-none" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="usuario@promaxtuner.com"
                      {...register('email')}
                      className="pl-10 h-11 border-white/5 focus-visible:border-white/20 focus-visible:ring-1 focus-visible:ring-offset-0 text-white placeholder:text-slate-600 transition-all rounded-xl"
                      style={{ background: '#0B0C10' }}
                    />
                  </div>
                  {errors.email && <p className="text-xs text-red-400">{errors.email.message}</p>}
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="password" className="text-slate-300 text-xs font-medium uppercase tracking-wider">
                    Senha
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
                  <button type="button" className="text-[11px] text-slate-500 hover:text-slate-300 transition-colors"
                    onClick={() => { setForgotMode(true); setServerError(null) }}>
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
                      Acessar Painel Interno
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
