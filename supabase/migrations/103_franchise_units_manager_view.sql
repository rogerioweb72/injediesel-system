-- 103_franchise_units_manager_view.sql
-- Frente 2 (visibilidade 19/08/2026): expor o nome do gestor da unidade para
-- (a) exibir a coluna "Gestor" na lista de Franqueados e
-- (b) permitir busca por nome do gestor, não só pelo nome da unidade.
--
-- O gestor é o profile referenciado por franchise_units.manager_id (migration 015).
-- A view usa security_invoker = on: a RLS das tabelas-base (franchise_units e
-- profiles) continua valendo para quem consulta. Não abre dado de unidade para
-- outra unidade — apenas espelha franchise_units acrescido de manager_name.

CREATE OR REPLACE VIEW public.v_franchise_units
WITH (security_invoker = on) AS
SELECT
  fu.*,
  p.name AS manager_name
FROM public.franchise_units fu
LEFT JOIN public.profiles p ON p.id = fu.manager_id;

GRANT SELECT ON public.v_franchise_units TO authenticated;
