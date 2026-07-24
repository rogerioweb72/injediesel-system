-- ============================================================
-- 095_ecu_job_matrix_created.sql (24/07/2026)
--
-- DRAFT — pra auditoria do Rogério, ainda não aplicada.
--
-- A.5: "Job em nome da franquia" — matriz atende franquia/vendedor
-- por telefone e cria job já atribuído a uma unidade. Checkpoint de
-- arquitetura fechado com Rogério em 24/07/2026:
--
--   1. created_by_matrix boolean — selo "Criado pela Matriz", gate
--      de permissão (franquia não cancela) e contador de notificação.
--   2. Franquia nunca cancela job com created_by_matrix=true — quem
--      criou foi a matriz, só ela cancela (gate no front, mesmo
--      padrão do "status === 'recebido'" que já é só front hoje).
--   3. Ticket de Correção continua liberado pra franquia nesse job
--      — é o canal técnico com a matriz, não uma edição do job.
--   4. ecu_job_price_adjustments — ledger de acréscimo/desconto
--      pós-entrega sobre amount_charged_to_customer. Insert-only,
--      SEM aprovação: autonomia da franquia sobre o preço do PRÓPRIO
--      cliente. Diferente de amount_charged_by_matrix, que já tem
--      fluxo de aprovação (historico_edicoes_valor / useEcuValueEdit)
--      porque esse afeta o repasse financeiro pra matriz.
--   5. lookup_customer_by_document — autocomplete de contato entre
--      unidades. SECURITY DEFINER de propósito, pra contornar
--      isolamento de unit_id só pra achar contato repetido — mas
--      devolve APENAS nome/email/telefone. Nunca id, unit_id,
--      veículo ou histórico de job: cliente nunca fica "visível" de
--      uma unidade pra outra, só preenche o cadastro NOVO da unidade
--      atual quando o documento bate.
-- ============================================================

-- ── 1. Flag "criado pela matriz" ───────────────────────────────
ALTER TABLE public.ecu_jobs
  ADD COLUMN IF NOT EXISTS created_by_matrix boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_ecu_jobs_created_by_matrix
  ON public.ecu_jobs(created_by_matrix) WHERE created_by_matrix = true;

-- ── 2. Ledger de ajustes de preço (amount_charged_to_customer) ──
CREATE TABLE IF NOT EXISTS public.ecu_job_price_adjustments (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ecu_job_id uuid NOT NULL REFERENCES public.ecu_jobs(id) ON DELETE CASCADE,
  amount     numeric(12,2) NOT NULL,
  reason     text NOT NULL,
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ecu_job_price_adjustments_job
  ON public.ecu_job_price_adjustments(ecu_job_id);

ALTER TABLE public.ecu_job_price_adjustments ENABLE ROW LEVEL SECURITY;

-- Mesmo padrão de 3 camadas de ecu_jobs (system_ti / matrix / unit_member).
CREATE POLICY "ecu_job_price_adjustments_system_all" ON public.ecu_job_price_adjustments
  FOR ALL USING (public.is_system_ti());

CREATE POLICY "ecu_job_price_adjustments_matrix_all" ON public.ecu_job_price_adjustments
  FOR ALL USING (
    public.current_user_role() IN ('company_admin', 'operations_admin', 'support_agent')
  );

CREATE POLICY "ecu_job_price_adjustments_unit_member" ON public.ecu_job_price_adjustments
  FOR ALL USING (
    ecu_job_id IN (
      SELECT id FROM public.ecu_jobs WHERE unit_id IN (SELECT public.my_unit_ids())
    )
  );

-- ── 3. RPC: autocomplete de cliente por CPF/CNPJ entre unidades ──
CREATE OR REPLACE FUNCTION public.lookup_customer_by_document(p_document text)
RETURNS TABLE (name text, email text, phone text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT c.name, c.email, c.phone
  FROM public.customers c
  WHERE regexp_replace(p_document, '\D', '', 'g') <> ''
    AND regexp_replace(c.document, '\D', '', 'g') = regexp_replace(p_document, '\D', '', 'g')
    AND c.deleted_at IS NULL
  ORDER BY c.created_at DESC
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.lookup_customer_by_document(text) TO authenticated;
