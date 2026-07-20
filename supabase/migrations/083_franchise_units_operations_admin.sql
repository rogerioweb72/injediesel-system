-- ============================================================
-- 083_franchise_units_operations_admin.sql (20/07/2026)
--
-- BUG: franchise_units_admin_all usa is_matrix_admin() que só
-- inclui system_ti e company_admin. operations_admin consegue
-- ler unidades (via franchise_units_matrix_read) mas não pode
-- criar, editar ou excluir → 42501 no INSERT.
--
-- FIX: recria a policy com operations_admin incluído.
-- Mesmo padrão da 082 (inline check, sem alterar is_matrix_admin).
-- ============================================================

DROP POLICY IF EXISTS "franchise_units_admin_all" ON public.franchise_units;

CREATE POLICY "franchise_units_admin_all" ON public.franchise_units
  FOR ALL
  USING (
    COALESCE(
      (SELECT p.role IN ('system_ti', 'company_admin', 'operations_admin') AND p.active = true
       FROM public.profiles p WHERE p.id = auth.uid()),
      false
    )
  );

NOTIFY pgrst, 'reload schema';
