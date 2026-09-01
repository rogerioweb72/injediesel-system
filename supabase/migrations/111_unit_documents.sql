-- 111_unit_documents.sql
-- Documentos vinculados à unidade: contrato GERADO (venda) + contratos ANTIGOS
-- anexados (adendo). Bucket privado unit-documents + tabela unit_documents.
-- Caminho dos arquivos: '{unit_id}/{arquivo}' — usado no scoping da RLS de storage.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('unit-documents', 'unit-documents', false, 10485760,
  ARRAY['application/pdf','image/jpeg','image/png','image/webp'])
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.unit_documents (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id      uuid NOT NULL REFERENCES public.franchise_units(id) ON DELETE CASCADE,
  kind         text NOT NULL DEFAULT 'other'
               CHECK (kind IN ('contract_generated','contract_uploaded','other')),
  name         text NOT NULL,
  storage_path text NOT NULL,
  created_by   uuid REFERENCES public.profiles(id),
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_unit_documents_unit ON public.unit_documents(unit_id);

ALTER TABLE public.unit_documents ENABLE ROW LEVEL SECURITY;

-- Leitura: matriz + gestor da própria unidade.
DROP POLICY IF EXISTS "unit_documents_read" ON public.unit_documents;
CREATE POLICY "unit_documents_read" ON public.unit_documents FOR SELECT USING (
  public.is_matrix_user()
  OR unit_id IN (SELECT unit_id FROM public.user_unit_roles WHERE user_id = auth.uid())
);

-- Escrita: matriz (admins + seller + finance) — cria o registro do contrato/anexo.
DROP POLICY IF EXISTS "unit_documents_write" ON public.unit_documents;
CREATE POLICY "unit_documents_write" ON public.unit_documents FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid()
          AND p.role IN ('company_admin','operations_admin','system_ti','seller','finance_admin')
          AND p.active)
);

GRANT SELECT, INSERT, DELETE ON public.unit_documents TO authenticated;

-- ── Storage RLS (bucket unit-documents) ──
-- Leitura: matriz OU membro da unidade (pasta = unit_id).
DROP POLICY IF EXISTS "unit_documents_storage_read" ON storage.objects;
CREATE POLICY "unit_documents_storage_read" ON storage.objects FOR SELECT USING (
  bucket_id = 'unit-documents' AND (
    public.is_matrix_user()
    OR (storage.foldername(name))[1] IN (
      SELECT unit_id::text FROM public.user_unit_roles WHERE user_id = auth.uid()
    )
  )
);
-- Upload: matriz (admins + seller + finance).
DROP POLICY IF EXISTS "unit_documents_storage_write" ON storage.objects;
CREATE POLICY "unit_documents_storage_write" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'unit-documents' AND EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = auth.uid()
      AND p.role IN ('company_admin','operations_admin','system_ti','seller','finance_admin')
      AND p.active)
);

NOTIFY pgrst, 'reload schema';
