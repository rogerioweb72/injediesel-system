-- ============================================================
-- 096_backfill_orphan_vehicles.sql (24/07/2026)
--
-- DRAFT — pra auditoria do Rogério, ainda não aplicada.
--
-- A.9 item 5: bug crítico veículo↔cliente. EcuJobForm nunca inseriu
-- em `vehicles` quando o atendente digitava veículo manualmente (sem
-- selecionar da lista "Veículo cadastrado") — dado ficava só em
-- ecu_jobs.vehicle_info (jsonb), vehicle_id nulo pra sempre.
-- /clientes/:id consulta `vehicles WHERE customer_id` corretamente
-- (CustomerDetail.tsx:23) — a query nunca teve bug, a linha é que
-- nunca existiu. Fix de código em EcuJobForm.tsx (item 5a, PR
-- separado) resolve daqui pra frente; esta migration resolve o
-- histórico acumulado.
--
-- ESCOPO: todo ecu_jobs com vehicle_id IS NULL e vehicle_info
-- preenchido (tem pelo menos 'categoria') gera 1 linha nova em
-- vehicles + aponta o(s) job(s) órfão(s) pra ela.
--
-- MAPEAMENTO vehicle_info → vehicles:
--   categoria → vehicle_type (Agrícola→maquina_agricola,
--     Máquina Pesada→maquina_pesada, Náutica→nautica, qualquer
--     outra categoria → automotivo, default do schema)
--   placa  → plate
--   marca  → brand
--   modelo → model
--   motor  → engine
--   ano    → year (texto livre tipo "2022/2023" no form, mas
--     vehicles.year é integer — extrai os primeiros 4 dígitos via
--     regex; se não achar nenhum, fica NULL). CONFERIR amostra do
--     bloco de preview antes de aplicar — texto livre pode ter
--     formato inesperado que essa regex não cobre.
--   transmissao + horas_km → concatenados em notes (sem coluna
--     própria em vehicles) — decisão Rogério, checkpoint 24/07/2026.
--
-- DEDUPE — por que DO block em vez de INSERT...SELECT direto:
--   Quando 2+ jobs do MESMO cliente têm a MESMA placa digitada
--   manualmente (atendeu o mesmo carro 2x sem nunca selecionar da
--   lista), quero UMA linha só em vehicles, com todos os jobs
--   órfãos daquele (customer_id, placa) apontando pra ela — placa é
--   chave de dedupe confiável.
--   Quando NÃO há placa (categorias sem placa: agrícola/pesada/
--   náutica), NÃO existe chave confiável — um DISTINCT ON ingênuo
--   por customer_id colapsaria veículos DIFERENTES do mesmo cliente
--   numa linha só (ex.: trator + barco do mesmo cliente virariam 1
--   registro, perdendo dado). Por isso cada job sem placa vira sua
--   própria linha em vehicles (1:1), aceitando duplicidade só no
--   caso raro de ser genuinamente o mesmo equipamento atendido 2x
--   manualmente — troca segura: duplicar é reversível (merge manual
--   depois), mesclar errado apagaria dado sem aviso.
--
-- RECOMENDAÇÃO: rodar o bloco 1 (SELECT, não altera nada) primeiro,
-- revisar a amostra — sobretudo a coluna `ano_extraido` — e só
-- depois rodar o bloco 2.
-- ============================================================

-- ── Bloco 1: conferência (SELECT, não altera nada) ──────────────
SELECT
  j.id AS job_id,
  j.customer_id,
  j.vehicle_info->>'categoria' AS categoria,
  j.vehicle_info->>'placa'     AS placa,
  j.vehicle_info->>'marca'     AS marca,
  j.vehicle_info->>'modelo'    AS modelo,
  j.vehicle_info->>'ano'       AS ano_original,
  NULLIF(substring(j.vehicle_info->>'ano' FROM '\d{4}'), '')::int AS ano_extraido
FROM public.ecu_jobs j
WHERE j.vehicle_id IS NULL
  AND j.vehicle_info IS NOT NULL
  AND j.vehicle_info ? 'categoria'
ORDER BY j.customer_id, j.created_at;

-- ── Bloco 2: aplicação (rodar só depois de revisar o bloco 1) ───
DO $$
DECLARE
  rec RECORD;
  new_vehicle_id uuid;
BEGIN
  FOR rec IN
    SELECT DISTINCT ON (
      j.customer_id,
      COALESCE(NULLIF(trim(j.vehicle_info->>'placa'), ''), 'job:' || j.id::text)
    )
      j.id AS job_id,
      j.customer_id,
      j.vehicle_info
    FROM public.ecu_jobs j
    WHERE j.vehicle_id IS NULL
      AND j.vehicle_info IS NOT NULL
      AND j.vehicle_info ? 'categoria'
    ORDER BY
      j.customer_id,
      COALESCE(NULLIF(trim(j.vehicle_info->>'placa'), ''), 'job:' || j.id::text),
      j.created_at ASC
  LOOP
    INSERT INTO public.vehicles (customer_id, vehicle_type, plate, brand, model, year, engine, notes)
    VALUES (
      rec.customer_id,
      CASE rec.vehicle_info->>'categoria'
        WHEN 'Agrícola'       THEN 'maquina_agricola'
        WHEN 'Máquina Pesada' THEN 'maquina_pesada'
        WHEN 'Náutica'        THEN 'nautica'
        ELSE 'automotivo'
      END::public.vehicle_type,
      NULLIF(trim(rec.vehicle_info->>'placa'), ''),
      NULLIF(trim(rec.vehicle_info->>'marca'), ''),
      NULLIF(trim(rec.vehicle_info->>'modelo'), ''),
      NULLIF(substring(rec.vehicle_info->>'ano' FROM '\d{4}'), '')::int,
      NULLIF(trim(rec.vehicle_info->>'motor'), ''),
      NULLIF(trim(concat_ws(' · ',
        CASE WHEN NULLIF(trim(rec.vehicle_info->>'transmissao'), '') IS NOT NULL
             THEN 'Transmissão: ' || (rec.vehicle_info->>'transmissao') END,
        CASE WHEN NULLIF(trim(rec.vehicle_info->>'horas_km'), '') IS NOT NULL
             THEN 'Horas/Km: ' || (rec.vehicle_info->>'horas_km') END
      )), '')
    )
    RETURNING id INTO new_vehicle_id;

    -- Job representante do grupo (o que gerou a linha).
    UPDATE public.ecu_jobs SET vehicle_id = new_vehicle_id WHERE id = rec.job_id;

    -- Demais jobs do mesmo (customer_id, placa) — só quando há placa
    -- real, única chave de dedupe confiável — apontam pro mesmo vehicle.
    IF NULLIF(trim(rec.vehicle_info->>'placa'), '') IS NOT NULL THEN
      UPDATE public.ecu_jobs j2
      SET vehicle_id = new_vehicle_id
      WHERE j2.vehicle_id IS NULL
        AND j2.customer_id = rec.customer_id
        AND NULLIF(trim(j2.vehicle_info->>'placa'), '') = NULLIF(trim(rec.vehicle_info->>'placa'), '');
    END IF;
  END LOOP;
END $$;
