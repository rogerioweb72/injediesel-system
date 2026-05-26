-- ============================================================
-- 064_ecu_file_security_hardening.sql
-- Adiciona sha256_hex para integridade pós-scan e um status
-- de bloqueio para arquivos rejeitados por regra (não malware).
-- ============================================================

-- sha256 gravado pelo scan-ecu-file; verificado no download
ALTER TABLE public.ecu_job_files
  ADD COLUMN IF NOT EXISTS sha256_hex TEXT;

-- Índice para deduplicação rápida por hash
CREATE INDEX IF NOT EXISTS idx_ecu_job_files_sha256
  ON public.ecu_job_files(sha256_hex)
  WHERE sha256_hex IS NOT NULL;

-- Status extra: 'blocked' para arquivos rejeitados por política
-- (extensão proibida, magic bytes perigosos, tamanho, rate-limit)
-- Separado de 'infected' para não confundir operador.
ALTER TYPE public.scan_status ADD VALUE IF NOT EXISTS 'blocked';
