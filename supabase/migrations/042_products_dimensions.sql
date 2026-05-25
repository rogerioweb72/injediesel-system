-- Add shipping dimension fields to products table
alter table public.products
  add column if not exists weight_kg   numeric(8,3),
  add column if not exists height_cm   numeric(8,1),
  add column if not exists width_cm    numeric(8,1),
  add column if not exists length_cm   numeric(8,1);

comment on column public.products.weight_kg  is 'Peso em kg para cálculo de frete';
comment on column public.products.height_cm  is 'Altura em cm para cálculo de frete';
comment on column public.products.width_cm   is 'Largura em cm para cálculo de frete';
comment on column public.products.length_cm  is 'Comprimento em cm para cálculo de frete';
