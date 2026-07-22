-- ============================================================
-- 094_ecu_job_files_matrix_roles.sql (22/07/2026)
--
-- REGISTRO — policy já aplicada manualmente por Rogério via SQL
-- Editor. Este arquivo documenta o estado atual do banco.
--
-- BUG: ecu_job_files_matrix (021_multitenant_rbac.sql) só liberava
-- company_admin/operations_admin. support_agent (que TEM FOR ALL
-- em ecu_jobs via ecu_jobs_matrix_all) não conseguia INSERT/SELECT
-- em ecu_job_files — upload e download quebravam com 42501/404
-- silencioso. finance_admin no mesmo caso.
--
-- ecu_job_files_unit_member (075_ecu_flow_unit_scoped_rls.sql) não
-- é tocada aqui — franquia (franchise_manager, unit_manager,
-- unit_operator, ecu_technician — todos via my_unit_ids(), sem
-- checagem de role) fica exatamente como estava.
-- ============================================================

DROP POLICY IF EXISTS "ecu_job_files_matrix" ON public.ecu_job_files;
CREATE POLICY "ecu_job_files_matrix" ON public.ecu_job_files
  FOR ALL USING (
    public.current_user_role() IN ('company_admin', 'operations_admin', 'support_agent', 'finance_admin')
  );
