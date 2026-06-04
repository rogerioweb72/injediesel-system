-- supabase/migrations/072_relatorio_permissions.sql

-- 1. Permissões de relatório em profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS relatorio_financeiro BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS relatorio_ecu        BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS relatorio_vendas     BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS relatorio_franquias  BOOLEAN NOT NULL DEFAULT FALSE;

-- 2. Função auxiliar de verificação de permissão
CREATE OR REPLACE FUNCTION public.check_relatorio_permission(permissao TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_role   TEXT;
  v_result BOOLEAN := FALSE;
BEGIN
  SELECT role INTO v_role FROM public.profiles WHERE id = auth.uid();

  IF v_role IN ('company_admin', 'operations_admin', 'system_ti') THEN
    RETURN TRUE;
  END IF;

  SELECT CASE permissao
    WHEN 'financeiro' THEN relatorio_financeiro
    WHEN 'ecu'        THEN relatorio_ecu
    WHEN 'vendas'     THEN relatorio_vendas
    WHEN 'franquias'  THEN relatorio_franquias
    ELSE FALSE
  END INTO v_result
  FROM public.profiles
  WHERE id = auth.uid();

  RETURN COALESCE(v_result, FALSE);
END;
$$;

-- 3. RPC: exportar relatório ECU
CREATE OR REPLACE FUNCTION public.exportar_relatorio_ecu(
  p_unidade_id  UUID,
  p_data_inicio DATE,
  p_data_fim    DATE
)
RETURNS TABLE (
  unidade_nome      TEXT,
  cidade            TEXT,
  uf                TEXT,
  data_solicitacao  TIMESTAMPTZ,
  veiculo           TEXT,
  placa             TEXT,
  tipo_remapeamento TEXT,
  status_financeiro TEXT,
  pago_em           TIMESTAMPTZ
)
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_role TEXT;
BEGIN
  SELECT role INTO v_role FROM public.profiles WHERE id = auth.uid();

  IF v_role NOT IN ('company_admin', 'operations_admin', 'system_ti') THEN
    IF NOT COALESCE((SELECT relatorio_ecu FROM public.profiles WHERE id = auth.uid()), FALSE) THEN
      RAISE EXCEPTION 'Acesso negado: sem permissão para relatório ECU';
    END IF;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.franchise_units WHERE id = p_unidade_id) THEN
    RAISE EXCEPTION 'Acesso negado: unidade inválida';
  END IF;

  RETURN QUERY
  SELECT
    fu.name::TEXT,
    fu.city::TEXT,
    fu.state::TEXT,
    j.created_at,
    COALESCE(
      v.brand || ' ' || v.model,
      (j.vehicle_info->>'marca') || ' ' || (j.vehicle_info->>'modelo'),
      '—'
    )::TEXT,
    COALESCE(v.plate, j.vehicle_info->>'placa', '—')::TEXT,
    j.service_type::TEXT,
    j.matrix_payment_status::TEXT,
    j.matrix_paid_at
  FROM public.ecu_jobs j
  JOIN public.franchise_units fu ON fu.id = j.unit_id
  LEFT JOIN public.vehicles v ON v.id = j.vehicle_id
  WHERE j.unit_id = p_unidade_id
    AND j.amount_charged_by_matrix IS NOT NULL
    AND j.created_at::date BETWEEN p_data_inicio AND p_data_fim
  ORDER BY j.created_at DESC;
END;
$$;

-- 4. RPC: exportar relatório Financeiro
CREATE OR REPLACE FUNCTION public.exportar_relatorio_financeiro(
  p_unidade_id  UUID,
  p_data_inicio DATE,
  p_data_fim    DATE
)
RETURNS TABLE (
  unidade_nome     TEXT,
  cidade           TEXT,
  uf               TEXT,
  cnpj             TEXT,
  data_cobranca    TIMESTAMPTZ,
  descricao        TEXT,
  valor_cobrado    NUMERIC,
  status_pagamento TEXT,
  pago_em          TIMESTAMPTZ
)
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_role TEXT;
BEGIN
  SELECT role INTO v_role FROM public.profiles WHERE id = auth.uid();

  IF v_role NOT IN ('company_admin', 'operations_admin', 'system_ti') THEN
    IF NOT COALESCE((SELECT relatorio_financeiro FROM public.profiles WHERE id = auth.uid()), FALSE) THEN
      RAISE EXCEPTION 'Acesso negado: sem permissão para relatório Financeiro';
    END IF;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.franchise_units WHERE id = p_unidade_id) THEN
    RAISE EXCEPTION 'Acesso negado: unidade inválida';
  END IF;

  RETURN QUERY
  SELECT
    fu.name::TEXT,
    fu.city::TEXT,
    fu.state::TEXT,
    fu.cnpj::TEXT,
    j.created_at,
    j.service_type::TEXT,
    j.amount_charged_by_matrix,
    j.matrix_payment_status::TEXT,
    j.matrix_paid_at
  FROM public.ecu_jobs j
  JOIN public.franchise_units fu ON fu.id = j.unit_id
  WHERE j.unit_id = p_unidade_id
    AND j.amount_charged_by_matrix IS NOT NULL
    AND j.created_at::date BETWEEN p_data_inicio AND p_data_fim
  ORDER BY j.created_at DESC;
END;
$$;

-- 5. RPC: exportar relatório Franquia
CREATE OR REPLACE FUNCTION public.exportar_relatorio_franquia(p_unidade_id UUID)
RETURNS TABLE (
  nome_fantasia     TEXT,
  razao_social      TEXT,
  cnpj              TEXT,
  cidade            TEXT,
  uf                TEXT,
  telefone          TEXT,
  email             TEXT,
  raio_km           NUMERIC,
  cidades_atendidas TEXT,
  tipo_contrato     TEXT,
  contrato_inicio   DATE,
  contrato_fim      DATE,
  status_unidade    TEXT
)
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_role TEXT;
BEGIN
  SELECT role INTO v_role FROM public.profiles WHERE id = auth.uid();

  IF v_role NOT IN ('company_admin', 'operations_admin', 'system_ti') THEN
    IF NOT COALESCE((SELECT relatorio_franquias FROM public.profiles WHERE id = auth.uid()), FALSE) THEN
      RAISE EXCEPTION 'Acesso negado: sem permissão para relatório Franquias';
    END IF;
  END IF;

  RETURN QUERY
  SELECT
    fu.name::TEXT,
    fu.razao_social::TEXT,
    fu.cnpj::TEXT,
    fu.city::TEXT,
    fu.state::TEXT,
    fu.phone::TEXT,
    fu.email::TEXT,
    fu.raio_atendimento_km,
    array_to_string(fu.cidades_atendidas, ', ')::TEXT,
    fu.contract_type::TEXT,
    fu.contract_start_date,
    fu.contract_end_date,
    fu.status::TEXT
  FROM public.franchise_units fu
  WHERE fu.id = p_unidade_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_relatorio_permission(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.exportar_relatorio_ecu(UUID, DATE, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION public.exportar_relatorio_financeiro(UUID, DATE, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION public.exportar_relatorio_franquia(UUID) TO authenticated;
