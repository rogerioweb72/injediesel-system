-- 052_help_images_bucket.sql
-- Bucket para imagens de capa dos artigos da base de conhecimento

INSERT INTO storage.buckets (id, name, public)
VALUES ('help-images', 'help-images', true)
ON CONFLICT (id) DO NOTHING;

-- Usuários da matriz podem fazer upload
CREATE POLICY "help_images_upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'help-images'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND role IN ('company_admin','operations_admin','finance_admin','support_agent','seller')
    )
  );

-- Leitura pública (bucket já é public, mas garante via policy também)
CREATE POLICY "help_images_read" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'help-images');

-- Deleção somente pela matriz
CREATE POLICY "help_images_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'help-images'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND role IN ('company_admin','operations_admin')
    )
  );
