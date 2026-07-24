-- ============================================================
-- 097_search_ecu_jobs_unit_filter.sql (24/07/2026)
--
-- DRAFT — pra auditoria do Rogério, ainda não aplicada.
--
-- A.10 item 4: filtro de unidade na listagem de Arquivos ECU
-- (visão matriz). CREATE OR REPLACE de search_ecu_jobs (088, 090)
-- somando 2 parâmetros novos, ambos com DEFAULT — chamada atual do
-- front (useEcuJobs.ts, sem esses 2 args) continua funcionando sem
-- mudança nenhuma.
--
--   p_unit_id     uuid    DEFAULT NULL  — filtra unit_id = p_unit_id
--   p_matrix_only boolean DEFAULT false — filtra unit_id IS NULL
--
-- Por que 2 parâmetros e não 1: são 3 estados (todas / só matriz /
-- unidade X) que não cabem num uuid nullable só — NULL já significa
-- "não filtrar", não dá pra reusar o mesmo NULL pra "só matriz" sem
-- ambiguidade. Um parâmetro sentinela (string mágica tipo '_matrix')
-- misturaria uuid com texto no SQL só pra economizar um argumento —
-- não vale a complexidade. 2 parâmetros tipados, comportamento
-- explícito.
--
-- COMBINA com p_status via AND, não substitui: unit_id e status são
-- predicados independentes no mesmo WHERE — selecionar unidade X +
-- status "concluído" retorna só jobs de X que estão concluídos,
-- nunca um OR nem um dos dois sozinho. Ver o WHERE abaixo: cada
-- filtro é uma cláusula própria encadeada com AND.
-- ============================================================

CREATE OR REPLACE FUNCTION public.search_ecu_jobs(
  p_query       text DEFAULT '',
  p_status      public.file_status DEFAULT NULL,
  p_page        int DEFAULT 0,
  p_page_size   int DEFAULT 20,
  p_unit_id     uuid DEFAULT NULL,
  p_matrix_only boolean DEFAULT false
)
RETURNS TABLE (data jsonb, total_count bigint)
LANGUAGE sql
STABLE
SECURITY INVOKER
AS $$
  SELECT
    to_jsonb(j.*)
      || jsonb_build_object(
           'customers', CASE WHEN c.id IS NULL THEN NULL
             ELSE jsonb_build_object('name', c.name, 'email', c.email) END,
           'vehicles', CASE WHEN v.id IS NULL THEN NULL
             ELSE jsonb_build_object('brand', v.brand, 'model', v.model, 'plate', v.plate) END,
           'franchise_units', CASE WHEN fu.id IS NULL THEN NULL
             ELSE jsonb_build_object('name', fu.name, 'city', fu.city, 'state', fu.state) END,
           'creator_profile', CASE WHEN pr.id IS NULL THEN NULL
             ELSE jsonb_build_object('name', pr.name) END,
           'first_entrega_at', fe.first_entrega_at
         ) AS data,
    count(*) OVER() AS total_count
  FROM public.ecu_jobs j
  LEFT JOIN public.customers c        ON c.id = j.customer_id
  LEFT JOIN public.vehicles v         ON v.id = j.vehicle_id
  LEFT JOIN public.franchise_units fu ON fu.id = j.unit_id
  LEFT JOIN public.profiles pr        ON pr.id = j.created_by
  LEFT JOIN LATERAL (
    SELECT MIN(f.created_at) AS first_entrega_at
    FROM public.ecu_job_files f
    WHERE f.job_id = j.id AND f.file_type = 'entrega'
  ) fe ON true
  WHERE
    (p_status IS NULL OR j.status = p_status)
    AND (p_unit_id IS NULL OR j.unit_id = p_unit_id)
    AND (NOT p_matrix_only OR j.unit_id IS NULL)
    AND (
      p_query = '' OR
      j.service_type ILIKE '%' || p_query || '%' OR
      (j.vehicle_info ->> 'placa') ILIKE '%' || p_query || '%' OR
      v.plate ILIKE '%' || p_query || '%' OR
      c.name ILIKE '%' || p_query || '%' OR
      c.document ILIKE '%' || p_query || '%' OR
      (
        p_query ~ '\d'
        AND regexp_replace(c.document, '\D', '', 'g') ILIKE '%' || regexp_replace(p_query, '\D', '', 'g') || '%'
      )
    )
  ORDER BY j.created_at DESC
  OFFSET p_page * p_page_size
  LIMIT p_page_size;
$$;

GRANT EXECUTE ON FUNCTION public.search_ecu_jobs(text, public.file_status, int, int, uuid, boolean) TO authenticated;
