-- 113_franchise_installments.sql
-- Módulo comercial (Fase 7): financeiro do contrato de venda — parcelas (entrada + N),
-- vencimento, forma de pagamento, status; e pagamento da comissão do vendedor.
--
-- "atrasado" NÃO é gravado — é derivado (due_date < hoje AND status='pendente') na leitura.
-- Escrita SEMPRE via RPC (SECURITY DEFINER) com checagem de cargo (finance_admin + admins).
-- A tabela não expõe policy de INSERT/UPDATE/DELETE para authenticated.

CREATE TABLE IF NOT EXISTS public.franchise_sale_installments (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id        uuid NOT NULL REFERENCES public.franchise_units(id) ON DELETE CASCADE,
  seq            int  NOT NULL,                    -- 0 = entrada, 1..N = parcelas
  label          text NOT NULL,                    -- "Entrada", "Parcela 1/6"
  amount         numeric(12,2) NOT NULL DEFAULT 0,
  due_date       date NOT NULL,
  payment_method text,                             -- boleto | pix | cartao | transferencia
  status         text NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente','pago','cancelado')),
  paid_at        timestamptz,
  paid_amount    numeric(12,2),
  notes          text,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (unit_id, seq)
);

CREATE INDEX IF NOT EXISTS idx_fsi_unit   ON public.franchise_sale_installments (unit_id);
CREATE INDEX IF NOT EXISTS idx_fsi_status ON public.franchise_sale_installments (status);
CREATE INDEX IF NOT EXISTS idx_fsi_due    ON public.franchise_sale_installments (due_date);

ALTER TABLE public.franchise_sale_installments ENABLE ROW LEVEL SECURITY;

-- Leitura: matriz (inclui finance_admin) OU membro da própria unidade (o franqueado vê as suas).
DROP POLICY IF EXISTS "fsi_read" ON public.franchise_sale_installments;
CREATE POLICY "fsi_read" ON public.franchise_sale_installments
  FOR SELECT USING (
    public.is_matrix_user()
    OR unit_id IN (SELECT public.my_unit_ids())
  );

-- ── Helper de cargo (finance + admins da matriz) ─────────────────────────────
CREATE OR REPLACE FUNCTION public.can_manage_franchise_finance()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(
    (SELECT role IN ('finance_admin','company_admin','operations_admin','system_ti')
       AND active = true
     FROM public.profiles WHERE id = auth.uid()),
    false)
$$;

-- ── Gera o cronograma (entrada + N parcelas). Split calculado no servidor. ────
CREATE OR REPLACE FUNCTION public.generate_franchise_installments(
  p_unit_id        uuid,
  p_entrada        numeric,
  p_num_parcelas   int,
  p_first_due      date,
  p_payment_method text
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_fee       numeric;
  v_remaining numeric;
  v_each      numeric;
  v_acc       numeric := 0;
  v_first     date := COALESCE(p_first_due, CURRENT_DATE);
  v_off       int;
  v_amount    numeric;
  i           int;
BEGIN
  IF NOT public.can_manage_franchise_finance() THEN RAISE EXCEPTION 'forbidden'; END IF;

  SELECT franchise_fee INTO v_fee FROM public.franchise_units WHERE id = p_unit_id;
  IF v_fee IS NULL THEN RAISE EXCEPTION 'unidade sem valor de contrato'; END IF;

  IF EXISTS (SELECT 1 FROM public.franchise_sale_installments
             WHERE unit_id = p_unit_id AND status = 'pago') THEN
    RAISE EXCEPTION 'ja existem parcelas pagas; edite individualmente em vez de regenerar';
  END IF;

  DELETE FROM public.franchise_sale_installments WHERE unit_id = p_unit_id;

  p_entrada := COALESCE(p_entrada, 0);
  IF p_entrada < 0 OR p_entrada > v_fee THEN RAISE EXCEPTION 'entrada invalida'; END IF;
  IF p_num_parcelas < 0 THEN RAISE EXCEPTION 'numero de parcelas invalido'; END IF;

  IF p_entrada > 0 THEN
    INSERT INTO public.franchise_sale_installments(unit_id, seq, label, amount, due_date, payment_method, status)
    VALUES (p_unit_id, 0, 'Entrada', p_entrada, v_first, p_payment_method, 'pendente');
  END IF;

  v_remaining := v_fee - p_entrada;
  v_off := CASE WHEN p_entrada > 0 THEN 1 ELSE 0 END;  -- parcelas começam 1 mês após a entrada

  IF p_num_parcelas > 0 AND v_remaining > 0 THEN
    v_each := round(v_remaining / p_num_parcelas, 2);
    FOR i IN 1..p_num_parcelas LOOP
      IF i < p_num_parcelas THEN
        v_amount := v_each; v_acc := v_acc + v_each;
      ELSE
        v_amount := round(v_remaining - v_acc, 2);   -- última ajusta o arredondamento
      END IF;
      INSERT INTO public.franchise_sale_installments(unit_id, seq, label, amount, due_date, payment_method, status)
      VALUES (
        p_unit_id, i,
        'Parcela ' || i || '/' || p_num_parcelas,
        v_amount,
        (v_first + ((i - 1 + v_off) || ' months')::interval)::date,
        p_payment_method, 'pendente'
      );
    END LOOP;
  ELSIF p_num_parcelas = 0 AND v_remaining > 0 THEN
    INSERT INTO public.franchise_sale_installments(unit_id, seq, label, amount, due_date, payment_method, status)
    VALUES (p_unit_id, 1, 'Parcela única', v_remaining, v_first, p_payment_method, 'pendente');
  END IF;
END $$;

-- ── Marcar parcela paga / estornar ───────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_franchise_installment_paid(
  p_id uuid, p_paid boolean, p_paid_amount numeric DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.can_manage_franchise_finance() THEN RAISE EXCEPTION 'forbidden'; END IF;
  UPDATE public.franchise_sale_installments SET
    status      = CASE WHEN p_paid THEN 'pago' ELSE 'pendente' END,
    paid_at     = CASE WHEN p_paid THEN now() ELSE NULL END,
    paid_amount = CASE WHEN p_paid THEN COALESCE(p_paid_amount, amount) ELSE NULL END,
    updated_at  = now()
  WHERE id = p_id;
END $$;

-- ── Editar/renegociar uma parcela (valor, vencimento, forma) ─────────────────
CREATE OR REPLACE FUNCTION public.update_franchise_installment(
  p_id uuid, p_amount numeric, p_due_date date, p_payment_method text, p_notes text DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.can_manage_franchise_finance() THEN RAISE EXCEPTION 'forbidden'; END IF;
  UPDATE public.franchise_sale_installments SET
    amount         = COALESCE(p_amount, amount),
    due_date       = COALESCE(p_due_date, due_date),
    payment_method = COALESCE(p_payment_method, payment_method),
    notes          = p_notes,
    updated_at     = now()
  WHERE id = p_id AND status <> 'pago';
END $$;

-- ── Excluir uma parcela pendente ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.delete_franchise_installment(p_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.can_manage_franchise_finance() THEN RAISE EXCEPTION 'forbidden'; END IF;
  DELETE FROM public.franchise_sale_installments WHERE id = p_id AND status <> 'pago';
END $$;

-- ── Pagamento da comissão do vendedor (migration 112) ────────────────────────
CREATE OR REPLACE FUNCTION public.set_franchise_commission_paid(p_id uuid, p_paid boolean)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.can_manage_franchise_finance() THEN RAISE EXCEPTION 'forbidden'; END IF;
  UPDATE public.franchise_sale_commissions SET
    status  = CASE WHEN p_paid THEN 'pago' ELSE 'pendente' END,
    paid_at = CASE WHEN p_paid THEN now() ELSE NULL END
  WHERE id = p_id;
END $$;

-- Permissões: só authenticated executa; a checagem de cargo é interna.
REVOKE ALL ON FUNCTION public.generate_franchise_installments(uuid, numeric, int, date, text)  FROM public;
REVOKE ALL ON FUNCTION public.set_franchise_installment_paid(uuid, boolean, numeric)             FROM public;
REVOKE ALL ON FUNCTION public.update_franchise_installment(uuid, numeric, date, text, text)      FROM public;
REVOKE ALL ON FUNCTION public.delete_franchise_installment(uuid)                                 FROM public;
REVOKE ALL ON FUNCTION public.set_franchise_commission_paid(uuid, boolean)                       FROM public;
GRANT EXECUTE ON FUNCTION public.generate_franchise_installments(uuid, numeric, int, date, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_franchise_installment_paid(uuid, boolean, numeric)          TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_franchise_installment(uuid, numeric, date, text, text)   TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_franchise_installment(uuid)                              TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_franchise_commission_paid(uuid, boolean)                    TO authenticated;

NOTIFY pgrst, 'reload schema';
