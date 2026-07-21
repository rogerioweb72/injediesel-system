-- ============================================================
-- 093_sync_ecu_job_payment_status_trigger.sql (21/07/2026)
--
-- DRAFT — pra auditoria do Rogério, ainda não aplicada.
--
-- BUG: useRegisterPayment (useCaixa.ts) marca financial_entries
-- como 'pago' mas nunca atualizou ecu_jobs.matrix_payment_status —
-- job ficava em_aberto pra sempre mesmo com a entry paga.
--
-- Fix no front (já commitado): useRegisterPayment agora tenta
-- atualizar ecu_jobs direto, best-effort (não derruba a mutation
-- se falhar). Mas essa call SÓ funciona pra quem tem UPDATE em
-- ecu_jobs via RLS — checado nas policies atuais
-- (021_multitenant_rbac.sql + 075_ecu_flow_unit_scoped_rls.sql):
--
--   ecu_jobs_matrix_all   → FOR ALL: company_admin, operations_admin,
--                           support_agent
--   ecu_jobs_unit_member  → FOR ALL: unit_id in my_unit_ids()
--                           (franquia da própria unidade)
--   ecu_jobs_matrix_read  → SELECT apenas: finance_admin, seller, auditor
--
-- finance_admin e finance_staff — exatamente quem a migration 089
-- liberou pra enviar pro financeiro e quem mais efetivamente
-- registra pagamento — NÃO aparecem em nenhuma policy de UPDATE.
-- Pra esses dois papéis, o fix do front sozinho não resolve nada.
--
-- Trigger SECURITY DEFINER contorna isso: roda com privilégio da
-- function, não do usuário que disparou o UPDATE em
-- financial_entries (que já tem permissão garantida — senão nem
-- teria chegado até aqui). Cobre TODOS os papéis, presente e
-- futuro, sem depender de RLS espelhada em duas tabelas.
-- ============================================================

CREATE OR REPLACE FUNCTION public.fn_sync_ecu_job_payment_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'pago'
     AND (OLD.status IS DISTINCT FROM 'pago')
     AND NEW.ecu_job_id IS NOT NULL
  THEN
    UPDATE public.ecu_jobs
    SET matrix_payment_status = 'pago',
        matrix_paid_at = now()
    WHERE id = NEW.ecu_job_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_ecu_job_payment_status ON public.financial_entries;
CREATE TRIGGER trg_sync_ecu_job_payment_status
  AFTER UPDATE OF status ON public.financial_entries
  FOR EACH ROW
  WHEN (NEW.status = 'pago' AND OLD.status IS DISTINCT FROM 'pago')
  EXECUTE FUNCTION public.fn_sync_ecu_job_payment_status();
