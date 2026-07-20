-- ============================================================
-- 084_operations_admin_all_policies.sql (20/07/2026)
--
-- BUG G: is_matrix_admin() (migration 024) = role IN ('system_ti',
-- 'company_admin') apenas — operations_admin fica de fora de 21
-- policies em 13 tabelas, mesmo padrão do gap já corrigido nas
-- migrations 082 (profiles) e 083 (franchise_units). Esta migration
-- fecha o restante.
--
-- Grep de confirmação (uma definição cada, sem redefinição
-- posterior — checado em 021, 045, 046, 047):
--   021_multitenant_rbac.sql      -> company_settings_admin_all,
--                                     franchise_levels_admin_write,
--                                     profiles_delete, profiles_insert,
--                                     user_unit_roles_admin_manage
--   045_firmware_updates.sql      -> equip_types_admin_write,
--                                     firmware_acceptances_admin_read,
--                                     firmware_files_admin_write,
--                                     firmware_files_read,
--                                     firmware_updates_admin_all
--   046_unit_employees_royalty.sql -> unit_employee_costs_read,
--                                      unit_employees_read
--   047_cadastros_base.sql        -> formas_pagamento_select/insert/update,
--                                     fornecedores_select/insert/update,
--                                     servicos_select/insert/update
--
-- FIX: DROP + CREATE de cada policy, substituindo is_matrix_admin()
-- pelo check inline abaixo. Não altera a function is_matrix_admin()
-- (usada em outras policies fora deste escopo) — mesmo padrão da 082/083.
-- Toda a lógica adicional de cada policy (OR com user_unit_roles,
-- fallback de firmware_updates.published, WITH CHECK) é preservada
-- idêntica ao que já está em produção.
--
--   (SELECT p.role IN ('system_ti','company_admin','operations_admin')
--    AND p.active = true FROM public.profiles p WHERE p.id = auth.uid())
-- ============================================================

-- ── company_settings ────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "company_settings_admin_all" ON public.company_settings;
CREATE POLICY "company_settings_admin_all" ON public.company_settings
  FOR ALL USING (
    (SELECT p.role IN ('system_ti','company_admin','operations_admin') AND p.active = true
     FROM public.profiles p WHERE p.id = auth.uid())
  );

-- ── equipment_types ──────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "equip_types_admin_write" ON public.equipment_types;
CREATE POLICY "equip_types_admin_write" ON public.equipment_types
  FOR ALL USING (
    (SELECT p.role IN ('system_ti','company_admin','operations_admin') AND p.active = true
     FROM public.profiles p WHERE p.id = auth.uid())
  );

-- ── firmware_update_acceptances ──────────────────────────────────────────────
DROP POLICY IF EXISTS "firmware_acceptances_admin_read" ON public.firmware_update_acceptances;
CREATE POLICY "firmware_acceptances_admin_read" ON public.firmware_update_acceptances
  FOR SELECT USING (
    (SELECT p.role IN ('system_ti','company_admin','operations_admin') AND p.active = true
     FROM public.profiles p WHERE p.id = auth.uid())
  );

-- ── firmware_update_files ─────────────────────────────────────────────────────
DROP POLICY IF EXISTS "firmware_files_admin_write" ON public.firmware_update_files;
CREATE POLICY "firmware_files_admin_write" ON public.firmware_update_files
  FOR ALL USING (
    (SELECT p.role IN ('system_ti','company_admin','operations_admin') AND p.active = true
     FROM public.profiles p WHERE p.id = auth.uid())
  );

DROP POLICY IF EXISTS "firmware_files_read" ON public.firmware_update_files;
CREATE POLICY "firmware_files_read" ON public.firmware_update_files
  FOR SELECT USING (
    (SELECT p.role IN ('system_ti','company_admin','operations_admin') AND p.active = true
     FROM public.profiles p WHERE p.id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.firmware_updates fu
      WHERE fu.id = firmware_update_files.update_id
        AND fu.published = true
        AND auth.uid() IS NOT NULL
    )
  );

-- ── firmware_updates ──────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "firmware_updates_admin_all" ON public.firmware_updates;
CREATE POLICY "firmware_updates_admin_all" ON public.firmware_updates
  FOR ALL USING (
    (SELECT p.role IN ('system_ti','company_admin','operations_admin') AND p.active = true
     FROM public.profiles p WHERE p.id = auth.uid())
  );

-- ── formas_pagamento ──────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "formas_pagamento_select" ON public.formas_pagamento;
CREATE POLICY "formas_pagamento_select" ON public.formas_pagamento
  FOR SELECT USING (
    (SELECT p.role IN ('system_ti','company_admin','operations_admin') AND p.active = true
     FROM public.profiles p WHERE p.id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.user_unit_roles uur
      WHERE uur.unit_id = formas_pagamento.unit_id
        AND uur.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "formas_pagamento_insert" ON public.formas_pagamento;
CREATE POLICY "formas_pagamento_insert" ON public.formas_pagamento
  FOR INSERT WITH CHECK (
    (SELECT p.role IN ('system_ti','company_admin','operations_admin') AND p.active = true
     FROM public.profiles p WHERE p.id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.user_unit_roles uur
      WHERE uur.unit_id = formas_pagamento.unit_id
        AND uur.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "formas_pagamento_update" ON public.formas_pagamento;
CREATE POLICY "formas_pagamento_update" ON public.formas_pagamento
  FOR UPDATE USING (
    (SELECT p.role IN ('system_ti','company_admin','operations_admin') AND p.active = true
     FROM public.profiles p WHERE p.id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.user_unit_roles uur
      WHERE uur.unit_id = formas_pagamento.unit_id
        AND uur.user_id = auth.uid()
    )
  );

-- ── fornecedores ──────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "fornecedores_select" ON public.fornecedores;
CREATE POLICY "fornecedores_select" ON public.fornecedores
  FOR SELECT USING (
    (SELECT p.role IN ('system_ti','company_admin','operations_admin') AND p.active = true
     FROM public.profiles p WHERE p.id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.user_unit_roles uur
      WHERE uur.unit_id = fornecedores.unit_id
        AND uur.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "fornecedores_insert" ON public.fornecedores;
CREATE POLICY "fornecedores_insert" ON public.fornecedores
  FOR INSERT WITH CHECK (
    (SELECT p.role IN ('system_ti','company_admin','operations_admin') AND p.active = true
     FROM public.profiles p WHERE p.id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.user_unit_roles uur
      WHERE uur.unit_id = fornecedores.unit_id
        AND uur.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "fornecedores_update" ON public.fornecedores;
CREATE POLICY "fornecedores_update" ON public.fornecedores
  FOR UPDATE USING (
    (SELECT p.role IN ('system_ti','company_admin','operations_admin') AND p.active = true
     FROM public.profiles p WHERE p.id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.user_unit_roles uur
      WHERE uur.unit_id = fornecedores.unit_id
        AND uur.user_id = auth.uid()
    )
  );

-- ── franchise_levels ──────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "franchise_levels_admin_write" ON public.franchise_levels;
CREATE POLICY "franchise_levels_admin_write" ON public.franchise_levels
  FOR ALL USING (
    (SELECT p.role IN ('system_ti','company_admin','operations_admin') AND p.active = true
     FROM public.profiles p WHERE p.id = auth.uid())
  );

-- ── profiles ──────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "profiles_delete" ON public.profiles;
CREATE POLICY "profiles_delete" ON public.profiles
  FOR DELETE USING (
    (SELECT p.role IN ('system_ti','company_admin','operations_admin') AND p.active = true
     FROM public.profiles p WHERE p.id = auth.uid())
  );

DROP POLICY IF EXISTS "profiles_insert" ON public.profiles;
CREATE POLICY "profiles_insert" ON public.profiles
  FOR INSERT WITH CHECK (
    (SELECT p.role IN ('system_ti','company_admin','operations_admin') AND p.active = true
     FROM public.profiles p WHERE p.id = auth.uid())
  );

-- ── servicos ──────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "servicos_select" ON public.servicos;
CREATE POLICY "servicos_select" ON public.servicos
  FOR SELECT USING (
    (SELECT p.role IN ('system_ti','company_admin','operations_admin') AND p.active = true
     FROM public.profiles p WHERE p.id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.user_unit_roles uur
      WHERE uur.unit_id = servicos.unit_id
        AND uur.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "servicos_insert" ON public.servicos;
CREATE POLICY "servicos_insert" ON public.servicos
  FOR INSERT WITH CHECK (
    (SELECT p.role IN ('system_ti','company_admin','operations_admin') AND p.active = true
     FROM public.profiles p WHERE p.id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.user_unit_roles uur
      WHERE uur.unit_id = servicos.unit_id
        AND uur.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "servicos_update" ON public.servicos;
CREATE POLICY "servicos_update" ON public.servicos
  FOR UPDATE USING (
    (SELECT p.role IN ('system_ti','company_admin','operations_admin') AND p.active = true
     FROM public.profiles p WHERE p.id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.user_unit_roles uur
      WHERE uur.unit_id = servicos.unit_id
        AND uur.user_id = auth.uid()
    )
  );

-- ── unit_employee_costs ───────────────────────────────────────────────────────
DROP POLICY IF EXISTS "unit_employee_costs_read" ON public.unit_employee_costs;
CREATE POLICY "unit_employee_costs_read" ON public.unit_employee_costs
  FOR SELECT USING (
    (SELECT p.role IN ('system_ti','company_admin','operations_admin') AND p.active = true
     FROM public.profiles p WHERE p.id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.unit_employees ue
      JOIN public.user_unit_roles uur ON uur.unit_id = ue.unit_id
      WHERE ue.id = unit_employee_costs.employee_id
        AND uur.user_id = auth.uid()
    )
  );

-- ── unit_employees ────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "unit_employees_read" ON public.unit_employees;
CREATE POLICY "unit_employees_read" ON public.unit_employees
  FOR SELECT USING (
    (SELECT p.role IN ('system_ti','company_admin','operations_admin') AND p.active = true
     FROM public.profiles p WHERE p.id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.user_unit_roles uur
      WHERE uur.unit_id = unit_employees.unit_id
        AND uur.user_id = auth.uid()
    )
  );

-- ── user_unit_roles ───────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "user_unit_roles_admin_manage" ON public.user_unit_roles;
CREATE POLICY "user_unit_roles_admin_manage" ON public.user_unit_roles
  FOR ALL USING (
    (SELECT p.role IN ('system_ti','company_admin','operations_admin') AND p.active = true
     FROM public.profiles p WHERE p.id = auth.uid())
  );

NOTIFY pgrst, 'reload schema';
