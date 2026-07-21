-- ============================================================
-- 089_financial_entries_franchise_send.sql (21/07/2026)
--
-- REGISTRO — policy já aplicada manualmente por Rogério via SQL
-- Editor. Este arquivo documenta o estado atual do banco.
--
-- BUG: financial_admin_write (migration 021) restringia INSERT em
-- financial_entries a company_admin/finance_admin. operations_admin
-- (injedieselrenan@gmail.com) e qualquer franquia levavam 42501 ao
-- tentar "Enviar para o Financeiro" — silencioso (ver commit do
-- fix em main.tsx / useEcuJobs.ts / EcuJobDetail.tsx, mesma leva).
--
-- Tentativa inicial citou 'franchise_admin' — não existe no enum
-- user_role (confirmado: system_ti, company_admin, operations_admin,
-- finance_admin, support_agent, seller, franchise_manager,
-- unit_manager, unit_operator, ecu_technician, unit_seller,
-- receptionist, finance_staff, auditor — migrations 001/020/054).
-- Lista final decidida pelo Rogério: company_admin, finance_admin,
-- finance_staff, operations_admin, franchise_manager, unit_manager.
-- system_ti continua via bypass separado (financial_system_all).
-- ============================================================

DROP POLICY IF EXISTS "financial_admin_write" ON public.financial_entries;
CREATE POLICY "financial_admin_write" ON public.financial_entries
  FOR INSERT WITH CHECK (
    public.current_user_role() IN (
      'company_admin', 'finance_admin', 'finance_staff',
      'operations_admin', 'franchise_manager', 'unit_manager'
    )
  );
