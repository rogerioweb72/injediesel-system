-- supabase/migrations/073_ecu_value_edit_history.sql

-- 1. Tabela de auditoria de edições de valor
CREATE TABLE IF NOT EXISTS public.historico_edicoes_valor (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        UUID NOT NULL,
  arquivo_id       UUID NOT NULL REFERENCES public.ecu_jobs(id) ON DELETE CASCADE,
  valor_anterior   NUMERIC(12,2) NOT NULL,
  valor_novo       NUMERIC(12,2) NOT NULL,
  motivo           TEXT NOT NULL,
  status           TEXT NOT NULL DEFAULT 'AGUARDANDO_APROVACAO'
    CHECK (status IN ('AGUARDANDO_APROVACAO', 'APROVADO', 'RECUSADO', 'CANCELADO_PAGAMENTO')),
  solicitado_por   UUID NOT NULL REFERENCES auth.users(id),
  solicitado_em    TIMESTAMPTZ NOT NULL DEFAULT now(),
  aprovado_por     UUID REFERENCES auth.users(id),
  aprovado_em      TIMESTAMPTZ,
  motivo_recusa    TEXT,
  created_at       TIMESTAMPTZ DEFAULT now()
);

-- 2. RLS: apenas matriz (is_matrix_user é função existente no projeto)
ALTER TABLE public.historico_edicoes_valor ENABLE ROW LEVEL SECURITY;

CREATE POLICY "matriz_all_hev" ON public.historico_edicoes_valor
  FOR ALL USING (is_matrix_user());

-- 3. Colunas de controle em ecu_jobs
ALTER TABLE public.ecu_jobs
  ADD COLUMN IF NOT EXISTS edicao_valor_pendente     BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS edicao_valor_historico_id UUID REFERENCES public.historico_edicoes_valor(id);

-- 4. Índice parcial para o painel do financeiro
CREATE INDEX IF NOT EXISTS idx_historico_edicoes_pendentes
  ON public.historico_edicoes_valor(solicitado_em)
  WHERE status = 'AGUARDANDO_APROVACAO';
