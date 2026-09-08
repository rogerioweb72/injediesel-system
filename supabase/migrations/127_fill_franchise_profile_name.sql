-- 127_fill_franchise_profile_name.sql
-- CAUSA-RAIZ (nome vazio → slug quebrado / "Logado como —"): o convite grava
-- profiles.name, mas o trigger handle_new_user corre depois (async, ao inserir em
-- auth.users) e sobrescreve com vazio — corrida. Resultado: todo franqueado novo
-- nasce sem nome. O backfill manual resolvia caso a caso, mas voltava no próximo.
--
-- Fix definitivo: trigger no user_unit_roles. Sempre que um usuário é VINCULADO a
-- uma unidade, se o profile dele está sem nome, preenche pelo representante legal
-- da unidade (ou, na falta, pelo nome da unidade). Atômico, sem corrida, cobre
-- todo convite futuro.

CREATE OR REPLACE FUNCTION public.fill_franchise_profile_name()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_name text;
BEGIN
  -- só age se o profile do vinculado estiver sem nome
  IF EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = NEW.user_id AND (p.name IS NULL OR btrim(p.name) = '')
  ) THEN
    SELECT coalesce(nullif(btrim(fu.responsavel_legal_nome), ''), fu.name)
      INTO v_name
      FROM public.franchise_units fu
     WHERE fu.id = NEW.unit_id;

    IF v_name IS NOT NULL AND btrim(v_name) <> '' THEN
      UPDATE public.profiles
         SET name = v_name
       WHERE id = NEW.user_id AND (name IS NULL OR btrim(name) = '');
    END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_fill_franchise_profile_name ON public.user_unit_roles;
CREATE TRIGGER trg_fill_franchise_profile_name
  AFTER INSERT ON public.user_unit_roles
  FOR EACH ROW EXECUTE FUNCTION public.fill_franchise_profile_name();

-- Backfill de quem já está sem nome (pega qualquer franqueado vinculado).
UPDATE public.profiles p
   SET name = coalesce(nullif(btrim(fu.responsavel_legal_nome), ''), fu.name)
  FROM public.user_unit_roles r
  JOIN public.franchise_units fu ON fu.id = r.unit_id
 WHERE r.user_id = p.id
   AND (p.name IS NULL OR btrim(p.name) = '');
