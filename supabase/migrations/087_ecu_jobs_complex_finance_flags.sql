-- ============================================================
-- 087_ecu_jobs_complex_finance_flags.sql (21/07/2026)
--
-- REGISTRO — colunas já aplicadas manualmente por Rogério via
-- SQL Editor. Este arquivo documenta o estado atual do banco,
-- não precisa ser executado novamente.
--
-- Grupo B item 6 (antecipado): duas flags booleanas em ecu_jobs
-- pro card "Próximas Ações" (seção TAGS):
--   is_complex_file → badge "Arquivo Complexo" no job
--   contact_finance → bloco vermelho de alerta no job
-- ============================================================

ALTER TABLE ecu_jobs
  ADD COLUMN is_complex_file boolean NOT NULL DEFAULT false,
  ADD COLUMN contact_finance boolean NOT NULL DEFAULT false;
