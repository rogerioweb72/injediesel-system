-- PDV configurable settings in company_settings
ALTER TABLE public.company_settings
  ADD COLUMN IF NOT EXISTS pdv_settings jsonb NOT NULL DEFAULT '{}';

-- Track installments per PDV sale
ALTER TABLE public.pos_sales
  ADD COLUMN IF NOT EXISTS installments smallint NOT NULL DEFAULT 1;
