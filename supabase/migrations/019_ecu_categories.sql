-- 019_ecu_categories.sql
-- Dynamic category registry for ecu_catalog

CREATE TABLE IF NOT EXISTS ecu_categories (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  slug       text        NOT NULL UNIQUE,
  label      text        NOT NULL,
  ordem      int         NOT NULL DEFAULT 0,
  ativo      boolean     NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO ecu_categories (slug, label, ordem) VALUES
  ('carros-e-suvs', 'Carros & SUVs', 1),
  ('pickups',       'Pickups',       2),
  ('trucks',        'Trucks',        3),
  ('agricola',      'Agrícola',      4),
  ('maquinas',      'Máquinas',      5),
  ('motos',         'Motos',         6)
ON CONFLICT (slug) DO NOTHING;

ALTER TABLE ecu_categories ENABLE ROW LEVEL SECURITY;

-- everyone can read (needed by public catalog and franqueado)
CREATE POLICY "ecu_categories_read"
  ON ecu_categories FOR SELECT USING (true);

-- only matrix users can write
CREATE POLICY "ecu_categories_write"
  ON ecu_categories FOR ALL USING (is_matrix_user());
