-- 104_backfill_franchise_manager_id.sql
-- Backfill (registro): preenche franchise_units.manager_id nas unidades ANTIGAS,
-- criadas antes de o wizard passar a gravar o manager_id (ver commit e428e6f).
-- O gestor é o franchise_manager já vinculado à unidade em user_unit_roles
-- (o responsável legal convidado na criação). Só toca unidades com manager_id NULL.
--
-- Idempotente: rodar 2x não altera nada além do 1º passe. Se uma unidade tiver
-- mais de um franchise_manager, escolhe determinístico (menor user_id) — raro;
-- conferir antes com o SELECT de preview do playbook.
--
-- A EXIBIÇÃO do gestor (coluna/ficha) NÃO depende deste backfill — já usa
-- responsavel_legal_nome. Este backfill é só integridade do vínculo manager_id.

UPDATE public.franchise_units fu
SET manager_id = sub.user_id
FROM (
  SELECT DISTINCT ON (uur.unit_id) uur.unit_id, uur.user_id
  FROM public.user_unit_roles uur
  WHERE uur.role = 'franchise_manager'
  ORDER BY uur.unit_id, uur.user_id
) sub
WHERE fu.id = sub.unit_id
  AND fu.manager_id IS NULL;
