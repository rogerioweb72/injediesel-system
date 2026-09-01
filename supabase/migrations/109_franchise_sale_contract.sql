-- 109_franchise_sale_contract.sql
-- Módulo comercial de venda de franquia (Fase 1/2): campos do CONTRATO/venda em
-- franchise_units. A unidade nasce como rascunho (sale_status='pending') quando o
-- vendedor da matriz fecha o contrato; a ATIVAÇÃO (convite + status ativa) acontece
-- depois, na aprovação/assinatura (fases seguintes). Aditivo — não toca no fluxo
-- "Cadastrar Existente".

ALTER TABLE public.franchise_units
  -- Comercial
  ADD COLUMN IF NOT EXISTS franchise_fee        numeric(12,2),          -- valor do contrato (ativação)
  ADD COLUMN IF NOT EXISTS payment_plan         text,                   -- a_vista | 3x | 6x | 12x
  ADD COLUMN IF NOT EXISTS sale_payment_method  text,                   -- boleto | pix | cartao | transferencia
  ADD COLUMN IF NOT EXISTS sale_seller_id       uuid REFERENCES public.profiles(id), -- vendedor que fechou (comissão)
  -- Responsável legal (complemento)
  ADD COLUMN IF NOT EXISTS responsavel_legal_rg text,
  -- Estado do contrato de venda
  ADD COLUMN IF NOT EXISTS sale_status          text NOT NULL DEFAULT 'none';
  -- none = unidade cadastrada pelo fluxo antigo (sem venda)
  -- pending = contrato criado pelo vendedor, aguardando aprovação/ativação
  -- approved | signed | active = fases seguintes

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'franchise_units_sale_status_chk') THEN
    ALTER TABLE public.franchise_units
      ADD CONSTRAINT franchise_units_sale_status_chk
      CHECK (sale_status IN ('none','pending','approved','signed','active'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_franchise_units_sale_status
  ON public.franchise_units (sale_status) WHERE sale_status <> 'none';

-- RBAC: o vendedor da matriz (seller) pode CRIAR o contrato, mas só como RASCUNHO
-- (sale_status='pending' e active=false). Ativação (active=true / status) continua
-- restrita ao admin (policy franchise_units_admin_all FOR ALL). Franquia nunca insere.
DROP POLICY IF EXISTS "franchise_units_seller_insert_draft" ON public.franchise_units;
CREATE POLICY "franchise_units_seller_insert_draft" ON public.franchise_units
  FOR INSERT
  WITH CHECK (
    sale_status = 'pending'
    AND active = false
    AND (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'seller'
  );

NOTIFY pgrst, 'reload schema';
