-- ============================================================
-- 098_financial_entries_mark_paid_roles.sql (27/07/2026)
--
-- DRAFT — pra auditoria do Rogério, ainda não aplicada.
--
-- FIN.3: cobrança registrada no Caixa não sai da lista de
-- pendentes depois de "confirmar pagamento". Causa raiz: RLS,
-- não invalidation (useRegisterPayment já invalida
-- ['caixa-pendentes'] corretamente, useCaixa.ts:151).
--
-- financial_admin_mark_paid (migration 080) e
-- financial_admin_update_commissions (080) ficaram com lista de
-- roles mais curta que financial_admin_write (089) — mesma classe
-- de bug que a própria 080 já corrigiu uma vez (RLS bloqueia o
-- UPDATE silenciosamente, 0 linhas afetadas, sem erro; a mutation
-- reporta sucesso mas o banco nunca muda de 'pendente' pra 'pago').
--
--   financial_admin_write (089, quem ENVIA pro financeiro):
--     company_admin, finance_admin, finance_staff,
--     operations_admin, franchise_manager, unit_manager
--
--   financial_admin_mark_paid (080, quem MARCA como pago) — antes:
--     company_admin, finance_admin, seller
--
-- finance_staff, operations_admin, franchise_manager e
-- unit_manager enviavam a cobrança mas não conseguiam quitá-la.
-- Fix: as duas policies passam a cobrir os mesmos 6 roles de
-- financial_admin_write, mais seller (mantido — PDV registra
-- pagamento ECU sem guarda de rota, motivo já documentado na
-- migration 080 original).
--
-- DROP + CREATE (não existe ALTER POLICY … role list em Postgres
-- pra troca de condição — mesmo padrão de toda migration anterior
-- que edita policy existente).
--
-- PADRÃO DO BUG (pra reconhecer em outro lugar): quando um mesmo
-- domínio de dado tem múltiplas policies pra ações diferentes do
-- ciclo de vida (ex.: criar/escrever vs. atualizar/quitar), e cada
-- policy evolui em migration separada ao longo do tempo, as listas
-- de role divergem sem ninguém perceber — RLS nega o UPDATE/INSERT
-- de forma silenciosa (0 linhas afetadas, SEM erro), a mutation do
-- front reporta sucesso, e o dado nunca muda de estado no banco.
-- Correção: sincronizar as listas de role entre as policies do
-- mesmo domínio sempre que uma delas ganhar um role novo.
--
-- EXPLICAÇÃO DO SELLER: 'seller' está em financial_admin_mark_paid
-- e financial_admin_update_commissions mas DE PROPÓSITO NÃO está em
-- financial_admin_write (089) — não é typo, não remover em
-- cherry-pick pra outro sistema. Motivo (migration 080 original):
-- PDV abre "Registrar Pagamento ECU" pra seller sem guarda de rota.
-- seller só entra na transição pendente→pago (e no upsert de
-- comissão, mesmo fluxo), nunca na criação da cobrança — isso é
-- só financeiro/admin.
--
-- CANDIDATO A CHERRY-PICK: sim. Esse desalinhamento de listas de
-- role entre policies do mesmo domínio provavelmente existe em
-- Promax Tuner e EvoPro também (mesma origem de código). Verificar
-- nos clones antes de assumir que não afeta:
--
--   SELECT tablename, policyname, cmd, qual, with_check
--   FROM pg_policies
--   WHERE tablename IN ('financial_entries','commission_entries')
--     AND policyname IN (
--       'financial_admin_write',
--       'financial_admin_mark_paid',
--       'financial_admin_update_commissions'
--     )
--   ORDER BY tablename, policyname;
--
-- Comparar as listas de role em cada linha — se divergirem (fora do
-- 'seller' intencional em mark_paid/update_commissions, explicado
-- acima), aplicar o mesmo fix.
-- ============================================================

DROP POLICY IF EXISTS "financial_admin_mark_paid" ON public.financial_entries;
CREATE POLICY "financial_admin_mark_paid" ON public.financial_entries
  FOR UPDATE
  USING (
    public.current_user_role() IN (
      'company_admin', 'finance_admin', 'finance_staff',
      'operations_admin', 'franchise_manager', 'unit_manager', 'seller'
    )
    AND status = 'pendente'
  )
  WITH CHECK (
    public.current_user_role() IN (
      'company_admin', 'finance_admin', 'finance_staff',
      'operations_admin', 'franchise_manager', 'unit_manager', 'seller'
    )
    AND status = 'pago'
  );

DROP POLICY IF EXISTS "financial_admin_update_commissions" ON public.commission_entries;
CREATE POLICY "financial_admin_update_commissions" ON public.commission_entries
  FOR UPDATE
  USING (
    public.current_user_role() IN (
      'company_admin', 'finance_admin', 'finance_staff',
      'operations_admin', 'franchise_manager', 'unit_manager', 'seller'
    )
  )
  WITH CHECK (
    public.current_user_role() IN (
      'company_admin', 'finance_admin', 'finance_staff',
      'operations_admin', 'franchise_manager', 'unit_manager', 'seller'
    )
  );
