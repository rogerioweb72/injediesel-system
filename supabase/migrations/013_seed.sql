-- Usuário admin criado via Supabase Auth dashboard. Este seed atualiza o perfil.
-- Execute após criar o primeiro usuário admin manualmente no Auth dashboard.

-- Unidades de franquia de exemplo
insert into public.franchise_units (id, name, document, contract_type) values
  ('11111111-0000-0000-0000-000000000001', 'Promax SP Centro', '00.000.000/0001-01', 'full'),
  ('11111111-0000-0000-0000-000000000002', 'Promax RJ Norte',  '00.000.000/0002-02', 'linha_leve');

-- Categorias financeiras
insert into public.financial_categories (name, type) values
  ('Serviços ECU',    'receita'),
  ('Produtos Loja',   'receita'),
  ('Comissões',       'despesa'),
  ('Infraestrutura',  'despesa'),
  ('Folha de Pagamento', 'despesa');

-- Produtos de exemplo com 3 tiers de preço
with p1 as (
  insert into public.products (sku, name, category, description, stock)
  values ('ECU-REMAP-001', 'Remapeamento Estágio 1', 'Serviço ECU', 'Remapeamento base para ganho de torque e potência', 999)
  returning id
)
insert into public.product_prices (product_id, tier, price)
select id, 'franqueado_full'::public.price_tier,        350.00 from p1 union all
select id, 'franqueado_linha_leve'::public.price_tier,  420.00 from p1 union all
select id, 'cliente_final'::public.price_tier,          599.00 from p1;

with p2 as (
  insert into public.products (sku, name, category, description, stock)
  values ('ECU-REMAP-002', 'Remapeamento Estágio 2', 'Serviço ECU', 'Remapeamento avançado com ajuste de combustível', 999)
  returning id
)
insert into public.product_prices (product_id, tier, price)
select id, 'franqueado_full'::public.price_tier,        480.00 from p2 union all
select id, 'franqueado_linha_leve'::public.price_tier,  560.00 from p2 union all
select id, 'cliente_final'::public.price_tier,          799.00 from p2;

with p3 as (
  insert into public.products (sku, name, category, description, stock)
  values ('CHIP-TUNE-001', 'Chip Tuning OBD2', 'Hardware', 'Módulo de performance plug-and-play', 50)
  returning id
)
insert into public.product_prices (product_id, tier, price)
select id, 'franqueado_full'::public.price_tier,        180.00 from p3 union all
select id, 'franqueado_linha_leve'::public.price_tier,  210.00 from p3 union all
select id, 'cliente_final'::public.price_tier,          299.00 from p3;
