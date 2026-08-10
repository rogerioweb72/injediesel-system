-- 101: WhatsApp de suporte interno (franquias <-> matriz).
-- SEGURANCA: o numero NAO pode ficar exposto publicamente. Fica somente no banco,
-- lido por uma funcao SECURITY DEFINER que exige usuario AUTENTICADO. Nunca vai
-- para o bundle do frontend (nao e VITE_*), e anon nao consegue ler.
-- O VALOR (numero) e definido a parte (UPDATE manual), fora do repositorio.

ALTER TABLE public.company_settings
  ADD COLUMN IF NOT EXISTS support_whatsapp text;

-- Retorna apenas o numero de suporte, sem expor a linha inteira de company_settings.
CREATE OR REPLACE FUNCTION public.get_support_whatsapp()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT support_whatsapp
  FROM public.company_settings
  ORDER BY updated_at DESC
  LIMIT 1
$$;

-- Somente usuarios autenticados podem chamar (anon/public revogados).
REVOKE ALL ON FUNCTION public.get_support_whatsapp() FROM public;
REVOKE ALL ON FUNCTION public.get_support_whatsapp() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_support_whatsapp() TO authenticated;
