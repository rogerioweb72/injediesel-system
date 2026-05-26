// src/components/auth/LoginBackground.tsx
import { useRef, useEffect } from 'react'

export function LoginBackground() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return

    const setSize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    setSize()

    type Particle = { x: number; y: number; v: number; o: number; colorType: number }
    let particles: Particle[] = []
    let raf = 0

    const makeParticle = (): Particle => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      v: Math.random() * 0.35 + 0.1,
      o: Math.random() * 0.45 + 0.15,
      colorType: Math.random() > 0.3 ? 0 : 1,
    })

    const init = () => {
      particles = Array.from(
        { length: Math.floor((canvas.width * canvas.height) / 8000) },
        makeParticle,
      )
    }

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      for (const p of particles) {
        p.y -= p.v
        if (p.y < 0) {
          p.x = Math.random() * canvas.width
          p.y = canvas.height + Math.random() * 40
          p.v = Math.random() * 0.35 + 0.1
          p.o = Math.random() * 0.45 + 0.15
          p.colorType = Math.random() > 0.3 ? 0 : 1
        }
        ctx.fillStyle = p.colorType === 0
          ? `rgba(248,250,252,${p.o.toFixed(2)})`
          : `rgba(177,40,37,${(p.o * 0.9).toFixed(2)})`
        ctx.fillRect(p.x, p.y, 1.2, 2.5)
      }
      raf = requestAnimationFrame(draw)
    }

    const onResize = () => { setSize(); init() }
    window.addEventListener('resize', onResize)
    init()
    raf = requestAnimationFrame(draw)
    return () => {
      window.removeEventListener('resize', onResize)
      cancelAnimationFrame(raf)
    }
  }, [])

  return (
    <>
      <style>{`
        @keyframes lb-drawX {
          0%   { transform: scaleX(0); opacity: 0; }
          100% { transform: scaleX(1); opacity: 0.7; }
        }
        @keyframes lb-drawY {
          0%   { transform: scaleY(0); opacity: 0; }
          100% { transform: scaleY(1); opacity: 0.7; }
        }
        .lb-hline {
          position: absolute; left: 0; right: 0; height: 1px;
          background: rgba(255,255,255,0.03);
          transform: scaleX(0); transform-origin: 50% 50%;
          animation: lb-drawX 0.8s cubic-bezier(.22,.61,.36,1) forwards;
        }
        .lb-vline {
          position: absolute; top: 0; bottom: 0; width: 1px;
          background: rgba(255,255,255,0.03);
          transform: scaleY(0); transform-origin: 50% 0%;
          animation: lb-drawY 0.9s cubic-bezier(.22,.61,.36,1) forwards;
        }
      `}</style>

      {/* Ambient glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(60% 50% at 50% 35%, rgba(177,40,37,0.07), transparent 60%)' }}
      />

      {/* Cockpit grid */}
      <div className="absolute inset-0 pointer-events-none opacity-40">
        <div className="lb-hline" style={{ top: '15%', animationDelay: '0.1s' }} />
        <div className="lb-hline" style={{ top: '50%', animationDelay: '0.2s' }} />
        <div className="lb-hline" style={{ top: '85%', animationDelay: '0.3s' }} />
        <div className="lb-vline" style={{ left: '20%', animationDelay: '0.4s' }} />
        <div className="lb-vline" style={{ left: '50%', animationDelay: '0.5s' }} />
        <div className="lb-vline" style={{ left: '80%', animationDelay: '0.6s' }} />
      </div>

      {/* Particles */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none opacity-60 mix-blend-screen"
      />
    </>
  )
}
