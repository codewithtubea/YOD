-- Phase 5: daily affirmations, Amen reactions, private favorites, images.
-- Members read only published affirmations up to the circle's today. Admin
-- scheduling and image upload remain explicit and audited.

-- ---------------------------------------------------------------------------
-- 1. Affirmations
-- ---------------------------------------------------------------------------

create table public.affirmations (
  id uuid primary key default gen_random_uuid(),
  body text not null check (char_length(btrim(body)) between 1 and 400),
  scripture_ref text
    check (scripture_ref is null or char_length(btrim(scripture_ref)) between 1 and 60),
  image_path text
    check (image_path is null or char_length(image_path) between 1 and 300),
  image_alt text
    check (image_alt is null or char_length(btrim(image_alt)) between 1 and 200),
  status text not null default 'draft'
    check (status in ('draft', 'scheduled', 'archived')),
  publish_date date,
  created_by uuid not null references public.profiles (id) on delete cascade
    default auth.uid(),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint affirmations_schedule_check check (
    (status = 'draft' and publish_date is null and archived_at is null)
    or (status = 'scheduled' and publish_date is not null and archived_at is null)
    or (status = 'archived' and publish_date is not null and archived_at is not null)
  ),
  constraint affirmations_image_alt_required_check check (
    image_path is null or btrim(coalesce(image_alt, '')) <> ''
  )
);

comment on table public.affirmations is
  'Admin-scheduled daily affirmations. Members never see drafts or future dates.';

create unique index affirmations_publish_date_key
  on public.affirmations (publish_date)
  where publish_date is not null;
create index affirmations_visible_idx
  on public.affirmations (publish_date desc)
  where status in ('scheduled', 'archived');

create trigger affirmations_set_updated_at
  before update on public.affirmations
  for each row execute function public.set_updated_at();

create table public.affirmation_reactions (
  affirmation_id uuid not null references public.affirmations (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade
    default auth.uid(),
  kind text not null default 'amen' check (kind = 'amen'),
  created_at timestamptz not null default now(),
  primary key (affirmation_id, user_id)
);

comment on table public.affirmation_reactions is
  'Amen records. RPC-only; only aggregate counts and viewer state are exposed.';

create table public.affirmation_favorites (
  affirmation_id uuid not null references public.affirmations (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade
    default auth.uid(),
  created_at timestamptz not null default now(),
  primary key (affirmation_id, user_id)
);

comment on table public.affirmation_favorites is
  'Private member saves. Members can read and change only their own rows.';

-- ---------------------------------------------------------------------------
-- 2. Visibility helper and RLS
-- ---------------------------------------------------------------------------

create or replace function public.can_read_affirmation(
  p_status text,
  p_publish_date date
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(public.is_active_member(), false)
    and (
      coalesce(public.is_admin(), false)
      or (
        p_status in ('scheduled', 'archived')
        and p_publish_date is not null
        and p_publish_date <= public.circle_today()
      )
    );
$$;

revoke all on function public.can_read_affirmation(text, date) from public, anon;
grant execute on function public.can_read_affirmation(text, date) to authenticated;

alter table public.affirmations enable row level security;
alter table public.affirmation_reactions enable row level security;
alter table public.affirmation_favorites enable row level security;

create policy "members read visible affirmations"
  on public.affirmations for select to authenticated
  using (public.can_read_affirmation(status, publish_date));

create policy "admins create affirmations"
  on public.affirmations for insert to authenticated
  with check (
    public.is_admin()
    and created_by = (select auth.uid())
  );

create policy "admins update affirmations"
  on public.affirmations for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "members read their own affirmation favorites"
  on public.affirmation_favorites for select to authenticated
  using (user_id = (select auth.uid()));

revoke all on table public.affirmations from anon, authenticated;
grant select on table public.affirmations to authenticated;
grant insert (body, scripture_ref, image_path, image_alt, status, publish_date, archived_at)
  on table public.affirmations to authenticated;
grant update (body, scripture_ref, image_path, image_alt, status, publish_date, archived_at)
  on table public.affirmations to authenticated;

revoke all on table public.affirmation_reactions from anon, authenticated;
revoke all on table public.affirmation_favorites from anon, authenticated;
grant select on table public.affirmation_favorites to authenticated;

-- ---------------------------------------------------------------------------
-- 3. Engagement and toggle RPCs
-- ---------------------------------------------------------------------------

create or replace function public.get_affirmation_engagement(p_ids uuid[])
returns table (
  affirmation_id uuid,
  amen_count bigint,
  viewer_amen boolean,
  viewer_saved boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    a.id,
    (
      select count(*)
      from public.affirmation_reactions r
      where r.affirmation_id = a.id
    ) as amen_count,
    exists (
      select 1
      from public.affirmation_reactions r
      where r.affirmation_id = a.id
        and r.user_id = (select auth.uid())
    ) as viewer_amen,
    exists (
      select 1
      from public.affirmation_favorites f
      where f.affirmation_id = a.id
        and f.user_id = (select auth.uid())
    ) as viewer_saved
  from public.affirmations a
  where a.id = any(coalesce(p_ids, array[]::uuid[]))
    and public.can_read_affirmation(a.status, a.publish_date);
$$;

revoke all on function public.get_affirmation_engagement(uuid[]) from public, anon;
grant execute on function public.get_affirmation_engagement(uuid[]) to authenticated;

create or replace function public.toggle_affirmation_amen(p_affirmation_id uuid)
returns table (amen boolean, amen_count bigint)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_status text;
  v_publish_date date;
  v_active boolean;
begin
  if v_uid is null or not public.is_active_member() then
    raise exception 'Only active circle members can say Amen.';
  end if;

  select a.status, a.publish_date
  into v_status, v_publish_date
  from public.affirmations a
  where a.id = p_affirmation_id;

  if not found or not public.can_read_affirmation(v_status, v_publish_date) then
    raise exception 'That affirmation is not available.';
  end if;

  select exists (
    select 1
    from public.affirmation_reactions r
    where r.affirmation_id = p_affirmation_id
      and r.user_id = v_uid
  ) into v_active;

  if v_active then
    delete from public.affirmation_reactions r
    where r.affirmation_id = p_affirmation_id
      and r.user_id = v_uid;
  else
    insert into public.affirmation_reactions (affirmation_id, user_id)
    values (p_affirmation_id, v_uid);
  end if;

  return query
  select
    exists (
      select 1
      from public.affirmation_reactions r
      where r.affirmation_id = p_affirmation_id
        and r.user_id = v_uid
    ),
    (
      select count(*)
      from public.affirmation_reactions r
      where r.affirmation_id = p_affirmation_id
    );
end;
$$;

revoke all on function public.toggle_affirmation_amen(uuid) from public, anon;
grant execute on function public.toggle_affirmation_amen(uuid) to authenticated;

create or replace function public.toggle_affirmation_favorite(p_affirmation_id uuid)
returns table (saved boolean)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_status text;
  v_publish_date date;
  v_saved boolean;
begin
  if v_uid is null or not public.is_active_member() then
    raise exception 'Only active circle members can save an affirmation.';
  end if;

  select a.status, a.publish_date
  into v_status, v_publish_date
  from public.affirmations a
  where a.id = p_affirmation_id;

  if not found or not public.can_read_affirmation(v_status, v_publish_date) then
    raise exception 'That affirmation is not available.';
  end if;

  select exists (
    select 1
    from public.affirmation_favorites f
    where f.affirmation_id = p_affirmation_id
      and f.user_id = v_uid
  ) into v_saved;

  if v_saved then
    delete from public.affirmation_favorites f
    where f.affirmation_id = p_affirmation_id
      and f.user_id = v_uid;
  else
    insert into public.affirmation_favorites (affirmation_id, user_id)
    values (p_affirmation_id, v_uid);
  end if;

  return query
  select exists (
    select 1
    from public.affirmation_favorites f
    where f.affirmation_id = p_affirmation_id
      and f.user_id = v_uid
  );
end;
$$;

revoke all on function public.toggle_affirmation_favorite(uuid) from public, anon;
grant execute on function public.toggle_affirmation_favorite(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 4. Update guard and audit
-- ---------------------------------------------------------------------------

create or replace function public.guard_affirmation_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.created_by is distinct from old.created_by then
    raise exception 'The affirmation author cannot be changed.';
  end if;

  if new.status = 'archived' then
    new.archived_at := coalesce(old.archived_at, new.archived_at, now());
  else
    new.archived_at := null;
  end if;

  return new;
end;
$$;

revoke all on function public.guard_affirmation_update() from public, anon, authenticated;

create trigger affirmations_guard_update
  before update on public.affirmations
  for each row execute function public.guard_affirmation_update();

create or replace function public.audit_affirmation_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.log_audit_event(
    case
      when tg_op = 'INSERT' then 'affirmation.created'
      when new.archived_at is not null and old.archived_at is null then 'affirmation.archived'
      else 'affirmation.updated'
    end,
    'affirmation',
    new.id::text,
    jsonb_build_object(
      'status', new.status,
      'publish_date', new.publish_date,
      'has_image', new.image_path is not null
    )
  );
  return new;
end;
$$;

revoke all on function public.audit_affirmation_change() from public, anon, authenticated;

create trigger affirmations_audit
  after insert or update on public.affirmations
  for each row execute function public.audit_affirmation_change();

-- ---------------------------------------------------------------------------
-- 5. Private affirmation images
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'affirmation-images',
  'affirmation-images',
  false,
  2097152,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "admins manage affirmation images"
  on storage.objects for all to authenticated
  using (bucket_id = 'affirmation-images' and public.is_admin())
  with check (bucket_id = 'affirmation-images' and public.is_admin());

create policy "members read visible affirmation images"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'affirmation-images'
    and exists (
      select 1
      from public.affirmations a
      where a.image_path = storage.objects.name
        and public.can_read_affirmation(a.status, a.publish_date)
    )
  );
