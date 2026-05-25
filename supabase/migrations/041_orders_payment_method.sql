-- Add payment_method column to orders (was missing from original schema)
alter table public.orders add column if not exists payment_method text;
