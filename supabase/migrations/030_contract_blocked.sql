-- Migration 030: contract blocked flag and reason

ALTER TABLE public.franchise_units
  ADD COLUMN IF NOT EXISTS contract_blocked        boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS contract_blocked_reason text,
  ADD COLUMN IF NOT EXISTS contract_blocked_at     timestamptz;

CREATE INDEX IF NOT EXISTS idx_franchise_units_blocked
  ON public.franchise_units(contract_blocked)
  WHERE contract_blocked = true;

COMMENT ON COLUMN public.franchise_units.contract_blocked        IS 'true = unidade bloqueada pela Matriz; impede envio de arquivos';
COMMENT ON COLUMN public.franchise_units.contract_blocked_reason IS 'Motivo do bloqueio informado pela Matriz';
COMMENT ON COLUMN public.franchise_units.contract_blocked_at     IS 'Timestamp do bloqueio';
