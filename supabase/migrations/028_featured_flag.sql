-- Add featured flag to ecu_catalog and products
ALTER TABLE public.ecu_catalog
  ADD COLUMN featured boolean NOT NULL DEFAULT false;

ALTER TABLE public.products
  ADD COLUMN featured boolean NOT NULL DEFAULT false;

-- Recreate ecu_catalog_public to expose featured
CREATE OR REPLACE VIEW public.ecu_catalog_public
WITH (security_invoker = false) AS
SELECT
  id, categoria, categoria_slug, marca, secao_original,
  modelo_descricao, ano, ganho, cv_original, cv_tuned,
  kgfm_original, kgfm_tuned, preco_cliente_final, foto_url,
  featured
FROM public.ecu_catalog
WHERE ativo = true AND ativo_ecommerce = true;

GRANT SELECT ON public.ecu_catalog_public TO anon, authenticated;
