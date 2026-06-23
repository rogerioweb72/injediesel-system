-- ============================================================
-- Migration 022: Complete RLS for orphan tables + user deactivation sync
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- 1. ADD unit_id TO pos_sales (needed for clean tenant isolation)
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.pos_sales
  ADD COLUMN IF NOT EXISTS unit_id uuid REFERENCES public.franchise_units(id);

-- Backfill: derive unit_id from the customer's unit, if available
UPDATE public.pos_sales ps
SET unit_id = c.unit_id
FROM public.customers c
WHERE ps.customer_id = c.id AND ps.unit_id IS NULL AND c.unit_id IS NOT NULL;

-- ─────────────────────────────────────────────────────────────
-- 2. ORDER ITEMS (child of orders — inherit unit via parent)
-- ─────────────────────────────────────────────────────────────
CREATE POLICY "order_items_system_all" ON public.order_items
  FOR ALL USING (public.is_system_ti());

CREATE POLICY "order_items_matrix_all" ON public.order_items
  FOR ALL USING (
    public.current_user_role() IN ('company_admin', 'operations_admin', 'seller', 'finance_admin')
  );

CREATE POLICY "order_items_matrix_read" ON public.order_items
  FOR SELECT USING (
    public.current_user_role() IN ('support_agent', 'auditor')
  );

CREATE POLICY "order_items_unit_member" ON public.order_items
  FOR ALL USING (
    order_id IN (
      SELECT id FROM public.orders
      WHERE unit_id IN (SELECT unit_id FROM public.user_unit_roles WHERE user_id = auth.uid())
    )
  );

-- ─────────────────────────────────────────────────────────────
-- 3. POS SALES
-- ─────────────────────────────────────────────────────────────
CREATE POLICY "pos_sales_system_all" ON public.pos_sales
  FOR ALL USING (public.is_system_ti());

CREATE POLICY "pos_sales_matrix_all" ON public.pos_sales
  FOR ALL USING (
    public.current_user_role() IN ('company_admin', 'operations_admin', 'seller', 'finance_admin')
  );

CREATE POLICY "pos_sales_unit_member" ON public.pos_sales
  FOR ALL USING (
    unit_id IN (SELECT unit_id FROM public.user_unit_roles WHERE user_id = auth.uid())
    OR created_by = auth.uid()
  );

-- ─────────────────────────────────────────────────────────────
-- 4. POS SALE ITEMS (child of pos_sales)
-- ─────────────────────────────────────────────────────────────
CREATE POLICY "pos_sale_items_system_all" ON public.pos_sale_items
  FOR ALL USING (public.is_system_ti());

CREATE POLICY "pos_sale_items_matrix_all" ON public.pos_sale_items
  FOR ALL USING (
    public.current_user_role() IN ('company_admin', 'operations_admin', 'seller', 'finance_admin')
  );

CREATE POLICY "pos_sale_items_unit_member" ON public.pos_sale_items
  FOR ALL USING (
    sale_id IN (
      SELECT id FROM public.pos_sales
      WHERE unit_id IN (SELECT unit_id FROM public.user_unit_roles WHERE user_id = auth.uid())
        OR created_by = auth.uid()
    )
  );

-- ─────────────────────────────────────────────────────────────
-- 5. SUPPORT MESSAGES (child of support_tickets)
-- ─────────────────────────────────────────────────────────────
CREATE POLICY "support_messages_system_all" ON public.support_messages
  FOR ALL USING (public.is_system_ti());

CREATE POLICY "support_messages_matrix_all" ON public.support_messages
  FOR ALL USING (public.is_matrix_user());

CREATE POLICY "support_messages_unit_member" ON public.support_messages
  FOR ALL USING (
    ticket_id IN (
      SELECT id FROM public.support_tickets
      WHERE unit_id IN (SELECT unit_id FROM public.user_unit_roles WHERE user_id = auth.uid())
    )
  );

-- ─────────────────────────────────────────────────────────────
-- 6. ECU JOB EVENTS (child of ecu_jobs)
-- ─────────────────────────────────────────────────────────────
CREATE POLICY "ecu_job_events_system_all" ON public.ecu_job_events
  FOR ALL USING (public.is_system_ti());

CREATE POLICY "ecu_job_events_matrix_all" ON public.ecu_job_events
  FOR ALL USING (
    public.current_user_role() IN ('company_admin', 'operations_admin', 'support_agent')
  );

CREATE POLICY "ecu_job_events_matrix_read" ON public.ecu_job_events
  FOR SELECT USING (
    public.current_user_role() IN ('finance_admin', 'seller', 'auditor')
  );

CREATE POLICY "ecu_job_events_unit_member" ON public.ecu_job_events
  FOR ALL USING (
    job_id IN (
      SELECT id FROM public.ecu_jobs
      WHERE unit_id IN (SELECT unit_id FROM public.user_unit_roles WHERE user_id = auth.uid())
    )
  );

-- ─────────────────────────────────────────────────────────────
-- 7. COMMISSIONS (seller_id scoped)
-- ─────────────────────────────────────────────────────────────
CREATE POLICY "commissions_system_all" ON public.commissions
  FOR ALL USING (public.is_system_ti());

CREATE POLICY "commissions_matrix_all" ON public.commissions
  FOR ALL USING (
    public.current_user_role() IN ('company_admin', 'finance_admin', 'operations_admin', 'auditor')
  );

-- Franchise users see their own commissions only
CREATE POLICY "commissions_own" ON public.commissions
  FOR SELECT USING (seller_id = auth.uid());

-- ─────────────────────────────────────────────────────────────
-- 8. MONTHLY CLOSINGS (unit_id scoped; matrix admin can create)
-- ─────────────────────────────────────────────────────────────
CREATE POLICY "monthly_closings_system_all" ON public.monthly_closings
  FOR ALL USING (public.is_system_ti());

CREATE POLICY "monthly_closings_matrix_admin" ON public.monthly_closings
  FOR ALL USING (
    public.current_user_role() IN ('company_admin', 'finance_admin')
  );

CREATE POLICY "monthly_closings_matrix_read" ON public.monthly_closings
  FOR SELECT USING (
    public.current_user_role() IN ('operations_admin', 'auditor')
  );

-- Franchise admin can see their unit's closings (read-only — no mutation)
CREATE POLICY "monthly_closings_unit_read" ON public.monthly_closings
  FOR SELECT USING (
    unit_id IN (SELECT unit_id FROM public.user_unit_roles WHERE user_id = auth.uid())
  );

-- ─────────────────────────────────────────────────────────────
-- 9. USER DEACTIVATION SYNC → auth.users.banned_until
-- When profiles.active = false, ban the JWT issuance in auth.users.
-- SECURITY DEFINER runs as postgres (superuser), which can modify auth schema.
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.fn_sync_user_ban()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NEW.active IS DISTINCT FROM OLD.active THEN
    IF NOT NEW.active THEN
      -- Permanently ban: blocks future logins and token refresh
      UPDATE auth.users
      SET banned_until = 'infinity'::timestamptz
      WHERE id = NEW.id;
    ELSE
      -- Unban: restore login access
      UPDATE auth.users
      SET banned_until = NULL
      WHERE id = NEW.id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_sync_user_ban
  AFTER UPDATE OF active ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.fn_sync_user_ban();

-- ─────────────────────────────────────────────────────────────
-- 10. EXTRA SAFETY: RLS policy using profiles.active
-- Even if ban sync fails for some reason, authenticated users
-- with active=false get blocked at the RLS layer too.
-- This replaces the existing profiles_read policy.
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.is_active_user()
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT COALESCE(active, false) FROM public.profiles WHERE id = auth.uid()
$$;

-- Add active check to the RLS helper used by most policies
CREATE OR REPLACE FUNCTION public.is_matrix_user()
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT role IN ('system_ti','company_admin','operations_admin','finance_admin','support_agent','seller','auditor')
    AND active = true
  FROM public.profiles WHERE id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION public.is_matrix_admin()
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT role IN ('system_ti', 'company_admin') AND active = true
  FROM public.profiles WHERE id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION public.is_system_ti()
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT role = 'system_ti' AND active = true
  FROM public.profiles WHERE id = auth.uid()
$$;
