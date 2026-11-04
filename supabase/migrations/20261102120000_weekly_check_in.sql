-- Phase 6: weekly check-in and being seen.
--
-- Check-ins and encouragement notes live in the private schema and are only
-- reachable through RPCs. Members see their own check-in and aggregate
-- presence; admins get a care view. Encouragement contents are visible only
-- to the sender and the recipient. Applied migrations are immutable; this file
-- is additive.

-- ---------------------------------------------------------------------------
-- 1. Notifications can carry encouragement and gentle nudges
-- ---------------------------------------------------------------------------

alter table public.notifications
  drop constraint if exists notifications_type_check;
alter table public.notifications
  add constraint notifications_type_check
  check (type in ('reply', 'amen', 'answered', 'encouragement', 'nudge'));

alter table public.notifications
  drop constraint if exists notifications_target_check;
alter table public.notifications
  add constraint notifications_target_check
  check (
    (
      type in ('reply', 'amen', 'answered')
      and (post_id is not null or reply_id is not null)
    )
    or (type = 'encouragement' and post_id is null and reply_id is null)
    or (type = 'nudge')
  );

-- ---------------------------------------------------------------------------
-- 2. Member notification preference for encouragement notes
-- ---------------------------------------------------------------------------

alter table public.member_settings
  add column if not exists notify_encouragements boolean not null default true;

grant insert (notify_encouragements) on table public.member_settings
  to authenticated;
grant update (notify_encouragements) on table public.member_settings
  to authenticated;

-- ---------------------------------------------------------------------------
-- 3. Circle week helper (Monday start in the circle timezone)
-- ---------------------------------------------------------------------------

create or replace function private.circle_week_start(
  p_at timestamptz default now()
)
returns date
language plpgsql
stable
set search_path = ''
as $$
declare
  configured_timezone text;
begin
  select timezone
  into configured_timezone
  from public.circle_settings
  where id = true;

  begin
    return date_trunc(
      'week',
      (coalesce(p_at, now()) at time zone coalesce(configured_timezone, 'Africa/Accra'))
    )::date;
  exception when others then
    return date_trunc(
      'week',
      (coalesce(p_at, now()) at time zone 'Africa/Accra')
    )::date;
  end;
end;
$$;

revoke all on function private.circle_week_start(timestamptz)
  from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 4. Private tables
-- ---------------------------------------------------------------------------

create table private.check_ins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade
    default auth.uid(),
  week_start date not null,
  mood text not null
    check (mood in ('grateful', 'steady', 'heavy', 'resting')),
  note text
    check (note is null or char_length(note) between 1 and 280),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, week_start)
);

comment on table private.check_ins is
  'One gentle weekly check-in per member. RPC-only; admins see it for care, members see only their own and aggregate presence.';

create index check_ins_week_idx
  on private.check_ins (week_start, user_id);
create index check_ins_user_idx
  on private.check_ins (user_id, week_start desc);

create table private.encouragements (
  id uuid primary key default gen_random_uuid(),
  from_user_id uuid not null references public.profiles (id) on delete cascade
    default auth.uid(),
  to_user_id uuid not null references public.profiles (id) on delete cascade,
  body text not null
    check (char_length(body) between 1 and 280),
  read_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  constraint encouragements_self_check check (from_user_id <> to_user_id)
);

comment on table private.encouragements is
  'Private encouragement notes between members. Contents are visible only to the sender and recipient.';

create index encouragements_recipient_idx
  on private.encouragements (to_user_id, created_at desc)
  where deleted_at is null;
create index encouragements_sender_idx
  on private.encouragements (from_user_id, created_at desc);
create index encouragements_unread_idx
  on private.encouragements (to_user_id, created_at desc)
  where read_at is null and deleted_at is null;

create table private.care_nudges (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid references public.profiles (id) on delete set null,
  user_id uuid not null references public.profiles (id) on delete cascade,
  post_id uuid references public.posts (id) on delete set null,
  created_at timestamptz not null default now()
);

comment on table private.care_nudges is
  'Admin gentle nudges to a member. Kept for throttling and audit context.';

create index care_nudges_user_idx
  on private.care_nudges (user_id, created_at desc);
create index care_nudges_post_idx
  on private.care_nudges (post_id);

create trigger check_ins_set_updated_at
  before update on private.check_ins
  for each row execute function public.set_updated_at();

alter table private.check_ins enable row level security;
alter table private.encouragements enable row level security;
alter table private.care_nudges enable row level security;

revoke all on table private.check_ins from public, anon, authenticated;
revoke all on table private.encouragements from public, anon, authenticated;
revoke all on table private.care_nudges from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 5. Member RPCs: weekly check-in
-- ---------------------------------------------------------------------------

create or replace function public.get_my_check_in()
returns table (
  week_start date,
  mood text,
  note text,
  updated_at timestamptz,
  checked_in boolean
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
begin
  if v_uid is null or not public.is_active_member() then
    raise exception 'This account is not active.' using errcode = '42501';
  end if;

  return query
  select
    w.week_start,
    c.mood,
    c.note,
    c.updated_at,
    (c.id is not null)
  from (select private.circle_week_start() as week_start) w
  left join private.check_ins c
    on c.user_id = v_uid
   and c.week_start = w.week_start;
end;
$$;

revoke all on function public.get_my_check_in() from public, anon;
grant execute on function public.get_my_check_in() to authenticated;

create or replace function public.save_my_check_in(
  p_mood text,
  p_note text default null
)
returns table (
  week_start date,
  mood text,
  note text,
  updated_at timestamptz,
  checked_in boolean
)
language plpgsql
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_uid uuid := (select auth.uid());
  v_mood text := lower(btrim(coalesce(p_mood, '')));
  v_note text := nullif(btrim(coalesce(p_note, '')), '');
  v_week date := private.circle_week_start();
begin
  if v_uid is null or not public.is_active_member() then
    raise exception 'This account is not active.' using errcode = '42501';
  end if;

  if v_mood not in ('grateful', 'steady', 'heavy', 'resting') then
    raise exception 'Choose how this week feels.' using errcode = '22023';
  end if;

  if v_note is not null and char_length(v_note) > 280 then
    raise exception 'Keep your note under 280 characters.'
      using errcode = '22023';
  end if;

  insert into private.check_ins (user_id, week_start, mood, note)
  values (v_uid, v_week, v_mood, v_note)
  on conflict (user_id, week_start) do update
  set mood = excluded.mood,
      note = excluded.note,
      updated_at = now();

  return query
  select c.week_start, c.mood, c.note, c.updated_at, true
  from private.check_ins c
  where c.user_id = v_uid
    and c.week_start = v_week;
end;
$$;

revoke all on function public.save_my_check_in(text, text) from public, anon;
grant execute on function public.save_my_check_in(text, text) to authenticated;

create or replace function public.get_check_in_presence()
returns table (
  week_start date,
  circle_size bigint,
  checked_in_count bigint,
  viewer_checked_in boolean
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
begin
  if v_uid is null or not public.is_active_member() then
    raise exception 'This account is not active.' using errcode = '42501';
  end if;

  return query
  select
    w.week_start,
    (select count(*) from public.profiles p where p.status = 'active'),
    (
      select count(*)
      from private.check_ins c
      where c.week_start = w.week_start
    ),
    exists (
      select 1
      from private.check_ins c
      where c.week_start = w.week_start
        and c.user_id = v_uid
    )
  from (select private.circle_week_start() as week_start) w;
end;
$$;

revoke all on function public.get_check_in_presence() from public, anon;
grant execute on function public.get_check_in_presence() to authenticated;

-- ---------------------------------------------------------------------------
-- 6. Member RPCs: encouragement notes
-- ---------------------------------------------------------------------------

create or replace function public.get_my_encouragements(p_limit integer default 30)
returns table (
  id uuid,
  body text,
  created_at timestamptz,
  read_at timestamptz,
  sender_id uuid,
  sender_name text,
  sender_avatar_path text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
begin
  if v_uid is null or not public.is_active_member() then
    raise exception 'This account is not active.' using errcode = '42501';
  end if;

  return query
  select
    e.id,
    e.body,
    e.created_at,
    e.read_at,
    e.from_user_id,
    p.display_name,
    p.avatar_path
  from private.encouragements e
  join public.profiles p on p.id = e.from_user_id
  where e.to_user_id = v_uid
    and e.deleted_at is null
  order by e.created_at desc
  limit least(greatest(coalesce(p_limit, 30), 1), 50);
end;
$$;

revoke all on function public.get_my_encouragements(integer) from public, anon;
grant execute on function public.get_my_encouragements(integer)
  to authenticated;

create or replace function public.send_encouragement(
  p_to uuid,
  p_body text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_body text := btrim(coalesce(p_body, ''));
  v_recent bigint;
  v_to_recent bigint;
  v_notify boolean;
  v_id uuid;
begin
  if v_uid is null or not public.is_active_member() then
    raise exception 'This account is not active.' using errcode = '42501';
  end if;

  if p_to is null then
    raise exception 'Choose someone to encourage.' using errcode = '22023';
  end if;

  if p_to = v_uid then
    raise exception 'Encouragement is for someone else.' using errcode = 'P0001';
  end if;

  if not exists (
    select 1 from public.profiles p
    where p.id = p_to and p.status = 'active'
  ) then
    raise exception 'That member is not available.' using errcode = 'P0001';
  end if;

  if char_length(v_body) = 0 then
    raise exception 'Write a short word of encouragement.' using errcode = '22023';
  end if;

  if char_length(v_body) > 280 then
    raise exception 'Keep this under 280 characters.' using errcode = '22023';
  end if;

  select count(*)
  into v_recent
  from private.encouragements
  where from_user_id = v_uid
    and created_at > now() - interval '1 hour';

  if v_recent >= 20 then
    raise exception 'You have sent a lot of notes in a short time. Please wait a little while.'
      using errcode = 'P0001';
  end if;

  select count(*)
  into v_to_recent
  from private.encouragements
  where from_user_id = v_uid
    and to_user_id = p_to
    and created_at > now() - interval '1 day';

  if v_to_recent >= 5 then
    raise exception 'You have sent several notes to this person today. Give it a little time.'
      using errcode = 'P0001';
  end if;

  insert into private.encouragements (from_user_id, to_user_id, body)
  values (v_uid, p_to, v_body)
  returning id into v_id;

  select coalesce(s.notify_encouragements, true)
  into v_notify
  from public.member_settings s
  where s.user_id = p_to;

  if coalesce(v_notify, true) then
    insert into public.notifications (
      user_id, type, actor_id, post_id, reply_id
    )
    values (p_to, 'encouragement', v_uid, null, null);
  end if;

  return v_id;
end;
$$;

revoke all on function public.send_encouragement(uuid, text) from public, anon;
grant execute on function public.send_encouragement(uuid, text)
  to authenticated;

create or replace function public.mark_encouragements_read()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_count integer;
begin
  if v_uid is null or not public.is_active_member() then
    raise exception 'This account is not active.' using errcode = '42501';
  end if;

  with updated as (
    update private.encouragements
    set read_at = now()
    where to_user_id = v_uid
      and deleted_at is null
      and read_at is null
    returning 1
  )
  select count(*) into v_count from updated;

  return v_count;
end;
$$;

revoke all on function public.mark_encouragements_read() from public, anon;
grant execute on function public.mark_encouragements_read()
  to authenticated;

-- ---------------------------------------------------------------------------
-- 7. Admin care view
-- ---------------------------------------------------------------------------

create or replace function public.admin_get_care_summary()
returns table (
  week_start date,
  circle_size bigint,
  checked_in_count bigint,
  grateful bigint,
  steady bigint,
  heavy bigint,
  resting bigint
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
    w.week_start,
    (select count(*) from public.profiles p where p.status = 'active'),
    (
      select count(*)
      from private.check_ins c
      where c.week_start = w.week_start
    ),
    (
      select count(*)
      from private.check_ins c
      where c.week_start = w.week_start and c.mood = 'grateful'
    ),
    (
      select count(*)
      from private.check_ins c
      where c.week_start = w.week_start and c.mood = 'steady'
    ),
    (
      select count(*)
      from private.check_ins c
      where c.week_start = w.week_start and c.mood = 'heavy'
    ),
    (
      select count(*)
      from private.check_ins c
      where c.week_start = w.week_start and c.mood = 'resting'
    )
  from (select private.circle_week_start() as week_start) w;
end;
$$;

revoke all on function public.admin_get_care_summary() from public, anon;
grant execute on function public.admin_get_care_summary()
  to authenticated;

create or replace function public.admin_list_care_members()
returns table (
  id uuid,
  display_name text,
  avatar_path text,
  checked_in boolean,
  mood text,
  note text,
  checked_in_at timestamptz
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
    p.id,
    p.display_name,
    p.avatar_path,
    (c.id is not null),
    c.mood,
    c.note,
    c.updated_at
  from public.profiles p
  left join private.check_ins c
    on c.user_id = p.id
   and c.week_start = private.circle_week_start()
  where p.status = 'active'
  order by p.display_name asc
  limit 500;
end;
$$;

revoke all on function public.admin_list_care_members() from public, anon;
grant execute on function public.admin_list_care_members()
  to authenticated;

create or replace function public.admin_list_unanswered_thoughts(
  p_days integer default 1
)
returns table (
  id uuid,
  body text,
  plan_date date,
  author_id uuid,
  author_name text,
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_days integer := least(greatest(coalesce(p_days, 1), 1), 30);
begin
  perform public.assert_admin();

  return query
  select
    po.id,
    po.body,
    po.plan_date,
    po.author_id,
    p.display_name,
    po.created_at
  from public.posts po
  join public.profiles p on p.id = po.author_id
  where po.kind = 'thought'
    and po.hidden_at is null
    and po.deleted_at is null
    and po.author_id is not null
    and p.status = 'active'
    and po.created_at <= now() - make_interval(days => v_days)
    and not exists (
      select 1
      from public.replies r
      where r.post_id = po.id
        and r.hidden_at is null
        and r.deleted_at is null
    )
  order by po.created_at asc
  limit 50;
end;
$$;

revoke all on function public.admin_list_unanswered_thoughts(integer)
  from public, anon;
grant execute on function public.admin_list_unanswered_thoughts(integer)
  to authenticated;

create or replace function public.admin_send_nudge(
  p_user_id uuid,
  p_post_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin uuid := public.assert_admin();
  v_recent integer;
begin
  if p_user_id is null then
    raise exception 'Choose a member to nudge.' using errcode = '22023';
  end if;

  if not exists (
    select 1 from public.profiles p
    where p.id = p_user_id and p.status = 'active'
  ) then
    raise exception 'That member is not available.' using errcode = 'P0001';
  end if;

  if p_post_id is not null then
    if not exists (
      select 1
      from public.posts po
      where po.id = p_post_id
        and po.author_id = p_user_id
        and po.kind = 'thought'
        and po.hidden_at is null
        and po.deleted_at is null
    ) then
      raise exception 'That thought is no longer available.' using errcode = 'P0001';
    end if;
  end if;

  select count(*)
  into v_recent
  from private.care_nudges
  where user_id = p_user_id
    and created_at > now() - interval '24 hours'
    and post_id is not distinct from p_post_id;

  if v_recent > 0 then
    raise exception 'A nudge was already sent for this recently.'
      using errcode = 'P0001';
  end if;

  insert into private.care_nudges (admin_id, user_id, post_id)
  values (v_admin, p_user_id, p_post_id);

  insert into public.notifications (
    user_id, type, actor_id, post_id, reply_id
  )
  values (p_user_id, 'nudge', v_admin, p_post_id, null);

  perform public.log_audit_event(
    'care.nudged',
    'member',
    p_user_id::text,
    jsonb_build_object('post_id', p_post_id),
    v_admin
  );
end;
$$;

revoke all on function public.admin_send_nudge(uuid, uuid) from public, anon;
grant execute on function public.admin_send_nudge(uuid, uuid)
  to authenticated;

-- ---------------------------------------------------------------------------
-- 8. Account deletion removes private Phase 6 data
-- ---------------------------------------------------------------------------

create or replace function public.delete_my_account(
  p_proof_id uuid,
  p_mode text,
  p_confirm text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_session uuid := nullif(auth.jwt() ->> 'session_id', '')::uuid;
  v_proof private.account_action_proofs%rowtype;
  v_role text;
  v_admins integer;
  v_email text;
  v_avatar text;
begin
  if v_uid is null or not public.is_active_member() then
    raise exception 'This account is not active.' using errcode = '42501';
  end if;

  if p_confirm is distinct from 'DELETE' then
    raise exception 'Type DELETE exactly to confirm.' using errcode = '22023';
  end if;

  if p_mode not in ('delete_content', 'keep_contributions') then
    raise exception 'Choose what happens to your contributions.'
      using errcode = '22023';
  end if;

  select *
  into v_proof
  from private.account_action_proofs
  where id = p_proof_id
    and user_id = v_uid
    and action = 'delete_account'
    and session_id = v_session
    and used_at is null
    and expires_at > now()
  for update;

  if not found then
    raise exception 'Verify your email again before deleting your account.'
      using errcode = 'P0001';
  end if;

  select r.role into v_role
  from public.member_roles r
  where r.user_id = v_uid;

  if v_role = 'admin' then
    select count(*)
    into v_admins
    from public.member_roles r
    join public.profiles p on p.id = r.user_id
    where r.role = 'admin' and p.status = 'active';

    if v_admins <= 1 then
      raise exception 'Add another administrator before leaving the circle.'
        using errcode = 'P0001';
    end if;
  end if;

  select u.email into v_email from auth.users u where u.id = v_uid;
  select p.avatar_path into v_avatar from public.profiles p where p.id = v_uid;

  update private.account_action_proofs
  set used_at = now()
  where id = v_proof.id;

  if p_mode = 'delete_content' then
    update public.posts
    set deleted_at = now()
    where author_id = v_uid and deleted_at is null;

    update public.replies
    set deleted_at = now()
    where author_id = v_uid and deleted_at is null;
  end if;

  delete from private.prayer_prayed where user_id = v_uid;
  delete from private.prayer_updates where author_id = v_uid;
  delete from private.prayers where author_id = v_uid;
  delete from private.check_ins where user_id = v_uid;
  delete from private.encouragements
  where from_user_id = v_uid or to_user_id = v_uid;
  delete from private.care_nudges
  where user_id = v_uid or admin_id = v_uid;
  delete from public.reactions where user_id = v_uid;
  delete from public.read_receipts where user_id = v_uid;
  delete from public.affirmation_favorites where user_id = v_uid;
  delete from public.notifications where user_id = v_uid;
  delete from public.content_reports where reporter_id = v_uid;
  delete from public.contact_admin where author_id = v_uid;

  if v_avatar is not null then
    delete from storage.objects
    where bucket_id = 'avatars' and name = v_avatar;
  end if;

  update public.invites
  set status = 'left',
      accepted_at = null,
      accepted_by = null,
      revoked_at = null
  where lower(email) = lower(coalesce(v_email, ''));

  insert into public.audit_log (
    actor_id, actor_label, action, target_type, target_id, metadata
  )
  values (
    v_uid,
    'Former member',
    'account_deleted',
    'account',
    v_uid::text,
    jsonb_build_object('mode', p_mode)
  );

  delete from auth.users where id = v_uid;
end;
$$;

revoke all on function public.delete_my_account(uuid, text, text)
  from public, anon;
grant execute on function public.delete_my_account(uuid, text, text)
  to authenticated;

-- ---------------------------------------------------------------------------
-- 9. Account export includes Phase 6 data
-- ---------------------------------------------------------------------------

create or replace function public.export_my_data()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_exports integer;
  v_email text;
begin
  if v_uid is null or not public.is_active_member() then
    raise exception 'This account is not active.' using errcode = '42501';
  end if;

  select count(*)
  into v_exports
  from private.account_export_events
  where user_id = v_uid
    and created_at > now() - interval '1 hour';

  if v_exports >= 1 then
    raise exception 'You can export once an hour. Try again later.'
      using errcode = 'P0001';
  end if;

  select email into v_email from auth.users where id = v_uid;
  insert into private.account_export_events (user_id) values (v_uid);

  insert into public.audit_log (
    actor_id, actor_label, action, target_type, target_id, metadata
  )
  values (
    v_uid, 'Member', 'account_export', 'account', v_uid::text, '{}'::jsonb
  );

  return jsonb_build_object(
    'exported_at', now(),
    'profile', (
      select jsonb_build_object(
        'id', p.id,
        'display_name', p.display_name,
        'bio', p.bio,
        'email', v_email,
        'joined_at', p.created_at,
        'onboarded_at', p.onboarded_at
      )
      from public.profiles p
      where p.id = v_uid
    ),
    'settings', (
      select jsonb_build_object(
        'reduce_motion', s.reduce_motion,
        'theme', s.theme,
        'text_size', s.text_size,
        'notify_replies', s.notify_replies,
        'notify_amens', s.notify_amens,
        'notify_answered', s.notify_answered,
        'notify_encouragements', s.notify_encouragements
      )
      from public.member_settings s
      where s.user_id = v_uid
    ),
    'posts', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', p.id,
        'plan_date', p.plan_date,
        'kind', p.kind,
        'body', p.body,
        'status', p.status,
        'created_at', p.created_at,
        'edited_at', p.edited_at,
        'deleted_at', p.deleted_at
      ) order by p.created_at)
      from public.posts p
      where p.author_id = v_uid
    ), '[]'::jsonb),
    'replies', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', r.id,
        'post_id', r.post_id,
        'parent_reply_id', r.parent_reply_id,
        'body', r.body,
        'created_at', r.created_at,
        'edited_at', r.edited_at,
        'deleted_at', r.deleted_at
      ) order by r.created_at)
      from public.replies r
      where r.author_id = v_uid
    ), '[]'::jsonb),
    'prayers', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', pr.id,
        'body', pr.body,
        'status', pr.status,
        'created_at', pr.created_at,
        'answered_at', pr.answered_at,
        'deleted_at', pr.deleted_at
      ) order by pr.created_at)
      from private.prayers pr
      where pr.author_id = v_uid
    ), '[]'::jsonb),
    'prayer_updates', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', pu.id,
        'prayer_id', pu.prayer_id,
        'body', pu.body,
        'created_at', pu.created_at
      ) order by pu.created_at)
      from private.prayer_updates pu
      where pu.author_id = v_uid
    ), '[]'::jsonb),
    'check_ins', coalesce((
      select jsonb_agg(jsonb_build_object(
        'week_start', c.week_start,
        'mood', c.mood,
        'note', c.note,
        'created_at', c.created_at,
        'updated_at', c.updated_at
      ) order by c.week_start desc)
      from private.check_ins c
      where c.user_id = v_uid
    ), '[]'::jsonb),
    'encouragements_sent', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', e.id,
        'to_user_id', e.to_user_id,
        'body', e.body,
        'created_at', e.created_at
      ) order by e.created_at)
      from private.encouragements e
      where e.from_user_id = v_uid
        and e.deleted_at is null
    ), '[]'::jsonb),
    'encouragements_received', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', e.id,
        'from_user_id', e.from_user_id,
        'body', e.body,
        'read_at', e.read_at,
        'created_at', e.created_at
      ) order by e.created_at)
      from private.encouragements e
      where e.to_user_id = v_uid
        and e.deleted_at is null
    ), '[]'::jsonb),
    'reactions', coalesce((
      select jsonb_agg(jsonb_build_object(
        'target_type', rc.target_type,
        'target_id', rc.target_id,
        'kind', rc.kind,
        'created_at', rc.created_at
      ) order by rc.created_at)
      from public.reactions rc
      where rc.user_id = v_uid
    ), '[]'::jsonb),
    'read_receipts', coalesce((
      select jsonb_agg(jsonb_build_object(
        'plan_date', rr.plan_date,
        'created_at', rr.created_at
      ) order by rr.plan_date)
      from public.read_receipts rr
      where rr.user_id = v_uid
    ), '[]'::jsonb),
    'saved_affirmations', coalesce((
      select jsonb_agg(jsonb_build_object(
        'affirmation_id', af.affirmation_id,
        'created_at', af.created_at
      ) order by af.created_at)
      from public.affirmation_favorites af
      where af.user_id = v_uid
    ), '[]'::jsonb),
    'contact_messages', coalesce((
      select jsonb_agg(jsonb_build_object(
        'category', cm.category,
        'subject', cm.subject,
        'body', cm.body,
        'status', cm.status,
        'created_at', cm.created_at
      ) order by cm.created_at)
      from public.contact_admin cm
      where cm.author_id = v_uid
    ), '[]'::jsonb)
  );
end;
$$;

revoke all on function public.export_my_data() from public, anon;
grant execute on function public.export_my_data() to authenticated;
