-- Phase 4: anonymous prayer wall.
--
-- Prayer content lives in the private schema. It is never exposed directly
-- through the Data API. The public functions below are the only access path,
-- and each one checks active membership and ownership or visibility itself.
-- Applied migrations are immutable; this file is additive.

create schema if not exists private;

revoke all on schema private from public;
revoke all on schema private from anon, authenticated;

-- ---------------------------------------------------------------------------
-- 1. Private tables
-- ---------------------------------------------------------------------------

create table private.prayers (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles (id) on delete cascade
    default auth.uid(),
  body text not null check (char_length(body) between 1 and 1200),
  status text not null default 'open'
    check (status in ('open', 'answered')),
  answered_at timestamptz,
  hidden_at timestamptz,
  hidden_by uuid references public.profiles (id) on delete set null,
  hidden_reason text
    check (hidden_reason is null or char_length(hidden_reason) between 1 and 280),
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint prayers_answered_at_check check (
    (status = 'open' and answered_at is null)
    or (status = 'answered' and answered_at is not null)
  )
);

comment on table private.prayers is
  'Anonymous prayer wall requests. RPC-only; never expose author_id to clients.';
comment on column private.prayers.author_id is
  'Private authorship retained for ownership checks. Never returned by public RPCs.';

create table private.prayer_updates (
  id uuid primary key default gen_random_uuid(),
  prayer_id uuid not null references private.prayers (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade
    default auth.uid(),
  body text not null check (char_length(body) between 1 and 600),
  created_at timestamptz not null default now()
);

comment on table private.prayer_updates is
  'Author updates on a prayer. RPC-only; author_id is never exposed.';

create table private.prayer_prayed (
  prayer_id uuid not null references private.prayers (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (prayer_id, user_id)
);

comment on table private.prayer_prayed is
  'Private "I prayed" records. Only aggregate counts are exposed.';

create index prayers_feed_idx
  on private.prayers (created_at desc, id desc)
  where hidden_at is null and deleted_at is null;
create index prayers_author_rate_idx
  on private.prayers (author_id, created_at desc);
create index prayers_hidden_by_idx
  on private.prayers (hidden_by);
create index prayer_updates_prayer_idx
  on private.prayer_updates (prayer_id, created_at asc, id asc);
create index prayer_updates_author_idx
  on private.prayer_updates (author_id);
create index prayer_prayed_user_idx
  on private.prayer_prayed (user_id);

create trigger prayers_set_updated_at
  before update on private.prayers
  for each row
  execute function public.set_updated_at();

alter table private.prayers enable row level security;
alter table private.prayer_updates enable row level security;
alter table private.prayer_prayed enable row level security;

-- Default deny: no policies and no direct table grants. Security-definer
-- RPCs are the only supported access path.
revoke all on table private.prayers from public, anon, authenticated;
revoke all on table private.prayer_updates from public, anon, authenticated;
revoke all on table private.prayer_prayed from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 2. Public RPCs
-- ---------------------------------------------------------------------------

create or replace function public.get_prayer_wall(
  p_limit integer default 20,
  p_before timestamptz default null,
  p_before_id uuid default null
)
returns table (
  id uuid,
  body text,
  status text,
  created_at timestamptz,
  answered_at timestamptz,
  viewer_is_author boolean,
  prayed_count bigint,
  viewer_prayed boolean,
  updates jsonb
)
language sql
stable
security definer
set search_path = ''
as $$
  with visible as (
    select p.*
    from private.prayers p
    where public.is_active_member()
      and p.hidden_at is null
      and p.deleted_at is null
      and (
        p_before is null
        or p_before_id is null
        or (p.created_at, p.id) < (p_before, p_before_id)
      )
    order by p.created_at desc, p.id desc
    limit (least(greatest(coalesce(p_limit, 20), 1), 50) + 1)
  )
  select
    v.id,
    v.body,
    v.status,
    v.created_at,
    v.answered_at,
    (v.author_id = (select auth.uid())) as viewer_is_author,
    (
      select count(*)
      from private.prayer_prayed pp
      where pp.prayer_id = v.id
    ) as prayed_count,
    exists (
      select 1
      from private.prayer_prayed pp
      where pp.prayer_id = v.id
        and pp.user_id = (select auth.uid())
    ) as viewer_prayed,
    coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'id', u.id,
            'body', u.body,
            'created_at', u.created_at
          )
          order by u.created_at asc, u.id asc
        )
        from private.prayer_updates u
        where u.prayer_id = v.id
      ),
      '[]'::jsonb
    ) as updates
  from visible v
  order by v.created_at desc, v.id desc;
$$;

revoke all on function public.get_prayer_wall(integer, timestamptz, uuid)
  from public;
grant execute on function public.get_prayer_wall(integer, timestamptz, uuid)
  to authenticated;

create or replace function public.create_prayer(p_body text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_body text := btrim(coalesce(p_body, ''));
  v_recent bigint;
  v_id uuid;
begin
  if v_uid is null or not public.is_active_member() then
    raise exception 'Only active circle members can share a prayer.';
  end if;

  if char_length(v_body) = 0 then
    raise exception 'Write a prayer first.';
  end if;

  if char_length(v_body) > 1200 then
    raise exception 'Keep this under 1,200 characters.';
  end if;

  select count(*)
  into v_recent
  from private.prayers
  where author_id = v_uid
    and created_at > now() - interval '10 minutes';

  if v_recent >= 5 then
    raise exception 'You have shared a lot in a short time. Please wait a few minutes.';
  end if;

  insert into private.prayers (author_id, body)
  values (v_uid, v_body)
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.create_prayer(text) from public;
grant execute on function public.create_prayer(text) to authenticated;

create or replace function public.toggle_prayer_prayed(p_prayer_id uuid)
returns table (prayed boolean, prayed_count bigint)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_prayed boolean;
begin
  if v_uid is null or not public.is_active_member() then
    raise exception 'Only active circle members can pray.';
  end if;

  if not exists (
    select 1
    from private.prayers
    where id = p_prayer_id
      and hidden_at is null
      and deleted_at is null
  ) then
    raise exception 'That prayer is no longer available.';
  end if;

  if exists (
    select 1
    from private.prayer_prayed
    where prayer_id = p_prayer_id
      and user_id = v_uid
  ) then
    delete from private.prayer_prayed
    where prayer_id = p_prayer_id
      and user_id = v_uid;
    v_prayed := false;
  else
    insert into private.prayer_prayed (prayer_id, user_id)
    values (p_prayer_id, v_uid)
    on conflict (prayer_id, user_id) do nothing;
    v_prayed := true;
  end if;

  return query
  select
    v_prayed,
    (
      select count(*)
      from private.prayer_prayed
      where prayer_id = p_prayer_id
    )::bigint;
end;
$$;

revoke all on function public.toggle_prayer_prayed(uuid) from public;
grant execute on function public.toggle_prayer_prayed(uuid) to authenticated;

create or replace function public.add_prayer_update(
  p_prayer_id uuid,
  p_body text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_body text := btrim(coalesce(p_body, ''));
  v_recent bigint;
  v_id uuid;
begin
  if v_uid is null or not public.is_active_member() then
    raise exception 'Only active circle members can add an update.';
  end if;

  if char_length(v_body) = 0 then
    raise exception 'Write an update first.';
  end if;

  if char_length(v_body) > 600 then
    raise exception 'Keep updates under 600 characters.';
  end if;

  if not exists (
    select 1
    from private.prayers
    where id = p_prayer_id
      and author_id = v_uid
      and hidden_at is null
      and deleted_at is null
  ) then
    raise exception 'Only the author can add an update to this prayer.';
  end if;

  select count(*)
  into v_recent
  from private.prayer_updates
  where author_id = v_uid
    and created_at > now() - interval '10 minutes';

  if v_recent >= 20 then
    raise exception 'You have posted a lot in a short time. Please wait a few minutes.';
  end if;

  insert into private.prayer_updates (prayer_id, author_id, body)
  values (p_prayer_id, v_uid, v_body)
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.add_prayer_update(uuid, text) from public;
grant execute on function public.add_prayer_update(uuid, text) to authenticated;

create or replace function public.mark_prayer_answered(p_prayer_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
begin
  if v_uid is null or not public.is_active_member() then
    raise exception 'Only active circle members can update a prayer.';
  end if;

  update private.prayers
  set status = 'answered',
      answered_at = now()
  where id = p_prayer_id
    and author_id = v_uid
    and status = 'open'
    and hidden_at is null
    and deleted_at is null;

  if not found then
    raise exception 'That prayer is not open or no longer available.';
  end if;
end;
$$;

revoke all on function public.mark_prayer_answered(uuid) from public;
grant execute on function public.mark_prayer_answered(uuid) to authenticated;

create or replace function public.remove_prayer(p_prayer_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
begin
  if v_uid is null or not public.is_active_member() then
    raise exception 'Only active circle members can remove a prayer.';
  end if;

  update private.prayers
  set deleted_at = now()
  where id = p_prayer_id
    and author_id = v_uid
    and deleted_at is null;

  if not found then
    raise exception 'That prayer was not found.';
  end if;
end;
$$;

revoke all on function public.remove_prayer(uuid) from public;
grant execute on function public.remove_prayer(uuid) to authenticated;
