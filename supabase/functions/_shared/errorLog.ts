import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Loga um erro de edge function em public.error_logs (service_role, ignora RLS).
// Best-effort: NUNCA lança nem quebra a função. Aparece no painel de monitoramento.
export async function logEdgeError(
  functionName: string,
  err: unknown,
  extra: Record<string, unknown> = {},
): Promise<void> {
  try {
    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )
    // deno-lint-ignore no-explicit-any
    const e = err as any
    await admin.from('error_logs').insert({
      source: 'edge',
      level: 'error',
      message: String(e?.message ?? err ?? 'Edge error').slice(0, 2000),
      stack: e?.stack ? String(e.stack).slice(0, 8000) : null,
      route: `edge/${functionName}`,
      context: extra,
    })
  } catch {
    /* logger nunca quebra a função */
  }
}
