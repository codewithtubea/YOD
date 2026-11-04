-- Default-deny future public objects.
--
-- Supabase grants new public tables, sequences, and functions to the Data API
-- roles by default. RLS still protects rows, but new objects should also be
-- deny-by-default at the privilege layer. Existing objects keep their current
-- grants; future migrations must grant explicitly.

alter default privileges for role postgres in schema public
  revoke all on tables from public, anon, authenticated, service_role;

alter default privileges for role postgres in schema public
  revoke all on sequences from public, anon, authenticated, service_role;

alter default privileges for role postgres in schema public
  revoke execute on functions from public, anon, authenticated, service_role;
