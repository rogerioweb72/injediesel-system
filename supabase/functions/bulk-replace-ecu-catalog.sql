-- Atomic bulk replace of ECU catalog
-- Usage: supabase.rpc('bulk_replace_ecu_catalog', { p_records: [...] })
-- Behavior: Deletes all existing records, inserts new ones in single transaction
-- On error: Entire operation rolls back (no partial data)

CREATE OR REPLACE FUNCTION public.bulk_replace_ecu_catalog(
  p_records JSONB
)
RETURNS TABLE (inserted INT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INT;
BEGIN
  -- Begin transaction (implicit in plpgsql function)
  -- 1. Delete all existing records
  DELETE FROM ecu_catalog;

  -- 2. Insert all new records from JSONB array
  INSERT INTO ecu_catalog (
    id, categoria, categoria_slug, arquivo_origem,
    marca, secao_original, modelo_descricao, ano,
    tipo_registro, ganho, cv_original, cv_tuned,
    kgfm_original, kgfm_tuned, aparelho, protocolo,
    cabo, preco_franqueado, preco_cliente_final,
    observacoes, foto_url, ativo, ativo_ecommerce,
    created_at, updated_at
  )
  SELECT
    (item->>'id')::UUID,
    item->>'categoria',
    item->>'categoria_slug',
    item->>'arquivo_origem',
    item->>'marca',
    item->>'secao_original',
    item->>'modelo_descricao',
    item->>'ano',
    item->>'tipo_registro',
    item->>'ganho',
    (item->>'cv_original')::INT,
    (item->>'cv_tuned')::INT,
    (item->>'kgfm_original')::INT,
    (item->>'kgfm_tuned')::INT,
    item->>'aparelho',
    item->>'protocolo',
    item->>'cabo',
    (item->>'preco_franqueado')::DECIMAL,
    (item->>'preco_cliente_final')::DECIMAL,
    item->>'observacoes',
    item->>'foto_url',
    (item->>'ativo')::BOOLEAN,
    (item->>'ativo_ecommerce')::BOOLEAN,
    (item->>'created_at')::TIMESTAMP WITH TIME ZONE,
    (item->>'updated_at')::TIMESTAMP WITH TIME ZONE
  FROM JSONB_ARRAY_ELEMENTS(p_records) item;

  -- Get count of inserted records
  GET DIAGNOSTICS v_count = ROW_COUNT;

  RETURN QUERY SELECT v_count;
END;
$$;

-- Grant permission to authenticated users
GRANT EXECUTE ON FUNCTION public.bulk_replace_ecu_catalog(JSONB) TO authenticated;
