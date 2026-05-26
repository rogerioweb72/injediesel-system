-- ============================================================
-- 060_rls_unit_ids_from_jwt.sql
-- Atualiza my_unit_ids() para ler app_metadata.unit_ids do JWT.
-- Elimina o JOIN em user_unit_roles a cada avaliação de política RLS.
--
-- FALLBACK: se o claim não existir no JWT (token antigo emitido antes
-- do hook, ou usuário de matriz), cai para a query no banco.
-- Isso garante zero-downtime durante a transição.
-- ============================================================

CREATE OR REPLACE FUNCTION public.my_unit_ids()
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  -- Lê unit_ids injetados pelo hook no JWT (zero DB lookup)
  SELECT jsonb_array_elements_text(
    auth.jwt() -> 'app_metadata' -> 'unit_ids'
  )::uuid

  UNION  -- se o claim estiver ausente, o UNION com array vazio é no-op

  -- Fallback: token anterior ao hook ou claim ausente → consulta banco
  -- A condição evita dupla leitura quando o JWT já tem o claim
  SELECT unit_id
  FROM public.user_unit_roles
  WHERE user_id = auth.uid()
    AND NOT (auth.jwt() -> 'app_metadata' ? 'unit_ids')
$$;

-- ============================================================
-- EXEMPLOS DE POLÍTICAS RLS USANDO A NOVA my_unit_ids()
--
-- Nenhuma política precisa mudar — elas já chamam my_unit_ids().
-- A função agora lê do JWT em vez de fazer JOIN.
--
-- Exemplo 1 — ecu_jobs (já existente, zero mudança necessária):
--
--   CREATE POLICY "ecu_jobs_unit_member" ON public.ecu_jobs
--     FOR ALL USING (
--       unit_id IN (SELECT public.my_unit_ids())
--     );
--
-- Exemplo 2 — support_tickets (já existente):
--
--   CREATE POLICY "tickets_unit_own" ON public.support_tickets
--     FOR ALL USING (
--       unit_id IN (SELECT public.my_unit_ids())
--     );
--
-- ANTES desta migration, cada avaliação dessas políticas fazia:
--   SELECT unit_id FROM user_unit_roles WHERE user_id = auth.uid()
--   → 1 query extra por request com RLS ativo
--
-- DEPOIS desta migration (com hook ativo):
--   SELECT jsonb_array_elements_text(auth.jwt()->'app_metadata'->'unit_ids')::uuid
--   → leitura de memória — zero DB roundtrip
-- ============================================================
