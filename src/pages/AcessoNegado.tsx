import { Link } from 'react-router-dom'
import { ShieldAlert, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/stores/auth'
import { getAccountTier } from '@/types/app'

export default function AcessoNegado() {
  const profile = useAuthStore((s) => s.profile)

  const dashboardHref = profile
    ? getAccountTier(profile.role) === 'franchise'
      ? '/login'
      : '/appmax'
    : '/login'

  return (
    <section
      className="fixed inset-0 flex items-center justify-center px-4"
      style={{ background: '#0B0C10' }}
    >
      <div className="w-full max-w-sm text-center space-y-6">
        <div
          className="mx-auto w-16 h-16 rounded-2xl flex items-center justify-center"
          style={{ background: 'rgba(177,40,37,0.12)', border: '1px solid rgba(177,40,37,0.3)' }}
        >
          <ShieldAlert size={28} style={{ color: 'hsl(var(--pm-red-500))' }} />
        </div>

        <div className="space-y-1">
          <h1
            className="text-2xl font-black tracking-[0.15em] uppercase"
            style={{ fontFamily: 'var(--pm-font-display)', color: 'hsl(var(--pm-red-500))' }}
          >
            Acesso Negado
          </h1>
          <p className="text-sm text-slate-400">
            Você não tem permissão para acessar esta área.
          </p>
        </div>

        {profile && (
          <p className="text-xs text-slate-600">
            Logado como <span className="text-slate-400">{profile.name ?? profile.email}</span>
            {' '}— perfil sem acesso a esta rota.
          </p>
        )}

        <div className="flex flex-col gap-2">
          <Button
            asChild
            className="w-full h-11 rounded-xl font-bold text-white border-0"
            style={{ background: 'var(--pm-accent-gradient)' }}
          >
            <Link to={dashboardHref}>Ir para minha área</Link>
          </Button>
          <Button
            asChild
            variant="ghost"
            className="w-full h-10 rounded-xl text-slate-500 hover:text-white hover:bg-white/5"
          >
            <Link to={-1 as unknown as string}>
              <ArrowLeft className="h-4 w-4 mr-1" />
              Voltar
            </Link>
          </Button>
        </div>
      </div>
    </section>
  )
}
