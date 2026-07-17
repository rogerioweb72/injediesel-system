-- ============================================================
-- 075_ecu_flow_unit_scoped_rls.sql
--
-- BUG: usuário de franquia real (franchise_manager, criado pelo
-- auto-invite ao criar unidade) recebe "new row violates row-level
-- security policy for table ecu_jobs" ao enviar arquivo ECU.
--
-- CAUSA: migration 021 deu FOR ALL (criar/editar) em ecu_jobs e
-- ecu_job_files apenas ao role 'unit_operator'. franchise_manager
-- e os roles granulares adicionados depois em 054
-- (unit_manager, ecu_technician, unit_seller, receptionist,
-- finance_staff) ficaram de fora — franchise_manager só tem SELECT.
--
-- DECISÃO DE NEGÓCIO (Rogério): TODOS os roles de unidade podem
-- criar/enviar jobs ECU da PRÓPRIA unidade. Restrição é de tenant
-- (unit_id via user_unit_roles), não de cargo. Roles de matriz e
-- system_ti seguem como estão (policies próprias, sem alteração).
--
-- ecu_job_events já era unit-scoped sem gate de role (022) — sem
-- mudança necessária, mantido como está.
-- ============================================================

-- ── ECU_JOBS ────────────────────────────────────────────────
-- Substitui as duas policies role-specific por uma única
-- unit-scoped, no mesmo padrão de customers_unit_member /
-- vehicles_unit_member / orders_unit_all.
DROP POLICY IF EXISTS "ecu_jobs_franchise_admin_read" ON public.ecu_jobs;
DROP POLICY IF EXISTS "ecu_jobs_unit_operator"         ON public.ecu_jobs;

CREATE POLICY "ecu_jobs_unit_member" ON public.ecu_jobs
  FOR ALL USING (
    unit_id IN (SELECT public.my_unit_ids())
  );

-- ── ECU_JOB_FILES ───────────────────────────────────────────
-- Idem: unifica leitura (franchise_read) e insert (operator_insert)
-- restritos a role específico numa única policy unit-scoped.
DROP POLICY IF EXISTS "ecu_job_files_franchise_read"  ON public.ecu_job_files;
DROP POLICY IF EXISTS "ecu_job_files_operator_insert" ON public.ecu_job_files;

CREATE POLICY "ecu_job_files_unit_member" ON public.ecu_job_files
  FOR ALL USING (
    job_id IN (
      SELECT id FROM public.ecu_jobs
      WHERE unit_id IN (SELECT public.my_unit_ids())
    )
  );
