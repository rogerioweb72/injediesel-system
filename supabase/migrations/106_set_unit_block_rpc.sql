-- 106_set_unit_block_rpc.sql
-- RPC dedicada para (des)bloquear unidade por inadimplência, liberada ao Gerente
-- Financeiro (finance_admin) SEM dar a ele escrita ampla em franchise_units — a
-- policy franchise_units_admin_all é FOR ALL (tudo-ou-nada), o que exporia CNPJ,
-- contrato, etc. Esta função só flipa contract_blocked/_reason/_at.
--
-- SECURITY DEFINER roda com privilégio elevado (ignora RLS de franchise_units),
-- então a CHECAGEM DE QUEM PODE está DENTRO da função — só os cargos de matriz
-- autorizados bloqueiam. GRANT de EXECUTE só a authenticated; REVOKE de public.

CREATE OR REPLACE FUNCTION public.set_unit_block(
  p_unit_id uuid,
  p_blocked boolean,
  p_reason  text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text;
BEGIN
  SELECT role INTO v_role FROM public.profiles WHERE id = auth.uid();

  -- Quem pode bloquear: matriz (admin/operações/financeiro) + system_ti.
  IF v_role IS NULL OR v_role NOT IN
     ('company_admin', 'operations_admin', 'finance_admin', 'system_ti') THEN
    RAISE EXCEPTION 'Acesso negado: sem permissão para bloquear unidades';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.franchise_units WHERE id = p_unit_id) THEN
    RAISE EXCEPTION 'Unidade inválida';
  END IF;

  UPDATE public.franchise_units
  SET contract_blocked        = p_blocked,
      contract_blocked_reason = CASE WHEN p_blocked THEN p_reason ELSE NULL END,
      contract_blocked_at     = CASE WHEN p_blocked THEN now() ELSE NULL END
  WHERE id = p_unit_id;
END;
$$;

REVOKE ALL ON FUNCTION public.set_unit_block(uuid, boolean, text) FROM public;
GRANT EXECUTE ON FUNCTION public.set_unit_block(uuid, boolean, text) TO authenticated;

NOTIFY pgrst, 'reload schema';
