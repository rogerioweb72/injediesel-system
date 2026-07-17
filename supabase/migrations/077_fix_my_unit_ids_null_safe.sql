-- ============================================================
-- 077_fix_my_unit_ids_null_safe.sql
--
-- BUG: Realtime (postgres_changes) não chega pro lado franquia em
-- ecu_jobs/ecu_job_files — só matriz recebe evento.
--
-- CAUSA: a 075 trocou o filtro de unit_id nessas duas tabelas de
-- subquery direta em user_unit_roles (só depende de auth.uid()) pra
-- my_unit_ids(), que lê auth.jwt() -> 'app_metadata' -> 'unit_ids'.
-- Policies de matriz nunca dependeram de auth.jwt(), só de auth.uid()
-- + profiles — por isso só a franquia quebrou.
--
-- O fallback de my_unit_ids() (060) tem bug de NULL-propagation:
--   AND NOT (auth.jwt() -> 'app_metadata' ? 'unit_ids')
-- Se auth.jwt() inteiro vier NULL (suspeita: contexto de autorização
-- por assinante do Realtime pode não popular o GUC igual ao
-- PostgREST), essa expressão vira NULL, e "WHERE ... AND NULL"
-- descarta a linha inteira — my_unit_ids() retorna zero linhas pro
-- assinante de franquia, toda policy unit-scoped nega o evento, e o
-- Realtime cai silencioso, sem erro visível.
-- ============================================================

CREATE OR REPLACE FUNCTION public.my_unit_ids()
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_array_elements_text(
    auth.jwt() -> 'app_metadata' -> 'unit_ids'
  )::uuid

  UNION

  SELECT unit_id
  FROM public.user_unit_roles
  WHERE user_id = auth.uid()
    AND (auth.jwt() IS NULL OR NOT (auth.jwt() -> 'app_metadata' ? 'unit_ids'))
$$;
