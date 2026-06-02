-- 068_add_lgpd_accepted.sql
-- Adiciona campo lgpd_accepted em ecu_jobs para registro de aceite LGPD do cliente
ALTER TABLE public.ecu_jobs
  ADD COLUMN IF NOT EXISTS lgpd_accepted boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.ecu_jobs.lgpd_accepted IS 'Aceite presencial do cliente para coleta e processamento de dados conforme LGPD';
