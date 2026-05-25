-- Migration 015: Complete franchise_units schema + ECU financial fields

-- ── franchise_units: adicionar colunas faltantes ──────────────────────────────
-- 'document' renomeado para 'cnpj' para clareza (ou adicionar cnpj e manter document)
-- Adiciona cnpj como alias explícito (document já existe, adicionar cnpj separado)
ALTER TABLE public.franchise_units
  ADD COLUMN IF NOT EXISTS cnpj       text,
  ADD COLUMN IF NOT EXISTS phone      text,
  ADD COLUMN IF NOT EXISTS email      text,
  ADD COLUMN IF NOT EXISTS city       text,
  ADD COLUMN IF NOT EXISTS state      char(2),
  ADD COLUMN IF NOT EXISTS commission_rate numeric(5,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS manager_id uuid REFERENCES public.profiles(id);

-- Índices geográficos para relatórios da matriz
CREATE INDEX IF NOT EXISTS idx_franchise_units_city  ON public.franchise_units(city);
CREATE INDEX IF NOT EXISTS idx_franchise_units_state ON public.franchise_units(state);

-- ── ecu_jobs: campos financeiros simples ──────────────────────────────────────
ALTER TABLE public.ecu_jobs
  ADD COLUMN IF NOT EXISTS amount_charged_to_customer numeric(12,2),
  ADD COLUMN IF NOT EXISTS amount_charged_by_matrix   numeric(12,2);

-- Margem calculada como coluna gerada (Postgres 12+)
-- franchise_margin_amount = valor_cliente - valor_matriz
-- franchise_margin_percentage = margem / valor_cliente * 100
ALTER TABLE public.ecu_jobs
  ADD COLUMN IF NOT EXISTS franchise_margin_amount numeric(12,2)
    GENERATED ALWAYS AS (
      CASE
        WHEN amount_charged_to_customer IS NOT NULL
         AND amount_charged_by_matrix   IS NOT NULL
        THEN amount_charged_to_customer - amount_charged_by_matrix
        ELSE NULL
      END
    ) STORED;

ALTER TABLE public.ecu_jobs
  ADD COLUMN IF NOT EXISTS franchise_margin_percentage numeric(5,2)
    GENERATED ALWAYS AS (
      CASE
        WHEN amount_charged_to_customer > 0
         AND amount_charged_by_matrix IS NOT NULL
        THEN ROUND(
          (amount_charged_to_customer - amount_charged_by_matrix)
          / amount_charged_to_customer * 100,
          2
        )
        ELSE NULL
      END
    ) STORED;

-- Índices para relatórios financeiros
CREATE INDEX IF NOT EXISTS idx_ecu_jobs_unit_created ON public.ecu_jobs(unit_id, created_at);
CREATE INDEX IF NOT EXISTS idx_ecu_jobs_status_unit  ON public.ecu_jobs(status, unit_id);

-- ── seed: atualizar unidades de exemplo com city/state ────────────────────────
UPDATE public.franchise_units
  SET city = 'São Paulo', state = 'SP', cnpj = '00.000.000/0001-01'
  WHERE id = '11111111-0000-0000-0000-000000000001';

UPDATE public.franchise_units
  SET city = 'Rio de Janeiro', state = 'RJ', cnpj = '00.000.000/0002-02'
  WHERE id = '11111111-0000-0000-0000-000000000002';
