-- 118_franchise_search_digits.sql
-- Busca de Franqueados por CNPJ/CPF SEM depender da pontuação. O valor é salvo
-- formatado (ex.: 39.290.726/0001-41); digitar só números não casava no ilike.
-- Colunas geradas com apenas dígitos + a view reexposta para incluí-las.

ALTER TABLE public.franchise_units
  ADD COLUMN IF NOT EXISTS cnpj_digits text
    GENERATED ALWAYS AS (regexp_replace(COALESCE(cnpj, ''), '\D', '', 'g')) STORED,
  ADD COLUMN IF NOT EXISTS cpf_digits text
    GENERATED ALWAYS AS (regexp_replace(COALESCE(cpf, ''), '\D', '', 'g')) STORED;

-- A view usa fu.* — precisa ser recriada para expor as colunas novas. DROP+CREATE
-- (o CREATE OR REPLACE não permite reordenar/incluir coluna no meio).
DROP VIEW IF EXISTS public.v_franchise_units;
CREATE VIEW public.v_franchise_units WITH (security_invoker = on) AS
  SELECT fu.*, p.name AS manager_name
  FROM public.franchise_units fu
  LEFT JOIN public.profiles p ON p.id = fu.manager_id;
GRANT SELECT ON public.v_franchise_units TO authenticated;

NOTIFY pgrst, 'reload schema';
