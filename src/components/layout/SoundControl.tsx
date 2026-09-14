import { useState, useEffect } from 'react'
import { Volume2, VolumeX, Volume1, Volume, BellOff, Check, Play, BellRing } from 'lucide-react'
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import {
  isSoundEnabled, setSoundEnabled, isSilenced, silencedUntil,
  silenceForMinutes, clearSilence, playNewFileSound,
  getSoundVolume, setSoundVolume, type SoundVolumeLevel,
} from '@/lib/notificationSound'
import {
  getNotificationPermission, requestNotificationPermission,
} from '@/lib/browserNotify'

const VOLUME_LEVELS: { level: SoundVolumeLevel; label: string; icon: typeof Volume }[] = [
  { level: 'baixo', label: 'Baixo', icon: Volume },
  { level: 'medio', label: 'Médio', icon: Volume1 },
  { level: 'alto', label: 'Alto', icon: Volume2 },
]

const OPTIONS = [
  { min: 5, l: '5 minutos' },
  { min: 15, l: '15 minutos' },
  { min: 30, l: '30 minutos' },
  { min: 60, l: '1 hora' },
  { min: 720, l: '12 horas' },
]

function fmtRemaining(until: number): string {
  const ms = until - Date.now()
  if (ms <= 0) return ''
  const min = Math.round(ms / 60_000)
  if (min < 60) return `${min} min restantes`
  return `${Math.round(min / 60)}h restantes`
}

export function SoundControl() {
  const [enabled, setEnabled] = useState(isSoundEnabled())
  const [silenced, setSilenced] = useState(isSilenced())
  const [until, setUntil] = useState(silencedUntil())
  const [volume, setVolume] = useState<SoundVolumeLevel>(getSoundVolume())
  const [notifPermission, setNotifPermission] = useState(getNotificationPermission())

  // Re-checa o silêncio periodicamente pra o ícone voltar quando expirar.
  useEffect(() => {
    const t = setInterval(() => { setSilenced(isSilenced()); setUntil(silencedUntil()) }, 30_000)
    return () => clearInterval(t)
  }, [])

  const muted = !enabled || silenced

  function toggleEnabled() { const v = !enabled; setSoundEnabled(v); setEnabled(v) }
  function silence(min: number) { silenceForMinutes(min); setSilenced(true); setUntil(Date.now() + min * 60_000) }
  function reactivate() { clearSilence(); setSilenced(false); setUntil(0) }
  function chooseVolume(level: SoundVolumeLevel) { setSoundVolume(level); setVolume(level) }
  async function enableBrowserNotifications() {
    const result = await requestNotificationPermission()
    setNotifPermission(result)
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" title="Som de novos arquivos">
          {muted ? <VolumeX size={18} className="text-zinc-500" /> : <Volume2 size={18} />}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">Som de novos arquivos</div>

        <DropdownMenuItem onClick={toggleEnabled}>
          {enabled
            ? <><Check size={14} className="mr-2 text-emerald-400" /> Ativado</>
            : <><VolumeX size={14} className="mr-2" /> Desativado</>}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => playNewFileSound(true)}>
          <Play size={14} className="mr-2" /> Testar som
        </DropdownMenuItem>

        <DropdownMenuSeparator />
        <div className="px-2 py-1 text-[11px] text-muted-foreground">Volume do alerta</div>
        {VOLUME_LEVELS.map(({ level, label, icon: Icon }) => (
          <DropdownMenuItem key={level} onClick={() => chooseVolume(level)}>
            <Icon size={14} className="mr-2" /> {label}
            {volume === level && <Check size={14} className="ml-auto text-emerald-400" />}
          </DropdownMenuItem>
        ))}

        <DropdownMenuSeparator />
        <div className="px-2 py-1 text-[11px] text-muted-foreground">Silenciar por</div>
        {OPTIONS.map((o) => (
          <DropdownMenuItem key={o.min} onClick={() => silence(o.min)}>
            <BellOff size={14} className="mr-2" /> {o.l}
          </DropdownMenuItem>
        ))}

        {silenced && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={reactivate} className="text-amber-400 focus:text-amber-300">
              <Volume2 size={14} className="mr-2" /> Reativar agora
              <span className="ml-auto text-[10px] text-zinc-500">{fmtRemaining(until)}</span>
            </DropdownMenuItem>
          </>
        )}

        {notifPermission !== 'unsupported' && (
          <>
            <DropdownMenuSeparator />
            {notifPermission === 'granted' ? (
              <div className="px-2 py-1.5 text-[11px] text-emerald-400 flex items-center gap-2">
                <Check size={14} /> Notificações do navegador ativas
              </div>
            ) : notifPermission === 'denied' ? (
              <div className="px-2 py-1.5 text-[11px] text-muted-foreground">
                Notificações bloqueadas — libere nas permissões do navegador.
              </div>
            ) : (
              <DropdownMenuItem onClick={enableBrowserNotifications}>
                <BellRing size={14} className="mr-2" /> Ativar notificações do navegador
              </DropdownMenuItem>
            )}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
