-- ============================================================
-- 085_marketing_materials_system_ti.sql (20/07/2026)
--
-- BUG I (mesmo padrão do MATRIX_ADMIN_ROLES do Worker r2-presign.ts):
-- mkt_materials_insert/update/delete (migration 044) usam
-- role in ('company_admin','operations_admin') — falta system_ti,
-- o role de bypass-total do sistema. Nenhuma das 3 foi redefinida
-- depois (grep em supabase/migrations/ confirma; só mkt_materials_read
-- foi tocada, na 066, e não depende de role).
--
-- FIX: DROP + CREATE das 3 policies, mesma lógica exata (exists com
-- role in (...)), só adicionando 'system_ti' à lista. mkt_materials_read
-- não é alterada.
-- ============================================================

DROP POLICY IF EXISTS "mkt_materials_insert" ON public.marketing_materials;
CREATE POLICY "mkt_materials_insert" ON public.marketing_materials
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND role IN ('system_ti', 'company_admin', 'operations_admin')
    )
  );

DROP POLICY IF EXISTS "mkt_materials_update" ON public.marketing_materials;
CREATE POLICY "mkt_materials_update" ON public.marketing_materials
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND role IN ('system_ti', 'company_admin', 'operations_admin')
    )
  );

DROP POLICY IF EXISTS "mkt_materials_delete" ON public.marketing_materials;
CREATE POLICY "mkt_materials_delete" ON public.marketing_materials
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND role IN ('system_ti', 'company_admin', 'operations_admin')
    )
  );

NOTIFY pgrst, 'reload schema';
