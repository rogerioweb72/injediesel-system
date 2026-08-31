-- 107_pay_franchise_jobs_rpc.sql
-- RPC dedicada para MARCAR COBRANÇA COMO PAGA (quitar jobs ECU de uma unidade),
-- liberada ao Gerente Financeiro (finance_admin) sem abrir a policy FOR ALL de
-- ecu_jobs (que hoje exclui finance_admin da escrita).
--
-- Replica o pay flow atual (usePayFranchiseJobs): registra 1 pagamento em
-- financeiro_pagamentos e marca os jobs como 'pago'. Ganhos sobre o fluxo antigo:
--   1) atômico (1 função = 1 transação) — elimina o risco de pagamento órfão se o
--      2º statement falhava no cliente;
--   2) total calculado no servidor (Σ amount_charged_by_matrix dos jobs em_aberto
--      da própria unidade) — não confia em valor vindo do cliente.
--
-- SECURITY DEFINER (ignora a RLS de ecu_jobs); a checagem de quem-pode está DENTRO
-- da função (mesma lista da set_unit_block). REVOKE public / GRANT authenticated.

CREATE OR REPLACE FUNCTION public.pay_franchise_jobs(
  p_unit_id         uuid,
  p_job_ids         uuid[],
  p_forma_pagamento text,
  p_observacao      text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role     text;
  v_total    numeric(12,2);
  v_count    integer;
  v_pag_id   uuid;
BEGIN
  SELECT role INTO v_role FROM public.profiles WHERE id = auth.uid();

  IF v_role IS NULL OR v_role NOT IN
     ('company_admin', 'operations_admin', 'finance_admin', 'system_ti') THEN
    RAISE EXCEPTION 'Acesso negado: sem permissão para registrar pagamento';
  END IF;

  -- Só considera jobs em aberto que pertencem à unidade informada.
  SELECT COALESCE(SUM(amount_charged_by_matrix), 0), COUNT(*)
    INTO v_total, v_count
  FROM public.ecu_jobs
  WHERE id = ANY(p_job_ids)
    AND unit_id = p_unit_id
    AND matrix_payment_status = 'em_aberto'
    AND amount_charged_by_matrix IS NOT NULL;

  IF v_count = 0 THEN
    RAISE EXCEPTION 'Nenhuma cobrança em aberto encontrada para os jobs informados';
  END IF;

  INSERT INTO public.financeiro_pagamentos
    (unit_id, realizado_por, total_valor, qtd_arquivos, forma_pagamento, observacao)
  VALUES
    (p_unit_id, auth.uid(), v_total, v_count, p_forma_pagamento, p_observacao)
  RETURNING id INTO v_pag_id;

  UPDATE public.ecu_jobs
  SET matrix_payment_status = 'pago',
      matrix_paid_at        = now(),
      matrix_paid_by        = auth.uid(),
      matrix_payment_id     = v_pag_id
  WHERE id = ANY(p_job_ids)
    AND unit_id = p_unit_id
    AND matrix_payment_status = 'em_aberto';

  RETURN v_pag_id;
END;
$$;

REVOKE ALL ON FUNCTION public.pay_franchise_jobs(uuid, uuid[], text, text) FROM public;
GRANT EXECUTE ON FUNCTION public.pay_franchise_jobs(uuid, uuid[], text, text) TO authenticated;

NOTIFY pgrst, 'reload schema';
