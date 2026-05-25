-- ============================================================
-- Migration 036: Auto-calculate franchise margin on ecu_jobs
-- Fires BEFORE INSERT OR UPDATE when financial amounts change.
-- ============================================================

CREATE OR REPLACE FUNCTION public.fn_calc_franchise_margin()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.amount_charged_by_matrix IS NOT NULL
     AND NEW.amount_charged_to_customer IS NOT NULL
     AND NEW.amount_charged_to_customer > 0
  THEN
    NEW.franchise_margin_amount :=
      NEW.amount_charged_to_customer - NEW.amount_charged_by_matrix;
    NEW.franchise_margin_percentage :=
      ROUND(
        ((NEW.amount_charged_to_customer - NEW.amount_charged_by_matrix)
          / NEW.amount_charged_to_customer * 100)::numeric,
        2
      );
  ELSE
    NEW.franchise_margin_amount    := NULL;
    NEW.franchise_margin_percentage := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_calc_franchise_margin ON public.ecu_jobs;

CREATE TRIGGER trg_calc_franchise_margin
  BEFORE INSERT OR UPDATE OF amount_charged_by_matrix, amount_charged_to_customer
  ON public.ecu_jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_calc_franchise_margin();

-- Backfill existing rows where both amounts are already set
UPDATE public.ecu_jobs
SET amount_charged_by_matrix = amount_charged_by_matrix
WHERE amount_charged_by_matrix IS NOT NULL
  AND amount_charged_to_customer IS NOT NULL
  AND amount_charged_to_customer > 0;
