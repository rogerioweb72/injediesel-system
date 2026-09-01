-- 112_franchise_signature.sql
-- Módulo comercial (Fase 5): assinatura eletrônica + ativação + comissão do vendedor.
--
-- Fluxo do contrato de venda:
--   pending  -> vendedor criou o rascunho (migration 109)
--   approved -> matriz aprovou e ENVIOU o link de assinatura (token + expiração)
--   active   -> representante ASSINOU (a edge function ativa a unidade e gera a comissão)
--
-- A escrita das colunas de assinatura e a criação da comissão ocorrem SOMENTE via
-- edge function `franchise-signature` (service_role) — a página de assinatura é
-- pública (sem login) e valida apenas o token. Nenhuma policy de INSERT/UPDATE é
-- aberta para authenticated aqui.

-- ── Colunas de aprovação / assinatura em franchise_units ─────────────────────
ALTER TABLE public.franchise_units
  ADD COLUMN IF NOT EXISTS sign_token            text,
  ADD COLUMN IF NOT EXISTS sign_token_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS approved_at           timestamptz,
  ADD COLUMN IF NOT EXISTS approved_by           uuid REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS signed_at             timestamptz,
  ADD COLUMN IF NOT EXISTS signed_by_name        text,
  ADD COLUMN IF NOT EXISTS signed_ip             text,
  ADD COLUMN IF NOT EXISTS signed_hash           text;   -- SHA-256 do PDF assinado

-- Token de assinatura é único (lookup direto). Índice parcial (só quando há token).
CREATE UNIQUE INDEX IF NOT EXISTS uq_franchise_units_sign_token
  ON public.franchise_units (sign_token) WHERE sign_token IS NOT NULL;

-- ── Comissão da venda de franquia (origem própria, fora do commission_entries de ECU) ──
CREATE TABLE IF NOT EXISTS public.franchise_sale_commissions (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id          uuid NOT NULL REFERENCES public.franchise_units(id) ON DELETE CASCADE,
  seller_id        uuid REFERENCES public.profiles(id),
  base_amount      numeric(12,2) NOT NULL DEFAULT 0,          -- valor do contrato (franchise_fee)
  commission_type  text NOT NULL CHECK (commission_type IN ('percent','fixed')),
  commission_value numeric(12,2) NOT NULL DEFAULT 0,          -- % (0-100) ou R$ fixo
  amount           numeric(12,2) NOT NULL DEFAULT 0,          -- valor calculado (server-side)
  status           text NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente','pago','cancelado')),
  paid_at          timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (unit_id)   -- uma comissão de venda por unidade
);

ALTER TABLE public.franchise_sale_commissions ENABLE ROW LEVEL SECURITY;

-- Leitura: usuários da matriz (inclui finance_admin e o próprio vendedor).
-- Escrita: nenhuma policy para authenticated → só service_role (edge function) grava.
DROP POLICY IF EXISTS "fsc_read_matrix" ON public.franchise_sale_commissions;
CREATE POLICY "fsc_read_matrix" ON public.franchise_sale_commissions
  FOR SELECT USING (
    public.is_matrix_user()
    OR seller_id = auth.uid()
  );

CREATE INDEX IF NOT EXISTS idx_fsc_seller ON public.franchise_sale_commissions (seller_id);
CREATE INDEX IF NOT EXISTS idx_fsc_status ON public.franchise_sale_commissions (status);
CREATE INDEX IF NOT EXISTS idx_fsc_unit   ON public.franchise_sale_commissions (unit_id);

NOTIFY pgrst, 'reload schema';
