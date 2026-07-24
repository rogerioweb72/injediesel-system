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
--
-- REVISÃO 24/07/2026 (perguntas do Rogério antes do push):
--   a) lookup_customer_by_document TEM que continuar SECURITY DEFINER.
--      Se fosse INVOKER, a RLS de customers_unit_member entraria em
--      jogo pro usuário que chama — ele só enxergaria clientes do
--      PRÓPRIO unit_id, e a busca cross-unit nunca acharia nada de
--      outra unidade. INVOKER quebra a feature. O que preserva o
--      isolamento não é o modo de execução, é o RETURN TABLE só ter
--      name/email/phone — nunca id, unit_id, document, veículo ou
--      job. Ninguém descobre EM QUAL unidade o contato já existe,
--      só reaproveita nome/telefone/e-mail pro cadastro novo.
--   b) ecu_job_price_adjustments é append-only de verdade: policies
--      abaixo cobrem só SELECT e INSERT. Sem policy de UPDATE/DELETE
--      pra franquia/matriz — RLS nega por padrão o que não tem
--      policy casando o comando, igual audit_logs. O "total" exibido
--      no front (valor original + soma dos ajustes) é só leitura,
--      nenhuma mutation escreve nele; não existe endpoint de
--      reset/edição/remoção de ajuste em lugar nenhum do código.
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

-- system_ti mantém FOR ALL (god-mode de sempre, igual toda outra tabela).
-- Matrix e unit_member: só SELECT + INSERT — SEM policy de UPDATE/DELETE.
-- RLS nega por padrão comando sem policy correspondente, então o ledger é
-- append-only na prática, igual audit_logs (histórico nunca é editado nem
-- apagado, nem por quem inseriu).
CREATE POLICY "ecu_job_price_adjustments_system_all" ON public.ecu_job_price_adjustments
  FOR ALL USING (public.is_system_ti());

-- finance_admin/finance_staff inclusos (além dos 3 papéis de matriz de
-- sempre): quem confere/registra pagamento precisa enxergar se o valor
-- foi ajustado depois da criação do job — sem isso, financeiro vê só o
-- amount_charged_to_customer original e pode fechar conta com valor
-- desatualizado. Read+insert, mesma regra dos outros papéis de matriz —
-- sem UPDATE/DELETE nunca (ledger append-only, ver nota (b) acima).
CREATE POLICY "ecu_job_price_adjustments_matrix_select" ON public.ecu_job_price_adjustments
  FOR SELECT USING (
    public.current_user_role() IN (
      'company_admin', 'operations_admin', 'support_agent',
      'finance_admin', 'finance_staff'
    )
  );

CREATE POLICY "ecu_job_price_adjustments_matrix_insert" ON public.ecu_job_price_adjustments
  FOR INSERT WITH CHECK (
    public.current_user_role() IN (
      'company_admin', 'operations_admin', 'support_agent',
      'finance_admin', 'finance_staff'
    )
  );

CREATE POLICY "ecu_job_price_adjustments_unit_select" ON public.ecu_job_price_adjustments
  FOR SELECT USING (
    ecu_job_id IN (
      SELECT id FROM public.ecu_jobs WHERE unit_id IN (SELECT public.my_unit_ids())
    )
  );

CREATE POLICY "ecu_job_price_adjustments_unit_insert" ON public.ecu_job_price_adjustments
  FOR INSERT WITH CHECK (
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
