-- 124_franchise_unit_code.sql
-- IDENTIDADE ÚNICA por unidade. Antes a unidade era identificada só por nome —
-- e como o nome duplicou (duas "SAMUEL - SDJ PERFORMANCE"), ficou arriscado saber
-- qual é qual. Agora cada unidade tem um unit_code legível:
--   <3 letras do nome>-<3 letras da cidade>-<sequencial>   ex.: SAM-CAS-01

ALTER TABLE public.franchise_units
  ADD COLUMN IF NOT EXISTS unit_code text;

-- Backfill das unidades existentes (sequencial por prefixo, ordem de criação)
WITH base AS (
  SELECT id,
    upper(left(regexp_replace(coalesce(name, 'X'), '[^A-Za-z]', '', 'g') || 'XXX', 3)) AS np,
    upper(left(regexp_replace(coalesce(city, 'X'), '[^A-Za-z]', '', 'g') || 'XXX', 3)) AS cp,
    row_number() OVER (
      PARTITION BY
        upper(left(regexp_replace(coalesce(name, 'X'), '[^A-Za-z]', '', 'g') || 'XXX', 3)),
        upper(left(regexp_replace(coalesce(city, 'X'), '[^A-Za-z]', '', 'g') || 'XXX', 3))
      ORDER BY created_at, id
    ) AS rn
  FROM public.franchise_units
)
UPDATE public.franchise_units fu
   SET unit_code = b.np || '-' || b.cp || '-' || lpad(b.rn::text, 2, '0')
  FROM base b
 WHERE b.id = fu.id AND fu.unit_code IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_franchise_units_unit_code
  ON public.franchise_units (unit_code) WHERE unit_code IS NOT NULL;

-- Gera automaticamente em novos inserts (se não vier preenchido)
CREATE OR REPLACE FUNCTION public.gen_unit_code()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE np text; cp text; seq int; code text;
BEGIN
  IF NEW.unit_code IS NOT NULL AND btrim(NEW.unit_code) <> '' THEN
    RETURN NEW;
  END IF;
  np := upper(left(regexp_replace(coalesce(NEW.name, 'X'), '[^A-Za-z]', '', 'g') || 'XXX', 3));
  cp := upper(left(regexp_replace(coalesce(NEW.city, 'X'), '[^A-Za-z]', '', 'g') || 'XXX', 3));
  SELECT count(*) + 1 INTO seq FROM public.franchise_units
   WHERE unit_code LIKE np || '-' || cp || '-%';
  code := np || '-' || cp || '-' || lpad(seq::text, 2, '0');
  WHILE EXISTS (SELECT 1 FROM public.franchise_units WHERE unit_code = code) LOOP
    seq := seq + 1;
    code := np || '-' || cp || '-' || lpad(seq::text, 2, '0');
  END LOOP;
  NEW.unit_code := code;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_gen_unit_code ON public.franchise_units;
CREATE TRIGGER trg_gen_unit_code
  BEFORE INSERT ON public.franchise_units
  FOR EACH ROW EXECUTE FUNCTION public.gen_unit_code();

-- A view v_franchise_units (migration 103) usa fu.* — mas o * é expandido na
-- criação e NÃO pega colunas novas. Recria pra incluir unit_code.
-- CREATE OR REPLACE não serve: unit_code entra no fim de fu.*, empurrando
-- manager_name de posição → "cannot change name of view column". DROP + CREATE.
DROP VIEW IF EXISTS public.v_franchise_units;

CREATE VIEW public.v_franchise_units
WITH (security_invoker = on) AS
SELECT
  fu.*,
  p.name AS manager_name
FROM public.franchise_units fu
LEFT JOIN public.profiles p ON p.id = fu.manager_id;

GRANT SELECT ON public.v_franchise_units TO authenticated;
