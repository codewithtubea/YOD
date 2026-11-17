-- Restore open registration with invite pre-approval, repair orphaned accounts,
-- and make every pending registration visible in the admin member list.

-- ---------------------------------------------------------------------------
-- 1. Repair accounts that exist in auth.users but are invisible to admins
-- ---------------------------------------------------------------------------

insert into public.profiles (id, display_name, status)
select
  u.id,
  coalesce(
    nullif(
      left(
        coalesce(
          nullif(u.raw_user_meta_data ->> 'display_name', ''),
          nullif(u.raw_user_meta_data ->> 'full_name', ''),
          split_part(lower(coalesce(u.email, '')), '@', 1)
        ),
        50
      ),
      ''
    ),
    'Member'
  ),
  'pending'
from auth.users u
where not exists (
  select 1 from public.profiles p where p.id = u.id
)
on conflict (id) do nothing;

insert into public.member_roles (user_id, role)
select p.id, 'member'
from public.profiles p
where not exists (
  select 1 from public.member_roles r where r.user_id = p.id
)
on conflict (user_id) do nothing;

-- ---------------------------------------------------------------------------
-- 2. Registration: open to anyone; a usable invite is a pre-approval
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
  birthday_value date;
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

  begin
    birthday_value := (new.raw_user_meta_data ->> 'birthday')::date;
  exception when invalid_text_representation or invalid_datetime_format then
    birthday_value := null;
  end;

  if has_invite then
    new_status := 'active';
    new_role := invite_record.role;
  end if;

  insert into public.profiles (id, display_name, status, approved_at, birthday)
  values (
    new.id,
    left(fallback_name, 50),
    new_status,
    case when has_invite then now() else null end,
    birthday_value
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
-- 3. Admin member list: never cap out pending requests
-- ---------------------------------------------------------------------------

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
    coalesce(r.role, 'member')::text,
    p.status,
    p.created_at,
    u.last_sign_in_at,
    p.deactivated_at
  from public.profiles p
  left join public.member_roles r on r.user_id = p.id
  left join auth.users u on u.id = p.id
  where v_search is null
    or lower(p.display_name) like '%' || v_search || '%'
    or lower(coalesce(u.email, '')) like '%' || v_search || '%'
  order by
    case when p.status = 'pending' then 0 when p.status = 'active' then 1 else 2 end,
    lower(p.display_name);
end;
$$;

revoke all on function public.admin_list_members(text) from public;
grant execute on function public.admin_list_members(text) to authenticated;
