-- 051_help_articles.sql
-- Base de conhecimento: artigos estilo blog criados pela matriz,
-- visíveis para unidades, matriz ou ambos.

CREATE TABLE IF NOT EXISTS public.help_articles (
  id           uuid         NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title        text         NOT NULL,
  excerpt      text,
  body         text,
  cover_url    text,
  youtube_url  text,
  category     text         NOT NULL DEFAULT 'geral',
  for_units    boolean      NOT NULL DEFAULT true,
  for_matrix   boolean      NOT NULL DEFAULT true,
  status       text         NOT NULL DEFAULT 'draft',
  position     integer      NOT NULL DEFAULT 0,
  created_by   uuid         REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at   timestamptz  NOT NULL DEFAULT now(),
  updated_at   timestamptz  NOT NULL DEFAULT now(),

  CONSTRAINT help_articles_status_check
    CHECK (status IN ('draft', 'published')),
  CONSTRAINT help_articles_audience_check
    CHECK (for_units OR for_matrix),
  CONSTRAINT help_articles_category_check
    CHECK (category IN ('ecu','tabela_remap','clientes','loja','financeiro','suporte','perfil','geral'))
);

ALTER TABLE public.help_articles ENABLE ROW LEVEL SECURITY;

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION public.set_help_articles_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_help_articles_updated_at
  BEFORE UPDATE ON public.help_articles
  FOR EACH ROW EXECUTE FUNCTION public.set_help_articles_updated_at();

-- Política: usuários da matriz (sem role de unidade) têm acesso total
CREATE POLICY "help_matrix_all" ON public.help_articles
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND role IN ('company_admin','operations_admin','finance_admin','support_agent','seller','auditor')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND role IN ('company_admin','operations_admin','finance_admin','support_agent','seller','auditor')
    )
  );

-- Política: franqueados lêem apenas publicados visíveis para unidades
CREATE POLICY "help_franchisee_read" ON public.help_articles
  FOR SELECT TO authenticated
  USING (
    status = 'published'
    AND for_units = true
    AND EXISTS (
      SELECT 1 FROM public.user_unit_roles
      WHERE user_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_help_articles_status   ON public.help_articles(status);
CREATE INDEX IF NOT EXISTS idx_help_articles_category ON public.help_articles(category);
