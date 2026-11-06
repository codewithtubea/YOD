-- Phase 7B: private birthdays + birthday notice for the circle.
-- Birthdays are stored privately on the profile and are only surfaced through
-- today's birthday RPC to active members/admins.

alter table public.profiles
  add column if not exists birthday date
    check (
      birthday is null
      or (birthday >= '1900-01-01'::date and birthday <= current_date)
    );

comment on column public.profiles.birthday is
  'Private birthday used for annual circle celebration only. Not exposed in the member directory.';

create or replace function public.get_today_birthdays()
returns table (
  user_id uuid,
  display_name text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_today_month integer := extract(month from current_date);
  v_today_day integer := extract(day from current_date);
begin
  return query
  select p.id as user_id,
         p.display_name
  from public.profiles p
  join public.member_roles r on r.user_id = p.id
  where p.status = 'active'
    and r.role in ('member', 'admin')
    and p.birthday is not null
    and extract(month from p.birthday) = v_today_month
    and extract(day from p.birthday) = v_today_day;
end;
$$;

revoke all on function public.get_today_birthdays() from public, anon;
grant execute on function public.get_today_birthdays() to authenticated;

create or replace function public.get_my_account()
returns table (
  id uuid,
  display_name text,
  bio text,
  avatar_path text,
  birthday date,
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
    p.birthday,
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

create or replace function public.save_my_profile(
  p_display_name text,
  p_bio text default null,
  p_birthday date default null
)
returns table (
  display_name text,
  bio text,
  birthday date,
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
  v_birthday date := p_birthday;
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

  if v_birthday is not null and (
    v_birthday < '1900-01-01'::date or v_birthday > current_date
  ) then
    raise exception 'Choose a valid birthday for today or earlier.'
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
      bio = v_bio,
      birthday = v_birthday
  where id = v_uid;

  insert into private.profile_edit_events (user_id) values (v_uid);

  return query
  select p.display_name, p.bio, p.birthday, p.onboarded_at
  from public.profiles p
  where p.id = v_uid;
end;
$$;

revoke all on function public.save_my_profile(text, text, date) from public, anon;
grant execute on function public.save_my_profile(text, text, date) to authenticated;

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
  birthday_value date;
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

  begin
    birthday_value := (
      new.raw_user_meta_data ->> 'birthday'
    )::date;
  exception when invalid_text_representation then
    birthday_value := null;
  end;

  insert into public.profiles (id, display_name, birthday)
  values (new.id, left(fallback_name, 50), birthday_value);

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
