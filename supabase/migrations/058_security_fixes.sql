-- 058_security_fixes.sql
-- SECURITY: current_user_role() must check active=true.
-- Policies using this function (products_matrix_write, product_prices_matrix_all,
-- permission_profiles_admin_manage, etc.) were allowing deactivated users to
-- perform writes during their JWT lifetime (up to 1h after deactivation).
-- is_matrix_user() already checked active; this aligns current_user_role().

CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS public.user_role
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid() AND active = true
$$;
