import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-6 text-center p-8">
      <div className="font-display font-black text-8xl" style={{ color: 'hsl(var(--pm-red-500))' }}>
        404
      </div>
      <div>
        <h1 className="text-2xl font-bold mb-2">Página não encontrada</h1>
        <p className="text-muted-foreground">A rota que você tentou acessar não existe.</p>
      </div>
      <Button asChild style={{ background: 'hsl(var(--pm-red-500))' }}>
        <Link to="/">Voltar ao Início</Link>
      </Button>
    </div>
  )
}
