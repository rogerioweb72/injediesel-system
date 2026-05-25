-- Migration 016: ECU Catalog
CREATE TABLE ecu_catalog (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  categoria           text NOT NULL,
  categoria_slug      text NOT NULL,
  arquivo_origem      text,
  secao_original      text,           -- modelo/seção (ex: "A1", "A3")
  marca               text,
  tipo_registro       text,           -- 'Dados' | 'Serviço/Adicional' | 'Observação'
  modelo_descricao    text,           -- "1.4 TFSI - 122CV"
  ano                 text,
  ganho               text,           -- "ATÉ +30CV E 4,2KG"
  cv_original         integer,        -- parsed de modelo_descricao
  cv_tuned            integer,        -- cv_original + gain parsed de ganho
  kgfm_original       numeric(6,2),   -- parsed de ganho quando presente
  kgfm_tuned          numeric(6,2),
  aparelho            text,
  protocolo           text,
  cabo                text,
  preco_franqueado    numeric(10,2),  -- do xlsx "Valor a vista"
  preco_cliente_final numeric(10,2),  -- NULL inicialmente
  observacoes         text,
  ativo               boolean NOT NULL DEFAULT true,
  ativo_ecommerce     boolean NOT NULL DEFAULT true,
  created_at          timestamptz DEFAULT now(),
  updated_at          timestamptz DEFAULT now()
);

CREATE INDEX idx_ecu_catalog_slug  ON ecu_catalog(categoria_slug);
CREATE INDEX idx_ecu_catalog_marca ON ecu_catalog(marca);
CREATE INDEX idx_ecu_catalog_ativo ON ecu_catalog(ativo, ativo_ecommerce);

-- Enable RLS
ALTER TABLE ecu_catalog ENABLE ROW LEVEL SECURITY;

-- Policies for ecu_catalog
-- Matriz can do everything
CREATE POLICY "Matriz tem acesso total ao catalogo ecu"
ON ecu_catalog FOR ALL
TO authenticated
USING (public.is_matrix_user())
WITH CHECK (public.is_matrix_user());

-- View: ecu_catalog_franqueado
-- Excludes: preco_cliente_final, arquivo_origem, cabo
-- Filters: ativo = true
CREATE OR REPLACE VIEW ecu_catalog_franqueado WITH (security_invoker = false) AS
SELECT 
  id, categoria, categoria_slug, secao_original, marca, tipo_registro,
  modelo_descricao, ano, ganho, cv_original, cv_tuned, kgfm_original,
  kgfm_tuned, aparelho, protocolo, preco_franqueado, observacoes,
  ativo, ativo_ecommerce, created_at, updated_at
FROM ecu_catalog
WHERE ativo = true;

-- View: ecu_catalog_public
-- Excludes: preco_franqueado, arquivo_origem, cabo, aparelho, protocolo, observacoes, ativo, ativo_ecommerce
-- Filters: ativo = true AND ativo_ecommerce = true
CREATE OR REPLACE VIEW ecu_catalog_public WITH (security_invoker = false) AS
SELECT 
  id, categoria, categoria_slug, marca, secao_original, 
  modelo_descricao, ano, ganho, cv_original, cv_tuned, 
  kgfm_original, kgfm_tuned, preco_cliente_final
FROM ecu_catalog
WHERE ativo = true AND ativo_ecommerce = true;

-- Grant access to the views
GRANT SELECT ON ecu_catalog_franqueado TO authenticated;
GRANT SELECT ON ecu_catalog_public TO anon, authenticated;
