-- 069_add_document_type.sql
-- Adiciona campo document_type em customers para diferenciar entre CPF/CNPJ/Estrangeiro
ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS document_type varchar(20) NOT NULL DEFAULT 'cpf';

COMMENT ON COLUMN public.customers.document_type IS 'Tipo de documento: cpf, cnpj, ou estrangeiro';

-- Índice para buscar clientes por tipo de documento
CREATE INDEX IF NOT EXISTS idx_customers_document_type ON public.customers(document_type);
