-- ============================================================
-- 082_profiles_operations_admin_update.sql (20/07/2026)
--
-- CONTEXTO: grep em supabase/migrations/ por "profiles_update" mostra
-- que a policy de UPDATE em profiles já passou por 3 gerações:
--   012 -> "profiles_update_own" (sem WITH CHECK, furo original)
--   021 -> dropa a 012, cria "profiles_update" (ainda sem WITH CHECK)
--   066 -> dropa a "profiles_update", cria as DUAS policies vigentes:
--       - "profiles_update_admin": USING (is_matrix_admin())
--       - "profiles_update_own":   USING (id = auth.uid())
--                                  WITH CHECK bloqueando o próprio
--                                  usuário de alterar role, active,
--                                  max_discount_pct, commission_rate,
--                                  discount_auth_hash, permissions,
--                                  salary, hire_date.
-- Ou seja: o furo "usuário edita a própria role" (Bug D) já estava
-- FECHADO em produção pela migration 066 (aplicada, migrations até
-- 081). Esta migration NÃO recria "profiles_update_own" — faria
-- regressão, pois a versão vigente protege mais colunas do que uma
-- reescrita focada só em role/active.
--
-- GAP REAL encontrado (não o Bug D original):
--   1. is_matrix_admin() (migration 024) = role IN ('system_ti',
--      'company_admin') apenas. operations_admin NÃO está incluído,
--      então hoje operations_admin não consegue alterar role/
--      permissões de NENHUM outro perfil via "profiles_update_admin"
--      — contradiz a regra de negócio (operations_admin pode gerir
--      outros usuários, matriz e franquia).
--   2. "profiles_update_admin" não exclui auto-edição: USING
--      (is_matrix_admin()) não checa id <> auth.uid() e não tem
--      WITH CHECK próprio — um company_admin/system_ti ainda
--      consegue alterar a PRÓPRIA role por essa policy (só a
--      "profiles_update_own" bloqueia auto-edição, e ela não se
--      aplica quando o usuário casa com a policy "_admin").
--
-- FIX: recria só "profiles_update_admin", mantendo "profiles_update_own"
-- intocada. Nova versão:
--   - Inclui operations_admin no conjunto de roles autorizados.
--   - Exige id <> auth.uid() — fecha a auto-edição de role também
--     para company_admin/system_ti/operations_admin (regra
--     "NINGUÉM altera a própria role" vale pra todo mundo).
--   - Não usa is_matrix_admin() diretamente pra não alterar o
--     comportamento dessa function em outras policies do sistema
--     (fora do escopo deste fix) — replica a checagem de role
--     inline, só para esta policy.
-- ============================================================

DROP POLICY IF EXISTS "profiles_update_admin" ON public.profiles;

CREATE POLICY "profiles_update_admin" ON public.profiles
  FOR UPDATE
  USING (
    id <> auth.uid()
    AND COALESCE(
      (SELECT p.role IN ('system_ti', 'company_admin', 'operations_admin') AND p.active = true
       FROM public.profiles p WHERE p.id = auth.uid()),
      false
    )
  );

NOTIFY pgrst, 'reload schema';
