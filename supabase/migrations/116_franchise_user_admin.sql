-- 116_franchise_user_admin.sql
-- Cockpit da unidade (Fase 1): a matriz gerencia os usuários de uma franquia —
-- bloquear/reativar, remover acesso da unidade (troca de titularidade) e editar cargo.
-- RLS não deixa um usuário editar profiles/user_unit_roles de outro; por isso RPCs
-- SECURITY DEFINER com checagem de cargo (admins da matriz) + guarda de alvo
-- (só usuários de FRANQUIA — nunca mexe em staff da matriz por aqui).

CREATE OR REPLACE FUNCTION public.can_manage_franchise_users()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(
    (SELECT role IN ('company_admin','operations_admin','system_ti') AND active = true
     FROM public.profiles WHERE id = auth.uid()),
    false)
$$;

CREATE OR REPLACE FUNCTION public._is_franchise_user(p_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(
    (SELECT role IN ('franchise_manager','unit_manager','unit_operator',
                     'ecu_technician','unit_seller','receptionist','finance_staff')
     FROM public.profiles WHERE id = p_user_id),
    false)
$$;

-- Bloquear / reativar o login do usuário de franquia (profiles.active).
CREATE OR REPLACE FUNCTION public.set_franchise_user_active(p_user_id uuid, p_active boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.can_manage_franchise_users() THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF NOT public._is_franchise_user(p_user_id) THEN RAISE EXCEPTION 'alvo nao e usuario de franquia'; END IF;
  UPDATE public.profiles SET active = p_active WHERE id = p_user_id;
END $$;

-- Remover o acesso do usuário à unidade (troca de titularidade). A conta continua
-- existindo — só perde o vínculo. Se era o gestor, zera manager_id.
CREATE OR REPLACE FUNCTION public.remove_unit_access(p_user_id uuid, p_unit_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.can_manage_franchise_users() THEN RAISE EXCEPTION 'forbidden'; END IF;
  DELETE FROM public.user_unit_roles WHERE user_id = p_user_id AND unit_id = p_unit_id;
  UPDATE public.franchise_units SET manager_id = NULL
   WHERE id = p_unit_id AND manager_id = p_user_id;
END $$;

-- Editar o cargo do usuário na unidade (espelha em profiles.role p/ o RBAC do login).
CREATE OR REPLACE FUNCTION public.set_unit_role(p_user_id uuid, p_unit_id uuid, p_role text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.can_manage_franchise_users() THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF p_role NOT IN ('franchise_manager','unit_manager','unit_operator',
                    'ecu_technician','unit_seller','receptionist','finance_staff') THEN
    RAISE EXCEPTION 'cargo invalido';
  END IF;
  UPDATE public.user_unit_roles SET role = p_role WHERE user_id = p_user_id AND unit_id = p_unit_id;
  UPDATE public.profiles       SET role = p_role WHERE id = p_user_id;
END $$;

REVOKE ALL ON FUNCTION public.set_franchise_user_active(uuid, boolean) FROM public;
REVOKE ALL ON FUNCTION public.remove_unit_access(uuid, uuid)           FROM public;
REVOKE ALL ON FUNCTION public.set_unit_role(uuid, uuid, text)          FROM public;
GRANT EXECUTE ON FUNCTION public.set_franchise_user_active(uuid, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.remove_unit_access(uuid, uuid)           TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_unit_role(uuid, uuid, text)          TO authenticated;

NOTIFY pgrst, 'reload schema';
