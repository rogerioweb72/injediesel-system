-- 046_unit_employees_royalty.sql
-- Funcionários da unidade + custo mensal + royalty da franqueadora

create table if not exists unit_employees (
  id         uuid primary key default gen_random_uuid(),
  unit_id    uuid not null references franchise_units(id) on delete cascade,
  name       text not null,
  position   text not null,
  active     boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists unit_employees_unit_idx   on unit_employees (unit_id);
create index if not exists unit_employees_active_idx on unit_employees (unit_id, active);

create table if not exists unit_employee_costs (
  id          uuid primary key default gen_random_uuid(),
  employee_id uuid not null references unit_employees(id) on delete cascade,
  year        int not null check (year >= 2020 and year <= 2100),
  month       int not null check (month >= 1 and month <= 12),
  base_salary numeric(12,2) not null check (base_salary >= 0),
  benefits    jsonb not null default '[]',
  -- benefits: [{ "category": "Vale Transporte", "amount": 200.00 }]
  created_at  timestamptz not null default now(),
  unique (employee_id, year, month)
);

create index if not exists unit_employee_costs_employee_idx on unit_employee_costs (employee_id);
create index if not exists unit_employee_costs_period_idx   on unit_employee_costs (year, month);

-- Royalty da franqueadora (habilitado e configurado pela matriz)
alter table franchise_units
  add column if not exists royalty_enabled    boolean not null default false,
  add column if not exists royalty_percentage numeric(5,2) not null default 0;

-- RLS: unit_employees
alter table unit_employees enable row level security;

create policy "unit_employees_read" on unit_employees
  for select using (
    public.is_matrix_admin()
    or exists (
      select 1 from user_unit_roles uur
      where uur.unit_id = unit_employees.unit_id
        and uur.user_id = auth.uid()
    )
  );

create policy "unit_employees_write" on unit_employees
  for all using (
    exists (
      select 1 from user_unit_roles uur
      where uur.unit_id = unit_employees.unit_id
        and uur.user_id = auth.uid()
    )
  );

-- RLS: unit_employee_costs
alter table unit_employee_costs enable row level security;

create policy "unit_employee_costs_read" on unit_employee_costs
  for select using (
    public.is_matrix_admin()
    or exists (
      select 1 from unit_employees ue
      join user_unit_roles uur on uur.unit_id = ue.unit_id
      where ue.id = unit_employee_costs.employee_id
        and uur.user_id = auth.uid()
    )
  );

create policy "unit_employee_costs_write" on unit_employee_costs
  for all using (
    exists (
      select 1 from unit_employees ue
      join user_unit_roles uur on uur.unit_id = ue.unit_id
      where ue.id = unit_employee_costs.employee_id
        and uur.user_id = auth.uid()
    )
  );
