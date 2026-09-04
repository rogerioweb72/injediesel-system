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

// Cadeia master: compressor (empurra o volume sem clipar feio) → gain alto →
// saída. Deixa o alerta MUITO mais alto que o bip discreto anterior.
function masterChain(c: AC): AudioNode {
  const comp = c.createDynamicsCompressor()
  comp.threshold.setValueAtTime(-18, c.currentTime)
  comp.ratio.setValueAtTime(12, c.currentTime)
  comp.attack.setValueAtTime(0.002, c.currentTime)
  comp.release.setValueAtTime(0.15, c.currentTime)
  const master = c.createGain()
  master.gain.setValueAtTime(0.95, c.currentTime)  // bem alto
  comp.connect(master)
  master.connect(c.destination)
  return comp
}

// Um "toque" de campainha (telefone antigo / iFood): onda quadrada com warble
// rápido entre dois tons — timbre estridente, difícil de ignorar.
function ringAt(c: AC, dest: AudioNode, t0: number, dur = 0.5, vol = 0.85) {
  const osc = c.createOscillator()
  const gain = c.createGain()
  osc.type = 'square'  // muito mais "alto" percebido que sine

  // warble ~30 Hz entre 640 e 480 Hz (brrrring da campainha)
  const steps = 30
  const freqs = new Float32Array(steps)
  for (let i = 0; i < steps; i++) freqs[i] = i % 2 === 0 ? 660 : 495
  osc.frequency.setValueCurveAtTime(freqs, t0, dur)

  gain.gain.setValueAtTime(0.0001, t0)
  gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.012)
  gain.gain.setValueAtTime(vol, t0 + dur - 0.06)
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)

  osc.connect(gain)
  gain.connect(dest)
  osc.start(t0)
  osc.stop(t0 + dur + 0.02)
}

// Toque duplo (brrring-brrring), como telefone antigo.
function doubleRing(c: AC, dest: AudioNode, t0: number) {
  ringAt(c, dest, t0)
  ringAt(c, dest, t0 + 0.62)
}

// Alerta de arquivo novo: 3 toques duplos espaçados = barulhão longo e alto.
// Respeita enabled + silêncio.
export function playNewFileSound(force = false): void {
  if (!force && (!isSoundEnabled() || isSilenced())) return
  const c = getCtx()
  if (!c) return
  const go = () => {
    const dest = masterChain(c)
    const now = c.currentTime
    doubleRing(c, dest, now)
    doubleRing(c, dest, now + 1.5)
    doubleRing(c, dest, now + 3.0)
  }
  if (c.state === 'suspended') c.resume().then(go).catch(() => {})
  else go()
}
