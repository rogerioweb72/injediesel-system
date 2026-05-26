-- ============================================================
-- 059_jwt_unit_ids_hook.sql
-- Custom Access Token Hook: injeta unit_ids no JWT para
-- eliminar o JOIN em user_unit_roles a cada política RLS.
--
-- TRADE-OFF CONSCIENTE:
--   unit_ids ficam no JWT com TTL de 1h.
--   Role NÃO vai para o JWT — revogação de role deve ser imediata
--   (RLS consulta profiles.role no banco em cada request).
--   Reatribuição de unidade tem latência de até 1h, aceitável
--   dado que essa operação é administrativa e rara.
--
-- ATIVAÇÃO (duas etapas necessárias):
--   1. config.toml (desenvolvimento local):
--        [auth.hook.custom_access_token]
--        enabled = true
--        uri = "pg-functions://postgres/public/fn_custom_access_token"
--
--   2. Supabase Cloud (produção):
--        Dashboard → Authentication → Hooks → Custom Access Token
--        URI: pg-functions://postgres/public/fn_custom_access_token
-- ============================================================

CREATE OR REPLACE FUNCTION public.fn_custom_access_token(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
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
  claims  := event -> 'claims';

  -- Busca role do usuário
  SELECT role::text INTO user_role
  FROM public.profiles
  WHERE id = user_id;

  -- Injeta unit_ids apenas para usuários de franquia.
  -- Usuários de matriz e system_ti não têm registros em user_unit_roles,
  -- e suas políticas RLS não usam my_unit_ids().
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
    -- Garante que app_metadata.unit_ids esteja ausente para não-franqueados
    claims := claims #- '{app_metadata,unit_ids}';
  END IF;

  RETURN jsonb_set(event, '{claims}', claims);
END;
$$;

-- Permissão necessária para o Supabase Auth invocar a função
GRANT EXECUTE ON FUNCTION public.fn_custom_access_token(jsonb) TO supabase_auth_admin;
REVOKE EXECUTE ON FUNCTION public.fn_custom_access_token(jsonb) FROM PUBLIC, anon, authenticated;
