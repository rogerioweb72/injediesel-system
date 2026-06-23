-- Migration 029: Franchise unit fiscal data, geo territory, and contract dates

ALTER TABLE public.franchise_units
  ADD COLUMN IF NOT EXISTS razao_social        text,
  ADD COLUMN IF NOT EXISTS inscricao_estadual  text,
  ADD COLUMN IF NOT EXISTS cidade_fiscal       text,
  ADD COLUMN IF NOT EXISTS raio_atendimento_km numeric(6,2),
  ADD COLUMN IF NOT EXISTS cidades_atendidas   text[],
  ADD COLUMN IF NOT EXISTS contract_start_date date,
  ADD COLUMN IF NOT EXISTS contract_end_date   date;

-- Index for contract expiry queries (alerts, reports)
CREATE INDEX IF NOT EXISTS idx_franchise_units_contract_end
  ON public.franchise_units(contract_end_date)
  WHERE contract_end_date IS NOT NULL AND active = true;

COMMENT ON COLUMN public.franchise_units.razao_social        IS 'Razão social da pessoa jurídica titular da franquia';
COMMENT ON COLUMN public.franchise_units.inscricao_estadual  IS 'Inscrição estadual para emissão de NF';
COMMENT ON COLUMN public.franchise_units.cidade_fiscal       IS 'Município do domicílio fiscal (pode diferir de city)';
COMMENT ON COLUMN public.franchise_units.raio_atendimento_km IS 'Raio geográfico exclusivo de atendimento em quilômetros';
COMMENT ON COLUMN public.franchise_units.cidades_atendidas   IS 'Lista de municípios no perímetro exclusivo desta unidade';
COMMENT ON COLUMN public.franchise_units.contract_start_date IS 'Data de início de vigência do contrato';
COMMENT ON COLUMN public.franchise_units.contract_end_date   IS 'Data de término de vigência do contrato';
