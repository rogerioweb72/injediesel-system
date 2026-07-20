-- ============================================================
-- 086_ecu_jobs_transmissao_check.sql (20/07/2026)
--
-- REGISTRO — constraint já aplicada manualmente por Rogério via
-- SQL Editor (base zerada antes da aplicação, sem risco a dados
-- existentes). Este arquivo documenta o estado atual do banco,
-- não precisa ser executado novamente.
--
-- ecu_jobs.vehicle_info é jsonb free-form (migration 017). Campo
-- vehicle_info->>'transmissao' agora restrito a 'Automático' ou
-- 'Manual' (strings exatas, com acento — front em EcuJobForm.tsx
-- usa VEHICLE_TRANSMISSIONS = ['Automático', 'Manual']).
--
-- Aplicada manualmente via SQL Editor em 20/07/2026. NULL passa no
-- CHECK (comportamento padrão Postgres); obrigatoriedade garantida
-- no front via zod.
-- ============================================================

ALTER TABLE ecu_jobs
  ADD CONSTRAINT ecu_jobs_transmissao_check
  CHECK (vehicle_info->>'transmissao' IN ('Automático', 'Manual'));
