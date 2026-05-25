ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS code text,
  ADD COLUMN IF NOT EXISTS cost_price numeric(12,2);
