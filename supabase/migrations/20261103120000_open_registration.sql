-- Phase 7: open registration with admin approval.
--
-- Anyone with the shared landing link may create an account, but a new account
-- starts as `pending` and can see nothing in the circle until an admin approves
-- it. Existing invites still work as a pre-approved path for a specific email.
-- Applied migrations are immutable; this file is additive.

-- ---------------------------------------------------------------------------
-- 1. Pending membership status and approval metadata
-- ---------------------------------------------------------------------------

alter table public.profiles
  drop constraint if exists profiles_status_check;

alter table public.profiles
  add constraint profiles_status_check
  check (status in ('pending', 'active', 'deactivated'));

alter table public.profiles
  alter column status set default 'pending';

alter table public.profiles
  add column if not exists approved_at timestamptz,
  add column if not exists approved_by uuid references auth.users (id) on delete set null;

comment on column public.profiles.status is
  'Pending members are waiting for admin approval and see only the waiting room. Active members use the circle. Deactivated members are blocked by RLS and the protected layout.';
comment on column public.profiles.approved_at is
  'When an admin approved this member. Null while pending and for legacy active members.';
comment on column public.profiles.approved_by is
  'The admin who approved this member.';

-- Pending and deactivated profiles are not readable by other members.
drop policy if exists "profiles readable by self or active members" on public.profiles;
drop policy if exists "profiles readable by self, active members, or admins" on public.profiles;

create policy "profiles readable by self, active members, or admins"
  on public.profiles
  for select
  to authenticated
  using (
    id = (select auth.uid())
    or public.is_admin()
    or (public.is_active_member() and status = 'active')
  );

-- ---------------------------------------------------------------------------
-- 2. Registration: open to anyone, pending unless a usable invite exists
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  invite_record public.invites%rowtype;
  signup_email text := lower(coalesce(new.email, ''));
  fallback_name text;
  new_status text := 'pending';
  new_role text := 'member';
  has_invite boolean := false;
begin
  if signup_email = '' then
    raise exception 'An email address is required to join YOD Circle.';
  end if;

  select *
  into invite_record
  from public.invites
  where lower(email) = signup_email
    and revoked_at is null
    and accepted_at is null
    and accepted_by is null
    and status = 'pending'
    and (expires_at is null or expires_at > now())
  order by created_at desc
  limit 1;

  has_invite := found;

  fallback_name := coalesce(
    nullif(new.raw_user_meta_data ->> 'display_name', ''),
    nullif(new.raw_user_meta_data ->> 'full_name', ''),
    split_part(signup_email, '@', 1)
  );

  -- An invite is a pre-approval: the email enters the circle immediately.
  if has_invite then
    new_status := 'active';
    new_role := invite_record.role;
  end if;

  insert into public.profiles (id, display_name, status, approved_at)
  values (
    new.id,
    left(fallback_name, 50),
    new_status,
    case when new_status = 'active' then now() else null end
  );

  insert into public.member_roles (user_id, role, granted_by)
  values (
    new.id,
    new_role,
    case when has_invite then invite_record.invited_by else null end
  );

  if has_invite then
    update public.invites
    set accepted_by = new.id
    where id = invite_record.id
      and revoked_at is null
      and accepted_by is null;

    if not found then
      raise exception 'This invitation is already linked to another account.';
    end if;
  end if;

  return new;
end;
$$;

revoke all on function public.handle_new_user() from public;

-- ---------------------------------------------------------------------------
-- 3. Sign-in no longer depends on an invite
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
    and status <> 'expired'
  order by created_at desc
  limit 1;

  if found and invite_record.accepted_by is not null
     and invite_record.accepted_by <> new.id then
    raise exception 'This invitation is already linked to another account.';
  end if;

  if found then
    update public.invites
    set accepted_at = coalesce(accepted_at, now()),
        accepted_by = coalesce(accepted_by, new.id),
        status = 'accepted'
    where id = invite_record.id;
  end if;

  return new;
end;
$$;

revoke all on function public.handle_user_sign_in() from public;

-- ---------------------------------------------------------------------------
-- 4. Admin approval
-- ---------------------------------------------------------------------------

create or replace function public.admin_approve_member(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := public.assert_admin();
  v_status text;
  v_role text;
begin
  select p.status, r.role
  into v_status, v_role
  from public.profiles p
  join public.member_roles r on r.user_id = p.id
  where p.id = p_user_id;

  if v_status is null then
    raise exception 'Member not found.';
  end if;

  if v_status = 'active' then
    return;
  end if;

  if v_status <> 'pending' then
    raise exception 'This member is not waiting for approval.';
  end if;

  update public.profiles
  set status = 'active',
      approved_at = now(),
      approved_by = v_uid,
      deactivated_at = null,
      deactivated_by = null
  where id = p_user_id;

  perform public.log_audit_event(
    'member.approved',
    'member',
    p_user_id::text,
    jsonb_build_object('role', v_role)
  );
end;
$$;

revoke all on function public.admin_approve_member(uuid) from public, anon;
grant execute on function public.admin_approve_member(uuid) to authenticated;

-- Do not let the generic status RPC skip the approval audit trail.
create or replace function public.admin_set_member_status(
  p_user_id uuid,
  p_status text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := public.assert_admin();
  v_old_status text;
  v_role text;
  v_active_admins int;
begin
  if p_status not in ('active', 'deactivated') then
    raise exception 'Choose a valid member status.';
  end if;

  if p_user_id = v_uid and p_status = 'deactivated' then
    raise exception 'You cannot deactivate your own account.';
  end if;

  select p.status, r.role
  into v_old_status, v_role
  from public.profiles p
  join public.member_roles r on r.user_id = p.id
  where p.id = p_user_id;

  if v_old_status is null then
    raise exception 'Member not found.';
  end if;

  if v_old_status = 'pending' then
    raise exception 'Approve this member request instead.';
  end if;

  if v_old_status = p_status then
    return;
  end if;

  if p_status = 'deactivated' and v_role = 'admin' then
    select count(*)
    into v_active_admins
    from public.member_roles r
    join public.profiles p on p.id = r.user_id
    where r.role = 'admin'
      and p.status = 'active';

    if v_active_admins <= 1 then
      raise exception 'The circle must keep at least one active admin.';
    end if;
  end if;

  update public.profiles
  set status = p_status,
      deactivated_at = case when p_status = 'deactivated' then now() else null end,
      deactivated_by = case when p_status = 'deactivated' then v_uid else null end
  where id = p_user_id;

  perform public.log_audit_event(
    'member.status_changed',
    'member',
    p_user_id::text,
    jsonb_build_object('from', v_old_status, 'to', p_status)
  );
end;
$$;

revoke all on function public.admin_set_member_status(uuid, text) from public;
grant execute on function public.admin_set_member_status(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 5. Admin counts include people waiting for approval
-- ---------------------------------------------------------------------------

create or replace function public.admin_overview_counts()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_result jsonb;
begin
  perform public.assert_admin();

  select jsonb_build_object(
    'members_active', (
      select count(*) from public.profiles where status = 'active'
    ),
    'members_pending', (
      select count(*) from public.profiles where status = 'pending'
    ),
    'members_total', (select count(*) from public.profiles),
    'admins', (
      select count(*)
      from public.member_roles r
      join public.profiles p on p.id = r.user_id
      where r.role = 'admin' and p.status = 'active'
    ),
    'pending_reports', (
      select count(*) from public.content_reports where status = 'pending'
    ),
    'pending_concerns', (
      select count(*) from public.contact_admin where status = 'new'
    ),
    'pending_questions', (
      select count(*)
      from public.posts
      where kind = 'question'
        and status = 'open'
        and answered_reply_id is null
        and hidden_at is null
        and deleted_at is null
    ),
    'hidden_content', (
      (select count(*) from public.posts where hidden_at is not null and deleted_at is null)
      + (select count(*) from public.replies where hidden_at is not null and deleted_at is null)
    ),
    'pending_invites', (
      select count(*)
      from public.invites
      where status = 'pending'
        and revoked_at is null
        and accepted_at is null
        and (expires_at is null or expires_at > now())
    ),
    'upcoming_readings', (
      select count(*) from public.reading_plan where date > public.circle_today()
    ),
    'current_announcement', (
      select jsonb_build_object('id', id, 'title', title)
      from public.announcements
      where archived_at is null
        and starts_at <= now()
        and (ends_at is null or ends_at > now())
      order by created_at desc
      limit 1
    ),
    'last_audit_at', (select max(created_at) from public.audit_log)
  )
  into v_result;

  return v_result;
end;
$$;

revoke all on function public.admin_overview_counts() from public, anon;
grant execute on function public.admin_overview_counts() to authenticated;
