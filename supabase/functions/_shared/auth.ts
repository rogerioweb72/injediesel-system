import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

/**
 * Validates the request's Bearer token via Supabase Auth (server-side round-trip,
 * not local decode), then confirms the user is active in public.profiles.
 *
 * Throws on any failure so callers can .catch(() => null) for a clean 401 path.
 *
 * @param profileSelect  Supabase select string passed to the profiles query.
 *                       Include any fields the caller needs (e.g. 'role, active').
 *                       'active' must always be included — it is the deactivation gate.
 */
export async function requireAuth(req: Request, profileSelect = 'active') {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) throw new Error('Unauthorized')

  const callerClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } },
  )

  // Server-side validation — confirms session exists in auth.sessions (not just signature)
  const { data: { user }, error } = await callerClient.auth.getUser()
  if (error || !user) throw new Error('Unauthorized')

  // Deactivation gate: a revoked JWT can remain cryptographically valid for up to 1h.
  // Checking profiles.active ensures banned users are blocked on the very next request.
  const { data: profile } = await callerClient
    .from('profiles')
    .select(profileSelect)
    .eq('id', user.id)
    .single()

  if (!profile?.active) throw new Error('Unauthorized')

  return { callerClient, user, profile }
}
