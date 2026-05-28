-- Migration 065: HR fields for collaborator profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS cpf       text,
  ADD COLUMN IF NOT EXISTS hire_date date,
  ADD COLUMN IF NOT EXISTS salary    numeric(10,2);
