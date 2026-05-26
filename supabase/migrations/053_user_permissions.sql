-- 053_user_permissions.sql
-- Adds commission_rate and custom permissions to profiles

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS commission_rate DECIMAL(5,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT NULL;

COMMENT ON COLUMN public.profiles.commission_rate IS 'Sales commission percentage (0-100). Only relevant for seller roles.';
COMMENT ON COLUMN public.profiles.permissions IS 'Custom permission overrides. NULL means use role defaults.';
