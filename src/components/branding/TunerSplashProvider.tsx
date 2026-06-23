import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  startTransition,
  type ReactNode,
} from 'react'
import { useNavigate } from 'react-router-dom'
import { TunerLogo } from './TunerLogo'

type SplashVariant = 'intro' | 'auth'

type PlayOptions = {
  minDuration?: number
  variant?: SplashVariant
}

type NavigateOptions = PlayOptions & {
  href: string
  navigationDelay?: number
}

type SplashContextValue = {
  play: (options?: PlayOptions) => Promise<void>
  playIntroOnce: () => void
  playAndNavigate: (options: NavigateOptions) => void
}

const SplashContext = createContext<SplashContextValue | null>(null)

const INTRO_FLAG         = 'injediesel-intro-played'
const DEFAULT_INTRO_DUR  = 2200
const DEFAULT_AUTH_DUR   = 1600
const DEFAULT_NAV_DELAY  = 900
const EXIT_DURATION      = 620

// Evaluated once at module load — before any React render.
// If first visit this session, splash starts visible immediately,
// so the page renders 100% behind it with zero flash.
const IS_FIRST_VISIT = typeof window !== 'undefined'
  && !window.sessionStorage.getItem(INTRO_FLAG)

const SPLASH_CSS = `
.injediesel-splash {
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: grid;
  place-items: center;
  padding: 24px;
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
  background:
    radial-gradient(circle at 50% 36%, rgba(37,99,235,0.18), transparent 30%),
    rgba(10,14,26,0.96);
  transition:
    opacity ${EXIT_DURATION}ms cubic-bezier(0.7,0,0.2,1),
    visibility ${EXIT_DURATION}ms cubic-bezier(0.7,0,0.2,1);
}
.injediesel-splash.is-visible {
  opacity: 1;
  visibility: visible;
  pointer-events: auto;
}
.injediesel-splash__inner {
  position: relative;
  width: min(560px, 88vw);
  transform: translateY(10px) scale(0.965);
  opacity: 0;
}
.injediesel-splash.is-visible .injediesel-splash__inner {
  animation: injediesel-splash-enter 820ms cubic-bezier(0.22,1,0.36,1) 120ms forwards;
}
.injediesel-splash.is-closing .injediesel-splash__inner {
  animation: injediesel-splash-exit ${EXIT_DURATION}ms cubic-bezier(0.7,0,0.2,1) forwards;
}
.injediesel-splash__halo {
  position: absolute;
  inset: -18% -8%;
  background: linear-gradient(100deg, transparent 12%, rgba(255,255,255,0.18) 48%, transparent 72%);
  transform: translateX(-120%);
  mix-blend-mode: screen;
}
.injediesel-splash.is-visible .injediesel-splash__halo {
  animation: injediesel-splash-sheen 960ms ease-out 1180ms forwards;
}
.injediesel-splash__logo {
  display: block;
  width: 100%;
  height: auto;
  overflow: visible;
  filter: drop-shadow(0 20px 48px rgba(0,0,0,0.42));
  opacity: 0;
  transform: translateY(6px);
}
.injediesel-splash.is-visible .injediesel-splash__logo {
  animation: injediesel-splash-text 680ms ease-out 280ms forwards;
}
.injediesel-splash__progress {
  width: min(340px, 58vw);
  height: 3px;
  margin: 24px auto 0;
  overflow: hidden;
  background: rgba(255,255,255,0.12);
}
.injediesel-splash__progress::before {
  content: '';
  display: block;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, #2563EB, #3B82F6);
  transform: scaleX(0);
  transform-origin: left center;
}
.injediesel-splash.is-visible .injediesel-splash__progress::before {
  animation: injediesel-splash-progress 1500ms cubic-bezier(0.22,1,0.36,1) 240ms forwards;
}
.injediesel-splash__label {
  margin: 12px 0 0;
  text-align: center;
  color: #bcc6d4;
  font-size: 12px;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  opacity: 0;
}
.injediesel-splash.is-visible .injediesel-splash__label {
  animation: injediesel-splash-fade 320ms ease-out 200ms forwards;
}
.injediesel-splash.is-auth {
  background:
    radial-gradient(circle at 50% 36%, rgba(37,99,235,0.22), transparent 32%),
    rgba(10,14,26,0.985);
}
@keyframes injediesel-splash-enter {
  to { opacity: 1; transform: translateY(0) scale(1); }
}
@keyframes injediesel-splash-exit {
  to { opacity: 0; transform: translateY(-8px) scale(0.985); }
}
@keyframes injediesel-splash-red {
  to { transform: scaleX(1); }
}
@keyframes injediesel-splash-text {
  to { opacity: 1; transform: translateY(0); }
}
@keyframes injediesel-splash-progress {
  to { transform: scaleX(1); }
}
@keyframes injediesel-splash-fade {
  to { opacity: 1; }
}
@keyframes injediesel-splash-sheen {
  to { transform: translateX(120%); }
}
@media (prefers-reduced-motion: reduce) {
  .injediesel-splash,
  .injediesel-splash *,
  .injediesel-splash *::before,
  .injediesel-splash *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
`

export function TunerSplashProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate()
  // Start visible immediately on first session visit — page loads behind splash.
  const [visible, setVisible]   = useState(IS_FIRST_VISIT)
  const [closing, setClosing]   = useState(false)
  const [variant, setVariant]   = useState<SplashVariant>('intro')
  const timeoutIds  = useRef<ReturnType<typeof setTimeout>[]>([])

  const clearTimers = useCallback(() => {
    timeoutIds.current.forEach(clearTimeout)
    timeoutIds.current = []
  }, [])

  useEffect(() => clearTimers, [clearTimers])

  // Auto-close intro splash on first visit.
  // No autoStarted guard — return cleanup so StrictMode double-invoke works correctly.
  useEffect(() => {
    if (!IS_FIRST_VISIT) return
    window.sessionStorage.setItem(INTRO_FLAG, 'true')
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const dur = reduced ? 80 : DEFAULT_INTRO_DUR
    let exitId: ReturnType<typeof setTimeout> | undefined
    const id = setTimeout(() => {
      setClosing(true)
      exitId = setTimeout(() => {
        setVisible(false)
        setClosing(false)
      }, EXIT_DURATION)
    }, dur)
    return () => {
      clearTimeout(id)
      if (exitId) clearTimeout(exitId)
    }
  }, [])

  const finish = useCallback((resolve?: () => void) => {
    setClosing(true)
    const id = setTimeout(() => {
      setVisible(false)
      setClosing(false)
      resolve?.()
    }, EXIT_DURATION)
    timeoutIds.current.push(id)
  }, [])

  const play = useCallback(
    (options?: PlayOptions) =>
      new Promise<void>((resolve) => {
        clearTimers()
        const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
        const sel     = options?.variant ?? 'intro'
        const dur     = options?.minDuration ?? (sel === 'auth' ? DEFAULT_AUTH_DUR : DEFAULT_INTRO_DUR)
        setVariant(sel)
        setVisible(true)
        setClosing(false)
        const id = setTimeout(() => finish(resolve), reduced ? 80 : dur)
        timeoutIds.current.push(id)
      }),
    [clearTimers, finish]
  )

  const playIntroOnce = useCallback(() => {
    if (window.sessionStorage.getItem(INTRO_FLAG)) return
    window.sessionStorage.setItem(INTRO_FLAG, 'true')
    void play({ variant: 'intro', minDuration: DEFAULT_INTRO_DUR })
  }, [play])

  const playAndNavigate = useCallback(
    ({ href, navigationDelay = DEFAULT_NAV_DELAY, ...options }: NavigateOptions) => {
      clearTimers()
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      const dur     = reduced ? 80 : (options.minDuration ?? DEFAULT_AUTH_DUR)
      setVariant(options.variant ?? 'auth')
      setVisible(true)
      setClosing(false)
      const pushId  = setTimeout(() => {
        startTransition(() => { navigate(href) })
      }, Math.min(navigationDelay, dur - 60))
      const closeId = setTimeout(() => finish(), dur)
      timeoutIds.current.push(pushId, closeId)
    },
    [clearTimers, finish, navigate]
  )

  const value = useMemo(
    () => ({ play, playIntroOnce, playAndNavigate }),
    [play, playIntroOnce, playAndNavigate]
  )

  const classes = [
    'injediesel-splash',
    visible ? 'is-visible' : '',
    closing ? 'is-closing' : '',
    variant === 'auth' ? 'is-auth' : 'is-intro',
  ].filter(Boolean).join(' ')

  return (
    <SplashContext.Provider value={value}>
      <style dangerouslySetInnerHTML={{ __html: SPLASH_CSS }} />
      {children}
      <div className={classes} aria-hidden={!visible}>
        <div className="injediesel-splash__inner">
          <div className="injediesel-splash__halo" />
          <TunerLogo className="injediesel-splash__logo" />
          <div className="injediesel-splash__progress" />
          <p className="injediesel-splash__label">
            {variant === 'auth' ? 'Entrando no Back Office' : 'Carregando experiência'}
          </p>
        </div>
      </div>
    </SplashContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useTunerSplash() {
  const ctx = useContext(SplashContext)
  if (!ctx) throw new Error('useTunerSplash must be inside TunerSplashProvider')
  return ctx
}
