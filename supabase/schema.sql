-- =========================================================
-- Flaw Medeiros Fisioterapia Veterinária — banco no Supabase
-- Rode este arquivo uma vez no SQL Editor do projeto.
-- Pode rodar de novo sem problema (é idempotente).
-- =========================================================

-- Clínicas (uma por conta principal)
create table if not exists public.clinics (
  id uuid primary key default gen_random_uuid(),
  name text,
  created_at timestamptz not null default now()
);

-- Quem tem acesso a cada clínica (dona e equipe)
create table if not exists public.members (
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'owner' check (role in ('owner', 'staff')),
  created_at timestamptz not null default now(),
  primary key (clinic_id, user_id)
);

-- Todos os registros do sistema (tutores, pets, planos, agenda, sessões,
-- pagamentos, avaliações, bloqueios, serviços e dados da clínica)
create table if not exists public.records (
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  coll text not null,
  id text not null,
  data jsonb,
  deleted boolean not null default false,
  updated_at timestamptz not null default now(),
  updated_by uuid default auth.uid(),
  primary key (clinic_id, coll, id)
);
create index if not exists records_sync_idx on public.records (clinic_id, updated_at);

-- ---------- funções auxiliares ----------
create or replace function public.is_member(c uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (select 1 from public.members where clinic_id = c and user_id = auth.uid());
$$;

create or replace function public.touch_record()
returns trigger language plpgsql as $$
begin
  new.updated_at := clock_timestamp();
  new.updated_by := auth.uid();
  return new;
end $$;

drop trigger if exists records_touch on public.records;
create trigger records_touch before insert or update on public.records
for each row execute function public.touch_record();

-- Garante que o usuário logado tenha uma clínica e devolve o id dela.
-- Se a pessoa foi adicionada à equipe de outra clínica, usa essa.
create or replace function public.ensure_clinic(clinic_name text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare cid uuid;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  select clinic_id into cid from public.members
   where user_id = auth.uid()
   order by case when role = 'staff' then 0 else 1 end, created_at
   limit 1;
  if cid is null then
    insert into public.clinics (name) values (coalesce(nullif(clinic_name, ''), 'Minha clínica')) returning id into cid;
    insert into public.members (clinic_id, user_id, role) values (cid, auth.uid(), 'owner');
  end if;
  return cid;
end $$;

-- Equipe: adicionar, listar e remover pessoas (só a dona)
create or replace function public.add_member(member_email text)
returns text language plpgsql security definer set search_path = public, auth as $$
declare cid uuid; uid uuid;
begin
  select clinic_id into cid from public.members where user_id = auth.uid() and role = 'owner' limit 1;
  if cid is null then raise exception 'Somente a dona da clínica pode adicionar pessoas.'; end if;
  select id into uid from auth.users where lower(email) = lower(trim(member_email));
  if uid is null then return 'not_found'; end if;
  if uid = auth.uid() then return 'self'; end if;
  insert into public.members (clinic_id, user_id, role) values (cid, uid, 'staff') on conflict do nothing;
  return 'ok';
end $$;

create or replace function public.list_members()
returns table (user_id uuid, email text, role text) language sql security definer stable set search_path = public, auth as $$
  select m.user_id, u.email::text, m.role
    from public.members m join auth.users u on u.id = m.user_id
   where m.clinic_id in (select clinic_id from public.members where user_id = auth.uid())
   order by m.role desc, u.email;
$$;

create or replace function public.remove_member(member uuid)
returns void language plpgsql security definer set search_path = public as $$
declare cid uuid;
begin
  select clinic_id into cid from public.members where user_id = auth.uid() and role = 'owner' limit 1;
  if cid is null then raise exception 'Somente a dona da clínica pode remover pessoas.'; end if;
  delete from public.members where clinic_id = cid and user_id = member and role <> 'owner';
end $$;

-- ---------- segurança (RLS): cada um só enxerga a própria clínica ----------
alter table public.clinics enable row level security;
alter table public.members enable row level security;
alter table public.records enable row level security;

drop policy if exists clinics_select on public.clinics;
drop policy if exists clinics_update on public.clinics;
drop policy if exists members_select on public.members;
drop policy if exists records_select on public.records;
drop policy if exists records_insert on public.records;
drop policy if exists records_update on public.records;

create policy clinics_select on public.clinics for select to authenticated using (public.is_member(id));
create policy clinics_update on public.clinics for update to authenticated using (public.is_member(id));
create policy members_select on public.members for select to authenticated using (public.is_member(clinic_id));
create policy records_select on public.records for select to authenticated using (public.is_member(clinic_id));
create policy records_insert on public.records for insert to authenticated with check (public.is_member(clinic_id));
create policy records_update on public.records for update to authenticated using (public.is_member(clinic_id)) with check (public.is_member(clinic_id));
-- Não há policy de DELETE: exclusões são marcadas com deleted = true (permite sincronizar entre aparelhos).

revoke all on function public.ensure_clinic(text), public.add_member(text), public.list_members(), public.remove_member(uuid), public.is_member(uuid) from public, anon;
grant execute on function public.ensure_clinic(text), public.add_member(text), public.list_members(), public.remove_member(uuid), public.is_member(uuid) to authenticated;
grant select, insert, update on public.records to authenticated;
grant select, update on public.clinics to authenticated;
grant select on public.members to authenticated;
