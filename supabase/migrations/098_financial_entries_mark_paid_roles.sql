-- ============================================================
-- 098_financial_entries_mark_paid_roles.sql (27/07/2026)
--
-- DRAFT — pra auditoria do Rogério, ainda não aplicada.
--
-- FIN.3: cobrança registrada no Caixa não sai da lista de
-- pendentes depois de "confirmar pagamento". Causa raiz: RLS,
-- não invalidation (useRegisterPayment já invalida
-- ['caixa-pendentes'] corretamente, useCaixa.ts:151).
--
-- financial_admin_mark_paid (migration 080) e
-- financial_admin_update_commissions (080) ficaram com lista de
-- roles mais curta que financial_admin_write (089) — mesma classe
-- de bug que a própria 080 já corrigiu uma vez (RLS bloqueia o
-- UPDATE silenciosamente, 0 linhas afetadas, sem erro; a mutation
-- reporta sucesso mas o banco nunca muda de 'pendente' pra 'pago').
--
--   financial_admin_write (089, quem ENVIA pro financeiro):
--     company_admin, finance_admin, finance_staff,
--     operations_admin, franchise_manager, unit_manager
--
--   financial_admin_mark_paid (080, quem MARCA como pago) — antes:
--     company_admin, finance_admin, seller
--
-- finance_staff, operations_admin, franchise_manager e
-- unit_manager enviavam a cobrança mas não conseguiam quitá-la.
-- Fix: as duas policies passam a cobrir os mesmos 6 roles de
-- financial_admin_write, mais seller (mantido — PDV registra
-- pagamento ECU sem guarda de rota, motivo já documentado na
-- migration 080 original).
--
-- DROP + CREATE (não existe ALTER POLICY … role list em Postgres
-- pra troca de condição — mesmo padrão de toda migration anterior
-- que edita policy existente).
-- ============================================================

DROP POLICY IF EXISTS "financial_admin_mark_paid" ON public.financial_entries;
CREATE POLICY "financial_admin_mark_paid" ON public.financial_entries
  FOR UPDATE
  USING (
    public.current_user_role() IN (
      'company_admin', 'finance_admin', 'finance_staff',
      'operations_admin', 'franchise_manager', 'unit_manager', 'seller'
    )
    AND status = 'pendente'
  )
  WITH CHECK (
    public.current_user_role() IN (
      'company_admin', 'finance_admin', 'finance_staff',
      'operations_admin', 'franchise_manager', 'unit_manager', 'seller'
    )
    AND status = 'pago'
  );

DROP POLICY IF EXISTS "financial_admin_update_commissions" ON public.commission_entries;
CREATE POLICY "financial_admin_update_commissions" ON public.commission_entries
  FOR UPDATE
  USING (
    public.current_user_role() IN (
      'company_admin', 'finance_admin', 'finance_staff',
      'operations_admin', 'franchise_manager', 'unit_manager', 'seller'
    )
  )
  WITH CHECK (
    public.current_user_role() IN (
      'company_admin', 'finance_admin', 'finance_staff',
      'operations_admin', 'franchise_manager', 'unit_manager', 'seller'
    )
  );
