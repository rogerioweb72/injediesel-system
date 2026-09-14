// Notificações do sistema operacional (Notification API) para quando a aba
// está minimizada, em segundo plano, ou o usuário está em outra aba/app.
// Funciona enquanto o navegador/PWA estiver ABERTO (não é Web Push — não
// entrega com o app totalmente fechado; isso exigiria service worker + VAPID,
// infra maior e um passo separado).

export type NotifPermission = 'default' | 'granted' | 'denied' | 'unsupported'

export function isNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window
}

export function getNotificationPermission(): NotifPermission {
  if (!isNotificationSupported()) return 'unsupported'
  return Notification.permission
}

export async function requestNotificationPermission(): Promise<NotifPermission> {
  if (!isNotificationSupported()) return 'unsupported'
  try {
    const result = await Notification.requestPermission()
    return result
  } catch {
    return getNotificationPermission()
  }
}

// Dispara notificação do SO. Só mostra se a aba não estiver em foco (evita
// duplicar aviso quando o operador já está olhando a tela) e a permissão
// tiver sido concedida. Clicar na notificação foca a aba do sistema.
export function showFileNotification(title: string, body: string): void {
  if (!isNotificationSupported()) return
  if (Notification.permission !== 'granted') return
  if (!document.hidden) return

  try {
    const n = new Notification(title, {
      body,
      icon: '/favicon-192.png',
      tag: 'inje-arquivo-novo', // agrupa/substitui notificação anterior
    })
    n.onclick = () => {
      window.focus()
      n.close()
    }
  } catch { /* alguns navegadores bloqueiam silenciosamente — sem crash */ }
}
