-- Phase 1 foundation: profiles, roles, invites, RLS, invite gate.
-- Apply with `supabase db push` or paste into the Supabase SQL Editor.
-- This migration is intentionally small; feature tables arrive in later phases.

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke all on function public.set_updated_at() from public;

-- Safe, constant database probe used by the temporary /setup-check page.
-- It reveals nothing about members or content.
create or replace function public.health_check()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select 'ok'::text;
$$;

revoke all on function public.health_check() from public;
grant execute on function public.health_check() to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null
    check (char_length(btrim(display_name)) between 1 and 80),
  bio text check (bio is null or char_length(bio) <= 280),
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is
  'Member profile, one row per auth.users row. Created only by the invite-gated trigger.';

create table public.member_roles (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  role text not null default 'member' check (role in ('member', 'admin')),
  granted_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

comment on table public.member_roles is
  'Authorization source of truth. Members can read but never write roles.';

create table public.invites (
  id uuid primary key default gen_random_uuid(),
  email text not null
    check (char_length(email) between 3 and 254 and email like '%_@_%._%'),
  role text not null default 'member' check (role in ('member', 'admin')),
  invited_by uuid references auth.users (id) on delete set null,
  note text check (note is null or char_length(note) <= 280),
  created_at timestamptz not null default now(),
  accepted_at timestamptz,
  revoked_at timestamptz
);

comment on table public.invites is
  'Allowlist of emails permitted to create an account. Admin-only via RLS.';

create unique index invites_pending_email_key
  on public.invites (lower(email))
  where revoked_at is null and accepted_at is null;

create index invites_email_lookup_idx on public.invites (lower(email));

-- ---------------------------------------------------------------------------
-- Role helper (security definer so it can read member_roles under RLS)
-- ---------------------------------------------------------------------------

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.member_roles
    where user_id = (select auth.uid())
      and role = 'admin'
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

-- ---------------------------------------------------------------------------
-- Invite gate: block signup and create profile + role for invited emails
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  invite_record public.invites%rowtype;
  invited_email text := lower(coalesce(new.email, ''));
  fallback_name text;
begin
  if invited_email = '' then
    raise exception 'An email address is required to join YOD Circle.';
  end if;

  select *
  into invite_record
  from public.invites
  where lower(email) = invited_email
    and revoked_at is null
  order by created_at desc
  limit 1;

  if not found then
    raise exception 'This email is not on the YOD Circle invite list.';
  end if;

  fallback_name := coalesce(
    nullif(new.raw_user_meta_data ->> 'display_name', ''),
    nullif(new.raw_user_meta_data ->> 'full_name', ''),
    split_part(invited_email, '@', 1)
  );

  insert into public.profiles (id, display_name)
  values (new.id, left(fallback_name, 80));

  insert into public.member_roles (user_id, role, granted_by)
  values (new.id, invite_record.role, invite_record.invited_by);

  update public.invites
  set accepted_at = now()
  where id = invite_record.id
    and accepted_at is null;

  return new;
end;
$$;

revoke all on function public.handle_new_user() from public;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row
  execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.member_roles enable row level security;
alter table public.invites enable row level security;

-- profiles: signed-in members can read the directory; a member can edit only
-- their own display fields. Inserts/deletes happen through controlled paths.
create policy "profiles readable by signed-in members"
  on public.profiles
  for select
  to authenticated
  using (true);

create policy "members update their own profile"
  on public.profiles
  for update
  to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- member_roles: read only. No insert/update/delete policies = default deny.
create policy "members read their own role, admins read all"
  on public.member_roles
  for select
  to authenticated
  using (user_id = (select auth.uid()) or public.is_admin());

-- invites: admin-only.
create policy "admins read invites"
  on public.invites
  for select
  to authenticated
  using (public.is_admin());

create policy "admins create invites"
  on public.invites
  for insert
  to authenticated
  with check (
    public.is_admin()
    and invited_by = (select auth.uid())
  );

create policy "admins update invites"
  on public.invites
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "admins delete invites"
  on public.invites
  for delete
  to authenticated
  using (public.is_admin());

-- ---------------------------------------------------------------------------
-- Privileges (RLS is the outer gate; grants are the inner gate)
-- ---------------------------------------------------------------------------

revoke all on table public.profiles from anon, authenticated;
grant select on table public.profiles to authenticated;
grant update (display_name, bio, avatar_url) on table public.profiles to authenticated;

revoke all on table public.member_roles from anon, authenticated;
grant select on table public.member_roles to authenticated;

revoke all on table public.invites from anon, authenticated;
grant select, insert, update, delete on table public.invites to authenticated;
