-- Harden function execution privileges.
--
-- Supabase's default privileges grant EXECUTE on new public functions to
-- anon, authenticated, and service_role. Revoking only FROM PUBLIC leaves
-- those explicit grants in place, so anonymous clients can still reach the
-- RPC surface. Remove anon from every existing function and from the default
-- privileges used by future migrations.

alter default privileges for role postgres in schema public
  revoke execute on functions from public;

alter default privileges for role postgres in schema public
  revoke execute on functions from anon;

do $$
declare
  fn regprocedure;
begin
  for fn in
    select p.oid::regprocedure
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.prokind = 'f'
  loop
    execute format('revoke all on function %s from public', fn);
    execute format('revoke all on function %s from anon', fn);
  end loop;
end;
$$;

-- Audit writes and the admin guard are internal. Security-definer callers run
-- as the owner, so revoking these from client roles does not affect them.
revoke all on function public.log_audit_event(text, text, text, jsonb, uuid)
  from authenticated, service_role;
revoke all on function public.assert_admin()
  from authenticated, service_role;
