-- Colunas adicionais para lançamentos manuais no caixa

ALTER TABLE public.financial_entries
  ADD COLUMN IF NOT EXISTS categoria       VARCHAR,
  ADD COLUMN IF NOT EXISTS subcategoria    VARCHAR,
  ADD COLUMN IF NOT EXISTS data_competencia DATE,
  ADD COLUMN IF NOT EXISTS centro_de_custo VARCHAR,
  ADD COLUMN IF NOT EXISTS recorrente      BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS recorrencia     JSONB,
  ADD COLUMN IF NOT EXISTS parent_id       UUID REFERENCES public.financial_entries(id);

CREATE INDEX IF NOT EXISTS idx_financial_entries_unit_manual
  ON public.financial_entries(unit_id, status)
  WHERE ecu_job_id IS NULL;
