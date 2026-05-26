import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { PUBLIC_CORS as CORS } from '../_shared/cors.ts'

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  const url = new URL(req.url)
  const categoriaSlug = url.searchParams.get('categoria')

  if (!categoriaSlug) {
    return new Response(
      JSON.stringify({ error: 'param "categoria" required' }),
      { status: 400, headers: { ...CORS, 'Content-Type': 'application/json' } },
    )
  }

  // SECURITY (VULN-08): usar ANON_KEY — dados públicos não precisam de service role.
  // Service role bypassa todo RLS; se a query fosse alterada por engano, exporia dados internos.
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
  )

  const { data, error } = await supabase
    .from('ecu_catalog_public')
    .select('id,categoria_slug,marca,secao_original,modelo_descricao,ano,ganho,cv_original,cv_tuned,kgfm_original,kgfm_tuned,preco_cliente_final')
    .eq('categoria_slug', categoriaSlug)
    .order('marca', { ascending: true })
    .order('secao_original', { ascending: true })

  if (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } },
    )
  }

  return new Response(JSON.stringify(data), {
    headers: {
      ...CORS,
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=300',
    },
  })
})
