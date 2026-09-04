-- 121_vw_saldo_franquias_no_overflow.sql
-- BLINDAGEM contra "numeric field overflow" na leitura do saldo por unidade.
--
-- A view vw_saldo_franquias (migration 070) fazia:
--   COALESCE(SUM(j.amount_charged_by_matrix), 0)::NUMERIC(12,2)
-- O cast para numeric(12,2) (máx 9.999.999.999,99) estoura se a SOMA de uma
-- unidade passar do teto — e aí a view INTEIRA falha, derrubando TODA página
-- financeiro que a lê. Trocamos por ::NUMERIC (sem precisão) para a leitura
-- nunca mais estourar. O teto de valor individual agora é garantido no client
-- (MAX_MONEY) + o banco continua com numeric(12,2) nas colunas de origem.
--
-- CREATE OR REPLACE VIEW não deixa trocar o tipo da coluna (numeric(12,2) ->
-- numeric), então dropa e recria. Sem dependências externas na view.

DROP VIEW IF EXISTS public.vw_saldo_franquias;

CREATE VIEW public.vw_saldo_franquias AS
SELECT
  fu.id                              AS unit_id,
  fu.name                            AS nome,
  fu.city                            AS cidade,
  fu.state                           AS uf,
  COUNT(j.id)::INTEGER               AS qtd_abertos,
  COALESCE(SUM(j.amount_charged_by_matrix), 0)::NUMERIC AS total_em_aberto,
  MIN(j.created_at)                  AS data_mais_antiga
FROM public.franchise_units fu
JOIN public.ecu_jobs j ON j.unit_id = fu.id
WHERE j.matrix_payment_status = 'em_aberto'
  AND j.amount_charged_by_matrix IS NOT NULL
GROUP BY fu.id, fu.name, fu.city, fu.state
HAVING SUM(j.amount_charged_by_matrix) > 0;

GRANT SELECT ON public.vw_saldo_franquias TO authenticated;
