-- Comprovante de pagamento para pedidos B2B
alter table public.orders
  add column if not exists comprovante_url         text,
  add column if not exists comprovante_path        text,
  add column if not exists comprovante_uploaded_at timestamptz,
  add column if not exists comprovante_expires_at  timestamptz;

-- Storage bucket for order receipts
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'order-receipts',
  'order-receipts',
  false,
  5242880,  -- 5 MB
  array['image/jpeg','image/png','image/webp','application/pdf']
)
on conflict (id) do nothing;

-- Franchise: upload own receipts
create policy "franchise_upload_receipts"
  on storage.objects for insert
  with check (
    bucket_id = 'order-receipts'
    and auth.role() = 'authenticated'
  );

-- Authenticated: read receipts
create policy "authenticated_read_receipts"
  on storage.objects for select
  using (
    bucket_id = 'order-receipts'
    and auth.role() = 'authenticated'
  );

-- Authenticated: delete receipts (cleanup)
create policy "authenticated_delete_receipts"
  on storage.objects for delete
  using (
    bucket_id = 'order-receipts'
    and auth.role() = 'authenticated'
  );
