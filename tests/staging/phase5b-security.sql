-- Phase 5B security checks. Run only against staging with:
--   psql "$STAGING_DATABASE_URL" -v ON_ERROR_STOP=1 -f tests/staging/phase5b-security.sql
-- Every failed assertion raises and stops the run.

do $$
declare
  fn record;
begin
  if not exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'delete_my_account'
      and oidvectortypes(p.proargtypes) = 'uuid, text, text'
  ) then
    raise exception 'delete_my_account(uuid, text, text) is missing';
  end if;

  if not exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'complete_onboarding'
  ) then
    raise exception 'complete_onboarding() is missing';
  end if;

  for fn in
    select p.oid, p.proname
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in (
        'complete_onboarding',
        'save_my_profile',
        'get_my_contribution_counts',
        'set_my_avatar',
        'begin_account_action',
        'complete_account_action',
        'delete_my_account',
        'export_my_data',
        'admin_reveal_prayer_author',
        'notify_on_reply',
        'notify_on_amen',
        'notify_on_answered'
      )
  loop
    if has_function_privilege('anon', fn.oid, 'execute') then
      raise exception 'anon can execute public.%', fn.proname;
    end if;

    if (select proacl from pg_proc where oid = fn.oid) is null then
      raise exception 'public.% still has default PUBLIC execute', fn.proname;
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

  if has_function_privilege('authenticated', 'public.delete_my_account(uuid,text,text)', 'execute') is not true then
    raise exception 'authenticated cannot execute delete_my_account';
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_views
    where schemaname = 'public'
      and viewname = 'member_directory'
  ) then
    raise exception 'member_directory view is missing';
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'member_directory'
      and column_name in ('email', 'role', 'status', 'onboarded_at')
  ) then
    raise exception 'member_directory exposes a private column';
  end if;

  if not exists (
    select 1 from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = 'member_directory'
      and c.reloptions @> array['security_invoker=true']
  ) then
    raise exception 'member_directory is not security_invoker';
  end if;

  if has_column_privilege('authenticated', 'public.profiles', 'status', 'update') then
    raise exception 'members can update profiles.status';
  end if;

  if has_column_privilege('authenticated', 'public.profiles', 'display_name', 'update') then
    raise exception 'members can update profiles directly instead of the RPC';
  end if;

  if has_column_privilege('authenticated', 'public.profiles', 'onboarded_at', 'update') then
    raise exception 'members can update profiles.onboarded_at';
  end if;

  if has_table_privilege('authenticated', 'private.prayers', 'select') then
    raise exception 'members can select private.prayers';
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'member_settings'
      and column_name = 'notify_replies'
  ) then
    raise exception 'member_settings.notify_replies is missing';
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'member_settings'
      and column_name = 'notify_amens'
  ) then
    raise exception 'member_settings.notify_amens is missing';
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'member_settings'
      and column_name = 'notify_answered'
  ) then
    raise exception 'member_settings.notify_answered is missing';
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'invites_status_check'
      and pg_get_constraintdef(oid) like '%left%'
  ) then
    raise exception 'invites_status_check does not include left';
  end if;

  if not exists (
    select 1 from storage.buckets
    where id = 'avatars' and public = false
  ) then
    raise exception 'avatars bucket is missing or public';
  end if;

  if not exists (
    select 1 from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = 'member_settings'
      and c.relrowsecurity
  ) then
    raise exception 'member_settings does not have RLS enabled';
  end if;

  if not exists (
    select 1 from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = 'contact_admin'
      and c.relrowsecurity
  ) then
    raise exception 'contact_admin does not have RLS enabled';
  end if;
end $$;

select 'phase5b security checks passed' as result;
