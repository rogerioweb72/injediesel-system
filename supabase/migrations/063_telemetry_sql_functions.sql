-- ============================================================
-- 063_telemetry_sql_functions.sql
-- Funções SECURITY DEFINER para o painel admin-telemetry.
-- Apenas chamadas via Edge Function com service role.
-- NÃO conceder EXECUTE a anon/authenticated (service role bypassa).
-- ============================================================

-- ── 1. Segurança: falhas de login + violações RLS + malware ──────────────────

CREATE OR REPLACE FUNCTION public.fn_get_security_summary()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  login_failures_24h   bigint;
  rls_violations_24h   bigint;
  malware_blocked_24h  bigint;
  critical_events      jsonb;
BEGIN
  -- Failed logins via Supabase Auth audit log
  -- payload->>'log_type' = 'account' + presence of error key = failed attempt
  SELECT COUNT(*) INTO login_failures_24h
  FROM auth.audit_log_entries
  WHERE created_at > now() - interval '24 hours'
    AND payload->'error' IS NOT NULL;

  SELECT COUNT(*) INTO rls_violations_24h
  FROM public.audit_events
  WHERE action IN ('rls_violation', 'forbidden_role', 'cross_tenant_attempt')
    AND created_at > now() - interval '24 hours';

  SELECT COUNT(*) INTO malware_blocked_24h
  FROM public.audit_events
  WHERE action = 'malware_detected'
    AND created_at > now() - interval '24 hours';

  SELECT jsonb_agg(row_to_json(r) ORDER BY total DESC)
  INTO critical_events
  FROM (
    SELECT
      action,
      COUNT(*)        AS total,
      actor_id::text,
      MAX(created_at) AS last_seen
    FROM public.audit_events
    WHERE action IN (
        'rls_violation', 'forbidden_role', 'cross_tenant_attempt',
        'malware_detected', 'scan_error', 'unit_role_revoked'
      )
      AND created_at > now() - interval '24 hours'
    GROUP BY action, actor_id
    ORDER BY total DESC
    LIMIT 25
  ) r;

  RETURN jsonb_build_object(
    'login_failures_24h',  login_failures_24h,
    'rls_violations_24h',  rls_violations_24h,
    'malware_blocked_24h', malware_blocked_24h,
    'critical_events',     COALESCE(critical_events, '[]'::jsonb)
  );
EXCEPTION WHEN OTHERS THEN
  -- auth.audit_log_entries inacessível em alguns planos → degraded mode
  RETURN jsonb_build_object(
    'login_failures_24h',  -1,
    'rls_violations_24h',  rls_violations_24h,
    'malware_blocked_24h', malware_blocked_24h,
    'critical_events',     COALESCE(critical_events, '[]'::jsonb),
    'warning',             'auth.audit_log_entries unavailable'
  );
END;
$$;

-- ── 2. Cota VirusTotal: calculada do banco, zero chamadas externas ────────────

CREATE OR REPLACE FUNCTION public.fn_get_vt_quota()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  calls_24h         bigint;
  calls_last_minute bigint;
  scan_errors       bigint;
  infected_total    bigint;
  pending_total     bigint;
BEGIN
  SELECT COUNT(*) INTO calls_24h
  FROM public.ecu_job_files
  WHERE scan_checked_at > now() - interval '24 hours'
    AND scan_status IN ('clean', 'infected');

  -- Conservative: each pending with analysis_id also consumed a VT submit call
  SELECT calls_24h + COUNT(*) INTO calls_24h
  FROM public.ecu_job_files
  WHERE created_at > now() - interval '24 hours'
    AND scan_status = 'pending'
    AND scan_analysis_id IS NOT NULL;

  SELECT COUNT(*) INTO calls_last_minute
  FROM public.ecu_job_files
  WHERE scan_checked_at > now() - interval '1 minute';

  SELECT COUNT(*) INTO scan_errors
  FROM public.audit_events
  WHERE action = 'scan_error'
    AND created_at > now() - interval '24 hours';

  SELECT COUNT(*) INTO infected_total
  FROM public.ecu_job_files
  WHERE scan_status = 'infected';

  SELECT COUNT(*) INTO pending_total
  FROM public.ecu_job_files
  WHERE scan_status = 'pending';

  RETURN jsonb_build_object(
    'calls_24h',             calls_24h,
    'daily_limit',           500,
    'pct_daily_quota',       ROUND((LEAST(calls_24h, 500)::numeric / 500) * 100, 1),
    'calls_last_minute',     calls_last_minute,
    'rate_limit_per_minute', 4,
    'scan_errors_24h',       scan_errors,
    'infected_total',        infected_total,
    'pending_total',         pending_total,
    'upgrade_recommended',   (calls_24h > 400)  -- >80% → alerta
  );
END;
$$;

-- ── 3. Infraestrutura: DB connections, sessões, storage ──────────────────────

CREATE OR REPLACE FUNCTION public.fn_get_infra_stats()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, auth, pg_catalog
AS $$
DECLARE
  db_connections   jsonb;
  active_sessions  bigint;
  total_units      bigint;
  total_profiles   bigint;
  ecu_storage      jsonb;
  support_storage  jsonb;
  edge_errors_24h  bigint;
BEGIN
  SELECT jsonb_agg(row_to_json(r))
  INTO db_connections
  FROM (
    SELECT
      COALESCE(state, 'idle') AS state,
      COUNT(*)                AS count
    FROM pg_stat_activity
    WHERE datname = current_database()
    GROUP BY state
  ) r;

  SELECT COUNT(*) INTO active_sessions
  FROM auth.sessions
  WHERE not_after > now();

  SELECT COUNT(*) INTO total_units
  FROM public.franchise_units;

  SELECT COUNT(*) INTO total_profiles
  FROM public.profiles
  WHERE active = true;

  SELECT jsonb_build_object(
    'bucket',      'ecu',
    'files',       COUNT(*),
    'used_bytes',  COALESCE(SUM(size_bytes), 0),
    'infected',    COUNT(*) FILTER (WHERE scan_status = 'infected'),
    'pending',     COUNT(*) FILTER (WHERE scan_status = 'pending')
  ) INTO ecu_storage
  FROM public.ecu_job_files;

  SELECT jsonb_build_object(
    'bucket', 'support',
    'files',  COUNT(*),
    'used_bytes', 0  -- size not tracked; set by Cloudflare API egress
  ) INTO support_storage
  FROM public.support_messages
  WHERE attachment_r2_key IS NOT NULL;

  SELECT COUNT(*) INTO edge_errors_24h
  FROM public.audit_events
  WHERE action = 'scan_error'
    AND created_at > now() - interval '24 hours';

  RETURN jsonb_build_object(
    'db_connections',      COALESCE(db_connections, '[]'::jsonb),
    'active_sessions',     active_sessions,
    'franchise_units',     total_units,
    'active_users',        total_profiles,
    'storage',             jsonb_build_array(ecu_storage, support_storage),
    'edge_errors_24h',     edge_errors_24h
  );
END;
$$;

-- Bloqueia acesso direto via PostgREST — chamadas só via service role na Edge Function
REVOKE EXECUTE ON FUNCTION public.fn_get_security_summary() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fn_get_vt_quota()         FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fn_get_infra_stats()      FROM PUBLIC, anon, authenticated;
