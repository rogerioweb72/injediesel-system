-- Expose foto_url in public view so unauthenticated store page can show product photos
CREATE OR REPLACE VIEW public.ecu_catalog_public WITH (security_invoker = false) AS
SELECT
  id, categoria, categoria_slug, marca, secao_original,
  modelo_descricao, ano, ganho, cv_original, cv_tuned,
  kgfm_original, kgfm_tuned, preco_cliente_final, foto_url
FROM public.ecu_catalog
WHERE ativo = true AND ativo_ecommerce = true;

GRANT SELECT ON public.ecu_catalog_public TO anon, authenticated;
