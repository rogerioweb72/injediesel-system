-- ============================================================
-- 067_fix_custom_access_token_hook.sql
-- FIX: fn_custom_access_token quebrava para usuários matriz
-- causando HTTP 500 em /auth/v1/token?grant_type=password.
--
-- Problemas corrigidos:
--   1. Sem EXCEPTION handler — qualquer erro interna vira 500
--   2. claims pode ser NULL se event -> 'claims' for null
--   3. STABLE marcação incorreta (função faz SELECT, VOLATILE é correto)
--
-- REGRA: hook deve NUNCA bloquear autenticação.
-- Em caso de falha → retorna event inalterado (failsafe).
-- ============================================================

CREATE OR REPLACE FUNCTION public.fn_custom_access_token(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_id   uuid;
  user_role text;
  unit_ids  uuid[];
  claims    jsonb;
BEGIN
  user_id := (event ->> 'user_id')::uuid;
  claims  := COALESCE(event -> 'claims', '{}'::jsonb);

  SELECT role::text INTO user_role
  FROM public.profiles
  WHERE id = user_id;

  IF user_role IN (
    'franchise_manager', 'unit_manager', 'unit_operator',
    'ecu_technician', 'unit_seller', 'receptionist', 'finance_staff'
  ) THEN
    SELECT array_agg(unit_id) INTO unit_ids
    FROM public.user_unit_roles
    WHERE user_id = fn_custom_access_token.user_id;

    claims := jsonb_set(
      claims,
      '{app_metadata,unit_ids}',
      COALESCE(to_jsonb(unit_ids), '[]'::jsonb)
    );
  ELSE
    claims := claims #- '{app_metadata,unit_ids}';
  END IF;

  RETURN jsonb_set(event, '{claims}', claims);

EXCEPTION WHEN OTHERS THEN
  -- Failsafe: nunca bloquear auth por erro no hook.
  -- Usuário loga normalmente; unit_ids não serão injetados.
  RETURN event;
END;
$$;

-- Re-grant caso tenha sido perdido
GRANT EXECUTE ON FUNCTION public.fn_custom_access_token(jsonb) TO supabase_auth_admin;
REVOKE EXECUTE ON FUNCTION public.fn_custom_access_token(jsonb) FROM PUBLIC, anon, authenticated;
