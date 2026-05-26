-- Categorias personalizadas por unidade franqueada

CREATE TABLE IF NOT EXISTS public.unit_custom_categories (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id    uuid NOT NULL REFERENCES public.franchise_units(id) ON DELETE CASCADE,
  name       text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(unit_id, name)
);

ALTER TABLE public.unit_custom_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "unit members can view own categories"
  ON public.unit_custom_categories FOR SELECT
  USING (
    unit_id IN (
      SELECT unit_id FROM public.user_unit_roles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "unit members can insert categories"
  ON public.unit_custom_categories FOR INSERT
  WITH CHECK (
    unit_id IN (
      SELECT unit_id FROM public.user_unit_roles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "unit members can delete own categories"
  ON public.unit_custom_categories FOR DELETE
  USING (
    unit_id IN (
      SELECT unit_id FROM public.user_unit_roles WHERE user_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_unit_custom_categories_unit
  ON public.unit_custom_categories(unit_id);
