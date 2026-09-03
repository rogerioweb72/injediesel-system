// Som de notificação de novos arquivos (estilo iFood), via Web Audio API — sem
// asset/áudio externo (evita copyright). Toca no máx. 2x por chegada. Silenciável.

const LS_ENABLED = 'inje_sound_enabled'
const LS_SILENCED = 'inje_sound_silenced_until'

// ── Preferências (localStorage, por dispositivo) ─────────────────────────────
export function isSoundEnabled(): boolean {
  try { return localStorage.getItem(LS_ENABLED) !== '0' } catch { return true } // default ON
}
export function setSoundEnabled(on: boolean): void {
  try { localStorage.setItem(LS_ENABLED, on ? '1' : '0') } catch { /* ignore */ }
}
export function silencedUntil(): number {
  try { return Number(localStorage.getItem(LS_SILENCED) ?? 0) } catch { return 0 }
}
export function isSilenced(): boolean {
  return Date.now() < silencedUntil()
}
export function silenceForMinutes(min: number): void {
  try { localStorage.setItem(LS_SILENCED, String(Date.now() + min * 60_000)) } catch { /* ignore */ }
}
export function clearSilence(): void {
  try { localStorage.removeItem(LS_SILENCED) } catch { /* ignore */ }
}

// ── AudioContext compartilhado, destravado no 1º gesto do usuário ────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AC = AudioContext
let ctx: AC | null = null
let unlocked = false

function getCtx(): AC | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const Ctor = window.AudioContext || (window as any).webkitAudioContext
    if (!Ctor) return null
    if (!ctx) ctx = new Ctor()
    return ctx
  } catch { return null }
}

// Navegadores bloqueiam áudio sem interação. Destrava no 1º clique/tecla.
export function installAudioUnlock(): void {
  if (typeof window === 'undefined' || unlocked) return
  const unlock = () => {
    const c = getCtx()
    if (c && c.state === 'suspended') c.resume().catch(() => {})
    unlocked = true
    window.removeEventListener('pointerdown', unlock)
    window.removeEventListener('keydown', unlock)
  }
  window.addEventListener('pointerdown', unlock, { once: false })
  window.addEventListener('keydown', unlock, { once: false })
}

function tone(c: AC, freq: number, start: number, dur: number, vol = 0.22) {
  const osc = c.createOscillator()
  const gain = c.createGain()
  osc.type = 'sine'
  osc.frequency.setValueAtTime(freq, start)
  osc.connect(gain)
  gain.connect(c.destination)
  gain.gain.setValueAtTime(0.0001, start)
  gain.gain.exponentialRampToValueAtTime(vol, start + 0.02)
  gain.gain.exponentialRampToValueAtTime(0.0001, start + dur)
  osc.start(start)
  osc.stop(start + dur + 0.02)
}

// Um "toque": duas notas ascendentes (di-din), timbre suave tipo campainha.
function chimeAt(c: AC, t0: number) {
  tone(c, 880.0, t0, 0.16)          // A5
  tone(c, 1318.5, t0 + 0.14, 0.30)  // E6
}

// Toca o chime até 2x (a chegada de arquivo novo). Respeita enabled + silêncio.
export function playNewFileSound(force = false): void {
  if (!force && (!isSoundEnabled() || isSilenced())) return
  const c = getCtx()
  if (!c) return
  const go = () => {
    const now = c.currentTime
    chimeAt(c, now)
    chimeAt(c, now + 0.62)  // 2ª vez
  }
  if (c.state === 'suspended') c.resume().then(go).catch(() => {})
  else go()
}
