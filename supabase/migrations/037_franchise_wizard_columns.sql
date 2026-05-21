-- supabase/migrations/037_franchise_wizard_columns.sql

-- Novas colunas em franchise_units
ALTER TABLE franchise_units
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'em_implantacao'
    CHECK (status IN ('em_implantacao','ativa','suspensa','encerrada')),
  ADD COLUMN IF NOT EXISTS logo_url TEXT,
  ADD COLUMN IF NOT EXISTS website TEXT,
  ADD COLUMN IF NOT EXISTS perimetro_exclusivo BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS responsavel_legal_nome TEXT,
  ADD COLUMN IF NOT EXISTS responsavel_legal_cpf TEXT,
  ADD COLUMN IF NOT EXISTS responsavel_legal_email TEXT,
  ADD COLUMN IF NOT EXISTS responsavel_legal_telefone TEXT,
  ADD COLUMN IF NOT EXISTS responsavel_legal_cargo TEXT,
  ADD COLUMN IF NOT EXISTS responsavel_op_mesmo_legal BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS responsavel_op_nome TEXT,
  ADD COLUMN IF NOT EXISTS responsavel_op_email TEXT,
  ADD COLUMN IF NOT EXISTS responsavel_op_telefone TEXT,
  ADD COLUMN IF NOT EXISTS cep TEXT,
  ADD COLUMN IF NOT EXISTS logradouro TEXT,
  ADD COLUMN IF NOT EXISTS numero TEXT,
  ADD COLUMN IF NOT EXISTS complemento TEXT,
  ADD COLUMN IF NOT EXISTS bairro TEXT,
  ADD COLUMN IF NOT EXISTS limite_colaboradores INTEGER,
  ADD COLUMN IF NOT EXISTS observacoes_internas TEXT;

-- Trigger: sincronizar active com status
CREATE OR REPLACE FUNCTION sync_franchise_status()
RETURNS TRIGGER AS $$
BEGIN
  NEW.active := (NEW.status = 'ativa');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_franchise_status ON franchise_units;
CREATE TRIGGER trg_franchise_status
  BEFORE INSERT OR UPDATE ON franchise_units
  FOR EACH ROW EXECUTE FUNCTION sync_franchise_status();

-- Migrar registros existentes
UPDATE franchise_units
SET status = CASE WHEN active THEN 'ativa' ELSE 'em_implantacao' END
WHERE status = 'em_implantacao';

-- Bucket logos-unidades (público para preview direto)
INSERT INTO storage.buckets (id, name, public)
VALUES ('logos-unidades', 'logos-unidades', TRUE)
ON CONFLICT (id) DO NOTHING;

-- RLS policies para o bucket
CREATE POLICY "Authenticated upload logos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'logos-unidades');

CREATE POLICY "Public read logos"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'logos-unidades');

CREATE POLICY "Authenticated update logos"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'logos-unidades');
