-- ============================================================
-- 078_fix_historico_edicoes_valor_fk.sql
--
-- BUG: fila de aprovação de edição de valor (FinanceiroPage, aba
-- Em Aberto) não mostra edições pendentes reais, mesmo existindo
-- linha em historico_edicoes_valor com status AGUARDANDO_APROVACAO.
--
-- CAUSA: solicitado_por e aprovado_por (073) referenciam
-- auth.users(id) em vez de public.profiles(id) — diferente de toda
-- outra FK do schema pra "quem fez a ação" (ecu_jobs.created_by,
-- ecu_job_events.actor_id, etc., todas pra profiles). PostgREST só
-- resolve embed (profiles!solicitado_por(name), profiles!aprovado_por(name))
-- quando existe FK direta entre as duas tabelas nomeadas — como a FK
-- aponta pra auth.users (schema nem exposto pela API), o embed é
-- inválido e a request INTEIRA falha. usePendingValueEdits e
-- useJobValueEditHistory mascaravam o erro como lista vazia
-- (`data = []` no destructure), por isso a fila parecia só "vazia"
-- em vez de quebrada.
-- ============================================================

ALTER TABLE public.historico_edicoes_valor
  DROP CONSTRAINT IF EXISTS historico_edicoes_valor_solicitado_por_fkey;
ALTER TABLE public.historico_edicoes_valor
  ADD CONSTRAINT historico_edicoes_valor_solicitado_por_fkey
  FOREIGN KEY (solicitado_por) REFERENCES public.profiles(id);

ALTER TABLE public.historico_edicoes_valor
  DROP CONSTRAINT IF EXISTS historico_edicoes_valor_aprovado_por_fkey;
ALTER TABLE public.historico_edicoes_valor
  ADD CONSTRAINT historico_edicoes_valor_aprovado_por_fkey
  FOREIGN KEY (aprovado_por) REFERENCES public.profiles(id);
