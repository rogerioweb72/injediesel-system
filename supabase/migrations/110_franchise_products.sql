-- 110_franchise_products.sql
-- Fase 3: "produto franquia" no catálogo — valor base + regra de comissão do
-- vendedor, por tipo de contrato (Full / Linha Leve). O NovoContratoPage puxa o
-- valor default daqui; a comissão do seller (Fase 5) é calculada por esta regra.
-- Editável por admin da matriz; leitura pela matriz.

CREATE TABLE IF NOT EXISTS public.franchise_products (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_type    text NOT NULL UNIQUE CHECK (contract_type IN ('full','linha_leve')),
  name             text NOT NULL,
  default_fee      numeric(12,2) NOT NULL DEFAULT 0,
  commission_type  text NOT NULL DEFAULT 'percent' CHECK (commission_type IN ('percent','fixed')),
  commission_value numeric(12,2) NOT NULL DEFAULT 0,   -- % (0-100) se percent, R$ se fixed
  active           boolean NOT NULL DEFAULT true,
  updated_at       timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.franchise_products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "franchise_products_read" ON public.franchise_products;
CREATE POLICY "franchise_products_read" ON public.franchise_products
  FOR SELECT USING (public.is_matrix_user());

DROP POLICY IF EXISTS "franchise_products_admin_write" ON public.franchise_products;
CREATE POLICY "franchise_products_admin_write" ON public.franchise_products
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
              AND p.role IN ('company_admin','operations_admin','system_ti')
              AND p.active)
  );

INSERT INTO public.franchise_products (contract_type, name, default_fee, commission_type, commission_value)
VALUES
  ('full',       'Franquia Full',       0, 'percent', 0),
  ('linha_leve', 'Franquia Linha Leve', 0, 'percent', 0)
ON CONFLICT (contract_type) DO NOTHING;

GRANT SELECT, INSERT, UPDATE ON public.franchise_products TO authenticated;

NOTIFY pgrst, 'reload schema';
