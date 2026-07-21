-- ============================================================
-- 088_search_ecu_jobs_rpc.sql (21/07/2026)
--
-- DRAFT — pra auditoria do Rogério antes de aplicar via SQL Editor.
--
-- Busca unificada na listagem de Arquivos ECU: hoje o filtro só
-- cobre service_type (useEcuJobs.ts, .ilike('service_type', ...)).
-- Decisão: nome do cliente, CPF (customers.document), placa
-- (vehicle_info->>'placa') e tipo de serviço, num único campo.
--
-- Por que RPC e não .or() no client: PostgREST não permite OR
-- entre coluna de tabela relacionada (customers.name/document) e
-- coluna da tabela base dentro de um único .or() — limitação do
-- embed. Função SQL resolve o join + OR num lugar só.
--
-- SEGURANÇA — decisão central desta function:
--   SECURITY INVOKER (padrão, mas explícito aqui de propósito).
--   A function roda com o papel de quem chama, então as RLS
--   policies de ecu_jobs e customers continuam valendo exatamente
--   como valem hoje na query direta — isolamento de franquia por
--   unit_id não é tocado. NUNCA trocar para SECURITY DEFINER aqui:
--   isso bypassaria RLS e vazaria jobs de outras unidades.
--
-- Retorna 1 linha por job: `data` (jsonb no mesmo formato que o
-- select atual monta — customers/vehicles/franchise_units/
-- creator_profile aninhados, pro front não precisar mudar o
-- parsing) + `total_count` (window function, pra paginação).
--
-- AJUSTES pós-auditoria (Rogério):
--   1. Placa também pode estar em vehicles.plate (não só no jsonb
--      vehicle_info->>'placa' do formulário) — comparar as duas.
--   2. CPF: usuário pode digitar com ou sem pontuação. Além do
--      ILIKE cru em customers.document, quando p_query tiver pelo
--      menos 1 dígito, compara também as duas strings limpas de
--      não-dígito (regexp_replace(...,'\D','','g')). Guard do
--      "tem dígito" existe pra não virar match-tudo quando a busca
--      é só texto (nome) — regexp_replace de string sem dígito dá
--      '', e '%%' bateria em qualquer linha.
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
             ELSE jsonb_build_object('name', pr.name) END
         ) AS data,
    count(*) OVER() AS total_count
  FROM public.ecu_jobs j
  LEFT JOIN public.customers c        ON c.id = j.customer_id
  LEFT JOIN public.vehicles v         ON v.id = j.vehicle_id
  LEFT JOIN public.franchise_units fu ON fu.id = j.unit_id
  LEFT JOIN public.profiles pr        ON pr.id = j.created_by
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
