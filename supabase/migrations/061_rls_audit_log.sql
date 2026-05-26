-- ============================================================
-- 061_rls_audit_log.sql
-- Tabela de auditoria de eventos de segurança.
-- Captura: RLS violations detectadas na camada app,
-- revogações de unit_role, e mudanças de role.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.audit_events (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at  timestamptz NOT NULL DEFAULT now(),
  actor_id    uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  action      text        NOT NULL,
  payload     jsonb       NOT NULL DEFAULT '{}'
);

-- Apenas matrix/system vêem todos os eventos; usuário vê os próprios
ALTER TABLE public.audit_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "audit_self_read" ON public.audit_events
  FOR SELECT USING (actor_id = auth.uid());

CREATE POLICY "audit_matrix_read" ON public.audit_events
  FOR SELECT USING (public.is_matrix_user());

-- Qualquer usuário autenticado pode inserir (app loga erros 403/42501)
CREATE POLICY "audit_insert" ON public.audit_events
  FOR INSERT WITH CHECK (actor_id = auth.uid());

-- Índice para queries de anomalia por janela de tempo
CREATE INDEX idx_audit_events_action_time ON public.audit_events(action, created_at DESC);

-- ============================================================
-- Trigger: loga revogação de unit_role para detectar
-- o janela de 1h do JWT staleness
-- ============================================================

CREATE OR REPLACE FUNCTION public.fn_log_unit_revocation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.audit_events (actor_id, action, payload)
  VALUES (
    auth.uid(),
    'unit_role_revoked',
    jsonb_build_object(
      'affected_user_id', OLD.user_id,
      'unit_id',          OLD.unit_id,
      'revoked_at',       now(),
      'jwt_stale_until',  now() + interval '1 hour'
    )
  );
  RETURN OLD;
END;
$$;

CREATE TRIGGER trg_log_unit_revocation
  AFTER DELETE ON public.user_unit_roles
  FOR EACH ROW EXECUTE FUNCTION public.fn_log_unit_revocation();

-- ============================================================
-- View: anomalias — picos de 403 por usuário nos últimos 15min
-- Consulte via: SELECT * FROM public.v_security_anomalies;
-- ============================================================

CREATE OR REPLACE VIEW public.v_security_anomalies AS
SELECT
  actor_id,
  action,
  COUNT(*)                              AS event_count,
  MIN(created_at)                       AS first_seen,
  MAX(created_at)                       AS last_seen,
  jsonb_agg(payload ORDER BY created_at DESC) FILTER (WHERE true) AS recent_payloads
FROM public.audit_events
WHERE created_at > now() - interval '15 minutes'
  AND action IN ('rls_violation', 'forbidden_role', 'cross_tenant_attempt')
GROUP BY actor_id, action
HAVING COUNT(*) >= 5
ORDER BY event_count DESC;

GRANT SELECT ON public.v_security_anomalies TO authenticated;
