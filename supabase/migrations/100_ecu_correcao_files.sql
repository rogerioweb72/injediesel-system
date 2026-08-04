-- 100_ecu_correcao_files.sql (04/08/2026)
-- FASE 1 do "Fluxo de Correção integrado ao Job" — adiciona 'correcao' como
-- terceiro valor válido de ecu_job_files.file_type (hoje: 'original','entrega').
-- Numeração: pedido original citava "086", mas o repo já tem migrations até
-- 099 (086 já é 086_ecu_jobs_transmissao_check.sql) — usando 100, próximo livre.
--
-- INSPEÇÃO: file_type é `text not null` com CHECK inline SEM nome explícito
-- (006_ecu.sql:24 -- check (file_type in ('original','entrega'))). Não é
-- enum PG, é CHECK constraint. Nenhuma migration posterior alterou esse
-- constraint. Em vez de assumir o nome default do Postgres para CHECK
-- inline sem nome (<tabela>_<coluna>_check), o bloco abaixo descobre o
-- nome real via pg_constraint antes de dropar — para não falhar
-- silenciosamente se o nome divergir do padrão assumido.
DO $$
DECLARE
  v_conname text;
BEGIN
  SELECT con.conname INTO v_conname
  FROM pg_constraint con
  JOIN pg_class rel ON rel.oid = con.conrelid
  JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
  WHERE nsp.nspname = 'public'
    AND rel.relname = 'ecu_job_files'
    AND con.contype = 'c'
    AND pg_get_constraintdef(con.oid) ILIKE '%file_type%'
  LIMIT 1;

  IF v_conname IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.ecu_job_files DROP CONSTRAINT %I', v_conname);
  END IF;

  ALTER TABLE public.ecu_job_files
    ADD CONSTRAINT ecu_job_files_file_type_check
    CHECK (file_type IN ('original', 'entrega', 'correcao'));
END $$;

-- POLICIES: nenhuma das 3 policies ativas em ecu_job_files filtra por
-- file_type (checado em 021_multitenant_rbac.sql, 075_ecu_flow_unit_scoped_rls.sql,
-- 094_ecu_job_files_matrix_roles.sql — todas FOR ALL, escopadas por role
-- (system_ti / company_admin,operations_admin,support_agent,finance_admin)
-- ou por unit_id via my_unit_ids()). 'correcao' fica coberto automaticamente,
-- sem alteração de policy necessária.

NOTIFY pgrst, 'reload schema';
