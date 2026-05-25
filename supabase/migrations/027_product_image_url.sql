alter table public.products add column if not exists image_url text;

-- Public storage bucket for product images
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'product-images',
  'product-images',
  true,
  5242880,
  array['image/jpeg','image/png','image/webp','image/gif']
)
on conflict (id) do nothing;

-- Matrix users can upload/delete
create policy "product_images_matrix_write" on storage.objects
  for all using (
    bucket_id = 'product-images' and
    (is_system_ti() or current_user_role() = any(array[
      'company_admin'::user_role,
      'operations_admin'::user_role,
      'seller'::user_role
    ]))
  );

-- Anyone can read
create policy "product_images_public_read" on storage.objects
  for select using (bucket_id = 'product-images');
