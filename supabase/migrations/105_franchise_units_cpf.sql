-- 105_franchise_units_cpf.sql
-- Unidade de Pessoa Física (CPF) no cadastro de Franqueados.
-- Alguns representantes comerciais são vendedores autônomos (PF): só têm CPF, não
-- CNPJ. Opção B (aditiva): MANTÉM franchise_units.cnpj intacto e ADICIONA cpf +
-- document_type. A unidade preenche CNPJ (PJ) OU CPF (PF) conforme document_type.
-- NÃO renomeia/remove cnpj. Sem dedup de CPF (consistente com cnpj, que também não
-- tem UNIQUE) — se um dia quiser impedir CPF duplicado, criar índice único parcial
-- WHERE document_type = 'cpf'.

ALTER TABLE public.franchise_units
  ADD COLUMN IF NOT EXISTS cpf text,
  ADD COLUMN IF NOT EXISTS document_type text NOT NULL DEFAULT 'cnpj';

-- Constraint idempotente (ADD CONSTRAINT não tem IF NOT EXISTS em toda versão).
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'franchise_units_document_type_chk'
  ) THEN
    ALTER TABLE public.franchise_units
      ADD CONSTRAINT franchise_units_document_type_chk
      CHECK (document_type IN ('cnpj','cpf'));
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
