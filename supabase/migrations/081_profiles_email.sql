-- ============================================================
-- 081_profiles_email.sql (17/07/2026)
--
-- BUG: public.profiles não tem coluna email. As Edge Functions
-- invite-user e invite-franchisee fazem upsert em profiles com
-- campo email e lookup .eq('email', ...) -> PGRST204 "Could not
-- find the 'email' column of 'profiles' in the schema cache" em
-- produção.
--
-- public.handle_new_user() (definido na migration 002, única
-- definição no repo — confirmado via grep, sem redefinições
-- posteriores) cria o profile no INSERT de auth.users com
-- id/name/role, sem email.
--
-- FIX: adiciona coluna email em profiles, faz backfill a partir de
-- auth.users, e atualiza handle_new_user() pra gravar email nos
-- novos cadastros. NOTIFY final recarrega o schema cache do
-- PostgREST pra eliminar o PGRST204 sem esperar o próximo deploy.
-- ============================================================

alter table public.profiles add column if not exists email text;

create index if not exists idx_profiles_email on public.profiles(email);

update public.profiles p
set email = u.email
from auth.users u
where u.id = p.id
  and p.email is null;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, name, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.email,
    coalesce((new.raw_user_meta_data->>'role')::public.user_role, 'unit_operator')
  );
  return new;
end;
$$;

notify pgrst, 'reload schema';
