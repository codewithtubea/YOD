-- Phase 6 security checks. Run only against staging with:
--   psql "$STAGING_DATABASE_URL" -v ON_ERROR_STOP=1 -f tests/staging/phase6-security.sql
-- Every failed assertion raises and stops the run.

do $$
declare
  tbl text;
begin
  foreach tbl in array array[
    'check_ins',
    'encouragements',
    'care_nudges'
  ]
  loop
    if not exists (
      select 1 from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'private' and c.relname = tbl
    ) then
      raise exception 'private.% is missing', tbl;
    end if;

    if not exists (
      select 1 from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'private'
        and c.relname = tbl
        and c.relrowsecurity
    ) then
      raise exception 'private.% does not have RLS enabled', tbl;
    end if;

    if has_table_privilege('authenticated', format('private.%I', tbl), 'select') then
      raise exception 'members can select private.%', tbl;
    end if;

    if has_table_privilege('anon', format('private.%I', tbl), 'select') then
      raise exception 'anon can select private.%', tbl;
    end if;
  end loop;
end $$;

do $$
declare
  fn record;
begin
  for fn in
    select p.oid, p.proname, p.prosecdef
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in (
        'get_my_check_in',
        'save_my_check_in',
        'get_check_in_presence',
        'get_my_encouragements',
        'send_encouragement',
        'mark_encouragements_read',
        'admin_get_care_summary',
        'admin_list_care_members',
        'admin_list_unanswered_thoughts',
        'admin_send_nudge'
      )
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

  if has_function_privilege('authenticated', 'public.get_my_check_in()', 'execute') is not true then
    raise exception 'authenticated cannot execute get_my_check_in';
  end if;

  if has_function_privilege('authenticated', 'public.admin_send_nudge(uuid,uuid)', 'execute') is not true then
    raise exception 'authenticated cannot execute admin_send_nudge';
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'member_settings'
      and column_name = 'notify_encouragements'
  ) then
    raise exception 'member_settings.notify_encouragements is missing';
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.notifications'::regclass
      and conname = 'notifications_type_check'
      and pg_get_constraintdef(oid) like '%encouragement%'
      and pg_get_constraintdef(oid) like '%nudge%'
  ) then
    raise exception 'notifications_type_check does not include encouragement/nudge';
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'private.check_ins'::regclass
      and contype = 'u'
  ) then
    raise exception 'private.check_ins is missing its weekly unique key';
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'private.encouragements'::regclass
      and conname = 'encouragements_self_check'
  ) then
    raise exception 'private.encouragements is missing the self-note guard';
  end if;

  if not exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'private' and p.proname = 'circle_week_start'
  ) then
    raise exception 'private.circle_week_start is missing';
  end if;

  if has_function_privilege('authenticated', 'private.circle_week_start(timestamptz)', 'execute') then
    raise exception 'authenticated can execute private.circle_week_start';
  end if;
end $$;
