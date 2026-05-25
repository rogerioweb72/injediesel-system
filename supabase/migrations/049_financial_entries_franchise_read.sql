-- 049_financial_entries_franchise_read.sql
-- Franchise users cannot currently SELECT their own financial_entries.
-- This breaks TabFinanceiro in RelatoriosPage (always empty for franchise users).
-- Fix: add unit-scoped SELECT policy mirroring the pattern used for customers, ecu_jobs, etc.

DROP POLICY IF EXISTS "financial_unit_read" ON public.financial_entries;

CREATE POLICY "financial_unit_read" ON public.financial_entries
  FOR SELECT USING (
    unit_id IN (
      SELECT unit_id FROM public.user_unit_roles WHERE user_id = auth.uid()
    )
  );
