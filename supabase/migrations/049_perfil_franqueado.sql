-- 049_perfil_franqueado.sql
-- Campos editáveis pelo próprio franqueado (representante)
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS phone          text,
  ADD COLUMN IF NOT EXISTS birth_date     date,
  ADD COLUMN IF NOT EXISTS avatar_url     text,
  ADD COLUMN IF NOT EXISTS cep            text,
  ADD COLUMN IF NOT EXISTS street         text,
  ADD COLUMN IF NOT EXISTS address_number text,
  ADD COLUMN IF NOT EXISTS complement     text,
  ADD COLUMN IF NOT EXISTS neighborhood   text,
  ADD COLUMN IF NOT EXISTS city           text,
  ADD COLUMN IF NOT EXISTS state          text;

-- Campos somente-leitura para o franqueado (gerenciados pela matriz)
ALTER TABLE franchise_units
  ADD COLUMN IF NOT EXISTS contract_start_date date,
  ADD COLUMN IF NOT EXISTS razao_social        text,
  ADD COLUMN IF NOT EXISTS inscricao_estadual  text,
  ADD COLUMN IF NOT EXISTS data_abertura       date,
  ADD COLUMN IF NOT EXISTS plan                text,
  ADD COLUMN IF NOT EXISTS financial_status    text DEFAULT 'adimplente',
  ADD COLUMN IF NOT EXISTS file_limit          integer,
  ADD COLUMN IF NOT EXISTS commercial_phone    text,
  ADD COLUMN IF NOT EXISTS commercial_email    text,
  ADD COLUMN IF NOT EXISTS business_hours      text,
  ADD COLUMN IF NOT EXISTS main_technician     jsonb;
