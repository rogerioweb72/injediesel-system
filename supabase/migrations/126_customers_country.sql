-- 126_customers_country.sql
-- Suporte a cliente do PARAGUAI. A franquia do PY não consegue cadastrar cliente
-- porque o sistema exige CPF e celular no padrão BR. Adiciona o país do cliente
-- (BR padrão) para o cadastro relaxar documento/telefone quando for PY.
-- Prioridade atual: só BR e PY (não um "estrangeiro" genérico).

ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS country text NOT NULL DEFAULT 'BR';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'customers_country_chk'
  ) THEN
    ALTER TABLE public.customers
      ADD CONSTRAINT customers_country_chk CHECK (country IN ('BR', 'PY'));
  END IF;
END $$;
