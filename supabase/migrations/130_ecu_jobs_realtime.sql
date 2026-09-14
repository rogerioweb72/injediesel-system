-- ============================================================
-- 130_ecu_jobs_realtime.sql
--
-- Habilita Realtime em ecu_jobs para o alerta sonoro/badge de arquivo novo
-- dispararem no INSTANTE em que o banco registra (INSERT/UPDATE de status),
-- em vez de só depois que a página é atualizada ou volta o foco na aba.
-- Mesmo padrão usado em ecu_job_files (076) e support_messages (038).
--
-- RLS de ecu_jobs (021_multitenant_rbac.sql) já restringe cada usuário aos
-- jobs que ele pode ver (matriz = tudo, franquia = só a própria unidade) —
-- o Realtime honra essas policies automaticamente.
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE ecu_jobs;

-- REPLICA IDENTITY FULL: sem isso o payload "old" de um UPDATE traz só a PK,
-- e o frontend precisa saber o status ANTERIOR (ex.: virou "concluido" agora
-- ou já estava?) pra não repetir o alerta em updates irrelevantes do job.
ALTER TABLE ecu_jobs REPLICA IDENTITY FULL;
