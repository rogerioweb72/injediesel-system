-- 102_welcome_video_url.sql (12/08/2026)
-- Vídeo de boas-vindas da Central de Ajuda — hoje hardcoded no front
-- (AjudaPage.tsx: WELCOME_VIDEO_ID = 'dQw4w9WgXcQ', placeholder). Passa a
-- ser editável pela matriz via company_settings.
-- Numeração: pedido citava "101", mas 101_support_whatsapp.sql já existe
-- no repo — usando 102, próximo livre.
--
-- Mesmo padrão de 101_support_whatsapp.sql: company_settings é single-row
-- fixed-columns (não key-value); franquia NÃO tem SELECT direto na tabela
-- (policy company_settings_matrix_read exige is_matrix_user()) — expõe só
-- o campo necessário via função SECURITY DEFINER autenticada, sem abrir a
-- linha inteira pra franquia.

ALTER TABLE public.company_settings
  ADD COLUMN IF NOT EXISTS welcome_video_url text;

-- Retorna apenas a URL do vídeo de boas-vindas, sem expor a linha inteira
-- de company_settings pra quem não é matrix_user (franquia).
CREATE OR REPLACE FUNCTION public.get_welcome_video_url()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT welcome_video_url
  FROM public.company_settings
  ORDER BY updated_at DESC
  LIMIT 1
$$;

-- Somente usuários autenticados podem chamar (anon/public revogados) —
-- mesma postura de get_support_whatsapp(), mesmo o conteúdo não sendo
-- sensível: evita expor a função a chamadas anônimas por padrão.
REVOKE ALL ON FUNCTION public.get_welcome_video_url() FROM public;
REVOKE ALL ON FUNCTION public.get_welcome_video_url() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_welcome_video_url() TO authenticated;

NOTIFY pgrst, 'reload schema';
