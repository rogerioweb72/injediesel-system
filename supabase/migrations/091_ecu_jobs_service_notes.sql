-- ============================================================
-- 091_ecu_jobs_service_notes.sql (21/07/2026)
--
-- REGISTRO — coluna já aplicada manualmente por Rogério via SQL
-- Editor. Este arquivo documenta o estado atual do banco.
--
-- Grupo B item 8 (antecipado): campo "Observações do Serviço" —
-- matriz escreve (dicas, dados do serviço, orientações), TODOS
-- veem (franquia incluída, somente leitura). Card fica entre
-- Dados Financeiros e Arquivos no EcuJobDetail.
-- ============================================================

ALTER TABLE ecu_jobs
  ADD COLUMN service_notes text;
