-- ============================================================
-- 099_sync_ecu_job_payment_status_aggregate.sql (27/07/2026)
--
-- DRAFT — pra auditoria do Rogério, ainda não aplicada.
--
-- FIN.5: job created_by_matrix (matriz cria job pra unidade,
-- cobra cliente final direto + franquia paga repasse técnico)
-- vai passar a gerar 2 financial_entries por job (commit 2/3
-- desta série, ainda não codados): uma unit_id=null pro cliente
-- final, outra unit_id=<franquia> pro repasse. Sem este fix, a
-- primeira das duas a ser paga já fecha o job inteiro — a outra
-- fica pendente pra sempre no Caixa mas o job mostra "pago".
--
-- PADRÃO DO BUG (mesma classe do FIN.3/migration 098): trigger
-- fn_sync_ecu_job_payment_status (migration 093) foi escrito
-- assumindo N=1 financial_entries por ecu_job — óbvio na época,
-- só existia esse fluxo. Fluxo créate_by_matrix passa a permitir
-- N=2 sem que o trigger tenha sido revisitado.
--
-- CORREÇÃO: antes de marcar matrix_payment_status='pago', checa
-- se ainda existe alguma financial_entries do mesmo ecu_job_id
-- com status != 'pago'. Se sim, não fecha o job — só a entry
-- individual muda de status (comportamento normal do fluxo do
-- Caixa). Aggregate check roda dentro da mesma transação da
-- UPDATE que disparou o trigger, então a própria NEW já está
-- persistida e contada na query.
--
-- Comportamento por contagem de entries:
--   1 entry  (todo fluxo hoje)        → idêntico ao trigger atual
--   2 entries (created_by_matrix novo) → só fecha quando as duas
--                                        estiverem 'pago'
--
-- CANDIDATO DE CHERRY-PICK: sim, se Promax Tuner ou EvoPro tiverem
-- fluxo equivalente de job matriz→cliente-final direto com repasse
-- de franquia (ver useSendToFinance / EcuJobDetail nesses clones).
-- Buscar o mesmo padrão: trigger/function de sync escrita pra N=1
-- que precise virar aggregate quando o domínio passar a permitir
-- múltiplas entries por job.
--
-- SQL DE VERIFICAÇÃO (rodar após aplicar, nos clones e aqui):
--   -- lista triggers/functions que assumem 1:1 job→entry sem
--   -- aggregate check — candidatos a mesmo bug:
--   SELECT p.proname, pg_get_functiondef(p.oid)
--   FROM pg_proc p
--   WHERE pg_get_functiondef(p.oid) ILIKE '%ecu_job_id%'
--     AND pg_get_functiondef(p.oid) NOT ILIKE '%count%'
--     AND pg_get_functiondef(p.oid) NOT ILIKE '%exists%';
--
--   -- confirma que job com 2 entries só fecha quando as duas
--   -- pagarem (rodar manualmente após commit 2/3 em staging):
--   SELECT ej.id, ej.matrix_payment_status, fe.unit_id, fe.status
--   FROM ecu_jobs ej JOIN financial_entries fe ON fe.ecu_job_id = ej.id
--   WHERE ej.created_by_matrix = true
--   ORDER BY ej.id;
-- ============================================================

CREATE OR REPLACE FUNCTION public.fn_sync_ecu_job_payment_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'pago'
     AND (OLD.status IS DISTINCT FROM 'pago')
     AND NEW.ecu_job_id IS NOT NULL
     AND NOT EXISTS (
       SELECT 1 FROM public.financial_entries
       WHERE ecu_job_id = NEW.ecu_job_id
         AND status <> 'pago'
     )
  THEN
    UPDATE public.ecu_jobs
    SET matrix_payment_status = 'pago',
        matrix_paid_at = now()
    WHERE id = NEW.ecu_job_id;
  END IF;
  RETURN NEW;
END;
$$;
