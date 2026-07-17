-- ============================================================
-- 080_financial_entries_admin_update_pending.sql
--
-- BUG 1: aprovar edição de valor (historico_edicoes_valor) atualiza
-- ecu_jobs.amount_charged_by_matrix mas NÃO propaga pra
-- financial_entries — cobrança pendente no caixa continua com o
-- valor antigo, o desconto/ajuste aprovado nunca chega no caixa.
--
-- BUG 2 (achado ao investigar o 1): financial_entries e
-- commission_entries não tinham NENHUMA policy de UPDATE pra
-- company_admin/finance_admin — só financial_system_all (system_ti).
-- Isso bloqueia silenciosamente (0 linhas afetadas, sem erro) o
-- fluxo normal de "Registrar Pagamento ECU" (useRegisterPayment) pra
-- qualquer financeiro que não seja system_ti:
--   1. financial_entries: UPDATE status pendente -> pago
--   2. commission_entries: UPSERT (o caminho de UPDATE do upsert,
--      quando já existe comissão pro job, precisa de policy própria —
--      só havia SELECT (própria) e INSERT (aberto), sem UPDATE)
--
-- FIX: duas policies em financial_entries — uma pra correção de
-- valor mantendo pendente (aprovação de edição), outra específica
-- pra transição pendente -> pago (registro de pagamento). Manter
-- separadas de propósito: a primeira NÃO permite virar pago (WITH
-- CHECK exige que continue pendente), a segunda só permite EXATAMENTE
-- a transição pendente -> pago, nada além disso. Cobrança já paga
-- (status = 'pago') continua imutável — nenhuma das duas cobre esse
-- caso.
-- Mais uma policy de UPDATE em commission_entries, mesmo escopo de
-- role, sem restrição adicional de linha (mesmo nível de permissivi-
-- dade que a policy de INSERT já existente na tabela).
-- ============================================================

-- financial_entries: correção de valor (aprovação de edição) — mantém pendente
CREATE POLICY "financial_admin_update_pending" ON public.financial_entries
  FOR UPDATE
  USING (
    public.current_user_role() IN ('company_admin', 'finance_admin')
    AND status = 'pendente'
  )
  WITH CHECK (
    public.current_user_role() IN ('company_admin', 'finance_admin')
    AND status = 'pendente'
  );

-- financial_entries: registro de pagamento — só a transição pendente -> pago
CREATE POLICY "financial_admin_mark_paid" ON public.financial_entries
  FOR UPDATE
  USING (
    public.current_user_role() IN ('company_admin', 'finance_admin')
    AND status = 'pendente'
  )
  WITH CHECK (
    public.current_user_role() IN ('company_admin', 'finance_admin')
    AND status = 'pago'
  );

-- commission_entries: falta UPDATE pro caminho de conflito do upsert
-- em useRegisterPayment (INSERT já é aberto — "authenticated can insert commissions").
CREATE POLICY "financial_admin_update_commissions" ON public.commission_entries
  FOR UPDATE
  USING (
    public.current_user_role() IN ('company_admin', 'finance_admin')
  )
  WITH CHECK (
    public.current_user_role() IN ('company_admin', 'finance_admin')
  );
