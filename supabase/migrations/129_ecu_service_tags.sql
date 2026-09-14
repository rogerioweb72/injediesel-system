-- 129_ecu_service_tags.sql
-- Registro dinâmico de tags de serviço (antes hardcoded no frontend).
-- Gestor da empresa / gestor operacional pode adicionar novas tags ou ocultar
-- (ativo=false) as existentes sem editar código. Ocultar preserva o vínculo
-- histórico nos jobs já criados com aquela tag (a tag só some do seletor de
-- novos jobs, não é apagada nem some dos jobs antigos).

CREATE TABLE IF NOT EXISTS ecu_service_tags (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  slug       text        NOT NULL UNIQUE,
  label      text        NOT NULL,
  ordem      int         NOT NULL DEFAULT 0,
  ativo      boolean     NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO ecu_service_tags (slug, label, ordem) VALUES
  ('potencia',        'Potência',        1),
  ('egr',              'EGR',             2),
  ('dpf',              'DPF',             3),
  ('adblue',           'AdBlue',          4),
  ('pops-and-bangs',   'Pops and Bangs',  5),
  ('pops-and-flames',  'Pops and Flames', 6),
  ('hard-cut',         'Hard Cut',        7),
  ('full-smoke',       'Full Smoke',      8),
  ('lup-tuner',        'Lup Tuner',       9)
ON CONFLICT (slug) DO NOTHING;

ALTER TABLE ecu_service_tags ENABLE ROW LEVEL SECURITY;

-- todos autenticados leem (franquia precisa ver as tags ativas no formulário)
CREATE POLICY "ecu_service_tags_read"
  ON ecu_service_tags FOR SELECT USING (true);

-- só gestor da matriz (admin da empresa, gestor operacional ou TI) escreve
CREATE POLICY "ecu_service_tags_write"
  ON ecu_service_tags FOR ALL USING (
    COALESCE(
      (SELECT role IN ('system_ti', 'company_admin', 'operations_admin') AND active = true
       FROM public.profiles WHERE id = auth.uid()),
      false
    )
  );
