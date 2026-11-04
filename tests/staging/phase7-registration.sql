-- Phase 7 open-registration and approval checks. Run only against staging with:
--   psql "$STAGING_DATABASE_URL" -v ON_ERROR_STOP=1 -f tests/staging/phase7-registration.sql
-- Runs inside a transaction and rolls back. Every failed assertion stops the run.

begin;

insert into public.invites (email, role)
values
  ('phase7-admin@example.com', 'admin'),
  ('phase7-invited@example.com', 'member');

insert into auth.users (id, email, raw_user_meta_data)
values
  (
    '71000000-0000-0000-0000-000000000001',
    'phase7-admin@example.com',
    '{"display_name": "Phase Seven Admin"}'::jsonb
  ),
  (
    '71000000-0000-0000-0000-000000000002',
    'phase7-invited@example.com',
    '{"display_name": "Phase Seven Invited"}'::jsonb
  ),
  (
    '71000000-0000-0000-0000-000000000003',
    'phase7-open-one@example.com',
    '{"display_name": "Open One"}'::jsonb
  ),
  (
    '71000000-0000-0000-0000-000000000004',
    'phase7-open-two@example.com',
    '{"display_name": "Open Two"}'::jsonb
  ),
  (
    '71000000-0000-0000-0000-000000000005',
    'phase7-open-three@example.com',
    '{"display_name": "Open Three"}'::jsonb
  );

do $$
declare
  v_status text;
  v_role text;
  v_approved_at timestamptz;
  v_approved_by uuid;
  v_invite_status text;
  v_audit_count integer;
begin
  select p.status, r.role, p.approved_at
  into v_status, v_role, v_approved_at
  from public.profiles p
  join public.member_roles r on r.user_id = p.id
  where p.id = '71000000-0000-0000-0000-000000000003';

  if v_status <> 'pending' then
    raise exception 'open registration did not start pending: %', v_status;
  end if;

  if v_role <> 'member' then
    raise exception 'open registration got role %', v_role;
  end if;

  if v_approved_at is not null then
    raise exception 'pending member already has approved_at';
  end if;

  select p.status, r.role
  into v_status, v_role
  from public.profiles p
  join public.member_roles r on r.user_id = p.id
  where p.id = '71000000-0000-0000-0000-000000000002';

  if v_status <> 'active' or v_role <> 'member' then
    raise exception 'invited member did not skip approval: % / %', v_status, v_role;
  end if;

  select accepted_by into v_approved_by
  from public.invites
  where lower(email) = 'phase7-invited@example.com';

  if v_approved_by <> '71000000-0000-0000-0000-000000000002' then
    raise exception 'invite was not linked to the invited account';
  end if;
end $$;

-- A pending member can read only their own profile through RLS.
select set_config(
  'request.jwt.claim.sub',
  '71000000-0000-0000-0000-000000000003',
  false
);

set local role authenticated;

do $$
declare
  v_profiles integer;
  v_directory integer;
  v_membership_status text;
begin
  select count(*) into v_profiles from public.profiles;

  if v_profiles <> 1 then
    raise exception 'pending member can read % profiles, expected 1', v_profiles;
  end if;

  select count(*) into v_directory from public.member_directory;

  if v_directory <> 0 then
    raise exception 'pending member can read the member directory';
  end if;

  select status into v_membership_status from public.get_my_membership();

  if v_membership_status <> 'pending' then
    raise exception 'pending member sees status %', v_membership_status;
  end if;

  if public.is_active_member() then
    raise exception 'pending member is treated as active';
  end if;
end $$;

reset role;

-- Signing in does not fail and does not promote a pending account.
update auth.users
set last_sign_in_at = now()
where id = '71000000-0000-0000-0000-000000000003';

do $$
declare
  v_status text;
begin
  select status into v_status
  from public.profiles
  where id = '71000000-0000-0000-0000-000000000003';

  if v_status <> 'pending' then
    raise exception 'sign-in changed pending status to %', v_status;
  end if;
end $$;

-- A normal member cannot approve anyone.
select set_config(
  'request.jwt.claim.sub',
  '71000000-0000-0000-0000-000000000002',
  false
);

do $$
begin
  begin
    perform public.admin_approve_member('71000000-0000-0000-0000-000000000003');
    raise exception 'a normal member approved another member';
  exception
    when sqlstate '42501' then null;
  end;
end $$;

-- Only the dedicated approval path accepts a pending member.
select set_config(
  'request.jwt.claim.sub',
  '71000000-0000-0000-0000-000000000001',
  false
);

do $$
begin
  begin
    perform public.admin_set_member_status(
      '71000000-0000-0000-0000-000000000003',
      'active'
    );
    raise exception 'generic status RPC approved a pending member';
  exception
    when sqlstate 'P0001' then null;
  end;
end $$;

do $$
declare
  v_status text;
  v_approved_at timestamptz;
  v_approved_by uuid;
  v_audit integer;
begin
  perform public.admin_approve_member('71000000-0000-0000-0000-000000000003');

  select status, approved_at, approved_by
  into v_status, v_approved_at, v_approved_by
  from public.profiles
  where id = '71000000-0000-0000-0000-000000000003';

  if v_status <> 'active' then
    raise exception 'approval left status at %', v_status;
  end if;

  if v_approved_at is null
     or v_approved_by <> '71000000-0000-0000-0000-000000000001' then
    raise exception 'approval metadata was not recorded';
  end if;

  select count(*) into v_audit
  from public.audit_log
  where action = 'member.approved'
    and target_id = '71000000-0000-0000-0000-000000000003';

  if v_audit <> 1 then
    raise exception 'expected one approval audit row, found %', v_audit;
  end if;

  -- Approving again is harmless and does not duplicate the audit row.
  perform public.admin_approve_member('71000000-0000-0000-0000-000000000003');

  select count(*) into v_audit
  from public.audit_log
  where action = 'member.approved'
    and target_id = '71000000-0000-0000-0000-000000000003';

  if v_audit <> 1 then
    raise exception 'repeat approval duplicated the audit row';
  end if;
end $$;

-- The remaining pending account can be approved and counted.
do $$
declare
  v_pending integer;
  v_counted integer;
begin
  select count(*) into v_pending
  from public.profiles
  where status = 'pending';

  select (public.admin_overview_counts() ->> 'members_pending')::integer
  into v_counted;

  if v_pending <> v_counted then
    raise exception 'pending count mismatch: % vs %', v_pending, v_counted;
  end if;

  perform public.admin_approve_member('71000000-0000-0000-0000-000000000004');
end $$;

-- First sign-in marks the pre-approved invite accepted.
update auth.users
set last_sign_in_at = now()
where id = '71000000-0000-0000-0000-000000000002';

do $$
declare
  v_status text;
begin
  select status into v_status
  from public.invites
  where lower(email) = 'phase7-invited@example.com';

  if v_status <> 'accepted' then
    raise exception 'invite status after sign-in is %', v_status;
  end if;
end $$;

select 'phase7 registration checks passed' as result;

rollback;
