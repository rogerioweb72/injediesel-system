-- 048_financial_categories_active.sql
-- Adds active flag to financial_categories for soft-delete support

alter table financial_categories
  add column if not exists active boolean not null default true;
