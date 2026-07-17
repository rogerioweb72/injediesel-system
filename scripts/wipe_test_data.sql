-- ============================================================
-- wipe_test_data.sql
--
-- Zera DADOS DE TESTE pré-entrega. Preserva schema, RLS, functions,
-- triggers, migrations, catálogo (products/product_prices/ecu_catalog/
-- ecu_categories), config (company_settings/financial_categories/
-- franchise_levels/permission_profiles/permission_entries), conteúdo
-- (help_articles/marketing_materials/firmware_updates/
-- firmware_update_files/equipment_types), cadastros base (fornecedores/
-- formas_pagamento/servicos — decisão: revisão manual em FASE 0B/6B,
-- tabela não cai, linhas preservadas) e o usuário master
-- web72web@gmail.com (e seu profile, via auth.users).
--
-- PROTOCOLO 075 ELEVADO — LEIA ANTES DE RODAR:
--   1. BACKUP-FIRST OBRIGATÓRIO. Sem backup feito, NÃO RODE ISSO.
--      Veja o roteiro de backup no final deste arquivo (comentário).
--   2. Rode este arquivo INTEIRO no SQL Editor do Supabase.
--   3. O bloco termina em BEGIN...(sem COMMIT). Depois de rodar,
--      CONFIRA os counts "DEPOIS" no resultado. Se baterem com o
--      esperado, digite e rode manualmente:
--          COMMIT;
--      Se algo parecer errado, rode:
--          ROLLBACK;
--   4. Claude NUNCA roda isso. Só Rogério, manualmente, no SQL Editor.
--
-- ORDEM: filhos → pais, dentro de cada camada. FASE 1 neutraliza (via
-- UPDATE ... = NULL) duas FKs circulares que bloqueariam DELETEs
-- posteriores, e mais três FKs que teriam CASCADE indesejado sobre
-- fornecedores/formas_pagamento/servicos (ver comentários inline).
-- ============================================================

BEGIN;

-- ────────────────────────────────────────────────────────────
-- FASE 0 — COUNTS ANTES
-- ────────────────────────────────────────────────────────────
SELECT 'ANTES' AS momento, t.name AS tabela, t.n AS linhas
FROM (VALUES
  ('ecu_job_events',            (SELECT count(*) FROM public.ecu_job_events)),
  ('ecu_job_files',             (SELECT count(*) FROM public.ecu_job_files)),
  ('historico_edicoes_valor',   (SELECT count(*) FROM public.historico_edicoes_valor)),
  ('commission_entries',        (SELECT count(*) FROM public.commission_entries)),
  ('support_ticket_views',      (SELECT count(*) FROM public.support_ticket_views)),
  ('support_messages',          (SELECT count(*) FROM public.support_messages)),
  ('order_items',               (SELECT count(*) FROM public.order_items)),
  ('commissions',               (SELECT count(*) FROM public.commissions)),
  ('pos_sale_items',            (SELECT count(*) FROM public.pos_sale_items)),
  ('unit_employee_costs',       (SELECT count(*) FROM public.unit_employee_costs)),
  ('firmware_update_acceptances', (SELECT count(*) FROM public.firmware_update_acceptances)),
  ('impersonation_sessions',    (SELECT count(*) FROM public.impersonation_sessions)),
  ('audit_events',              (SELECT count(*) FROM public.audit_events)),
  ('audit_logs',                (SELECT count(*) FROM public.audit_logs)),
  ('support_tickets',           (SELECT count(*) FROM public.support_tickets)),
  ('ecu_jobs',                  (SELECT count(*) FROM public.ecu_jobs)),
  ('orders',                    (SELECT count(*) FROM public.orders)),
  ('pos_sales',                 (SELECT count(*) FROM public.pos_sales)),
  ('financeiro_pagamentos',     (SELECT count(*) FROM public.financeiro_pagamentos)),
  ('financial_entries',         (SELECT count(*) FROM public.financial_entries)),
  ('monthly_closings',          (SELECT count(*) FROM public.monthly_closings)),
  ('unit_employees',            (SELECT count(*) FROM public.unit_employees)),
  ('unit_custom_categories',    (SELECT count(*) FROM public.unit_custom_categories)),
  ('vehicles',                  (SELECT count(*) FROM public.vehicles)),
  ('customers',                 (SELECT count(*) FROM public.customers)),
  ('user_unit_roles',           (SELECT count(*) FROM public.user_unit_roles)),
  ('franchise_units',           (SELECT count(*) FROM public.franchise_units)),
  ('profiles (exceto master)',  (SELECT count(*) FROM public.profiles WHERE id NOT IN (SELECT id FROM auth.users WHERE email = 'web72web@gmail.com'))),
  ('auth.users (exceto master)', (SELECT count(*) FROM auth.users WHERE email != 'web72web@gmail.com'))
) AS t(name, n);

-- ────────────────────────────────────────────────────────────
-- FASE 0B — REVISÃO MANUAL (não é wipe): fornecedores, formas_pagamento
-- e servicos NÃO são apagados — são cadastro/config que o sistema
-- precisa funcionando no dia 1 (decisão do Rogério: fornecedores tem
-- a Promax Peças, relação real). unit_id NULL = matriz, unit_id = uuid
-- = franquia específica (comentário original da 047_cadastros_base.sql).
-- Liste aqui pra você separar teste de real e decidir caso a caso —
-- nenhuma linha é apagada automaticamente por este script.
-- ────────────────────────────────────────────────────────────
SELECT 'fornecedores' AS tabela, id, unit_id, name, document, contact, active
  FROM public.fornecedores ORDER BY unit_id NULLS FIRST, name;

SELECT 'formas_pagamento' AS tabela, id, unit_id, name, active
  FROM public.formas_pagamento ORDER BY unit_id NULLS FIRST, name;

SELECT 'servicos' AS tabela, id, unit_id, name, description, active
  FROM public.servicos ORDER BY unit_id NULLS FIRST, name;

-- ────────────────────────────────────────────────────────────
-- FASE 1 — Quebra de FK circular (NULL antes de DELETE)
-- ────────────────────────────────────────────────────────────

-- ecu_jobs.edicao_valor_historico_id -> historico_edicoes_valor(id) (sem cascade)
-- historico_edicoes_valor.arquivo_id -> ecu_jobs(id) (cascade)
-- Sem isso, o DELETE de historico_edicoes_valor na Fase 2 falharia
-- (linha ainda referenciada por algum ecu_jobs.edicao_valor_historico_id).
UPDATE public.ecu_jobs
   SET edicao_valor_historico_id = NULL
 WHERE edicao_valor_historico_id IS NOT NULL;

-- profiles.unit_id -> franchise_units(id) (sem cascade)
-- franchise_units é apagada na Fase 3, profiles só na Fase 5 (via
-- auth.users) — sem isso, o DELETE de franchise_units falharia.
UPDATE public.profiles
   SET unit_id = NULL
 WHERE unit_id IS NOT NULL;

-- fornecedores/formas_pagamento/servicos: unit_id -> franchise_units
-- TEM ON DELETE CASCADE no schema (047_cadastros_base.sql) — sem
-- neutralizar isso, apagar franchise_units na Fase 5 apagaria junto
-- qualquer linha dessas 3 tabelas vinculada a uma unidade de teste,
-- mesmo sem nenhum DELETE explícito nelas (não é o que você decidiu).
-- Preserva a linha inteira: unit_id vira NULL (= "matriz", mesma
-- convenção documentada na 047), a unidade original deixa de existir
-- mas o cadastro sobrevive pra você revisar/realocar depois.
UPDATE public.fornecedores    SET unit_id = NULL WHERE unit_id IS NOT NULL;
UPDATE public.formas_pagamento SET unit_id = NULL WHERE unit_id IS NOT NULL;
UPDATE public.servicos        SET unit_id = NULL WHERE unit_id IS NOT NULL;

-- ────────────────────────────────────────────────────────────
-- FASE 2 — Filhos mais profundos (ecu_jobs / support_tickets /
-- orders / pos_sales / unit_employees / auditoria)
-- ────────────────────────────────────────────────────────────
DELETE FROM public.ecu_job_events;
DELETE FROM public.ecu_job_files;
DELETE FROM public.historico_edicoes_valor;        -- já sem referência de ecu_jobs (Fase 1)
DELETE FROM public.commission_entries;
DELETE FROM public.support_ticket_views;
DELETE FROM public.support_messages;
DELETE FROM public.order_items;
DELETE FROM public.commissions;                     -- referencia orders — antes de apagar orders
DELETE FROM public.pos_sale_items;
DELETE FROM public.unit_employee_costs;
DELETE FROM public.firmware_update_acceptances;      -- NÃO apaga firmware_updates/equipment_types (catálogo)
DELETE FROM public.impersonation_sessions;
DELETE FROM public.audit_events;
DELETE FROM public.audit_logs;

-- ────────────────────────────────────────────────────────────
-- FASE 3 — Meio da cadeia (ecu_jobs.matrix_payment_id ->
-- financeiro_pagamentos exige ecu_jobs apagado ANTES de
-- financeiro_pagamentos — ordem abaixo já respeita isso)
-- ────────────────────────────────────────────────────────────
DELETE FROM public.support_tickets;                 -- ecu_job_id -> ecu_jobs: antes de ecu_jobs
DELETE FROM public.ecu_jobs;                         -- antes de financeiro_pagamentos (matrix_payment_id)
DELETE FROM public.orders;
DELETE FROM public.pos_sales;
DELETE FROM public.financeiro_pagamentos;
DELETE FROM public.financial_entries;
DELETE FROM public.monthly_closings;
DELETE FROM public.unit_employees;
DELETE FROM public.unit_custom_categories;
-- fornecedores/formas_pagamento/servicos: NÃO apagados (decisão do
-- Rogério) — já neutralizados na Fase 1 (unit_id -> NULL), sobrevivem
-- ao DELETE de franchise_units abaixo.

-- ────────────────────────────────────────────────────────────
-- FASE 4 — Clientes e veículos (decisão confirmada: apagar junto)
-- ────────────────────────────────────────────────────────────
DELETE FROM public.vehicles;
DELETE FROM public.customers;

-- ────────────────────────────────────────────────────────────
-- FASE 5 — Estrutura de franquia + usuários (menos o master)
-- ────────────────────────────────────────────────────────────
DELETE FROM public.user_unit_roles;
DELETE FROM public.franchise_units;

-- Cascata: profiles.id -> auth.users(id) ON DELETE CASCADE (002_profiles.sql).
-- Apagar aqui remove o profile automaticamente. NÃO apaga
-- permission_profiles/permission_entries (config, ficam intactos).
DELETE FROM auth.users WHERE email != 'web72web@gmail.com';

-- ────────────────────────────────────────────────────────────
-- FASE 6 — COUNTS DEPOIS
-- ────────────────────────────────────────────────────────────
SELECT 'DEPOIS' AS momento, t.name AS tabela, t.n AS linhas
FROM (VALUES
  ('ecu_job_events',            (SELECT count(*) FROM public.ecu_job_events)),
  ('ecu_job_files',             (SELECT count(*) FROM public.ecu_job_files)),
  ('historico_edicoes_valor',   (SELECT count(*) FROM public.historico_edicoes_valor)),
  ('commission_entries',        (SELECT count(*) FROM public.commission_entries)),
  ('support_ticket_views',      (SELECT count(*) FROM public.support_ticket_views)),
  ('support_messages',          (SELECT count(*) FROM public.support_messages)),
  ('order_items',               (SELECT count(*) FROM public.order_items)),
  ('commissions',               (SELECT count(*) FROM public.commissions)),
  ('pos_sale_items',            (SELECT count(*) FROM public.pos_sale_items)),
  ('unit_employee_costs',       (SELECT count(*) FROM public.unit_employee_costs)),
  ('firmware_update_acceptances', (SELECT count(*) FROM public.firmware_update_acceptances)),
  ('impersonation_sessions',    (SELECT count(*) FROM public.impersonation_sessions)),
  ('audit_events',              (SELECT count(*) FROM public.audit_events)),
  ('audit_logs',                (SELECT count(*) FROM public.audit_logs)),
  ('support_tickets',           (SELECT count(*) FROM public.support_tickets)),
  ('ecu_jobs',                  (SELECT count(*) FROM public.ecu_jobs)),
  ('orders',                    (SELECT count(*) FROM public.orders)),
  ('pos_sales',                 (SELECT count(*) FROM public.pos_sales)),
  ('financeiro_pagamentos',     (SELECT count(*) FROM public.financeiro_pagamentos)),
  ('financial_entries',         (SELECT count(*) FROM public.financial_entries)),
  ('monthly_closings',          (SELECT count(*) FROM public.monthly_closings)),
  ('unit_employees',            (SELECT count(*) FROM public.unit_employees)),
  ('unit_custom_categories',    (SELECT count(*) FROM public.unit_custom_categories)),
  ('vehicles',                  (SELECT count(*) FROM public.vehicles)),
  ('customers',                 (SELECT count(*) FROM public.customers)),
  ('user_unit_roles',           (SELECT count(*) FROM public.user_unit_roles)),
  ('franchise_units',           (SELECT count(*) FROM public.franchise_units)),
  ('profiles (exceto master)',  (SELECT count(*) FROM public.profiles WHERE id NOT IN (SELECT id FROM auth.users WHERE email = 'web72web@gmail.com'))),
  ('auth.users (exceto master)', (SELECT count(*) FROM auth.users WHERE email != 'web72web@gmail.com'))
) AS t(name, n);

-- FASE 6B — mesma revisão manual da FASE 0B, agora com unit_id já
-- neutralizado (NULL) pra quem estava vinculado a unidade apagada.
-- Contagem de linhas deve bater com a FASE 0B — nenhuma some.
SELECT 'fornecedores' AS tabela, id, unit_id, name, document, contact, active
  FROM public.fornecedores ORDER BY unit_id NULLS FIRST, name;

SELECT 'formas_pagamento' AS tabela, id, unit_id, name, active
  FROM public.formas_pagamento ORDER BY unit_id NULLS FIRST, name;

SELECT 'servicos' AS tabela, id, unit_id, name, description, active
  FROM public.servicos ORDER BY unit_id NULLS FIRST, name;

-- ────────────────────────────────────────────────────────────
-- CONFIRME os dois SELECTs de count acima (ANTES vs DEPOIS) antes de
-- decidir. Esperado DEPOIS: todas as linhas = 0.
-- fornecedores/formas_pagamento/servicos: comparar FASE 0B vs FASE 6B
-- — mesma contagem de linhas, só unit_id pode ter virado NULL.
-- Esperado intacto (não tocado por este script, confira manualmente
-- se quiser, não tem SELECT de count aqui pra eles):
--   products, product_prices, ecu_catalog, ecu_categories,
--   company_settings, financial_categories, franchise_levels,
--   permission_profiles, permission_entries, help_articles,
--   marketing_materials, firmware_updates, firmware_update_files,
--   equipment_types, profiles do web72web@gmail.com.
--
--   COMMIT;   -- se os counts baterem
--   ROLLBACK; -- se algo parecer errado
-- (nenhum dos dois está no arquivo de propósito — você decide e
-- digita manualmente no SQL Editor)

-- ============================================================
-- BACKUP-FIRST — rode ANTES de executar o script acima.
-- SEM BACKUP FEITO, NÃO RODE O DELETE.
--
-- Opção A — pg_dump (dados das tabelas que serão apagadas, sem schema):
--   Pegue a connection string em Supabase Dashboard → Project Settings →
--   Database → Connection string (URI). NÃO cole a connection string em
--   nenhum arquivo do repo — só no terminal, na hora.
--
--   pg_dump --db-url="<CONNECTION_STRING_AQUI>" \
--     --data-only --column-inserts \
--     -t public.ecu_jobs -t public.ecu_job_files -t public.ecu_job_events \
--     -t public.historico_edicoes_valor -t public.commission_entries \
--     -t public.support_tickets -t public.support_messages -t public.support_ticket_views \
--     -t public.orders -t public.order_items -t public.pos_sales -t public.pos_sale_items \
--     -t public.commissions -t public.financial_entries -t public.monthly_closings \
--     -t public.financeiro_pagamentos -t public.customers -t public.vehicles \
--     -t public.user_unit_roles -t public.franchise_units -t public.unit_employees \
--     -t public.unit_employee_costs -t public.unit_custom_categories \
--     -t public.firmware_update_acceptances -t public.impersonation_sessions \
--     -t public.audit_events -t public.audit_logs \
--     -t public.fornecedores -t public.formas_pagamento -t public.servicos \
--     -f backup_pre_wipe_$(date +%Y%m%d_%H%M).sql
--
-- fornecedores/formas_pagamento/servicos entram no backup por
-- prudência (o script MODIFICA unit_id -> NULL nelas, não apaga —
-- útil pra restaurar o vínculo original com a unidade se precisar).
--
-- Opção B — CSV por tabela (fallback, via psql \copy — roda uma vez por
-- tabela da lista acima, trocando NOME_DA_TABELA):
--
--   psql "<CONNECTION_STRING_AQUI>" -c "\copy public.NOME_DA_TABELA TO 'backup_NOME_DA_TABELA.csv' WITH CSV HEADER"
--
-- Guarde o(s) arquivo(s) de backup fora do repo (não commitar, não subir
-- pro R2 público). Só depois disso feito, rode o wipe acima.
-- ============================================================
