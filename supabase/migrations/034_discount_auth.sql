ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS max_discount_pct numeric(5,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS discount_auth_hash text;
