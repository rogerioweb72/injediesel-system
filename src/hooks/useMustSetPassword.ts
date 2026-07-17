import { useAuthStore } from '@/stores/auth'

export function useMustSetPassword(): boolean {
  const user = useAuthStore(s => s.user)
  const hashInviteFlow = useAuthStore(s => s.hashInviteFlow)
  const metadataFlag =
    (user?.user_metadata as { must_set_password?: boolean } | undefined)?.must_set_password === true
  return metadataFlag || hashInviteFlow
}
