// src/pages/LoginParceiro.tsx — Área do Parceiro (Franqueado)
import { useState, useEffect } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, EyeOff, Lock, Mail, ArrowRight } from 'lucide-react'
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

const schema = z.object({
  email:    z.string().email('E-mail inválido'),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
})

type FormData = z.infer<typeof schema>

export default function LoginParceiro() {
  const { session, profile } = useAuthStore()
  const { isFranchiseUser } = useProfile()
  const { data: myUnit, isLoading: unitLoading } = useMyUnit()
  const navigate = useNavigate()
  const location = useLocation()

  const [showPassword, setShowPassword] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  const explicitFrom = (location.state as { from?: { pathname: string } })?.from?.pathname

  useEffect(() => {
    if (!session || !profile) return

    if (FRANCHISE_ROLES.includes(profile.role)) {
      if (unitLoading) return
      const unitName = myUnit?.franchise_units?.name ?? profile.id
      const unitSlug = toSlug(unitName)
      const agentSlug = toSlug(profile.name ?? profile.email)
      navigate(`/${unitSlug}/${agentSlug}/dashboard`, { replace: true })
    } else {
      const agentSlug = toSlug(profile.name ?? profile.email)
      navigate(explicitFrom ?? `/${agentSlug}/dashboard`, { replace: true })
    }
  }, [session, profile, myUnit, unitLoading, navigate, explicitFrom, isFranchiseUser])

  const { signIn } = useSignIn()

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  async function onSubmit(data: FormData) {
    setServerError(null)
    try {
      const { profile: loadedProfile, accessToken, userId } = await signIn(data.email, data.password)

      // Fetch unit name for franchise nav URL (bypass useMyUnit which uses supabase-js)
      let unitName: string | null = null
      if (loadedProfile && FRANCHISE_ROLES.includes(loadedProfile.role)) {
        const base = import.meta.env.VITE_SUPABASE_URL as string
        const key  = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string
        const unitRes = await fetch(
          `${base}/rest/v1/user_unit_roles?user_id=eq.${userId}&select=unit_id,franchise_units(name)&limit=1`,
          { headers: { apikey: key, Authorization: `Bearer ${accessToken}` } },
        )
        const unitRows = await unitRes.json()
        unitName = (Array.isArray(unitRows) && unitRows[0]?.franchise_units?.name) || null
      }

      // Navigate immediately (don't wait for useMyUnit which uses supabase-js)
      if (!loadedProfile) return
      const agentSlug = toSlug(loadedProfile.name ?? loadedProfile.email)
      if (FRANCHISE_ROLES.includes(loadedProfile.role)) {
        const unitSlug = toSlug(unitName ?? loadedProfile.id)
        navigate(`/${unitSlug}/${agentSlug}/dashboard`, { replace: true })
      } else {
        navigate(explicitFrom ?? `/${agentSlug}/dashboard`, { replace: true })
      }
    } catch (err) {
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
                disabled={isSubmitting}
                className="w-full h-11 rounded-xl text-white font-bold hover:opacity-95 transition-all mt-1 border-0"
                style={{ background: 'var(--pm-accent-gradient)', boxShadow: '0 0 20px rgba(177,40,37,0.2)' }}
              >
                {isSubmitting ? (
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
      </div>
    </section>
  )
}
