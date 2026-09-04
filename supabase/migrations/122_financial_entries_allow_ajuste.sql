-- 122_financial_entries_allow_ajuste.sql
-- BUG: "new row for relation financial_entries violates check constraint
--       financial_entries_type_check"
--
-- A UI trata 'ajuste' como um tipo de lançamento de 1ª classe — criar
-- (NovoLancamentoModal), exibir (CaixaPage/FinanceiroPage isAjuste) e filtrar
-- (option value="ajuste"). Mas a check constraint da coluna type só permitia
-- ('receita','despesa') — nunca foi atualizada. Todo lançamento tipo "Ajuste"
-- (franquia ou matriz) tomava violação e não salvava.
--
-- Fix: incluir 'ajuste' na constraint. Constraint inline auto-nomeada como
-- <tabela>_<coluna>_check = financial_entries_type_check.

ALTER TABLE public.financial_entries
  DROP CONSTRAINT IF EXISTS financial_entries_type_check;

ALTER TABLE public.financial_entries
  ADD CONSTRAINT financial_entries_type_check
  CHECK (type IN ('receita', 'despesa', 'ajuste'));
