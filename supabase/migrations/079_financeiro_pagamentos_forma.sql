-- ============================================================
-- 079_financeiro_pagamentos_forma.sql
--
-- Forma de pagamento no lote de cobranças de franquia (Feature 3).
-- Nullable, sem default: pagamento novo sempre envia (obrigatório
-- no modal, front); histórico antigo exibe "—" — não inventa valor
-- pra linha que nunca teve essa informação.
-- ============================================================

ALTER TABLE public.financeiro_pagamentos
  ADD COLUMN IF NOT EXISTS forma_pagamento TEXT;
