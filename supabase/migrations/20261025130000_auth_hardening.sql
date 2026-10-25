-- Phase 1 auth hardening. Migration 1 is already applied; never edit it.
-- Apply with `pnpm db:push` or paste into the Supabase SQL Editor.

-- ---------------------------------------------------------------------------
-- 1. Invite acceptance + member status
-- ---------------------------------------------------------------------------

alter table public.invites
  add column accepted_by uuid references auth.users (id) on delete set null;

comment on column public.invites.accepted_by is
  'The auth user that claimed this invite at signup. accepted_at is set on the first successful sign-in.';

alter table public.profiles
  add column status text not null default 'active'
    check (status in ('active', 'suspended'));

comment on column public.profiles.status is
  'Active members can use the circle. Suspended members are blocked by the protected layout and RLS helpers.';

-- ---------------------------------------------------------------------------
-- 2. Registration gate: require a usable invite, create profile + role.
--    Do NOT mark the invite accepted here: acceptance happens on first sign-in.
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
    and accepted_at is null
    and accepted_by is null
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

  -- Reserve the invite so a second auth user cannot claim the same email.
  update public.invites
  set accepted_by = new.id
  where id = invite_record.id
    and revoked_at is null
    and accepted_by is null;

  if not found then
    raise exception 'This invitation is already linked to another account.';
  end if;

  return new;
end;
$$;

revoke all on function public.handle_new_user() from public;

-- ---------------------------------------------------------------------------
-- 3. First successful sign-in: validate the invite, mark accepted, handle revoke
-- ---------------------------------------------------------------------------

create or replace function public.handle_user_sign_in()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  invite_record public.invites%rowtype;
  user_email text := lower(coalesce(new.email, ''));
begin
  if new.last_sign_in_at is null
     or new.last_sign_in_at is not distinct from old.last_sign_in_at then
    return new;
  end if;

  select *
  into invite_record
  from public.invites
  where lower(email) = user_email
    and revoked_at is null
  order by created_at desc
  limit 1;

  if not found then
    raise exception 'This account is no longer invited to YOD Circle.';
  end if;

  if invite_record.accepted_by is not null
     and invite_record.accepted_by <> new.id then
    raise exception 'This invitation is already linked to another account.';
  end if;

  update public.invites
  set accepted_at = coalesce(accepted_at, now()),
      accepted_by = coalesce(accepted_by, new.id)
  where id = invite_record.id;

  return new;
end;
$$;

revoke all on function public.handle_user_sign_in() from public;

drop trigger if exists on_auth_user_sign_in on auth.users;

create trigger on_auth_user_sign_in
  after update of last_sign_in_at on auth.users
  for each row
  execute function public.handle_user_sign_in();

-- ---------------------------------------------------------------------------
-- 4. Active membership helpers
-- ---------------------------------------------------------------------------

create or replace function public.is_active_member()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and status = 'active'
  );
$$;

revoke all on function public.is_active_member() from public;
grant execute on function public.is_active_member() to authenticated;

-- Admin requires both the role and an active profile.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.member_roles r
    join public.profiles p on p.id = r.user_id
    where r.user_id = (select auth.uid())
      and r.role = 'admin'
      and p.status = 'active'
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

-- Own display name, role, and status without exposing other members' status.
create or replace function public.get_my_membership()
returns table (display_name text, role text, status text)
language sql
stable
security definer
set search_path = ''
as $$
  select p.display_name, r.role, p.status
  from public.profiles p
  join public.member_roles r on r.user_id = p.id
  where p.id = (select auth.uid());
$$;

revoke all on function public.get_my_membership() from public;
grant execute on function public.get_my_membership() to authenticated;

-- ---------------------------------------------------------------------------
-- 5. Tighten RLS: active members read the directory; self always reads own row
-- ---------------------------------------------------------------------------

drop policy if exists "profiles readable by signed-in members" on public.profiles;

create policy "profiles readable by self or active members"
  on public.profiles
  for select
  to authenticated
  using (
    id = (select auth.uid())
    or public.is_active_member()
  );

drop policy if exists "members update their own profile" on public.profiles;

create policy "active members update their own profile"
  on public.profiles
  for update
  to authenticated
  using (
    id = (select auth.uid())
    and public.is_active_member()
  )
  with check (
    id = (select auth.uid())
    and public.is_active_member()
  );

-- Column-level grants: status is private to the membership RPC.
revoke select on table public.profiles from authenticated;
grant select (id, display_name, bio, avatar_url, created_at, updated_at)
  on table public.profiles to authenticated;

-- ---------------------------------------------------------------------------
-- 6. Remove the temporary diagnostic function
-- ---------------------------------------------------------------------------

drop function if exists public.health_check();
