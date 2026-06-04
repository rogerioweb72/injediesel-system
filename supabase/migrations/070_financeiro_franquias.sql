-- supabase/migrations/070_financeiro_franquias.sql

-- 1. Campos de controle de pagamento matriz em ecu_jobs
ALTER TABLE public.ecu_jobs
  ADD COLUMN IF NOT EXISTS matrix_payment_status TEXT NOT NULL DEFAULT 'em_aberto'
    CHECK (matrix_payment_status IN ('em_aberto', 'pago')),
  ADD COLUMN IF NOT EXISTS matrix_paid_at        TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS matrix_paid_by        UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS matrix_payment_id     UUID;

-- 2. Tabela de eventos de pagamento
CREATE TABLE IF NOT EXISTS public.financeiro_pagamentos (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id       UUID NOT NULL REFERENCES public.franchise_units(id),
  realizado_por UUID NOT NULL REFERENCES auth.users(id),
  realizado_em  TIMESTAMPTZ NOT NULL DEFAULT now(),
  total_valor   NUMERIC(12,2) NOT NULL,
  qtd_arquivos  INTEGER NOT NULL,
  observacao    TEXT,
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- 3. FK de ecu_jobs → financeiro_pagamentos
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_matrix_payment_id'
  ) THEN
    ALTER TABLE public.ecu_jobs
      ADD CONSTRAINT fk_matrix_payment_id
      FOREIGN KEY (matrix_payment_id) REFERENCES public.financeiro_pagamentos(id);
  END IF;
END$$;

-- 4. RLS em financeiro_pagamentos
ALTER TABLE public.financeiro_pagamentos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "matrix_read_pagamentos" ON public.financeiro_pagamentos;
CREATE POLICY "matrix_read_pagamentos"
  ON public.financeiro_pagamentos FOR SELECT
  USING (is_matrix_user());

DROP POLICY IF EXISTS "matrix_insert_pagamentos" ON public.financeiro_pagamentos;
CREATE POLICY "matrix_insert_pagamentos"
  ON public.financeiro_pagamentos FOR INSERT
  WITH CHECK (is_matrix_user());

-- 5. Índice para queries de saldo
CREATE INDEX IF NOT EXISTS idx_ecu_jobs_matrix_payment
  ON public.ecu_jobs(unit_id, matrix_payment_status)
  WHERE matrix_payment_status = 'em_aberto';

-- 6. View de saldo por unidade
CREATE OR REPLACE VIEW public.vw_saldo_franquias AS
SELECT
  fu.id                              AS unit_id,
  fu.name                            AS nome,
  fu.city                            AS cidade,
  fu.state                           AS uf,
  COUNT(j.id)::INTEGER               AS qtd_abertos,
  COALESCE(SUM(j.amount_charged_by_matrix), 0)::NUMERIC(12,2) AS total_em_aberto,
  MIN(j.created_at)                  AS data_mais_antiga
FROM public.franchise_units fu
JOIN public.ecu_jobs j ON j.unit_id = fu.id
WHERE j.matrix_payment_status = 'em_aberto'
  AND j.amount_charged_by_matrix IS NOT NULL
GROUP BY fu.id, fu.name, fu.city, fu.state
HAVING SUM(j.amount_charged_by_matrix) > 0;

GRANT SELECT ON public.vw_saldo_franquias TO authenticated;
GRANT SELECT ON public.financeiro_pagamentos TO authenticated;
