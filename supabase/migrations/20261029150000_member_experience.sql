-- Phase 5B: member experience.
--
-- Profiles, private member settings, avatar storage, onboarding, account
-- export/deletion, and the member-to-admin concern channel.
-- Apply after 20261029140000_affirmations.sql. Applied migrations are immutable.

-- ---------------------------------------------------------------------------
-- 1. Profile shape and directory
-- ---------------------------------------------------------------------------

alter table public.profiles
  add column if not exists avatar_path text
    check (
      avatar_path is null
      or char_length(avatar_path) between 3 and 300
    ),
  add column if not exists onboarded_at timestamptz;

comment on column public.profiles.avatar_path is
  'Private storage path in the avatars bucket. Never a public URL.';
comment on column public.profiles.onboarded_at is
  'When the member finished the welcome flow. Existing members are backfilled.';

update public.profiles
set onboarded_at = created_at
where onboarded_at is null;

alter table public.profiles drop constraint if exists profiles_display_name_check;
alter table public.profiles drop constraint if exists profiles_bio_check;
alter table public.profiles add constraint profiles_display_name_check
  check (char_length(btrim(display_name)) between 1 and 50) not valid;
alter table public.profiles add constraint profiles_bio_check
  check (bio is null or char_length(bio) <= 160) not valid;

alter table public.profiles drop column if exists avatar_url;

create or replace view public.member_directory
with (security_invoker = true)
as
select
  id,
  display_name,
  avatar_path,
  bio,
  created_at as joined_at
from public.profiles
where status = 'active';

comment on view public.member_directory is
  'Listed member fields only. No email, status, role, or onboarding state.';

revoke all on public.member_directory from public, anon, authenticated;
grant select on public.member_directory to authenticated;

-- Members can no longer write profile columns directly; the RPC below adds
-- validation and a simple edit throttle. Reading stays column-limited.
revoke update on table public.profiles from authenticated;
revoke update (display_name, bio, avatar_path, status, onboarded_at)
  on table public.profiles from authenticated;
revoke select on table public.profiles from authenticated;
revoke select (
  id, display_name, bio, avatar_path, status, created_at, updated_at
) on table public.profiles from authenticated;
grant select (id, display_name, bio, avatar_path, created_at, updated_at, status)
  on table public.profiles to authenticated;

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
  values (new.id, left(fallback_name, 50));

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

create or replace function public.get_my_account()
returns table (
  id uuid,
  display_name text,
  bio text,
  avatar_path text,
  joined_at timestamptz,
  onboarded_at timestamptz,
  email text,
  role text,
  status text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
begin
  if v_uid is null then
    raise exception 'Sign in again.' using errcode = '42501';
  end if;

  return query
  select
    p.id,
    p.display_name,
    p.bio,
    p.avatar_path,
    p.created_at,
    p.onboarded_at,
    coalesce(u.email, '')::text,
    r.role,
    p.status
  from public.profiles p
  join public.member_roles r on r.user_id = p.id
  join auth.users u on u.id = p.id
  where p.id = v_uid;
end;
$$;

revoke all on function public.get_my_account() from public, anon;
grant execute on function public.get_my_account() to authenticated;

create table private.profile_edit_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);

create index profile_edit_events_user_idx
  on private.profile_edit_events (user_id, created_at desc);

revoke all on table private.profile_edit_events
  from public, anon, authenticated;

create or replace function public.save_my_profile(
  p_display_name text,
  p_bio text default null
)
returns table (
  display_name text,
  bio text,
  onboarded_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_name text := btrim(coalesce(p_display_name, ''));
  v_bio text := nullif(btrim(coalesce(p_bio, '')), '');
  v_edits integer;
begin
  if v_uid is null or not public.is_active_member() then
    raise exception 'This account is not active.' using errcode = '42501';
  end if;

  if char_length(v_name) not between 1 and 50 then
    raise exception 'Keep your name between 1 and 50 characters.'
      using errcode = '22023';
  end if;

  if v_bio is not null and char_length(v_bio) > 160 then
    raise exception 'Keep your bio under 160 characters.'
      using errcode = '22023';
  end if;

  select count(*)
  into v_edits
  from private.profile_edit_events
  where user_id = v_uid
    and created_at > now() - interval '1 hour';

  if v_edits >= 30 then
    raise exception 'You have made a lot of profile changes. Please wait a little while.'
      using errcode = 'P0001';
  end if;

  update public.profiles
  set display_name = v_name,
      bio = v_bio
  where id = v_uid;

  insert into private.profile_edit_events (user_id) values (v_uid);

  return query
  select p.display_name, p.bio, p.onboarded_at
  from public.profiles p
  where p.id = v_uid;
end;
$$;

revoke all on function public.save_my_profile(text, text) from public, anon;
grant execute on function public.save_my_profile(text, text) to authenticated;

create or replace function public.complete_onboarding()
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_at timestamptz;
begin
  if v_uid is null or not public.is_active_member() then
    raise exception 'This account is not active.' using errcode = '42501';
  end if;

  update public.profiles
  set onboarded_at = coalesce(onboarded_at, now())
  where id = v_uid
  returning onboarded_at into v_at;

  return v_at;
end;
$$;

revoke all on function public.complete_onboarding() from public, anon;
grant execute on function public.complete_onboarding() to authenticated;

create or replace function public.get_my_contribution_counts()
returns table (thoughts bigint, replies bigint, prayers_shared bigint)
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
    (select count(*) from public.posts
      where author_id = v_uid
        and kind = 'thought'
        and deleted_at is null
        and hidden_at is null),
    (select count(*) from public.replies
      where author_id = v_uid
        and deleted_at is null
        and hidden_at is null),
    (select count(*) from private.prayers
      where author_id = v_uid
        and deleted_at is null);
end;
$$;

revoke all on function public.get_my_contribution_counts() from public, anon;
grant execute on function public.get_my_contribution_counts() to authenticated;

-- ---------------------------------------------------------------------------
-- 2. Private member settings
-- ---------------------------------------------------------------------------

create table public.member_settings (
  user_id uuid primary key
    references public.profiles (id) on delete cascade
    default auth.uid(),
  reduce_motion boolean not null default false,
  theme text not null default 'system'
    check (theme in ('system', 'light', 'dark')),
  text_size text not null default 'default'
    check (text_size in ('default', 'large')),
  notify_replies boolean not null default true,
  notify_amens boolean not null default true,
  notify_answered boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger member_settings_set_updated_at
  before update on public.member_settings
  for each row execute function public.set_updated_at();

alter table public.member_settings enable row level security;

create policy "members read their own settings"
  on public.member_settings for select to authenticated
  using (user_id = (select auth.uid()));

create policy "members create their own settings"
  on public.member_settings for insert to authenticated
  with check (user_id = (select auth.uid()) and public.is_active_member());

create policy "members update their own settings"
  on public.member_settings for update to authenticated
  using (user_id = (select auth.uid()) and public.is_active_member())
  with check (user_id = (select auth.uid()) and public.is_active_member());

revoke all on table public.member_settings from public, anon, authenticated;
grant select on table public.member_settings to authenticated;
grant insert (
  reduce_motion, theme, text_size,
  notify_replies, notify_amens, notify_answered
) on table public.member_settings to authenticated;
grant update (
  reduce_motion, theme, text_size,
  notify_replies, notify_amens, notify_answered
) on table public.member_settings to authenticated;

-- ---------------------------------------------------------------------------
-- 3. Private avatars
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  false,
  1048576,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create policy "active members read avatars"
  on storage.objects for select to authenticated
  using (bucket_id = 'avatars' and public.is_active_member());

create policy "members upload their own avatar"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and public.is_active_member()
  );

create policy "members update their own avatar"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and public.is_active_member()
  )
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and public.is_active_member()
  );

create policy "members delete their own avatar"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and public.is_active_member()
  );

create table private.avatar_upload_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  path text not null,
  created_at timestamptz not null default now()
);

create index avatar_upload_events_user_idx
  on private.avatar_upload_events (user_id, created_at desc);

revoke all on table private.avatar_upload_events
  from public, anon, authenticated;

create or replace function public.set_my_avatar(p_path text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_path text := nullif(btrim(coalesce(p_path, '')), '');
  v_old text;
  v_uploads integer;
begin
  if v_uid is null or not public.is_active_member() then
    raise exception 'This account is not active.' using errcode = '42501';
  end if;

  select avatar_path into v_old
  from public.profiles
  where id = v_uid;

  if v_path is null then
    update public.profiles set avatar_path = null where id = v_uid;
    return v_old;
  end if;

  if char_length(v_path) > 300
     or v_path !~ ('^' || v_uid::text || '/[A-Za-z0-9._-]+$') then
    raise exception 'Choose an image from your own avatar folder.'
      using errcode = '22023';
  end if;

  if not exists (
    select 1 from storage.objects
    where bucket_id = 'avatars' and name = v_path
  ) then
    raise exception 'That image was not uploaded. Try again.' using errcode = 'P0001';
  end if;

  select count(*)
  into v_uploads
  from private.avatar_upload_events
  where user_id = v_uid
    and created_at > now() - interval '1 hour';

  if v_uploads >= 10 then
    raise exception 'You have changed your photo a lot. Please wait a little while.'
      using errcode = 'P0001';
  end if;

  update public.profiles set avatar_path = v_path where id = v_uid;
  insert into private.avatar_upload_events (user_id, path) values (v_uid, v_path);

  return v_old;
end;
$$;

revoke all on function public.set_my_avatar(text) from public, anon;
grant execute on function public.set_my_avatar(text) to authenticated;

-- Invites can also record a member who has left. Admins may renew a 'left'
-- invite for the same email instead of treating it as permanently used.
alter table public.invites drop constraint if exists invites_status_check;
alter table public.invites add constraint invites_status_check
  check (status in ('pending', 'accepted', 'revoked', 'expired', 'left'));

-- ---------------------------------------------------------------------------
-- 3b. Notification preferences
-- ---------------------------------------------------------------------------

create or replace function public.notify_on_reply()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  post_author uuid;
begin
  select author_id into post_author
  from public.posts
  where id = new.post_id;

  if post_author is not null
     and post_author <> new.author_id
     and coalesce((
       select s.notify_replies
       from public.member_settings s
       where s.user_id = post_author
     ), true) then
    insert into public.notifications (user_id, type, actor_id, post_id, reply_id)
    values (post_author, 'reply', new.author_id, new.post_id, new.id);
  end if;

  return new;
end;
$$;

revoke all on function public.notify_on_reply() from public;

create or replace function public.notify_on_amen()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  owner_id uuid;
  related_post uuid;
  related_reply uuid;
begin
  if new.target_type = 'post' then
    select author_id into owner_id
    from public.posts
    where id = new.target_id;
    related_post := new.target_id;
  else
    select r.author_id, r.post_id
    into owner_id, related_post
    from public.replies r
    where r.id = new.target_id;
    related_reply := new.target_id;
  end if;

  if owner_id is null
     or owner_id = new.user_id
     or not coalesce((
       select s.notify_amens
       from public.member_settings s
       where s.user_id = owner_id
     ), true) then
    return new;
  end if;

  update public.notifications
  set read_at = null,
      created_at = now()
  where user_id = owner_id
    and type = 'amen'
    and actor_id = new.user_id
    and post_id = related_post
    and reply_id is not distinct from related_reply;

  if not found then
    insert into public.notifications (
      user_id, type, actor_id, post_id, reply_id
    )
    values (owner_id, 'amen', new.user_id, related_post, related_reply);
  end if;

  return new;
end;
$$;

revoke all on function public.notify_on_amen() from public;

create or replace function public.notify_on_answered()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  recipient uuid;
  actor uuid := coalesce((select auth.uid()), new.author_id);
begin
  if new.status = 'answered' and old.status is distinct from 'answered' then
    for recipient in
      select distinct candidates.candidate
      from (
        select new.author_id as candidate
        union all
        select r.author_id
        from public.replies r
        where r.id = new.answered_reply_id
      ) candidates
      where candidates.candidate is not null
        and candidates.candidate <> actor
        and coalesce((
          select s.notify_answered
          from public.member_settings s
          where s.user_id = candidates.candidate
        ), true)
    loop
      insert into public.notifications (
        user_id, type, actor_id, post_id, reply_id
      )
      values (
        recipient, 'answered', actor, new.id, new.answered_reply_id
      );
    end loop;
  end if;

  return new;
end;
$$;

revoke all on function public.notify_on_answered() from public;

-- ---------------------------------------------------------------------------
-- 4. Keep authored contributions after a member leaves
-- ---------------------------------------------------------------------------

alter table public.posts alter column author_id drop not null;
alter table public.replies alter column author_id drop not null;

alter table public.posts drop constraint if exists posts_author_id_fkey;
alter table public.posts add constraint posts_author_id_fkey
  foreign key (author_id) references public.profiles (id) on delete set null;

alter table public.replies drop constraint if exists replies_author_id_fkey;
alter table public.replies add constraint replies_author_id_fkey
  foreign key (author_id) references public.profiles (id) on delete set null;

-- ---------------------------------------------------------------------------
-- 5. Account action proofs (OTP re-verification)
-- ---------------------------------------------------------------------------

create table private.account_action_challenges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  action text not null check (action in ('delete_account')),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  consumed_at timestamptz
);

create index account_action_challenges_user_idx
  on private.account_action_challenges (user_id, created_at desc);

create table private.account_action_proofs (
  id uuid primary key default gen_random_uuid(),
  challenge_id uuid not null
    references private.account_action_challenges (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  action text not null check (action in ('delete_account')),
  session_id uuid,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  used_at timestamptz
);

create index account_action_proofs_user_idx
  on private.account_action_proofs (user_id, created_at desc);

revoke all on table private.account_action_challenges
  from public, anon, authenticated;
revoke all on table private.account_action_proofs
  from public, anon, authenticated;

create or replace function public.begin_account_action(p_action text)
returns table (challenge_id uuid, expires_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_id uuid;
  v_expires timestamptz := now() + interval '5 minutes';
begin
  if v_uid is null or not public.is_active_member() then
    raise exception 'This account is not active.' using errcode = '42501';
  end if;

  if p_action is distinct from 'delete_account' then
    raise exception 'Choose a valid account action.' using errcode = '22023';
  end if;

  insert into private.account_action_challenges (user_id, action, expires_at)
  values (v_uid, p_action, v_expires)
  returning id into v_id;

  return query select v_id, v_expires;
end;
$$;

revoke all on function public.begin_account_action(text) from public, anon;
grant execute on function public.begin_account_action(text) to authenticated;

create or replace function public.complete_account_action(p_challenge_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_session uuid := nullif(auth.jwt() ->> 'session_id', '')::uuid;
  v_challenge private.account_action_challenges%rowtype;
  v_proof uuid;
begin
  if v_uid is null or not public.is_active_member() then
    raise exception 'This account is not active.' using errcode = '42501';
  end if;

  if v_session is null or not exists (
    select 1 from auth.sessions s
    where s.id = v_session and s.user_id = v_uid
  ) then
    raise exception 'Your session could not be verified. Sign in again.'
      using errcode = '42501';
  end if;

  select *
  into v_challenge
  from private.account_action_challenges
  where id = p_challenge_id
    and user_id = v_uid
    and action = 'delete_account'
    and consumed_at is null
    and expires_at > now()
  for update;

  if not found then
    raise exception 'That verification has expired. Request a new code.'
      using errcode = 'P0001';
  end if;

  update private.account_action_challenges
  set consumed_at = now()
  where id = v_challenge.id;

  insert into private.account_action_proofs (
    challenge_id, user_id, action, session_id, expires_at
  )
  values (
    v_challenge.id, v_uid, v_challenge.action, v_session,
    now() + interval '5 minutes'
  )
  returning id into v_proof;

  return v_proof;
end;
$$;

revoke all on function public.complete_account_action(uuid) from public, anon;
grant execute on function public.complete_account_action(uuid) to authenticated;

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
-- 6. Data export
-- ---------------------------------------------------------------------------

create table private.account_export_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);

create index account_export_events_user_idx
  on private.account_export_events (user_id, created_at desc);

revoke all on table private.account_export_events
  from public, anon, authenticated;

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
        'notify_answered', s.notify_answered
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

-- Safety-only path to prayer authorship. The prayer body is never written to
-- the audit log; the reveal itself is recorded with ids only.
create or replace function public.admin_reveal_prayer_author(p_prayer_id uuid)
returns table (author_id uuid, display_name text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin uuid := public.assert_admin();
  v_label text;
  v_author uuid;
  v_name text;
begin
  select pr.author_id, p.display_name
  into v_author, v_name
  from private.prayers pr
  join public.profiles p on p.id = pr.author_id
  where pr.id = p_prayer_id
    and pr.deleted_at is null;

  if v_author is null then
    raise exception 'Prayer not found.' using errcode = 'P0002';
  end if;

  select coalesce(nullif(p.display_name, ''), 'Admin')
  into v_label
  from public.profiles p
  where p.id = v_admin;

  insert into public.audit_log (
    actor_id, actor_label, action, target_type, target_id, metadata
  )
  values (
    v_admin,
    coalesce(v_label, 'Admin'),
    'prayer_author_revealed',
    'prayer',
    p_prayer_id::text,
    '{}'::jsonb
  );

  return query select v_author, v_name;
end;
$$;

revoke all on function public.admin_reveal_prayer_author(uuid)
  from public, anon;
grant execute on function public.admin_reveal_prayer_author(uuid)
  to authenticated;

-- ---------------------------------------------------------------------------
-- 7. Contact the admins
-- ---------------------------------------------------------------------------

create table public.contact_admin (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles (id) on delete cascade
    default auth.uid(),
  category text not null default 'other'
    check (category in ('account', 'privacy', 'content', 'technical', 'other')),
  subject text not null
    check (char_length(btrim(subject)) between 1 and 120),
  body text not null
    check (char_length(btrim(body)) between 1 and 2000),
  status text not null default 'new'
    check (status in ('new', 'resolved')),
  admin_note text
    check (admin_note is null or char_length(admin_note) <= 1000),
  resolved_at timestamptz,
  resolved_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index contact_admin_status_idx
  on public.contact_admin (status, created_at desc);
create index contact_admin_author_idx
  on public.contact_admin (author_id, created_at desc);

create trigger contact_admin_set_updated_at
  before update on public.contact_admin
  for each row execute function public.set_updated_at();

alter table public.contact_admin enable row level security;

create policy "members read their own concerns"
  on public.contact_admin for select to authenticated
  using (author_id = (select auth.uid()) or public.is_admin());

revoke all on table public.contact_admin from public, anon, authenticated;
grant select on table public.contact_admin to authenticated;

create or replace function public.create_contact_message(
  p_category text,
  p_subject text,
  p_body text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_category text := btrim(coalesce(p_category, ''));
  v_subject text := btrim(coalesce(p_subject, ''));
  v_body text := btrim(coalesce(p_body, ''));
  v_recent integer;
  v_id uuid;
begin
  if v_uid is null or not public.is_active_member() then
    raise exception 'This account is not active.' using errcode = '42501';
  end if;

  if v_category not in ('account', 'privacy', 'content', 'technical', 'other') then
    raise exception 'Choose what this is about.' using errcode = '22023';
  end if;

  if char_length(v_subject) not between 1 and 120 then
    raise exception 'Add a short subject.' using errcode = '22023';
  end if;

  if char_length(v_body) not between 1 and 2000 then
    raise exception 'Keep your message between 1 and 2,000 characters.'
      using errcode = '22023';
  end if;

  select count(*)
  into v_recent
  from public.contact_admin
  where author_id = v_uid
    and created_at > now() - interval '1 hour';

  if v_recent >= 3 then
    raise exception 'You have sent a few messages already. Please wait before sending another.'
      using errcode = 'P0001';
  end if;

  insert into public.contact_admin (author_id, category, subject, body)
  values (v_uid, v_category, v_subject, v_body)
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.create_contact_message(text, text, text)
  from public, anon;
grant execute on function public.create_contact_message(text, text, text)
  to authenticated;

create or replace function public.admin_list_concerns(p_status text default 'new')
returns table (
  id uuid,
  category text,
  subject text,
  body text,
  status text,
  author_name text,
  created_at timestamptz,
  resolved_at timestamptz,
  admin_note text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public.assert_admin();

  if p_status not in ('new', 'resolved', 'all') then
    raise exception 'Choose a valid concern filter.';
  end if;

  return query
  select
    c.id,
    c.category,
    c.subject,
    c.body,
    c.status,
    coalesce(p.display_name, 'Former member')::text,
    c.created_at,
    c.resolved_at,
    c.admin_note
  from public.contact_admin c
  left join public.profiles p on p.id = c.author_id
  where p_status = 'all' or c.status = p_status
  order by
    case when c.status = 'new' then 0 else 1 end,
    c.created_at desc
  limit 200;
end;
$$;

revoke all on function public.admin_list_concerns(text) from public, anon;
grant execute on function public.admin_list_concerns(text) to authenticated;

create or replace function public.admin_resolve_concern(
  p_id uuid,
  p_note text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_note text := btrim(coalesce(p_note, ''));
begin
  perform public.assert_admin();

  if char_length(v_note) not between 3 and 1000 then
    raise exception 'Add a short note for the record.' using errcode = '22023';
  end if;

  update public.contact_admin
  set status = 'resolved',
      admin_note = v_note,
      resolved_at = now(),
      resolved_by = v_uid
  where id = p_id and status = 'new';

  if not found then
    raise exception 'That concern was not found or is already resolved.'
      using errcode = 'P0001';
  end if;

  perform public.log_audit_event(
    'concern_resolved',
    'contact_admin',
    p_id::text,
    jsonb_build_object('note', v_note),
    v_uid
  );
end;
$$;

revoke all on function public.admin_resolve_concern(uuid, text)
  from public, anon;
grant execute on function public.admin_resolve_concern(uuid, text)
  to authenticated;

-- Add a pending-concern count to the admin overview without a new page.
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

-- ---------------------------------------------------------------------------
-- 8. Explicit endpoint grants
-- ---------------------------------------------------------------------------

grant execute on function public.get_my_account() to authenticated;
grant execute on function public.save_my_profile(text, text) to authenticated;
grant execute on function public.complete_onboarding() to authenticated;
grant execute on function public.get_my_contribution_counts() to authenticated;
grant execute on function public.set_my_avatar(text) to authenticated;
grant execute on function public.begin_account_action(text) to authenticated;
grant execute on function public.complete_account_action(uuid) to authenticated;
grant execute on function public.delete_my_account(uuid, text, text) to authenticated;
grant execute on function public.export_my_data() to authenticated;
grant execute on function public.admin_reveal_prayer_author(uuid)
  to authenticated;
grant execute on function public.create_contact_message(text, text, text)
  to authenticated;
grant execute on function public.admin_list_concerns(text) to authenticated;
grant execute on function public.admin_resolve_concern(uuid, text)
  to authenticated;
grant execute on function public.admin_overview_counts() to authenticated;
