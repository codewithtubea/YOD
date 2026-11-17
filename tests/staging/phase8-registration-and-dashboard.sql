-- Phase 8 registration, invite pre-approval and admin visibility checks.
-- Run only against STAGING with:
--   psql "$STAGING_DATABASE_URL" -v ON_ERROR_STOP=1 -f tests/staging/phase8-registration-and-dashboard.sql
-- Runs inside a transaction and rolls back. Every failed assertion stops the run.

begin;

insert into public.invites (email, role)
values ('phase8-invited@example.com', 'admin');

insert into auth.users (id, email, raw_user_meta_data)
values
  (
    '72000000-0000-0000-0000-000000000001',
    'phase8-invited@example.com',
    '{"display_name": "Phase Eight Admin"}'::jsonb
  ),
  (
    '72000000-0000-0000-0000-000000000002',
    'phase8-open@example.com',
    '{"display_name": "Phase Eight Open"}'::jsonb
  ),
  (
    '72000000-0000-0000-0000-000000000003',
    'phase8-orphan@example.com',
    '{"display_name": "Phase Eight Orphan"}'::jsonb
  );

-- The trigger at signup creates the profile and role in the same transaction.
do $$
declare
  v_status text;
  v_role text;
  v_approved_at timestamptz;
begin
  select p.status, r.role, p.approved_at
  into v_status, v_role, v_approved_at
  from public.profiles p
  join public.member_roles r on r.user_id = p.id
  where p.id = '72000000-0000-0000-0000-000000000001';

  if v_status <> 'active' or v_role <> 'admin' or v_approved_at is null then
    raise exception 'invited admin did not skip approval: % / %', v_status, v_role;
  end if;

  select p.status, r.role
  into v_status, v_role
  from public.profiles p
  join public.member_roles r on r.user_id = p.id
  where p.id = '72000000-0000-0000-0000-000000000002';

  if v_status <> 'pending' or v_role <> 'member' then
    raise exception 'open registration is not pending: % / %', v_status, v_role;
  end if;
end $$;

-- A profile missing its role row must still be visible to the admin list.
delete from public.member_roles
where user_id = '72000000-0000-0000-0000-000000000003';

select set_config(
  'request.jwt.claim.sub',
  '72000000-0000-0000-0000-000000000001',
  false
);
set local role authenticated;

do $$
declare
  v_rows integer;
  v_first_status text;
begin
  select count(*) into v_rows
  from public.admin_list_members(null)
  where id in (
    '72000000-0000-0000-0000-000000000002',
    '72000000-0000-0000-0000-000000000003'
  );

  if v_rows <> 2 then
    raise exception 'admin member list hid pending or role-less profiles: %', v_rows;
  end if;

  select status into v_first_status
  from public.admin_list_members(null)
  limit 1;

  if v_first_status <> 'pending' then
    raise exception 'pending requests are not listed first: %', v_first_status;
  end if;
end $$;

select 'phase8 registration and dashboard checks passed' as result;

rollback;
