-- Migration 018: foto_url column for ecu_catalog
ALTER TABLE ecu_catalog ADD COLUMN IF NOT EXISTS foto_url text;

-- Storage bucket for ECU catalog product photos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'ecu-catalog-fotos',
  'ecu-catalog-fotos',
  true,
  5242880,  -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated matrix users to upload/delete
CREATE POLICY "Matriz pode gerenciar fotos ecu"
ON storage.objects FOR ALL
TO authenticated
USING (
  bucket_id = 'ecu-catalog-fotos'
  AND public.is_matrix_user()
)
WITH CHECK (
  bucket_id = 'ecu-catalog-fotos'
  AND public.is_matrix_user()
);

-- Allow anyone to read (photos are public)
CREATE POLICY "Fotos ecu sao publicas"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (bucket_id = 'ecu-catalog-fotos');
