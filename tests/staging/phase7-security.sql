-- Phase 7 security checks. Run only against staging with:
--   psql "$STAGING_DATABASE_URL" -v ON_ERROR_STOP=1 -f tests/staging/phase7-security.sql
-- Every failed assertion raises and stops the run.

do $$
declare
  fn record;
begin
  if not exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'admin_approve_member'
      and oidvectortypes(p.proargtypes) = 'uuid'
  ) then
    raise exception 'admin_approve_member(uuid) is missing';
  end if;

  for fn in
    select p.oid, p.proname
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in ('admin_approve_member', 'admin_set_member_status')
  loop
    if not fn.prosecdef then
      raise exception 'public.% is not security definer', fn.proname;
    end if;

    if has_function_privilege('anon', fn.oid, 'execute') then
      raise exception 'anon can execute public.%', fn.proname;
    end if;

    if exists (
      select 1
      from aclexplode((select proacl from pg_proc where oid = fn.oid)) acl
      where acl.grantee = 0 and acl.privilege_type = 'EXECUTE'
    ) then
      raise exception 'PUBLIC can execute public.%', fn.proname;
    end if;

    if not ('search_path=""' = any(coalesce((select proconfig from pg_proc where oid = fn.oid), '{}'::text[]))) then
      raise exception 'public.% does not pin search_path', fn.proname;
    end if;
  end loop;

  if has_function_privilege(
    'authenticated',
    'public.admin_approve_member(uuid)',
    'execute'
  ) is not true then
    raise exception 'authenticated cannot execute admin_approve_member';
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.profiles'::regclass
      and conname = 'profiles_status_check'
      and pg_get_constraintdef(oid) like '%pending%'
  ) then
    raise exception 'profiles_status_check does not include pending';
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name = 'approved_at'
  ) then
    raise exception 'profiles.approved_at is missing';
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name = 'approved_by'
  ) then
    raise exception 'profiles.approved_by is missing';
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name = 'status'
      and column_default = '''pending''::text'
  ) then
    raise exception 'profiles.status does not default to pending';
  end if;

  if has_column_privilege('authenticated', 'public.profiles', 'status', 'update') then
    raise exception 'members can update profiles.status';
  end if;

  if has_column_privilege('authenticated', 'public.profiles', 'approved_at', 'update') then
    raise exception 'members can update profiles.approved_at';
  end if;

  if has_column_privilege('authenticated', 'public.profiles', 'approved_by', 'update') then
    raise exception 'members can update profiles.approved_by';
  end if;

  if has_table_privilege('authenticated', 'public.profiles', 'insert') then
    raise exception 'members can insert profiles directly';
  end if;
end $$;

select 'phase7 security checks passed' as result;
