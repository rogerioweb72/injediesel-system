-- 119_error_logs.sql
-- Painel de monitoramento (webmaster): log de erros/falhas/bugs do sistema.
-- Complementa audit_logs (ações do usuário). Leitura restrita a system_ti (web72).

CREATE TABLE IF NOT EXISTS public.error_logs (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at  timestamptz NOT NULL DEFAULT now(),
  source      text NOT NULL DEFAULT 'frontend' CHECK (source IN ('frontend','edge','db')),
  level       text NOT NULL DEFAULT 'error'    CHECK (level  IN ('error','warn','fatal')),
  message     text NOT NULL,
  stack       text,
  route       text,
  user_id     uuid REFERENCES public.profiles(id),
  user_role   text,
  unit_id     uuid,
  user_agent  text,
  context     jsonb,
  resolved    boolean NOT NULL DEFAULT false,
  resolved_at timestamptz,
  resolved_by uuid REFERENCES public.profiles(id)
);

CREATE INDEX IF NOT EXISTS idx_error_logs_created  ON public.error_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_error_logs_level    ON public.error_logs (level);
CREATE INDEX IF NOT EXISTS idx_error_logs_source   ON public.error_logs (source);
CREATE INDEX IF NOT EXISTS idx_error_logs_resolved ON public.error_logs (resolved);
CREATE INDEX IF NOT EXISTS idx_error_logs_user     ON public.error_logs (user_id);

ALTER TABLE public.error_logs ENABLE ROW LEVEL SECURITY;

-- Leitura/atualização: SOMENTE system_ti (webmaster / web72).
DROP POLICY IF EXISTS "error_logs_read_ti" ON public.error_logs;
CREATE POLICY "error_logs_read_ti" ON public.error_logs
  FOR SELECT USING (public.current_user_role() = 'system_ti');

DROP POLICY IF EXISTS "error_logs_update_ti" ON public.error_logs;
CREATE POLICY "error_logs_update_ti" ON public.error_logs
  FOR UPDATE USING (public.current_user_role() = 'system_ti');

-- Insert: qualquer autenticado loga o próprio erro (o app grava via logError).
-- service_role (edge functions) ignora RLS e grava com source='edge'.
DROP POLICY IF EXISTS "error_logs_insert_auth" ON public.error_logs;
CREATE POLICY "error_logs_insert_auth" ON public.error_logs
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Retenção: mantém no máx. ~20k linhas (apaga as mais antigas). Chamado após insert.
CREATE OR REPLACE FUNCTION public.trim_error_logs()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF (random() < 0.02) THEN  -- amostra: só ~2% dos inserts dispara a limpeza
    DELETE FROM public.error_logs
     WHERE id IN (
       SELECT id FROM public.error_logs ORDER BY created_at DESC OFFSET 20000
     );
  END IF;
  RETURN NULL;
END $$;

DROP TRIGGER IF EXISTS trg_trim_error_logs ON public.error_logs;
CREATE TRIGGER trg_trim_error_logs
  AFTER INSERT ON public.error_logs
  FOR EACH ROW EXECUTE FUNCTION public.trim_error_logs();

NOTIFY pgrst, 'reload schema';
