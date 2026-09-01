-- 117_fix_my_unit_ids_stale_jwt.sql
-- BUG CRÍTICO (envio de ECU pela franquia): a migration 060 fez my_unit_ids() ler
-- app_metadata.unit_ids do JWT, com fallback ao banco APENAS quando o claim está
-- ausente. Se o JWT tem o claim mas está STALE (unidade vinculada depois do login,
-- ou hook não injetou/injetou vazio), my_unit_ids() devolve o claim velho e o insert
-- de ecu_jobs/ecu_job_files viola a RLS ("new row violates row-level security policy")
-- -> franquia não consegue enviar arquivo. Matriz não é afetada (policies próprias).
--
-- FIX: user_unit_roles (banco) é a fonte da verdade e é SEMPRE incluído. O JWT vira só
-- um fast-path aditivo. Um JWT stale nunca mais tranca o usuário fora da própria unidade.

CREATE OR REPLACE FUNCTION public.my_unit_ids()
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  -- Fonte da verdade: vínculos reais no banco (sempre).
  SELECT unit_id
  FROM public.user_unit_roles
  WHERE user_id = auth.uid()

  UNION

  -- Fast-path aditivo: unit_ids do JWT quando presentes (não substitui o banco).
  SELECT jsonb_array_elements_text(auth.jwt() -> 'app_metadata' -> 'unit_ids')::uuid
  WHERE auth.jwt() -> 'app_metadata' ? 'unit_ids'
$$;

NOTIFY pgrst, 'reload schema';
