-- 115_ecu_scan_trigger.sql
-- Correção de regressão: o disparo do antivírus (scan-ecu-file) dependia de um
-- Database Webhook do Dashboard, que parou de entregar. Resultado: TODO arquivo
-- ficava 'pending' e o cron poll-ecu-scans marcava 'blocked' após 1h, travando
-- 100% dos downloads (confirmado: 8/8 arquivos 'blocked', sem scan_analysis_id).
--
-- Aqui o disparo passa a ser um TRIGGER pg_net versionado (não depende do Dashboard).
-- Ao inserir em ecu_job_files, chama scan-ecu-file com o WEBHOOK_SECRET no header
-- x-supabase-signature (a função valida com sig.includes(WEBHOOK_SECRET)).
--
-- ⚠️ CONFIG MANUAL (uma vez, fora desta migration — NÃO commitar o secret):
--   -- guarda o WEBHOOK_SECRET no Vault (mesmo valor do secret da Edge Function):
--   select vault.create_secret('<valor do WEBHOOK_SECRET>', 'ecu_webhook_secret');
--   -- e REMOVER o Database Webhook antigo no Dashboard (Database → Webhooks) p/ não duplicar.

CREATE EXTENSION IF NOT EXISTS pg_net;

CREATE OR REPLACE FUNCTION public.trigger_scan_ecu_file()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_url    text := 'https://ttnmvheptxedwninjedv.supabase.co/functions/v1/scan-ecu-file';
  -- anon key PÚBLICA (mesma do bundle do frontend) — só p/ o gateway rotear a
  -- requisição. A autenticação real é o WEBHOOK_SECRET em x-supabase-signature.
  v_anon   text := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR0bm12aGVwdHhlZHduaW5qZWR2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIxNzkyMTYsImV4cCI6MjA5Nzc1NTIxNn0.NQlgxnPsAjjIyGswOnZsNXN1ckXNLtfvqlfRTD82a9E';
  v_secret text;
BEGIN
  -- Secret do Vault; fallback p/ GUC app.webhook_secret se o Vault não estiver disponível.
  BEGIN
    SELECT decrypted_secret INTO v_secret
    FROM vault.decrypted_secrets WHERE name = 'ecu_webhook_secret' LIMIT 1;
  EXCEPTION WHEN OTHERS THEN
    v_secret := NULL;
  END;
  IF v_secret IS NULL OR v_secret = '' THEN
    v_secret := current_setting('app.webhook_secret', true);
  END IF;

  -- Sem secret configurado: não quebra o INSERT (upload continua funcionando).
  IF v_secret IS NULL OR v_secret = '' THEN
    RETURN NEW;
  END IF;

  PERFORM net.http_post(
    url     := v_url,
    headers := jsonb_build_object(
                 'Content-Type', 'application/json',
                 'Authorization', 'Bearer ' || v_anon,       -- gateway (verify_jwt)
                 'x-supabase-signature', v_secret             -- auth real da função
               ),
    body    := jsonb_build_object('record', jsonb_build_object(
                 'id',         NEW.id,
                 'job_id',     NEW.job_id,
                 'r2_key',     NEW.r2_key,
                 'file_name',  NEW.file_name,
                 'size_bytes', NEW.size_bytes,
                 'file_type',  NEW.file_type
               ))
  );
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_scan_ecu_file ON public.ecu_job_files;
CREATE TRIGGER trg_scan_ecu_file
  AFTER INSERT ON public.ecu_job_files
  FOR EACH ROW EXECUTE FUNCTION public.trigger_scan_ecu_file();

NOTIFY pgrst, 'reload schema';
