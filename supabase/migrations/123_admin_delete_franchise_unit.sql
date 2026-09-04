-- 123_admin_delete_franchise_unit.sql
-- BUG: excluir unidade "não fazia nada" (mesmo digitando "excluir" como TI).
-- Causa provável: delete client direto — se algum dependente (FK) bloqueava, o
-- erro sumia; e sem checar linhas afetadas, o app achava que tinha excluído.
--
-- Fix: RPC SECURITY DEFINER, gated a system_ti/company_admin. Bloqueia exclusão
-- de unidade COM histórico de negócio (clientes/jobs/lançamentos/pedidos/PDV) —
-- protege dados reais — e deixa excluir só unidade "vazia" (ex.: duplicata em
-- implantação criada por engano). CASCADE cuida de user_unit_roles/unit_documents.

CREATE OR REPLACE FUNCTION public.admin_delete_franchise_unit(p_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_role text;
  v_hist bigint;
BEGIN
  SELECT role INTO v_role FROM public.profiles WHERE id = auth.uid();
  IF v_role IS NULL OR v_role NOT IN ('system_ti', 'company_admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT
      (SELECT count(*) FROM public.customers         WHERE unit_id = p_id)
    + (SELECT count(*) FROM public.ecu_jobs          WHERE unit_id = p_id)
    + (SELECT count(*) FROM public.financial_entries WHERE unit_id = p_id)
    + (SELECT count(*) FROM public.orders            WHERE unit_id = p_id)
    + (SELECT count(*) FROM public.pos_sales         WHERE unit_id = p_id)
  INTO v_hist;

  IF v_hist > 0 THEN
    RAISE EXCEPTION 'unit_has_history';
  END IF;

  DELETE FROM public.franchise_units WHERE id = p_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'unit_not_found';
  END IF;
END $$;

REVOKE ALL ON FUNCTION public.admin_delete_franchise_unit(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.admin_delete_franchise_unit(uuid) TO authenticated;
