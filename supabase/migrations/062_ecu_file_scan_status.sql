-- ============================================================
-- 062_ecu_file_scan_status.sql
-- Adiciona quarentena antivírus para arquivos ECU.
--
-- FLUXO:
--   1. Upload → scan_status = 'pending'
--   2. Webhook dispara scan-ecu-file → VT hash check
--   3a. Hash conhecido → atualiza para 'clean' ou 'infected'
--   3b. Hash novo → submete para análise, salva analysis_id
--   4. Cron poll-ecu-scans → verifica pending por analysis_id
--   5. Infected → deleta do R2 + alerta em audit_events
-- ============================================================

CREATE TYPE public.scan_status AS ENUM ('pending', 'clean', 'infected');

ALTER TABLE public.ecu_job_files
  ADD COLUMN scan_status       public.scan_status NOT NULL DEFAULT 'pending',
  ADD COLUMN scan_checked_at   timestamptz,
  ADD COLUMN scan_analysis_id  text;

-- Índice parcial: apenas pending é relevante para o cron
CREATE INDEX idx_ecu_job_files_scan_pending
  ON public.ecu_job_files(created_at)
  WHERE scan_status = 'pending';

-- Arquivos pré-existentes: marcar como clean (não há baseline de segurança para retroativo)
UPDATE public.ecu_job_files
  SET scan_status = 'clean', scan_checked_at = now()
  WHERE scan_status = 'pending';
