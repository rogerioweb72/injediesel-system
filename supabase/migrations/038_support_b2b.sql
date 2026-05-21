-- 1. Enum de categoria estruturada
CREATE TYPE ticket_category AS ENUM (
  'tecnico', 'financeiro', 'operacional', 'ecu_arquivo', 'outro'
);

-- 2. Título do chamado
ALTER TABLE support_tickets ADD COLUMN title text NOT NULL DEFAULT '';

-- 3. Migrar category de text para enum (valores existentes fora do enum → 'outro')
ALTER TABLE support_tickets
  ALTER COLUMN category TYPE ticket_category
  USING CASE
    WHEN category IN ('tecnico','financeiro','operacional','ecu_arquivo','outro')
      THEN category::ticket_category
    ELSE 'outro'::ticket_category
  END;

-- 4. Novos campos em support_messages
ALTER TABLE support_messages
  ADD COLUMN is_internal           boolean     NOT NULL DEFAULT false,
  ADD COLUMN attachment_r2_key     text,
  ADD COLUMN attachment_filename   text,
  ADD COLUMN attachment_mime       text,
  ADD COLUMN attachment_size_bytes integer;

-- 5. Tabela de controle de leitura (badge de não lidos)
CREATE TABLE support_ticket_views (
  ticket_id    uuid NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  user_id      uuid NOT NULL REFERENCES profiles(id)        ON DELETE CASCADE,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (ticket_id, user_id)
);

-- Índices para performance das queries RLS
CREATE INDEX idx_stv_ticket_id ON support_ticket_views(ticket_id);
CREATE INDEX idx_stv_user_id   ON support_ticket_views(user_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_unit_id    ON support_tickets(unit_id);
CREATE INDEX IF NOT EXISTS idx_support_messages_ticket_id ON support_messages(ticket_id);

-- 6. RLS em support_tickets
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS franchise_select  ON support_tickets;
DROP POLICY IF EXISTS franchise_insert  ON support_tickets;
DROP POLICY IF EXISTS ticket_update     ON support_tickets;

CREATE POLICY franchise_select ON support_tickets
  FOR SELECT USING (
    (SELECT role FROM profiles WHERE id = auth.uid())
      NOT IN ('franchise_manager','unit_operator')
    OR unit_id = (SELECT unit_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY franchise_insert ON support_tickets
  FOR INSERT WITH CHECK (
    (SELECT role FROM profiles WHERE id = auth.uid())
      NOT IN ('franchise_manager','unit_operator')
    OR unit_id = (SELECT unit_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY ticket_update ON support_tickets
  FOR UPDATE USING (
    (SELECT role FROM profiles WHERE id = auth.uid())
      NOT IN ('franchise_manager','unit_operator')
  );

-- 7. RLS em support_messages
ALTER TABLE support_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS franchise_messages_select ON support_messages;
DROP POLICY IF EXISTS messages_insert           ON support_messages;

CREATE POLICY franchise_messages_select ON support_messages
  FOR SELECT USING (
    (SELECT role FROM profiles WHERE id = auth.uid())
      NOT IN ('franchise_manager','unit_operator')
    OR is_internal = false
  );

CREATE POLICY messages_insert ON support_messages
  FOR INSERT WITH CHECK (
    author_id = auth.uid()
    AND (
      is_internal = false
      OR (SELECT role FROM profiles WHERE id = auth.uid())
           NOT IN ('franchise_manager','unit_operator')
    )
  );

-- 8. RLS em support_ticket_views
ALTER TABLE support_ticket_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY views_own ON support_ticket_views
  FOR ALL
  USING     (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 9. Habilitar Realtime para support_messages
ALTER PUBLICATION supabase_realtime ADD TABLE support_messages;
