-- ============================================================
-- Migration 021: Multi-Tenant RBAC + Audit Triggers
-- Hierarchy: system_ti (020) > matrix > franchise
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- 1. PROFILES — add permission_profile_id link
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS permission_profile_id uuid,
  ADD COLUMN IF NOT EXISTS unit_id uuid REFERENCES public.franchise_units(id);

-- ─────────────────────────────────────────────────────────────
-- 3. RBAC PERMISSION PROFILES
-- Named reusable permission sets (e.g. "Financeiro", "Suporte")
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.permission_profiles (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  scope       text NOT NULL CHECK (scope IN ('matrix', 'franchise')),
  description text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (name, scope)
);

CREATE TABLE IF NOT EXISTS public.permission_entries (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  permission_profile_id uuid NOT NULL REFERENCES public.permission_profiles(id) ON DELETE CASCADE,
  module                text NOT NULL,
  can_view              boolean NOT NULL DEFAULT false,
  can_create            boolean NOT NULL DEFAULT false,
  can_edit              boolean NOT NULL DEFAULT false,
  can_delete            boolean NOT NULL DEFAULT false,
  UNIQUE (permission_profile_id, module)
);

CREATE INDEX IF NOT EXISTS idx_permission_entries_profile ON public.permission_entries(permission_profile_id);

-- Add FK now that table exists
ALTER TABLE public.profiles
  ADD CONSTRAINT fk_profiles_permission_profile
    FOREIGN KEY (permission_profile_id) REFERENCES public.permission_profiles(id);

-- ─────────────────────────────────────────────────────────────
-- 4. IMPERSONATION SESSIONS
-- system_ti users can view the system as another user (UI-level)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.impersonation_sessions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id    uuid NOT NULL REFERENCES public.profiles(id),
  target_id   uuid NOT NULL REFERENCES public.profiles(id),
  reason      text,
  started_at  timestamptz NOT NULL DEFAULT now(),
  ended_at    timestamptz,
  CHECK (actor_id != target_id)
);

CREATE INDEX IF NOT EXISTS idx_impersonation_actor ON public.impersonation_sessions(actor_id, ended_at);

-- ─────────────────────────────────────────────────────────────
-- 5. UPDATED RLS HELPER FUNCTIONS
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.is_system_ti()
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT role = 'system_ti' FROM public.profiles WHERE id = auth.uid()
$$;

-- system_ti + full matrix access
CREATE OR REPLACE FUNCTION public.is_matrix_admin()
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT role IN ('system_ti', 'company_admin')
  FROM public.profiles WHERE id = auth.uid()
$$;

-- all matrix-level users (including managers)
CREATE OR REPLACE FUNCTION public.is_matrix_user()
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT role IN ('system_ti', 'company_admin', 'operations_admin', 'finance_admin', 'support_agent', 'seller', 'auditor')
  FROM public.profiles WHERE id = auth.uid()
$$;

-- franchise admin of a specific unit
CREATE OR REPLACE FUNCTION public.is_franchise_admin_of(p_unit_id uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_unit_roles
    WHERE user_id = auth.uid()
      AND unit_id = p_unit_id
      AND role = 'franchise_manager'
  )
$$;

-- get primary unit_id for current user (franchise users)
CREATE OR REPLACE FUNCTION public.my_unit_ids()
RETURNS SETOF uuid LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT unit_id FROM public.user_unit_roles WHERE user_id = auth.uid()
$$;

-- updated role helper
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS public.user_role LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid()
$$;

-- ─────────────────────────────────────────────────────────────
-- 6. AUDIT TRIGGER FUNCTION
-- Fires on INSERT/UPDATE/DELETE on critical tables
-- Automatically marks system_ti actions
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.fn_audit_trigger()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_actor_id     uuid;
  v_action       text;
  v_entity_id    uuid;
  v_old_data     jsonb;
  v_new_data     jsonb;
  v_actor_role   text;
  v_impersonate  uuid;
  v_meta         jsonb;
BEGIN
  v_actor_id := auth.uid();

  -- Determine action and data
  IF TG_OP = 'INSERT' THEN
    v_action    := 'INSERT';
    v_entity_id := NEW.id;
    v_new_data  := to_jsonb(NEW);
    v_old_data  := NULL;
  ELSIF TG_OP = 'UPDATE' THEN
    v_action    := 'UPDATE';
    v_entity_id := NEW.id;
    v_new_data  := to_jsonb(NEW);
    v_old_data  := to_jsonb(OLD);
    -- Store only changed fields for UPDATE
    SELECT jsonb_object_agg(key, value)
    INTO v_new_data
    FROM jsonb_each(to_jsonb(NEW))
    WHERE (to_jsonb(OLD))->key IS DISTINCT FROM value;
  ELSIF TG_OP = 'DELETE' THEN
    v_action    := 'DELETE';
    v_entity_id := OLD.id;
    v_new_data  := NULL;
    v_old_data  := to_jsonb(OLD);
  END IF;

  -- Get actor role and active impersonation
  SELECT p.role::text INTO v_actor_role
  FROM public.profiles p WHERE p.id = v_actor_id;

  SELECT ims.target_id INTO v_impersonate
  FROM public.impersonation_sessions ims
  WHERE ims.actor_id = v_actor_id
    AND ims.ended_at IS NULL
  ORDER BY ims.started_at DESC
  LIMIT 1;

  -- Build metadata
  v_meta := jsonb_build_object(
    'actor_role',     v_actor_role,
    'via_system_ti',  (v_actor_role = 'system_ti'),
    'impersonating',  v_impersonate
  );
  IF v_actor_role = 'system_ti' THEN
    v_meta := v_meta || jsonb_build_object(
      'ti_note', 'Ação executada via Suporte TI (' ||
        COALESCE((SELECT name FROM public.profiles WHERE id = v_actor_id), v_actor_id::text) || ')'
    );
  END IF;
  IF v_old_data IS NOT NULL THEN
    v_meta := v_meta || jsonb_build_object('old', v_old_data);
  END IF;

  INSERT INTO public.audit_logs (actor_id, entity, entity_id, action, metadata)
  VALUES (v_actor_id, TG_TABLE_NAME, v_entity_id, v_action, v_meta);

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Attach audit trigger to all critical tables
DO $do$
DECLARE
  t text;
  tables text[] := ARRAY[
    'profiles', 'franchise_units', 'customers', 'vehicles',
    'ecu_jobs', 'ecu_job_files', 'orders', 'order_items',
    'financial_entries', 'support_tickets', 'products',
    'permission_profiles', 'permission_entries', 'impersonation_sessions'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS trg_audit_%1$s ON public.%1$s;
       CREATE TRIGGER trg_audit_%1$s
       AFTER INSERT OR UPDATE OR DELETE ON public.%1$s
       FOR EACH ROW EXECUTE FUNCTION public.fn_audit_trigger();',
      t
    );
  END LOOP;
END;
$do$;

-- ─────────────────────────────────────────────────────────────
-- 7. UPDATE EXISTING RLS POLICIES — add system_ti bypass
-- ─────────────────────────────────────────────────────────────

-- PROFILES
DROP POLICY IF EXISTS "profiles_read_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_matrix_manage" ON public.profiles;

CREATE POLICY "profiles_read" ON public.profiles
  FOR SELECT USING (
    public.is_system_ti()
    OR id = auth.uid()
    OR public.current_user_role() IN ('company_admin', 'operations_admin')
  );

CREATE POLICY "profiles_insert" ON public.profiles
  FOR INSERT WITH CHECK (public.is_matrix_admin());

CREATE POLICY "profiles_update" ON public.profiles
  FOR UPDATE USING (
    public.is_matrix_admin()
    OR id = auth.uid()
  );

CREATE POLICY "profiles_delete" ON public.profiles
  FOR DELETE USING (public.is_matrix_admin());

-- FRANCHISE UNITS
DROP POLICY IF EXISTS "franchise_units_matrix_all" ON public.franchise_units;
DROP POLICY IF EXISTS "franchise_units_member_read" ON public.franchise_units;

CREATE POLICY "franchise_units_admin_all" ON public.franchise_units
  FOR ALL USING (public.is_matrix_admin());

CREATE POLICY "franchise_units_matrix_read" ON public.franchise_units
  FOR SELECT USING (public.is_matrix_user());

CREATE POLICY "franchise_units_member_read" ON public.franchise_units
  FOR SELECT USING (
    id IN (SELECT unit_id FROM public.user_unit_roles WHERE user_id = auth.uid())
  );

-- CUSTOMERS
DROP POLICY IF EXISTS "customers_matrix_all" ON public.customers;
DROP POLICY IF EXISTS "customers_unit_member" ON public.customers;

CREATE POLICY "customers_system_all" ON public.customers
  FOR ALL USING (public.is_system_ti());

CREATE POLICY "customers_matrix_all" ON public.customers
  FOR ALL USING (
    public.current_user_role() IN ('company_admin', 'operations_admin', 'support_agent', 'seller')
  );

CREATE POLICY "customers_matrix_read" ON public.customers
  FOR SELECT USING (
    public.current_user_role() IN ('finance_admin', 'auditor')
  );

CREATE POLICY "customers_unit_member" ON public.customers
  FOR ALL USING (
    unit_id IN (SELECT unit_id FROM public.user_unit_roles WHERE user_id = auth.uid())
  );

-- VEHICLES
DROP POLICY IF EXISTS "vehicles_via_customer" ON public.vehicles;

CREATE POLICY "vehicles_system_all" ON public.vehicles
  FOR ALL USING (public.is_system_ti());

CREATE POLICY "vehicles_matrix_all" ON public.vehicles
  FOR ALL USING (
    public.current_user_role() IN ('company_admin', 'operations_admin', 'support_agent', 'seller')
  );

CREATE POLICY "vehicles_unit_member" ON public.vehicles
  FOR ALL USING (
    customer_id IN (
      SELECT id FROM public.customers
      WHERE unit_id IN (SELECT unit_id FROM public.user_unit_roles WHERE user_id = auth.uid())
    )
  );

-- ECU JOBS
DROP POLICY IF EXISTS "ecu_jobs_matrix_all" ON public.ecu_jobs;
DROP POLICY IF EXISTS "ecu_jobs_unit_member" ON public.ecu_jobs;

CREATE POLICY "ecu_jobs_system_all" ON public.ecu_jobs
  FOR ALL USING (public.is_system_ti());

CREATE POLICY "ecu_jobs_matrix_all" ON public.ecu_jobs
  FOR ALL USING (
    public.current_user_role() IN ('company_admin', 'operations_admin', 'support_agent')
  );

CREATE POLICY "ecu_jobs_matrix_read" ON public.ecu_jobs
  FOR SELECT USING (
    public.current_user_role() IN ('finance_admin', 'seller', 'auditor')
  );

-- Franchise admin: READ only (cannot modify ECU maps/jobs)
CREATE POLICY "ecu_jobs_franchise_admin_read" ON public.ecu_jobs
  FOR SELECT USING (
    public.current_user_role() = 'franchise_manager'
    AND unit_id IN (SELECT unit_id FROM public.user_unit_roles WHERE user_id = auth.uid())
  );

-- Franchise operator: full access to own unit's jobs
CREATE POLICY "ecu_jobs_unit_operator" ON public.ecu_jobs
  FOR ALL USING (
    public.current_user_role() = 'unit_operator'
    AND unit_id IN (SELECT unit_id FROM public.user_unit_roles WHERE user_id = auth.uid())
  );

-- ECU JOB FILES: franchise_manager read-only
DROP POLICY IF EXISTS "ecu_job_files_all" ON public.ecu_job_files;
CREATE POLICY "ecu_job_files_system" ON public.ecu_job_files
  FOR ALL USING (public.is_system_ti());

CREATE POLICY "ecu_job_files_matrix" ON public.ecu_job_files
  FOR ALL USING (public.current_user_role() IN ('company_admin', 'operations_admin'));

CREATE POLICY "ecu_job_files_franchise_read" ON public.ecu_job_files
  FOR SELECT USING (
    public.current_user_role() IN ('franchise_manager', 'unit_operator')
    AND job_id IN (
      SELECT id FROM public.ecu_jobs
      WHERE unit_id IN (SELECT unit_id FROM public.user_unit_roles WHERE user_id = auth.uid())
    )
  );

-- franchise operator can INSERT new files (upload originals)
CREATE POLICY "ecu_job_files_operator_insert" ON public.ecu_job_files
  FOR INSERT WITH CHECK (
    public.current_user_role() = 'unit_operator'
    AND job_id IN (
      SELECT id FROM public.ecu_jobs
      WHERE unit_id IN (SELECT unit_id FROM public.user_unit_roles WHERE user_id = auth.uid())
    )
  );

-- PRODUCTS
DROP POLICY IF EXISTS "products_public_read" ON public.products;
DROP POLICY IF EXISTS "products_matrix_write" ON public.products;

CREATE POLICY "products_public_read" ON public.products
  FOR SELECT USING (active = true);

CREATE POLICY "products_matrix_write" ON public.products
  FOR ALL USING (
    public.is_system_ti()
    OR public.current_user_role() IN ('company_admin', 'operations_admin', 'seller')
  );

-- PRODUCT PRICES
DROP POLICY IF EXISTS "product_prices_cliente_final" ON public.product_prices;
DROP POLICY IF EXISTS "product_prices_full_franchise" ON public.product_prices;
DROP POLICY IF EXISTS "product_prices_leve_franchise" ON public.product_prices;
DROP POLICY IF EXISTS "product_prices_matrix_all" ON public.product_prices;

CREATE POLICY "product_prices_system" ON public.product_prices
  FOR ALL USING (public.is_system_ti());

CREATE POLICY "product_prices_matrix_all" ON public.product_prices
  FOR ALL USING (public.current_user_role() IN ('company_admin', 'operations_admin', 'seller'));

CREATE POLICY "product_prices_matrix_read" ON public.product_prices
  FOR SELECT USING (public.current_user_role() IN ('finance_admin', 'auditor'));

CREATE POLICY "product_prices_cliente_final" ON public.product_prices
  FOR SELECT USING (tier = 'cliente_final');

CREATE POLICY "product_prices_full_franchise" ON public.product_prices
  FOR SELECT USING (
    tier = 'franqueado_full'
    AND EXISTS (
      SELECT 1 FROM public.franchise_units fu
      JOIN public.user_unit_roles uur ON uur.unit_id = fu.id
      WHERE uur.user_id = auth.uid() AND fu.contract_type = 'full'
    )
  );

CREATE POLICY "product_prices_leve_franchise" ON public.product_prices
  FOR SELECT USING (
    tier = 'franqueado_linha_leve'
    AND EXISTS (
      SELECT 1 FROM public.franchise_units fu
      JOIN public.user_unit_roles uur ON uur.unit_id = fu.id
      WHERE uur.user_id = auth.uid() AND fu.contract_type = 'linha_leve'
    )
  );

-- ORDERS
DROP POLICY IF EXISTS "orders_matrix_all" ON public.orders;
DROP POLICY IF EXISTS "orders_unit_read" ON public.orders;

CREATE POLICY "orders_system_all" ON public.orders
  FOR ALL USING (public.is_system_ti());

CREATE POLICY "orders_matrix_all" ON public.orders
  FOR ALL USING (
    public.current_user_role() IN ('company_admin', 'operations_admin', 'seller', 'finance_admin')
  );

CREATE POLICY "orders_matrix_read" ON public.orders
  FOR SELECT USING (public.current_user_role() IN ('support_agent', 'auditor'));

CREATE POLICY "orders_unit_all" ON public.orders
  FOR ALL USING (
    unit_id IN (SELECT unit_id FROM public.user_unit_roles WHERE user_id = auth.uid())
  );

-- FINANCIAL ENTRIES (immutable for non-admin)
DROP POLICY IF EXISTS "financial_matrix_read" ON public.financial_entries;
DROP POLICY IF EXISTS "financial_admin_write" ON public.financial_entries;

CREATE POLICY "financial_system_all" ON public.financial_entries
  FOR ALL USING (public.is_system_ti());

CREATE POLICY "financial_matrix_read" ON public.financial_entries
  FOR SELECT USING (
    public.current_user_role() IN ('company_admin', 'finance_admin', 'operations_admin', 'auditor')
  );

CREATE POLICY "financial_admin_write" ON public.financial_entries
  FOR INSERT WITH CHECK (
    public.current_user_role() IN ('company_admin', 'finance_admin')
  );

-- SUPPORT TICKETS
DROP POLICY IF EXISTS "tickets_matrix_all" ON public.support_tickets;
DROP POLICY IF EXISTS "tickets_unit_own" ON public.support_tickets;

CREATE POLICY "tickets_system_all" ON public.support_tickets
  FOR ALL USING (public.is_system_ti());

CREATE POLICY "tickets_matrix_all" ON public.support_tickets
  FOR ALL USING (public.is_matrix_user());

CREATE POLICY "tickets_unit_own" ON public.support_tickets
  FOR ALL USING (
    unit_id IN (SELECT unit_id FROM public.user_unit_roles WHERE user_id = auth.uid())
  );

-- AUDIT LOGS
DROP POLICY IF EXISTS "audit_logs_select" ON public.audit_logs;

CREATE POLICY "audit_logs_system_all" ON public.audit_logs
  FOR ALL USING (public.is_system_ti());

CREATE POLICY "audit_logs_matrix_read" ON public.audit_logs
  FOR SELECT USING (
    public.current_user_role() IN ('company_admin', 'auditor')
  );

-- USER_UNIT_ROLES
DROP POLICY IF EXISTS "user_unit_roles_read" ON public.user_unit_roles;
DROP POLICY IF EXISTS "user_unit_roles_manage" ON public.user_unit_roles;

CREATE POLICY "user_unit_roles_system" ON public.user_unit_roles
  FOR ALL USING (public.is_system_ti());

CREATE POLICY "user_unit_roles_admin_manage" ON public.user_unit_roles
  FOR ALL USING (public.is_matrix_admin());

CREATE POLICY "user_unit_roles_self_read" ON public.user_unit_roles
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "user_unit_roles_franchise_admin" ON public.user_unit_roles
  FOR SELECT USING (
    public.current_user_role() = 'franchise_manager'
    AND unit_id IN (SELECT unit_id FROM public.user_unit_roles uur WHERE uur.user_id = auth.uid())
  );

-- ─────────────────────────────────────────────────────────────
-- 8. FIX MISSING RLS — company_settings, financial_categories, franchise_levels
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.company_settings    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.franchise_levels    ENABLE ROW LEVEL SECURITY;

-- company_settings: only matrix_admin can write; matrix users can read
CREATE POLICY "company_settings_admin_all" ON public.company_settings
  FOR ALL USING (public.is_matrix_admin());

CREATE POLICY "company_settings_matrix_read" ON public.company_settings
  FOR SELECT USING (public.is_matrix_user());

-- financial_categories: matrix users can read; admin can write
CREATE POLICY "financial_categories_matrix_read" ON public.financial_categories
  FOR SELECT USING (public.is_matrix_user());

CREATE POLICY "financial_categories_admin_write" ON public.financial_categories
  FOR ALL USING (
    public.is_system_ti()
    OR public.current_user_role() IN ('company_admin', 'finance_admin')
  );

-- franchise_levels: readable by all authenticated; writable by admin only
CREATE POLICY "franchise_levels_read" ON public.franchise_levels
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "franchise_levels_admin_write" ON public.franchise_levels
  FOR ALL USING (public.is_matrix_admin());

-- ─────────────────────────────────────────────────────────────
-- 9. RBAC — permission profiles & entries RLS
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.permission_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permission_entries  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.impersonation_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "permission_profiles_system_all" ON public.permission_profiles
  FOR ALL USING (public.is_system_ti());

CREATE POLICY "permission_profiles_admin_manage" ON public.permission_profiles
  FOR ALL USING (public.current_user_role() = 'company_admin');

CREATE POLICY "permission_profiles_read" ON public.permission_profiles
  FOR SELECT USING (public.is_matrix_user());

CREATE POLICY "permission_entries_system_all" ON public.permission_entries
  FOR ALL USING (public.is_system_ti());

CREATE POLICY "permission_entries_admin_manage" ON public.permission_entries
  FOR ALL USING (public.current_user_role() = 'company_admin');

CREATE POLICY "permission_entries_read" ON public.permission_entries
  FOR SELECT USING (public.is_matrix_user());

CREATE POLICY "impersonation_system_all" ON public.impersonation_sessions
  FOR ALL USING (public.is_system_ti());

CREATE POLICY "impersonation_actor_read" ON public.impersonation_sessions
  FOR SELECT USING (actor_id = auth.uid());

-- ─────────────────────────────────────────────────────────────
-- 10. SEED — default permission profiles
-- ─────────────────────────────────────────────────────────────
INSERT INTO public.permission_profiles (name, scope, description) VALUES
  ('Financeiro',          'matrix',    'Acesso ao módulo financeiro e relatórios'),
  ('Suporte Técnico',     'matrix',    'Atendimento de tickets e ECU jobs'),
  ('Marketing / Vendas',  'matrix',    'Catálogo, pedidos e PDV'),
  ('Auditor',             'matrix',    'Leitura completa sem escrita'),
  ('Gerente de Franquia', 'franchise', 'Gestão da unidade — leitura operacional'),
  ('Vendedor',            'franchise', 'Atendimento e pedidos da unidade'),
  ('Técnico ECU',         'franchise', 'Upload e processamento de arquivos ECU')
ON CONFLICT (name, scope) DO NOTHING;

-- Seed entries for 'Financeiro' matrix profile
WITH p AS (SELECT id FROM public.permission_profiles WHERE name = 'Financeiro' AND scope = 'matrix')
INSERT INTO public.permission_entries (permission_profile_id, module, can_view, can_create, can_edit, can_delete)
SELECT p.id, m.module, m.cv, m.cc, m.ce, m.cd FROM p,
(VALUES
  ('dashboard',      true,  false, false, false),
  ('clientes',       true,  false, false, false),
  ('produtos',       true,  false, false, false),
  ('pedidos',        true,  false, false, false),
  ('financeiro',     true,  true,  true,  false),
  ('relatorios',     true,  false, false, false)
) AS m(module, cv, cc, ce, cd)
ON CONFLICT (permission_profile_id, module) DO NOTHING;

-- Seed entries for 'Suporte Técnico' matrix profile
WITH p AS (SELECT id FROM public.permission_profiles WHERE name = 'Suporte Técnico' AND scope = 'matrix')
INSERT INTO public.permission_entries (permission_profile_id, module, can_view, can_create, can_edit, can_delete)
SELECT p.id, m.module, m.cv, m.cc, m.ce, m.cd FROM p,
(VALUES
  ('dashboard',      true,  false, false, false),
  ('clientes',       true,  true,  true,  false),
  ('ecu_arquivos',   true,  true,  true,  false),
  ('suporte',        true,  true,  true,  false),
  ('franqueados',    true,  false, false, false)
) AS m(module, cv, cc, ce, cd)
ON CONFLICT (permission_profile_id, module) DO NOTHING;

-- Seed entries for 'Técnico ECU' franchise profile
WITH p AS (SELECT id FROM public.permission_profiles WHERE name = 'Técnico ECU' AND scope = 'franchise')
INSERT INTO public.permission_entries (permission_profile_id, module, can_view, can_create, can_edit, can_delete)
SELECT p.id, m.module, m.cv, m.cc, m.ce, m.cd FROM p,
(VALUES
  ('dashboard',    true,  false, false, false),
  ('ecu_arquivos', true,  true,  true,  false),
  ('clientes',     true,  true,  false, false)
) AS m(module, cv, cc, ce, cd)
ON CONFLICT (permission_profile_id, module) DO NOTHING;

-- Seed entries for 'Vendedor' franchise profile
WITH p AS (SELECT id FROM public.permission_profiles WHERE name = 'Vendedor' AND scope = 'franchise')
INSERT INTO public.permission_entries (permission_profile_id, module, can_view, can_create, can_edit, can_delete)
SELECT p.id, m.module, m.cv, m.cc, m.ce, m.cd FROM p,
(VALUES
  ('dashboard',  true,  false, false, false),
  ('clientes',   true,  true,  true,  false),
  ('produtos',   true,  false, false, false),
  ('pedidos',    true,  true,  false, false),
  ('pdv',        true,  true,  false, false)
) AS m(module, cv, cc, ce, cd)
ON CONFLICT (permission_profile_id, module) DO NOTHING;

-- ─────────────────────────────────────────────────────────────
-- 11. Update existing system_ti user profile
-- ─────────────────────────────────────────────────────────────
-- web72web@gmail.com should be system_ti
UPDATE public.profiles
SET role = 'system_ti'
WHERE id = (SELECT id FROM auth.users WHERE email = 'web72web@gmail.com');
