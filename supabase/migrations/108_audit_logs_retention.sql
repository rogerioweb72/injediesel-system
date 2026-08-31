-- 108_audit_logs_retention.sql
-- Retenção do log de auditoria: manter no máximo 20.000 linhas
-- (= 400 páginas de 50 na tela de Auditoria). Ao inserir novos registros, apaga
-- os mais antigos além do teto.
--
-- ⚠️ Muda a política "append-only" do audit_logs: registros além de 20.000 são
-- APAGADOS permanentemente (não há histórico além disso). Decisão do Rogério.
--
-- Trigger AFTER INSERT FOR EACH STATEMENT (roda 1x por insert, não por linha).
-- SECURITY DEFINER para poder apagar mesmo com RLS append-only nas policies.

CREATE OR REPLACE FUNCTION public.trim_audit_logs()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.audit_logs
  WHERE id IN (
    SELECT id FROM public.audit_logs
    ORDER BY created_at DESC
    OFFSET 20000
  );
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_trim_audit_logs ON public.audit_logs;
CREATE TRIGGER trg_trim_audit_logs
AFTER INSERT ON public.audit_logs
FOR EACH STATEMENT
EXECUTE FUNCTION public.trim_audit_logs();

-- Índice para o ORDER BY created_at (do trim e da tela de Auditoria). Idempotente.
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs (created_at DESC);
