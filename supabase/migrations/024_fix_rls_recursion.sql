-- ============================================================
-- 024 — Fix RLS infinite recursion
--
-- Problem: helper functions called inside RLS policies queried
-- the same tables those policies guard → infinite recursion.
-- Two hotspots:
--   1. profiles helpers (current_user_role, is_system_ti, etc.)
--      queried `profiles` inside policies on `profiles`.
--   2. user_unit_roles policy had an inline subquery on
--      `user_unit_roles` inside its own policy.
--
-- Fix: SECURITY DEFINER + SET search_path on all helpers so they
-- run as the function owner (postgres = superuser, bypasses RLS).
-- The self-referential policy is replaced with my_unit_ids()
-- which already has SECURITY DEFINER.
-- ============================================================

-- ── 1. Helper functions ────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS public.user_role
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION public.is_system_ti()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT role = 'system_ti' AND active = true FROM public.profiles WHERE id = auth.uid()),
    false
  )
$$;

CREATE OR REPLACE FUNCTION public.is_matrix_admin()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT role IN ('system_ti','company_admin') AND active = true FROM public.profiles WHERE id = auth.uid()),
    false
  )
$$;

CREATE OR REPLACE FUNCTION public.is_matrix_user()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT role IN (
      'system_ti','company_admin','operations_admin',
      'finance_admin','support_agent','seller','auditor'
    ) AND active = true FROM public.profiles WHERE id = auth.uid()),
    false
  )
$$;

CREATE OR REPLACE FUNCTION public.my_unit_ids()
RETURNS SETOF uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT unit_id FROM public.user_unit_roles WHERE user_id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION public.is_franchise_admin_of(p_unit_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_unit_roles
    WHERE user_id = auth.uid()
      AND unit_id = p_unit_id
      AND role = 'franchise_manager'
  )
$$;

-- ── 2. Fix self-referential policy on user_unit_roles ──────────
-- Old policy had: unit_id IN (SELECT unit_id FROM user_unit_roles WHERE user_id = auth.uid())
-- → recursion. Replace inline subquery with my_unit_ids() (SECURITY DEFINER).

DROP POLICY IF EXISTS user_unit_roles_franchise_admin ON public.user_unit_roles;

CREATE POLICY user_unit_roles_franchise_admin ON public.user_unit_roles
FOR SELECT
USING (
  current_user_role() = 'franchise_manager'::public.user_role
  AND unit_id IN (SELECT public.my_unit_ids())
);
