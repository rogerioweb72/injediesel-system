-- supabase/migrations/055_ecu_seller_commission.sql

-- 1. seller_id em ecu_jobs
ALTER TABLE public.ecu_jobs
  ADD COLUMN IF NOT EXISTS seller_id UUID REFERENCES public.profiles(id);

-- 2. Campos de controle de pagamento em financial_entries
ALTER TABLE public.financial_entries
  ADD COLUMN IF NOT EXISTS ecu_job_id UUID REFERENCES public.ecu_jobs(id),
  ADD COLUMN IF NOT EXISTS status VARCHAR NOT NULL DEFAULT 'pago',
  ADD COLUMN IF NOT EXISTS discount_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS payment_method VARCHAR;

-- Entradas legacy recebem status='pago' (DEFAULT já faz isso em runtime,
-- mas garantir para rows existentes:)
UPDATE public.financial_entries SET status = 'pago' WHERE status IS NULL;

-- 3. Tabela commission_entries
CREATE TABLE IF NOT EXISTS public.commission_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ecu_job_id UUID NOT NULL REFERENCES public.ecu_jobs(id),
  seller_id UUID NOT NULL REFERENCES public.profiles(id),
  gross_amount DECIMAL(10,2) NOT NULL,
  discount_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  commission_rate DECIMAL(5,2) NOT NULL,
  commission_amount DECIMAL(10,2) NOT NULL,
  paid_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS para commission_entries (mesmo padrão das outras tabelas do projeto)
ALTER TABLE public.commission_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated can read own commissions"
  ON public.commission_entries FOR SELECT
  TO authenticated
  USING (seller_id = auth.uid());
CREATE POLICY "service role full access on commission_entries"
  ON public.commission_entries FOR ALL
  TO service_role
  USING (true);

-- 4. max_discount_pct em franchise_units
ALTER TABLE public.franchise_units
  ADD COLUMN IF NOT EXISTS max_discount_pct DECIMAL(5,2) NOT NULL DEFAULT 10;
