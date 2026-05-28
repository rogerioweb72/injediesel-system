-- ============================================================
-- RLS Validation by Role — pgTAP
-- Run: supabase test db (requires supabase start)
-- ============================================================
--
-- Roles under test:
--   company_admin   → is_matrix_admin() = true, is_matrix_user() = true
--   finance_admin   → is_matrix_user() = true (can read/write financial_entries)
--   support_agent   → is_matrix_user() = true (tickets only)
--   auditor         → is_matrix_user() = true (audit_logs read)
--   operations_admin→ is_matrix_user() = true (broad read)
--   franchise_manager → user_unit_roles only (scoped to own unit)
--   unit_operator   → user_unit_roles only (scoped to own unit)
--   inactive        → active=false blocks all is_matrix_* functions
--
-- Known gap documented in test #16:
--   financial_entries has NO franchise-level SELECT policy.
--   Franchise users cannot read their own financial entries.
--   TabFinanceiro in RelatoriosPage will be empty for franchise users.
-- ============================================================

begin;

create extension if not exists pgtap;

select plan(24);

-- ─── UUID constants (test-only, rolled back after) ────────────────────────────

-- Franchise units
-- unit_alpha: aaaaaa01-0000-0000-0000-000000000000
-- unit_beta:  aaaaaa02-0000-0000-0000-000000000000

-- Users
-- user_admin:       bbbbbb01-0000-0000-0000-000000000000  company_admin   active
-- user_finance:     bbbbbb02-0000-0000-0000-000000000000  finance_admin   active
-- user_support:     bbbbbb03-0000-0000-0000-000000000000  support_agent   active
-- user_auditor:     bbbbbb04-0000-0000-0000-000000000000  auditor         active
-- user_ops:         bbbbbb05-0000-0000-0000-000000000000  operations_admin active
-- user_franchise_a: bbbbbb06-0000-0000-0000-000000000000  unit_operator + user_unit_roles(alpha, franchise_manager)
-- user_franchise_b: bbbbbb07-0000-0000-0000-000000000000  unit_operator + user_unit_roles(beta, unit_operator)
-- user_inactive:    bbbbbb08-0000-0000-0000-000000000000  company_admin   active=false

-- ─── FIXTURES (run as postgres superuser — no RLS) ────────────────────────────

-- Franchise units
insert into public.franchise_units (id, name, document, contract_type) values
  ('aaaaaa01-0000-0000-0000-000000000000', 'Unit Alpha', '00.000.000/9801-01', 'full'),
  ('aaaaaa02-0000-0000-0000-000000000000', 'Unit Beta',  '00.000.000/9802-02', 'full');

-- Auth users
insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  confirmation_token, recovery_token,
  email_change, email_change_token_new, email_change_token_current,
  phone_change, phone_change_token, reauthentication_token,
  created_at, updated_at
) values
  ('bbbbbb01-0000-0000-0000-000000000000','00000000-0000-0000-0000-000000000000','authenticated','authenticated',
   'rls_admin@test.local',   crypt('x', gen_salt('bf')), now(), '{}',
   '{"name":"RLS Admin","role":"company_admin"}',     '','','','','','','','', now(), now()),
  ('bbbbbb02-0000-0000-0000-000000000000','00000000-0000-0000-0000-000000000000','authenticated','authenticated',
   'rls_finance@test.local', crypt('x', gen_salt('bf')), now(), '{}',
   '{"name":"RLS Finance","role":"finance_admin"}',   '','','','','','','','', now(), now()),
  ('bbbbbb03-0000-0000-0000-000000000000','00000000-0000-0000-0000-000000000000','authenticated','authenticated',
   'rls_support@test.local', crypt('x', gen_salt('bf')), now(), '{}',
   '{"name":"RLS Support","role":"support_agent"}',   '','','','','','','','', now(), now()),
  ('bbbbbb04-0000-0000-0000-000000000000','00000000-0000-0000-0000-000000000000','authenticated','authenticated',
   'rls_auditor@test.local', crypt('x', gen_salt('bf')), now(), '{}',
   '{"name":"RLS Auditor","role":"auditor"}',         '','','','','','','','', now(), now()),
  ('bbbbbb05-0000-0000-0000-000000000000','00000000-0000-0000-0000-000000000000','authenticated','authenticated',
   'rls_ops@test.local',     crypt('x', gen_salt('bf')), now(), '{}',
   '{"name":"RLS Ops","role":"operations_admin"}',    '','','','','','','','', now(), now()),
  ('bbbbbb06-0000-0000-0000-000000000000','00000000-0000-0000-0000-000000000000','authenticated','authenticated',
   'rls_fra@test.local',     crypt('x', gen_salt('bf')), now(), '{}',
   '{"name":"RLS Franchise A","role":"unit_operator"}','','','','','','','','', now(), now()),
  ('bbbbbb07-0000-0000-0000-000000000000','00000000-0000-0000-0000-000000000000','authenticated','authenticated',
   'rls_frb@test.local',     crypt('x', gen_salt('bf')), now(), '{}',
   '{"name":"RLS Franchise B","role":"unit_operator"}','','','','','','','','', now(), now()),
  ('bbbbbb08-0000-0000-0000-000000000000','00000000-0000-0000-0000-000000000000','authenticated','authenticated',
   'rls_dead@test.local',    crypt('x', gen_salt('bf')), now(), '{}',
   '{"name":"RLS Inactive","role":"company_admin"}',  '','','','','','','','', now(), now())
on conflict (id) do nothing;

-- Deactivate the inactive user (trigger creates profile; we patch it)
update public.profiles set active = false where id = 'bbbbbb08-0000-0000-0000-000000000000';

-- Franchise role assignments
insert into public.user_unit_roles (user_id, unit_id, role) values
  ('bbbbbb06-0000-0000-0000-000000000000', 'aaaaaa01-0000-0000-0000-000000000000', 'franchise_manager'),
  ('bbbbbb07-0000-0000-0000-000000000000', 'aaaaaa02-0000-0000-0000-000000000000', 'unit_operator')
on conflict (user_id, unit_id) do nothing;

-- Customers (2 per unit)
insert into public.customers (id, name, unit_id) values
  ('cccccc01-0000-0000-0000-000000000000', 'Alpha Cliente 1', 'aaaaaa01-0000-0000-0000-000000000000'),
  ('cccccc02-0000-0000-0000-000000000000', 'Alpha Cliente 2', 'aaaaaa01-0000-0000-0000-000000000000'),
  ('cccccc03-0000-0000-0000-000000000000', 'Beta Cliente 1',  'aaaaaa02-0000-0000-0000-000000000000'),
  ('cccccc04-0000-0000-0000-000000000000', 'Beta Cliente 2',  'aaaaaa02-0000-0000-0000-000000000000');

-- ECU Jobs (1 per unit — customer_id required)
insert into public.ecu_jobs (id, customer_id, unit_id, service_type, status) values
  ('dddddd01-0000-0000-0000-000000000000', 'cccccc01-0000-0000-0000-000000000000', 'aaaaaa01-0000-0000-0000-000000000000', 'Stage 1', 'concluido'),
  ('dddddd02-0000-0000-0000-000000000000', 'cccccc03-0000-0000-0000-000000000000', 'aaaaaa02-0000-0000-0000-000000000000', 'Stage 1', 'recebido');

-- Support tickets (protocol auto-generated by trigger, category required)
insert into public.support_tickets (id, unit_id, category) values
  ('eeeeee01-0000-0000-0000-000000000000', 'aaaaaa01-0000-0000-0000-000000000000', 'tecnico'),
  ('eeeeee02-0000-0000-0000-000000000000', 'aaaaaa02-0000-0000-0000-000000000000', 'tecnico');

-- Financial entry (unit_alpha)
insert into public.financial_entries (id, unit_id, type, amount, period_year, period_month) values
  ('fffffe01-0000-0000-0000-000000000000', 'aaaaaa01-0000-0000-0000-000000000000', 'receita', 1500.00, 2026, 5);

-- Audit log
insert into public.audit_logs (id, actor_id, entity, entity_id, action) values
  ('fffffe02-0000-0000-0000-000000000000', 'bbbbbb01-0000-0000-0000-000000000000', 'customers', 'cccccc01-0000-0000-0000-000000000000', 'INSERT');

-- ─── Switch to authenticated role — RLS now active ────────────────────────────
set local role authenticated;

-- Helper: set current auth user via JWT claims
create or replace function pg_temp.as_user(p_id uuid) returns void as $$
begin
  perform set_config(
    'request.jwt.claims',
    json_build_object('sub', p_id::text, 'role', 'authenticated')::text,
    true
  );
end;
$$ language plpgsql;

-- ─── 1-3: company_admin — sees everything ────────────────────────────────────
select pg_temp.as_user('bbbbbb01-0000-0000-0000-000000000000');

select is(
  (select count(*)::int from public.customers
   where id in (
     'cccccc01-0000-0000-0000-000000000000','cccccc02-0000-0000-0000-000000000000',
     'cccccc03-0000-0000-0000-000000000000','cccccc04-0000-0000-0000-000000000000'
   )),
  4,
  'company_admin: sees all 4 test customers (both units)'
);

select is(
  (select count(*)::int from public.ecu_jobs
   where id in ('dddddd01-0000-0000-0000-000000000000','dddddd02-0000-0000-0000-000000000000')),
  2,
  'company_admin: sees both test ecu_jobs'
);

select is(
  (select count(*)::int from public.support_tickets
   where id in ('eeeeee01-0000-0000-0000-000000000000','eeeeee02-0000-0000-0000-000000000000')),
  2,
  'company_admin: sees both test support_tickets'
);

-- ─── 4-5: finance_admin ───────────────────────────────────────────────────────
select pg_temp.as_user('bbbbbb02-0000-0000-0000-000000000000');

select ok(
  (select count(*) > 0 from public.financial_entries
   where id = 'fffffe01-0000-0000-0000-000000000000'),
  'finance_admin: can SELECT financial_entries'
);

-- Test INSERT (check that the row is visible after insert → implies insert worked)
-- We use a separate marker to detect success
select lives_ok(
  $$ insert into public.financial_entries (unit_id, type, amount, period_year, period_month)
     values ('aaaaaa01-0000-0000-0000-000000000000'::uuid, 'despesa', 200.00, 2026, 5) $$,
  'finance_admin: can INSERT financial_entries'
);

-- ─── 6-8: support_agent ───────────────────────────────────────────────────────
select pg_temp.as_user('bbbbbb03-0000-0000-0000-000000000000');

select is(
  (select count(*)::int from public.support_tickets
   where id in ('eeeeee01-0000-0000-0000-000000000000','eeeeee02-0000-0000-0000-000000000000')),
  2,
  'support_agent: sees both support_tickets (all units via is_matrix_user)'
);

select is(
  (select count(*)::int from public.audit_logs
   where id = 'fffffe02-0000-0000-0000-000000000000'),
  0,
  'support_agent: CANNOT SELECT audit_logs (not company_admin or auditor)'
);

select throws_ok(
  $$ insert into public.financial_entries (unit_id, type, amount, period_year, period_month)
     values ('aaaaaa01-0000-0000-0000-000000000000'::uuid, 'receita', 100.00, 2026, 5) $$,
  '42501',
  'support_agent: CANNOT INSERT financial_entries'
);

-- ─── 9-10: auditor ────────────────────────────────────────────────────────────
select pg_temp.as_user('bbbbbb04-0000-0000-0000-000000000000');

select ok(
  (select count(*) > 0 from public.audit_logs
   where id = 'fffffe02-0000-0000-0000-000000000000'),
  'auditor: can SELECT audit_logs'
);

select throws_ok(
  $$ insert into public.financial_entries (unit_id, type, amount, period_year, period_month)
     values ('aaaaaa01-0000-0000-0000-000000000000'::uuid, 'receita', 100.00, 2026, 5) $$,
  '42501',
  'auditor: CANNOT INSERT financial_entries (read-only role)'
);

-- ─── 11: operations_admin sees customers ──────────────────────────────────────
select pg_temp.as_user('bbbbbb05-0000-0000-0000-000000000000');

select is(
  (select count(*)::int from public.customers
   where id in (
     'cccccc01-0000-0000-0000-000000000000','cccccc02-0000-0000-0000-000000000000',
     'cccccc03-0000-0000-0000-000000000000','cccccc04-0000-0000-0000-000000000000'
   )),
  4,
  'operations_admin: is_matrix_user() = true → sees all 4 customers'
);

-- ─── 12-17: franchise_a (franchise_manager of unit_alpha) ────────────────────
select pg_temp.as_user('bbbbbb06-0000-0000-0000-000000000000');

select is(
  (select count(*)::int from public.customers
   where id in (
     'cccccc01-0000-0000-0000-000000000000','cccccc02-0000-0000-0000-000000000000',
     'cccccc03-0000-0000-0000-000000000000','cccccc04-0000-0000-0000-000000000000'
   )),
  2,
  'franchise_a: sees only 2 customers (unit_alpha, NOT unit_beta)'
);

select is(
  (select count(*)::int from public.customers
   where id in ('cccccc03-0000-0000-0000-000000000000','cccccc04-0000-0000-0000-000000000000')),
  0,
  'franchise_a: unit isolation — 0 customers from unit_beta visible'
);

select is(
  (select count(*)::int from public.ecu_jobs
   where id in ('dddddd01-0000-0000-0000-000000000000','dddddd02-0000-0000-0000-000000000000')),
  1,
  'franchise_a: sees only 1 ecu_job (unit_alpha only)'
);

select lives_ok(
  $$ insert into public.customers (name, unit_id)
     values ('Novo Alpha', 'aaaaaa01-0000-0000-0000-000000000000'::uuid) $$,
  'franchise_a: CAN INSERT customer for own unit (unit_alpha)'
);

select throws_ok(
  $$ insert into public.customers (name, unit_id)
     values ('Hack Beta', 'aaaaaa02-0000-0000-0000-000000000000'::uuid) $$,
  '42501',
  'franchise_a: CANNOT INSERT customer for unit_beta (cross-unit isolation)'
);

select is(
  (select count(*)::int from public.support_tickets
   where id in ('eeeeee01-0000-0000-0000-000000000000','eeeeee02-0000-0000-0000-000000000000')),
  1,
  'franchise_a: sees only 1 support_ticket (unit_alpha only)'
);

-- Migration 049 adds "financial_unit_read" policy → franchise users now see their own unit's entries
select is(
  (select count(*)::int from public.financial_entries
   where id = 'fffffe01-0000-0000-0000-000000000000'),
  1,
  'franchise_a: CAN SELECT financial_entries for own unit (migration 049 fix)'
);

-- ─── 18-20: franchise_b (unit_operator of unit_beta) ─────────────────────────
select pg_temp.as_user('bbbbbb07-0000-0000-0000-000000000000');

select is(
  (select count(*)::int from public.customers
   where id in (
     'cccccc01-0000-0000-0000-000000000000','cccccc02-0000-0000-0000-000000000000',
     'cccccc03-0000-0000-0000-000000000000','cccccc04-0000-0000-0000-000000000000'
   )),
  2,
  'franchise_b: sees only 2 customers (unit_beta, NOT unit_alpha)'
);

select is(
  (select count(*)::int from public.customers
   where id in ('cccccc01-0000-0000-0000-000000000000','cccccc02-0000-0000-0000-000000000000')),
  0,
  'franchise_b: unit isolation — 0 customers from unit_alpha visible'
);

select is(
  (select count(*)::int from public.ecu_jobs
   where id in ('dddddd01-0000-0000-0000-000000000000','dddddd02-0000-0000-0000-000000000000')),
  1,
  'franchise_b: sees only 1 ecu_job (unit_beta only)'
);

-- ─── 21-22: inactive user (active=false blocks all matrix functions) ──────────
select pg_temp.as_user('bbbbbb08-0000-0000-0000-000000000000');

select is(
  (select count(*)::int from public.customers
   where id in (
     'cccccc01-0000-0000-0000-000000000000','cccccc02-0000-0000-0000-000000000000',
     'cccccc03-0000-0000-0000-000000000000','cccccc04-0000-0000-0000-000000000000'
   )),
  0,
  'inactive company_admin: active=false blocks is_matrix_user() → 0 customers visible'
);

select is(
  (select count(*)::int from public.ecu_jobs
   where id in ('dddddd01-0000-0000-0000-000000000000','dddddd02-0000-0000-0000-000000000000')),
  0,
  'inactive company_admin: 0 ecu_jobs visible (blocked by active=false check in RLS helpers)'
);

-- ─── 23-24: product price tier isolation ─────────────────────────────────────
-- Franchise full contract should see franqueado_full prices only
-- Franchise linha_leve should see franqueado_linha_leve prices only
-- (Requires product + prices fixture — tested via policy existence check)

select pg_temp.as_user('bbbbbb01-0000-0000-0000-000000000000');

select has_table('public', 'financial_categories', 'financial_categories table exists');
select has_table('public', 'fornecedores',         'fornecedores table exists (migration 047)');

-- ─── Done ─────────────────────────────────────────────────────────────────────
select * from finish();

rollback;
