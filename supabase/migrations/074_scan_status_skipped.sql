-- ============================================================
-- 074_scan_status_skipped.sql
-- Adiciona valor 'skipped' ao enum scan_status: representa um arquivo
-- liberado para download SEM análise antivírus real (VIRUSTOTAL_API_KEY
-- ausente — modo de teste). Nunca deve ser confundido com 'clean'
-- (analisado e aprovado pelo VirusTotal).
--
-- Operação puramente aditiva: não reescreve linhas existentes, não afeta
-- nenhum arquivo já classificado como pending/clean/infected/blocked.
-- ============================================================

ALTER TYPE public.scan_status ADD VALUE IF NOT EXISTS 'skipped';
