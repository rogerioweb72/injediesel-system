-- ============================================================
-- 090_search_ecu_jobs_first_entrega.sql (21/07/2026)
--
-- DRAFT — pra auditoria do Rogério antes de aplicar via SQL Editor.
--
-- CREATE OR REPLACE de search_ecu_jobs (migration 088) somando
-- `first_entrega_at`: timestamp do primeiro ecu_job_files com
-- file_type='entrega' do job. Alimenta o semáforo de tempo da
-- listagem (EcuJobsPage — coluna Tempo): o relógio congela na
-- entrega do primeiro arquivo modificado, não em updated_at
-- genérico (que muda a cada troca de status, sem relação com
-- "quanto tempo levou pra entregar").
--
-- LATERAL em vez de subquery correlacionada solta no
-- jsonb_build_object — mesma coisa na prática pra essa escala
-- (paginado, ~20 linhas), mais legível.
-- ============================================================

CREATE OR REPLACE FUNCTION public.search_ecu_jobs(
  p_query     text DEFAULT '',
  p_status    public.file_status DEFAULT NULL,
  p_page      int DEFAULT 0,
  p_page_size int DEFAULT 20
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

GRANT EXECUTE ON FUNCTION public.search_ecu_jobs(text, public.file_status, int, int) TO authenticated;
