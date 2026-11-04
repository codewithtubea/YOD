-- Phase 3B: admin console, audit trail, moderation, announcements, invites,
-- and sermon links. Applied migrations are immutable; this file is additive.

-- ---------------------------------------------------------------------------
-- 1. Append-only audit trail
-- ---------------------------------------------------------------------------

create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles (id) on delete set null,
  actor_label text not null check (char_length(actor_label) between 1 and 160),
  action text not null check (char_length(action) between 3 and 80),
  target_type text not null check (char_length(target_type) between 2 and 40),
  target_id text,
  metadata jsonb not null default '{}'::jsonb
    check (jsonb_typeof(metadata) = 'object' and pg_column_size(metadata) <= 4096),
  created_at timestamptz not null default now()
);

comment on table public.audit_log is
  'Append-only record of administrative changes. Never store private content here.';

create index audit_log_created_idx
  on public.audit_log (created_at desc);
create index audit_log_actor_idx
  on public.audit_log (actor_id, created_at desc);
create index audit_log_target_idx
  on public.audit_log (target_type, target_id, created_at desc);

create or replace function public.log_audit_event(
  p_action text,
  p_target_type text,
  p_target_id text,
  p_metadata jsonb default '{}'::jsonb,
  p_actor_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := coalesce(p_actor_id, (select auth.uid()));
  v_label text;
  v_id uuid;
begin
  select coalesce(
    nullif(p.display_name, ''),
    nullif(u.email, ''),
    'Circle'
  )
  into v_label
  from auth.users u
  left join public.profiles p on p.id = u.id
  where u.id = v_actor;

  insert into public.audit_log (
    actor_id, actor_label, action, target_type, target_id, metadata
  )
  values (
    v_actor,
    coalesce(v_label, 'Circle'),
    p_action,
    p_target_type,
    p_target_id,
    coalesce(p_metadata, '{}'::jsonb)
  )
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.log_audit_event(text, text, text, jsonb, uuid)
  from public;

create or replace function public.prevent_audit_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'The audit trail is append-only.';
end;
$$;

revoke all on function public.prevent_audit_mutation() from public;

create trigger audit_log_no_update_or_delete
  before update or delete on public.audit_log
  for each row execute function public.prevent_audit_mutation();

create trigger audit_log_no_truncate
  before truncate on public.audit_log
  for each statement execute function public.prevent_audit_mutation();

-- ---------------------------------------------------------------------------
-- 2. Internal admin guard
-- ---------------------------------------------------------------------------

create or replace function public.assert_admin()
returns uuid
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
begin
  if v_uid is null or not public.is_admin() then
    raise exception 'Administrator access is required.' using errcode = '42501';
  end if;

  return v_uid;
end;
$$;

revoke all on function public.assert_admin() from public;

-- ---------------------------------------------------------------------------
-- 3. Member status: suspended -> deactivated, with deactivation metadata
-- ---------------------------------------------------------------------------

alter table public.profiles
  drop constraint if exists profiles_status_check;

update public.profiles
set status = 'deactivated'
where status = 'suspended';

alter table public.profiles
  add constraint profiles_status_check
  check (status in ('active', 'deactivated'));

alter table public.profiles
  add column if not exists deactivated_at timestamptz,
  add column if not exists deactivated_by uuid references auth.users (id) on delete set null;

comment on column public.profiles.status is
  'Active members can use the circle. Deactivated members are blocked by RLS and the protected layout.';
comment on column public.profiles.deactivated_at is
  'When an admin last deactivated this member. Null while active.';

-- ---------------------------------------------------------------------------
-- 4. Invite lifecycle extensions
-- ---------------------------------------------------------------------------

alter table public.invites
  add column if not exists personal_note text
    check (personal_note is null or char_length(personal_note) <= 600),
  add column if not exists status text not null default 'pending'
    check (status in ('pending', 'accepted', 'revoked', 'expired')),
  add column if not exists expires_at timestamptz,
  add column if not exists last_shared_at timestamptz;

update public.invites
set status = case
  when revoked_at is not null then 'revoked'
  when accepted_at is not null then 'accepted'
  else 'pending'
end;

drop index if exists public.invites_pending_email_key;
create unique index if not exists invites_email_key
  on public.invites (lower(email));

create index if not exists invites_status_idx
  on public.invites (status, created_at desc);

-- Keep the registration + first-sign-in gate aware of expiry and status.
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
    and status = 'pending'
    and (expires_at is null or expires_at > now())
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

  if not found then
    raise exception 'This account is no longer invited to YOD Circle.';
  end if;

  if invite_record.accepted_at is null
     and invite_record.expires_at is not null
     and invite_record.expires_at <= now() then
    raise exception 'This invitation has expired. Ask an admin for a new one.';
  end if;

  if invite_record.accepted_by is not null
     and invite_record.accepted_by <> new.id then
    raise exception 'This invitation is already linked to another account.';
  end if;

  update public.invites
  set accepted_at = coalesce(accepted_at, now()),
      accepted_by = coalesce(accepted_by, new.id),
      status = 'accepted'
  where id = invite_record.id;

  return new;
end;
$$;

revoke all on function public.handle_user_sign_in() from public;

-- ---------------------------------------------------------------------------
-- 5. Announcements
-- ---------------------------------------------------------------------------

create table public.announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(btrim(title)) between 1 and 120),
  body text not null check (char_length(btrim(body)) between 1 and 1000),
  created_by uuid not null default auth.uid()
    references public.profiles (id) on delete cascade,
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint announcements_window_check check (
    ends_at is null or ends_at > starts_at
  )
);

create index announcements_active_idx
  on public.announcements (starts_at desc, ends_at)
  where archived_at is null;

create trigger announcements_set_updated_at
  before update on public.announcements
  for each row execute function public.set_updated_at();

create or replace function public.audit_announcement_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.log_audit_event(
    case
      when tg_op = 'INSERT' then 'announcement.created'
      when new.archived_at is not null and old.archived_at is null then 'announcement.archived'
      else 'announcement.updated'
    end,
    'announcement',
    new.id::text,
    jsonb_build_object('title', new.title)
  );
  return new;
end;
$$;

revoke all on function public.audit_announcement_change() from public;

create trigger announcements_audit
  after insert or update on public.announcements
  for each row execute function public.audit_announcement_change();

-- ---------------------------------------------------------------------------
-- 6. Content reports
-- ---------------------------------------------------------------------------

create table public.content_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null default auth.uid()
    references public.profiles (id) on delete cascade,
  target_type text not null check (target_type in ('post', 'reply')),
  target_id uuid not null,
  reason text not null
    check (reason in ('unkind', 'unsafe', 'private', 'other')),
  note text check (note is null or char_length(note) <= 500),
  status text not null default 'pending'
    check (status in ('pending', 'resolved')),
  resolved_by uuid references public.profiles (id) on delete set null,
  resolved_at timestamptz,
  resolution_note text
    check (resolution_note is null or char_length(resolution_note) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index content_reports_once_idx
  on public.content_reports (reporter_id, target_type, target_id);
create index content_reports_status_idx
  on public.content_reports (status, created_at desc);

create trigger content_reports_set_updated_at
  before update on public.content_reports
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 7. Sermon links (admin-managed, member-visible when published)
-- ---------------------------------------------------------------------------

create table public.sermon_links (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(btrim(title)) between 1 and 140),
  url text not null check (
    char_length(url) between 8 and 2048
    and url ~* '^https?://'
  ),
  provider text not null default 'other'
    check (provider in ('youtube', 'vimeo', 'other')),
  provider_id text check (provider_id is null or char_length(provider_id) <= 80),
  is_published boolean not null default true,
  published_on date not null default public.circle_today(),
  created_by uuid not null default auth.uid()
    references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index sermon_links_published_idx
  on public.sermon_links (published_on desc, created_at desc)
  where is_published = true;

create trigger sermon_links_set_updated_at
  before update on public.sermon_links
  for each row execute function public.set_updated_at();

create or replace function public.audit_sermon_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.log_audit_event(
    case when tg_op = 'INSERT' then 'sermon.created' else 'sermon.updated' end,
    'sermon',
    new.id::text,
    jsonb_build_object(
      'title', new.title,
      'provider', new.provider,
      'published', new.is_published
    )
  );
  return new;
end;
$$;

revoke all on function public.audit_sermon_change() from public;

create trigger sermon_links_audit
  after insert or update on public.sermon_links
  for each row execute function public.audit_sermon_change();

-- ---------------------------------------------------------------------------
-- 8. Settings + reading-plan auditing
-- ---------------------------------------------------------------------------

alter table public.circle_settings
  add column if not exists invite_message_template text
  check (
    invite_message_template is null
    or char_length(invite_message_template) <= 2000
  );

create or replace function public.audit_settings_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.log_audit_event(
    'settings.updated',
    'settings',
    'circle',
    jsonb_build_object(
      'name', new.name,
      'timezone', new.timezone,
      'bible_source', new.default_bible_source,
      'care_inactivity_days', new.care_inactivity_days
    )
  );
  return new;
end;
$$;

revoke all on function public.audit_settings_change() from public;

create trigger circle_settings_audit
  after update on public.circle_settings
  for each row execute function public.audit_settings_change();

create or replace function public.audit_reading_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_plan public.reading_plan%rowtype;
begin
  if tg_op = 'DELETE' then
    v_plan := old;
  else
    v_plan := new;
  end if;

  perform public.log_audit_event(
    case
      when tg_op = 'INSERT' then 'reading.created'
      when tg_op = 'DELETE' then 'reading.deleted'
      else 'reading.updated'
    end,
    'reading',
    v_plan.date::text,
    jsonb_build_object(
      'date', v_plan.date,
      'book', v_plan.book,
      'chapter_start', v_plan.chapter_start,
      'chapter_end', v_plan.chapter_end
    )
  );
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

revoke all on function public.audit_reading_change() from public;

create trigger reading_plan_audit
  after insert or update or delete on public.reading_plan
  for each row execute function public.audit_reading_change();

create or replace function public.audit_content_moderation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.hidden_at is distinct from old.hidden_at then
    perform public.log_audit_event(
      case when new.hidden_at is null then 'content.unhidden' else 'content.hidden' end,
      case when tg_table_name = 'posts' then 'post' else 'reply' end,
      new.id::text,
      jsonb_build_object(
        'reason', new.hidden_reason,
        'plan_date', case when tg_table_name = 'posts' then new.plan_date else null end
      )
    );
  end if;

  return new;
end;
$$;

revoke all on function public.audit_content_moderation() from public;

create trigger posts_audit_moderation
  after update of hidden_at on public.posts
  for each row execute function public.audit_content_moderation();

create trigger replies_audit_moderation
  after update of hidden_at on public.replies
  for each row execute function public.audit_content_moderation();

create or replace function public.audit_invite_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.log_audit_event(
    case
      when tg_op = 'INSERT' then 'invite.created'
      when new.status = 'revoked' and old.status <> 'revoked' then 'invite.revoked'
      when new.status = 'accepted' and old.status <> 'accepted' then 'invite.accepted'
      else 'invite.updated'
    end,
    'invite',
    new.id::text,
    jsonb_build_object(
      'email', new.email,
      'role', new.role,
      'status', new.status
    )
  );
  return new;
end;
$$;

revoke all on function public.audit_invite_change() from public;

create trigger invites_audit
  after insert or update on public.invites
  for each row execute function public.audit_invite_change();

-- ---------------------------------------------------------------------------
-- 9. Admin RPCs
-- ---------------------------------------------------------------------------

create or replace function public.admin_set_role(
  p_user_id uuid,
  p_role text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := public.assert_admin();
  v_old_role text;
  v_target_status text;
  v_active_admins int;
begin
  if p_role not in ('member', 'admin') then
    raise exception 'Choose a valid role.';
  end if;

  if p_user_id = v_uid then
    raise exception 'You cannot change your own role.';
  end if;

  select role into v_old_role
  from public.member_roles
  where user_id = p_user_id;

  select status into v_target_status
  from public.profiles
  where id = p_user_id;

  if v_old_role is null or v_target_status is null then
    raise exception 'Member not found.';
  end if;

  if v_target_status <> 'active' then
    raise exception 'Reactivate the member before changing their role.';
  end if;

  if v_old_role = p_role then
    return;
  end if;

  if v_old_role = 'admin' and p_role = 'member' then
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

  update public.member_roles
  set role = p_role,
      granted_by = v_uid
  where user_id = p_user_id;

  perform public.log_audit_event(
    'member.role_changed',
    'member',
    p_user_id::text,
    jsonb_build_object('from', v_old_role, 'to', p_role)
  );
end;
$$;

revoke all on function public.admin_set_role(uuid, text) from public;
grant execute on function public.admin_set_role(uuid, text) to authenticated;

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

create or replace function public.admin_create_invites(
  p_emails text[],
  p_role text default 'member',
  p_personal_note text default null,
  p_expires_at timestamptz default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := public.assert_admin();
  v_email text;
  v_email_normalized text;
  v_expires timestamptz := coalesce(p_expires_at, now() + interval '14 days');
  v_recent int;
  v_created text[] := '{}';
  v_skipped jsonb := '[]'::jsonb;
begin
  if p_emails is null
     or array_length(p_emails, 1) is null
     or array_length(p_emails, 1) > 30 then
    raise exception 'Create between 1 and 30 invites at a time.';
  end if;

  if p_role not in ('member', 'admin') then
    raise exception 'Choose a valid role.';
  end if;

  if p_personal_note is not null and char_length(p_personal_note) > 600 then
    raise exception 'The personal note is too long.';
  end if;

  if v_expires <= now() then
    raise exception 'The expiry must be in the future.';
  end if;

  select count(*)
  into v_recent
  from public.invites
  where invited_by = v_uid
    and created_at > now() - interval '1 hour';

  if v_recent + array_length(p_emails, 1) > 30 then
    raise exception 'Invite limit reached: 30 per admin per hour.';
  end if;

  foreach v_email in array p_emails loop
    v_email_normalized := lower(btrim(coalesce(v_email, '')));

    if v_email_normalized !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then
      v_skipped := v_skipped || jsonb_build_array(
        jsonb_build_object('email', v_email_normalized, 'reason', 'Not a valid email address')
      );
      continue;
    end if;

    if exists (
      select 1 from auth.users u
      where lower(u.email) = v_email_normalized
    ) then
      v_skipped := v_skipped || jsonb_build_array(
        jsonb_build_object('email', v_email_normalized, 'reason', 'Already a member')
      );
      continue;
    end if;

    if exists (
      select 1 from public.invites i
      where lower(i.email) = v_email_normalized
    ) then
      v_skipped := v_skipped || jsonb_build_array(
        jsonb_build_object('email', v_email_normalized, 'reason', 'Already invited')
      );
      continue;
    end if;

    insert into public.invites (
      email, role, invited_by, personal_note, status, expires_at
    )
    values (
      v_email_normalized, p_role, v_uid, p_personal_note, 'pending', v_expires
    );

    v_created := v_created || v_email_normalized;
  end loop;

  return jsonb_build_object('created', to_jsonb(v_created), 'skipped', v_skipped);
end;
$$;

revoke all on function public.admin_create_invites(text[], text, text, timestamptz)
  from public;
grant execute on function public.admin_create_invites(text[], text, text, timestamptz)
  to authenticated;

create or replace function public.admin_revoke_invite(p_invite_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.assert_admin();

  update public.invites
  set revoked_at = now(),
      status = 'revoked'
  where id = p_invite_id
    and revoked_at is null
    and accepted_at is null;

  if not found then
    raise exception 'This invite cannot be revoked.';
  end if;
end;
$$;

revoke all on function public.admin_revoke_invite(uuid) from public;
grant execute on function public.admin_revoke_invite(uuid) to authenticated;

create or replace function public.admin_hide_content(
  p_target_type text,
  p_target_id uuid,
  p_reason text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := public.assert_admin();
begin
  if p_target_type not in ('post', 'reply') then
    raise exception 'Choose a valid content type.';
  end if;

  if p_reason is null or char_length(btrim(p_reason)) < 3 then
    raise exception 'Add a short reason before hiding content.';
  end if;

  if p_target_type = 'post' then
    update public.posts
    set hidden_at = now(),
        hidden_by = v_uid,
        hidden_reason = btrim(p_reason)
    where id = p_target_id
      and hidden_at is null
      and deleted_at is null;

    if not found then
      raise exception 'That post is already hidden or unavailable.';
    end if;
  else
    update public.replies
    set hidden_at = now(),
        hidden_by = v_uid,
        hidden_reason = btrim(p_reason)
    where id = p_target_id
      and hidden_at is null
      and deleted_at is null;

    if not found then
      raise exception 'That reply is already hidden or unavailable.';
    end if;
  end if;
end;
$$;

revoke all on function public.admin_hide_content(text, uuid, text) from public;
grant execute on function public.admin_hide_content(text, uuid, text) to authenticated;

create or replace function public.admin_unhide_content(
  p_target_type text,
  p_target_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.assert_admin();

  if p_target_type = 'post' then
    update public.posts
    set hidden_at = null,
        hidden_by = null,
        hidden_reason = null
    where id = p_target_id
      and hidden_at is not null
      and deleted_at is null;
  elsif p_target_type = 'reply' then
    update public.replies
    set hidden_at = null,
        hidden_by = null,
        hidden_reason = null
    where id = p_target_id
      and hidden_at is not null
      and deleted_at is null;
  else
    raise exception 'Choose a valid content type.';
  end if;

  if not found then
    raise exception 'That content is not hidden.';
  end if;
end;
$$;

revoke all on function public.admin_unhide_content(text, uuid) from public;
grant execute on function public.admin_unhide_content(text, uuid) to authenticated;

create or replace function public.admin_resolve_report(
  p_report_id uuid,
  p_resolution_note text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := public.assert_admin();
begin
  if p_resolution_note is null
     or char_length(btrim(p_resolution_note)) < 3 then
    raise exception 'Add a short resolution note.';
  end if;

  update public.content_reports
  set status = 'resolved',
      resolved_by = v_uid,
      resolved_at = now(),
      resolution_note = btrim(p_resolution_note)
  where id = p_report_id
    and status = 'pending';

  if not found then
    raise exception 'This report is already resolved.';
  end if;

  perform public.log_audit_event(
    'report.resolved',
    'report',
    p_report_id::text,
    jsonb_build_object('resolution', btrim(p_resolution_note))
  );
end;
$$;

revoke all on function public.admin_resolve_report(uuid, text) from public;
grant execute on function public.admin_resolve_report(uuid, text) to authenticated;

create or replace function public.admin_create_announcement(
  p_title text,
  p_body text,
  p_ends_at timestamptz default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := public.assert_admin();
  v_id uuid;
begin
  if p_title is null or char_length(btrim(p_title)) < 1 then
    raise exception 'Add a title.';
  end if;

  if p_body is null or char_length(btrim(p_body)) < 1 then
    raise exception 'Add a short announcement.';
  end if;

  if p_ends_at is not null and p_ends_at <= now() then
    raise exception 'The end time must be in the future.';
  end if;

  update public.announcements
  set archived_at = now()
  where archived_at is null;

  insert into public.announcements (title, body, created_by, ends_at)
  values (btrim(p_title), btrim(p_body), v_uid, p_ends_at)
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.admin_create_announcement(text, text, timestamptz)
  from public;
grant execute on function public.admin_create_announcement(text, text, timestamptz)
  to authenticated;

create or replace function public.admin_archive_announcement(p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.assert_admin();

  update public.announcements
  set archived_at = now()
  where id = p_id
    and archived_at is null;

  if not found then
    raise exception 'This announcement is already archived.';
  end if;
end;
$$;

revoke all on function public.admin_archive_announcement(uuid) from public;
grant execute on function public.admin_archive_announcement(uuid) to authenticated;

create or replace function public.admin_list_members(p_search text default null)
returns table (
  id uuid,
  display_name text,
  email text,
  role text,
  status text,
  joined_at timestamptz,
  last_sign_in_at timestamptz,
  deactivated_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_search text := nullif(lower(btrim(coalesce(p_search, ''))), '');
begin
  perform public.assert_admin();

  return query
  select
    p.id,
    p.display_name,
    coalesce(u.email, '')::text,
    r.role,
    p.status,
    p.created_at,
    u.last_sign_in_at,
    p.deactivated_at
  from public.profiles p
  join public.member_roles r on r.user_id = p.id
  join auth.users u on u.id = p.id
  where v_search is null
    or lower(p.display_name) like '%' || v_search || '%'
    or lower(coalesce(u.email, '')) like '%' || v_search || '%'
  order by
    case when p.status = 'active' then 0 else 1 end,
    lower(p.display_name)
  limit 250;
end;
$$;

revoke all on function public.admin_list_members(text) from public;
grant execute on function public.admin_list_members(text) to authenticated;

create or replace function public.admin_list_invites()
returns table (
  id uuid,
  email text,
  role text,
  status text,
  personal_note text,
  invited_by_name text,
  created_at timestamptz,
  expires_at timestamptz,
  accepted_at timestamptz,
  revoked_at timestamptz,
  last_shared_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public.assert_admin();

  return query
  select
    i.id,
    i.email,
    i.role,
    case
      when i.revoked_at is not null then 'revoked'
      when i.accepted_at is not null then 'accepted'
      when i.expires_at is not null and i.expires_at <= now() then 'expired'
      else 'pending'
    end::text as status,
    i.personal_note,
    coalesce(p.display_name, 'Circle admin')::text,
    i.created_at,
    i.expires_at,
    i.accepted_at,
    i.revoked_at,
    i.last_shared_at
  from public.invites i
  left join public.profiles p on p.id = i.invited_by
  order by i.created_at desc
  limit 250;
end;
$$;

revoke all on function public.admin_list_invites() from public;
grant execute on function public.admin_list_invites() to authenticated;

create or replace function public.admin_list_reports(p_status text default 'pending')
returns table (
  id uuid,
  target_type text,
  target_id uuid,
  reason text,
  note text,
  status text,
  reporter_name text,
  target_body text,
  target_author text,
  target_plan_date date,
  target_hidden_at timestamptz,
  created_at timestamptz,
  resolution_note text,
  resolved_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public.assert_admin();

  if p_status not in ('pending', 'resolved', 'all') then
    raise exception 'Choose a valid report filter.';
  end if;

  return query
  select
    cr.id,
    cr.target_type,
    cr.target_id,
    cr.reason,
    cr.note,
    cr.status,
    coalesce(reporter.display_name, 'Member')::text,
    left(coalesce(post.body, reply.body, 'Content unavailable'), 400)::text,
    coalesce(author.display_name, 'Member')::text,
    coalesce(post.plan_date, parent.plan_date),
    coalesce(post.hidden_at, reply.hidden_at),
    cr.created_at,
    cr.resolution_note,
    cr.resolved_at
  from public.content_reports cr
  left join public.profiles reporter on reporter.id = cr.reporter_id
  left join public.posts post
    on cr.target_type = 'post' and post.id = cr.target_id
  left join public.replies reply
    on cr.target_type = 'reply' and reply.id = cr.target_id
  left join public.posts parent on parent.id = reply.post_id
  left join public.profiles author
    on author.id = coalesce(post.author_id, reply.author_id)
  where p_status = 'all' or cr.status = p_status
  order by
    case when cr.status = 'pending' then 0 else 1 end,
    cr.created_at desc
  limit 200;
end;
$$;

revoke all on function public.admin_list_reports(text) from public;
grant execute on function public.admin_list_reports(text) to authenticated;

create or replace function public.admin_list_questions(p_filter text default 'open')
returns table (
  id uuid,
  body text,
  author_name text,
  plan_date date,
  status text,
  reply_count bigint,
  answered_reply_id uuid,
  created_at timestamptz,
  hidden_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public.assert_admin();

  if p_filter not in ('open', 'answered', 'all') then
    raise exception 'Choose a valid question filter.';
  end if;

  return query
  select
    p.id,
    left(p.body, 600)::text,
    coalesce(pr.display_name, 'Member')::text,
    p.plan_date,
    p.status,
    count(r.id) filter (
      where r.deleted_at is null and r.hidden_at is null
    ) as reply_count,
    p.answered_reply_id,
    p.created_at,
    p.hidden_at
  from public.posts p
  join public.profiles pr on pr.id = p.author_id
  left join public.replies r on r.post_id = p.id
  where p.kind = 'question'
    and p.deleted_at is null
    and (
      p_filter = 'all'
      or (p_filter = 'answered' and p.answered_reply_id is not null)
      or (
        p_filter = 'open'
        and p.answered_reply_id is null
        and p.hidden_at is null
        and p.status = 'open'
      )
    )
  group by p.id, pr.display_name
  order by
    case when p.answered_reply_id is null then 0 else 1 end,
    p.created_at desc
  limit 200;
end;
$$;

revoke all on function public.admin_list_questions(text) from public;
grant execute on function public.admin_list_questions(text) to authenticated;

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

revoke all on function public.admin_overview_counts() from public;
grant execute on function public.admin_overview_counts() to authenticated;

create or replace function public.admin_list_audit(
  p_limit int default 100,
  p_action text default null
)
returns table (
  id uuid,
  actor_label text,
  action text,
  target_type text,
  target_id text,
  metadata jsonb,
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_action text := nullif(btrim(coalesce(p_action, '')), '');
begin
  perform public.assert_admin();

  return query
  select
    a.id,
    a.actor_label,
    a.action,
    a.target_type,
    a.target_id,
    a.metadata,
    a.created_at
  from public.audit_log a
  where v_action is null or a.action = v_action
  order by a.created_at desc
  limit least(greatest(coalesce(p_limit, 100), 1), 200);
end;
$$;

revoke all on function public.admin_list_audit(int, text) from public;
grant execute on function public.admin_list_audit(int, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 10. RLS and grants for the new tables
-- ---------------------------------------------------------------------------

alter table public.audit_log enable row level security;
alter table public.announcements enable row level security;
alter table public.content_reports enable row level security;
alter table public.sermon_links enable row level security;

create policy "admins read audit log"
  on public.audit_log for select to authenticated
  using (public.is_admin());

revoke all on table public.audit_log from anon, authenticated;
grant select on table public.audit_log to authenticated;

create policy "members read current announcements"
  on public.announcements for select to authenticated
  using (
    public.is_active_member()
    and (
      public.is_admin()
      or (
        archived_at is null
        and starts_at <= now()
        and (ends_at is null or ends_at > now())
      )
    )
  );

create policy "admins create announcements"
  on public.announcements for insert to authenticated
  with check (
    public.is_admin()
    and created_by = (select auth.uid())
  );

create policy "admins update announcements"
  on public.announcements for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

revoke all on table public.announcements from anon, authenticated;
grant select on table public.announcements to authenticated;
grant insert (title, body, starts_at, ends_at)
  on table public.announcements to authenticated;
grant update (title, body, starts_at, ends_at, archived_at)
  on table public.announcements to authenticated;

create policy "members create reports for visible content"
  on public.content_reports for insert to authenticated
  with check (
    public.is_active_member()
    and reporter_id = (select auth.uid())
    and status = 'pending'
    and resolved_by is null
    and resolved_at is null
    and resolution_note is null
    and (
      (
        target_type = 'post'
        and exists (
          select 1
          from public.posts p
          where p.id = content_reports.target_id
            and p.author_id <> (select auth.uid())
            and p.deleted_at is null
            and p.hidden_at is null
            and p.plan_date <= public.circle_today()
        )
      )
      or (
        target_type = 'reply'
        and exists (
          select 1
          from public.replies r
          join public.posts p on p.id = r.post_id
          where r.id = content_reports.target_id
            and r.author_id <> (select auth.uid())
            and r.deleted_at is null
            and r.hidden_at is null
            and p.deleted_at is null
            and p.hidden_at is null
            and p.plan_date <= public.circle_today()
        )
      )
    )
  );

create policy "admins read reports"
  on public.content_reports for select to authenticated
  using (public.is_admin());

revoke all on table public.content_reports from anon, authenticated;
grant select on table public.content_reports to authenticated;
grant insert (target_type, target_id, reason, note)
  on table public.content_reports to authenticated;

create policy "members read published sermon links"
  on public.sermon_links for select to authenticated
  using (
    public.is_active_member()
    and (
      public.is_admin()
      or (is_published = true and published_on <= public.circle_today())
    )
  );

create policy "admins create sermon links"
  on public.sermon_links for insert to authenticated
  with check (
    public.is_admin()
    and created_by = (select auth.uid())
  );

create policy "admins update sermon links"
  on public.sermon_links for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

revoke all on table public.sermon_links from anon, authenticated;
grant select on table public.sermon_links to authenticated;
grant insert (title, url, provider, provider_id, is_published, published_on)
  on table public.sermon_links to authenticated;
grant update (title, url, provider, provider_id, is_published, published_on)
  on table public.sermon_links to authenticated;

-- Members read circle settings; admins can also update the invite template.
grant update (invite_message_template)
  on table public.circle_settings to authenticated;

-- Invite admin policies already exist. Add the new columns to the update grant.
grant update (personal_note, status, expires_at, last_shared_at)
  on table public.invites to authenticated;

-- ---------------------------------------------------------------------------
-- 11. Helpful read grants for audit + admin listings
-- ---------------------------------------------------------------------------

grant execute on function public.admin_list_members(text) to authenticated;
grant execute on function public.admin_list_invites() to authenticated;
grant execute on function public.admin_list_reports(text) to authenticated;
grant execute on function public.admin_list_questions(text) to authenticated;
grant execute on function public.admin_overview_counts() to authenticated;
grant execute on function public.admin_list_audit(int, text) to authenticated;
