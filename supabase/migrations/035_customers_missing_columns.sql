-- Add missing columns to customers that the application code expects
alter table public.customers
  add column if not exists active     boolean      not null default true,
  add column if not exists price_tier price_tier   not null default 'cliente_final';

-- Backfill: all existing customers stay active with default tier
update public.customers set active = true, price_tier = 'cliente_final' where active is null;
