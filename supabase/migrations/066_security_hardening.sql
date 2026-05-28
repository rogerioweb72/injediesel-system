-- ============================================================
-- Migration 066: Security hardening
-- 1. Prevent privilege escalation via profiles self-update
-- 2. Restrict inactive user access to marketing materials
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- 1. PROFILES — split update policy
--    VULN: "profiles_update" allows id=auth.uid() without
--    WITH CHECK, meaning any user can set their own role,
--    active, permissions, salary, etc. via direct REST call.
-- ─────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "profiles_update" ON public.profiles;

-- Admins: update any profile, any field
CREATE POLICY "profiles_update_admin" ON public.profiles
  FOR UPDATE
  USING (public.is_matrix_admin());

-- Self-update: only personal/contact/address fields — security
-- fields (role, active, permissions, salary, commission, etc.)
-- must remain unchanged via WITH CHECK.
CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (
    id = auth.uid()
    -- Security fields must not change
    AND role               IS NOT DISTINCT FROM (SELECT role               FROM public.profiles p WHERE p.id = auth.uid())
    AND active             IS NOT DISTINCT FROM (SELECT active             FROM public.profiles p WHERE p.id = auth.uid())
    AND max_discount_pct   IS NOT DISTINCT FROM (SELECT max_discount_pct   FROM public.profiles p WHERE p.id = auth.uid())
    AND commission_rate    IS NOT DISTINCT FROM (SELECT commission_rate    FROM public.profiles p WHERE p.id = auth.uid())
    AND discount_auth_hash IS NOT DISTINCT FROM (SELECT discount_auth_hash FROM public.profiles p WHERE p.id = auth.uid())
    AND permissions        IS NOT DISTINCT FROM (SELECT permissions        FROM public.profiles p WHERE p.id = auth.uid())
    AND salary             IS NOT DISTINCT FROM (SELECT salary             FROM public.profiles p WHERE p.id = auth.uid())
    AND hire_date          IS NOT DISTINCT FROM (SELECT hire_date          FROM public.profiles p WHERE p.id = auth.uid())
  );

-- ─────────────────────────────────────────────────────────────
-- 2. MARKETING MATERIALS — restrict to active users only
--    Current policy allows any auth.uid() including deactivated.
-- ─────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "mkt_materials_read" ON public.marketing_materials;

CREATE POLICY "mkt_materials_read" ON public.marketing_materials
  FOR SELECT USING (
    active = true
    AND public.is_active_user()
  );
