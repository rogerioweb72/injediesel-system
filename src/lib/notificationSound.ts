// Som de notificação de novos arquivos ("Toque Duplo" — escolhido entre 5
// opções apresentadas ao cliente em 14/09), via Web Audio API — sem
// asset/áudio externo (evita copyright). Toque único e sutil. Silenciável.

const LS_ENABLED = 'inje_sound_enabled'
const LS_SILENCED = 'inje_sound_silenced_until'
const LS_VOLUME = 'inje_sound_volume'

// ── Preferências (localStorage, por dispositivo) ─────────────────────────────
export function isSoundEnabled(): boolean {
  try { return localStorage.getItem(LS_ENABLED) !== '0' } catch { return true } // default ON
}
export function setSoundEnabled(on: boolean): void {
  try { localStorage.setItem(LS_ENABLED, on ? '1' : '0') } catch { /* ignore */ }
}

// ── Nível de volume (baixo/médio/alto) — cada operador ajusta o próprio ─────
export type SoundVolumeLevel = 'baixo' | 'medio' | 'alto'
const VOLUME_GAIN: Record<SoundVolumeLevel, number> = { baixo: 0.14, medio: 0.22, alto: 0.34 }

export function getSoundVolume(): SoundVolumeLevel {
  try {
    const v = localStorage.getItem(LS_VOLUME)
    if (v === 'baixo' || v === 'medio' || v === 'alto') return v
  } catch { /* ignore */ }
  return 'alto' // default (comportamento anterior, sem regressão)
}
export function setSoundVolume(level: SoundVolumeLevel): void {
  try { localStorage.setItem(LS_VOLUME, level) } catch { /* ignore */ }
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

// Uma nota do toque: sine puro, ataque rápido e decaimento suave — timbre
// de campainha leve, sem estridência.
function chimeNote(c: AC, dest: AudioNode, freq: number, t0: number, gain: number) {
  const osc = c.createOscillator()
  const g = c.createGain()
  osc.type = 'sine'
  osc.frequency.setValueAtTime(freq, t0)

  g.gain.setValueAtTime(0.0001, t0)
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.012)
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.45)

  osc.connect(g)
  g.connect(dest)
  osc.start(t0)
  osc.stop(t0 + 0.5)
}

// "Toque Duplo": duas notas ascendentes (Mi5 → Si5), como uma campainha de
// porta suave. Respeita enabled + silêncio + nível de volume escolhido.
export function playNewFileSound(force = false): void {
  if (!force && (!isSoundEnabled() || isSilenced())) return
  const c = getCtx()
  if (!c) return
  const go = () => {
    const gain = VOLUME_GAIN[getSoundVolume()]
    const now = c.currentTime
    chimeNote(c, c.destination, 659.25, now, gain)       // Mi5
    chimeNote(c, c.destination, 987.77, now + 0.16, gain) // Si5
  }
  if (c.state === 'suspended') c.resume().then(go).catch(() => {})
  else go()
}
