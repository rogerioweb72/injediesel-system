-- 120_ecu_file_invalidation.sql
-- Fluxo de apagar/substituir/inutilizar arquivo ECU (evita arquivo errado sobrando).
--
-- Regras de negócio:
--   • ANTES do aceite (ecu_jobs.status = 'recebido'): o FRANQUEADO pode apagar/
--     substituir o próprio arquivo 'original'. Substituir = sobe o novo + apaga o
--     errado na mesma ação (frontend), então nunca fica duplicado.
--   • DEPOIS do aceite: o franqueado NÃO apaga mais. Ele "avisa a matriz" que o
--     arquivo está errado (reported_wrong). A matriz então pode:
--       - INUTILIZAR (invalidated = true): fica cinza/opaco com nota "arquivo errado",
--         mas continua no histórico; ou
--       - EXCLUIR de vez (RPC devolve a r2_key p/ o frontend remover o objeto no R2).
--
-- Tudo via RPC SECURITY DEFINER (a tabela não abre DELETE/UPDATE direto ao cliente).
-- Cada ação registra um evento em ecu_job_events (timeline imutável do job).

-- ─── Colunas de inutilização / reporte ──────────────────────────────────────
ALTER TABLE public.ecu_job_files
  ADD COLUMN IF NOT EXISTS invalidated        boolean     NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS invalidated_reason text,
  ADD COLUMN IF NOT EXISTS invalidated_at     timestamptz,
  ADD COLUMN IF NOT EXISTS invalidated_by     uuid REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS reported_wrong     boolean     NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS reported_reason    text,
  ADD COLUMN IF NOT EXISTS reported_at        timestamptz,
  ADD COLUMN IF NOT EXISTS reported_by        uuid REFERENCES public.profiles(id);

-- helper: mapeia file_type -> bucket lógico do worker R2
CREATE OR REPLACE FUNCTION public._ecu_bucket_of(p_file_type text)
RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE WHEN p_file_type = 'original' THEN 'originals' ELSE 'delivered' END
$$;

-- ─── FRANQUEADO: apaga o próprio 'original' ANTES do aceite ──────────────────
-- Devolve r2_key + bucket para o frontend remover o objeto no R2.
CREATE OR REPLACE FUNCTION public.franchise_delete_ecu_file(p_file_id uuid)
RETURNS TABLE(r2_key text, bucket text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_file public.ecu_job_files; v_job public.ecu_jobs;
BEGIN
  SELECT * INTO v_file FROM public.ecu_job_files WHERE id = p_file_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'file_not_found'; END IF;

  SELECT * INTO v_job FROM public.ecu_jobs WHERE id = v_file.job_id;
  IF v_job.unit_id IS NULL OR v_job.unit_id NOT IN (SELECT public.my_unit_ids()) THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;
  IF v_job.status <> 'recebido' THEN RAISE EXCEPTION 'job_already_accepted'; END IF;
  IF v_file.file_type <> 'original' THEN RAISE EXCEPTION 'only_original'; END IF;

  DELETE FROM public.ecu_job_files WHERE id = p_file_id;

  INSERT INTO public.ecu_job_events(job_id, actor_id, event_type, payload)
  VALUES (v_job.id, auth.uid(), 'file_deleted_by_franchise',
    jsonb_build_object('file_name', v_file.file_name, 'r2_key', v_file.r2_key));

  RETURN QUERY SELECT v_file.r2_key, public._ecu_bucket_of(v_file.file_type);
END $$;

-- ─── FRANQUEADO: avisa a matriz que um arquivo está errado (pós-aceite) ──────
CREATE OR REPLACE FUNCTION public.franchise_report_wrong_file(p_file_id uuid, p_reason text)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_file public.ecu_job_files; v_job public.ecu_jobs;
BEGIN
  SELECT * INTO v_file FROM public.ecu_job_files WHERE id = p_file_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'file_not_found'; END IF;

  SELECT * INTO v_job FROM public.ecu_jobs WHERE id = v_file.job_id;
  IF v_job.unit_id IS NULL OR v_job.unit_id NOT IN (SELECT public.my_unit_ids()) THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  UPDATE public.ecu_job_files
     SET reported_wrong = true,
         reported_reason = NULLIF(btrim(p_reason), ''),
         reported_at = now(),
         reported_by = auth.uid()
   WHERE id = p_file_id;

  INSERT INTO public.ecu_job_events(job_id, actor_id, event_type, payload)
  VALUES (v_job.id, auth.uid(), 'file_reported_wrong',
    jsonb_build_object('file_name', v_file.file_name, 'reason', NULLIF(btrim(p_reason), '')));
END $$;

-- ─── MATRIZ: inutiliza (cinza + nota) sem apagar ────────────────────────────
CREATE OR REPLACE FUNCTION public.matrix_invalidate_ecu_file(p_file_id uuid, p_reason text)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_file public.ecu_job_files;
BEGIN
  IF NOT public.is_matrix_user() THEN RAISE EXCEPTION 'forbidden'; END IF;

  SELECT * INTO v_file FROM public.ecu_job_files WHERE id = p_file_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'file_not_found'; END IF;

  UPDATE public.ecu_job_files
     SET invalidated = true,
         invalidated_reason = NULLIF(btrim(p_reason), ''),
         invalidated_at = now(),
         invalidated_by = auth.uid()
   WHERE id = p_file_id;

  INSERT INTO public.ecu_job_events(job_id, actor_id, event_type, payload)
  VALUES (v_file.job_id, auth.uid(), 'file_invalidated',
    jsonb_build_object('file_name', v_file.file_name, 'reason', NULLIF(btrim(p_reason), '')));
END $$;

-- ─── MATRIZ: exclui de vez (devolve r2_key p/ apagar no R2) ──────────────────
CREATE OR REPLACE FUNCTION public.matrix_delete_ecu_file(p_file_id uuid)
RETURNS TABLE(r2_key text, bucket text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_file public.ecu_job_files;
BEGIN
  IF NOT public.is_matrix_user() THEN RAISE EXCEPTION 'forbidden'; END IF;

  SELECT * INTO v_file FROM public.ecu_job_files WHERE id = p_file_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'file_not_found'; END IF;

  DELETE FROM public.ecu_job_files WHERE id = p_file_id;

  INSERT INTO public.ecu_job_events(job_id, actor_id, event_type, payload)
  VALUES (v_file.job_id, auth.uid(), 'file_deleted_by_matrix',
    jsonb_build_object('file_name', v_file.file_name, 'r2_key', v_file.r2_key));

  RETURN QUERY SELECT v_file.r2_key, public._ecu_bucket_of(v_file.file_type);
END $$;

-- ─── Grants: só usuários autenticados; nunca anon/public ─────────────────────
REVOKE ALL ON FUNCTION public.franchise_delete_ecu_file(uuid)        FROM public;
REVOKE ALL ON FUNCTION public.franchise_report_wrong_file(uuid, text) FROM public;
REVOKE ALL ON FUNCTION public.matrix_invalidate_ecu_file(uuid, text)  FROM public;
REVOKE ALL ON FUNCTION public.matrix_delete_ecu_file(uuid)            FROM public;

GRANT EXECUTE ON FUNCTION public.franchise_delete_ecu_file(uuid)        TO authenticated;
GRANT EXECUTE ON FUNCTION public.franchise_report_wrong_file(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.matrix_invalidate_ecu_file(uuid, text)  TO authenticated;
GRANT EXECUTE ON FUNCTION public.matrix_delete_ecu_file(uuid)            TO authenticated;
