-- 125_franchise_margin_pct_widen.sql
-- BUG (trava de preço): a matriz não conseguia definir "cobrado pela matriz"
-- quando o franqueado tinha posto um "cobrado do cliente" pequeno (ex.: R$ 2).
--
-- Causa: o trigger fn_calc_franchise_margin (036) grava
--   franchise_margin_percentage = (customer - matrix) / customer * 100
-- Com customer=2 e matrix=1000 → -49900% → estoura numeric(5,2) (máx ±999,99)
-- → o UPDATE de amount_charged_by_matrix falha (numeric field overflow) → trava.
-- Com customer NULL o trigger cai no ELSE (margem NULL) — por isso "zerado" passava.
--
-- Fix: a matriz SEMPRE pode definir o valor dela, mesmo que a margem fique muito
-- negativa (dashboard do franqueado pode acusar negativo — comportamento aceito).
-- Alarga a coluna pra numeric(12,2) — a % de margem deixa de ter teto artificial.

ALTER TABLE public.ecu_jobs
  ALTER COLUMN franchise_margin_percentage TYPE numeric(12,2);
