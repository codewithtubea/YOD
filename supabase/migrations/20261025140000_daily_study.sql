-- Phase 3: daily reading plan, discussion, reactions, read receipts, notifications.
-- Apply after 20261025130000_auth_hardening.sql. Never edit an applied migration.

-- ---------------------------------------------------------------------------
-- Circle settings and reading plan
-- ---------------------------------------------------------------------------

create table public.circle_settings (
  id boolean primary key default true check (id = true),
  name text not null default 'YOD Circle'
    check (char_length(btrim(name)) between 1 and 80),
  timezone text not null default 'Africa/Accra'
    check (char_length(btrim(timezone)) between 1 and 64),
  default_bible_source text not null default 'biblegateway'
    check (default_bible_source in ('biblegateway', 'youversion')),
  care_inactivity_days integer not null default 7
    check (care_inactivity_days between 1 and 90),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.circle_settings (id)
values (true)
on conflict (id) do nothing;

create table public.reading_plan (
  id uuid primary key default gen_random_uuid(),
  date date not null unique,
  book text not null check (char_length(btrim(book)) between 1 and 40),
  chapter_start integer not null check (chapter_start between 1 and 200),
  chapter_end integer check (
    chapter_end is null
    or (chapter_end between chapter_start and 200)
  ),
  reference_text text not null
    check (char_length(btrim(reference_text)) between 1 and 120),
  created_by uuid references public.profiles (id) on delete set null
    default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index reading_plan_date_idx on public.reading_plan (date desc);

-- ---------------------------------------------------------------------------
-- Posts, replies, reactions
-- ---------------------------------------------------------------------------

create table public.posts (
  id uuid primary key default gen_random_uuid(),
  plan_date date not null references public.reading_plan (date)
    on update cascade on delete restrict,
  author_id uuid not null references public.profiles (id) on delete cascade
    default auth.uid(),
  kind text not null check (kind in ('thought', 'question')),
  body text not null
    check (char_length(btrim(body)) between 1 and 1000),
  status text not null default 'open' check (status in ('open', 'answered')),
  answered_reply_id uuid,
  hidden_at timestamptz,
  hidden_by uuid references public.profiles (id) on delete set null,
  hidden_reason text check (
    hidden_reason is null
    or char_length(btrim(hidden_reason)) between 1 and 300
  ),
  deleted_at timestamptz,
  edited_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint posts_kind_status_check check (
    (kind = 'thought' and status = 'open')
    or (kind = 'question' and status in ('open', 'answered'))
  ),
  constraint posts_answered_reply_check check (
    answered_reply_id is null
    or (kind = 'question' and status = 'answered')
  ),
  constraint posts_hidden_fields_check check (
    (hidden_at is null and hidden_by is null and hidden_reason is null)
    or (hidden_at is not null and hidden_by is not null and hidden_reason is not null)
  )
);

create index posts_plan_date_feed_idx
  on public.posts (plan_date, created_at desc, id desc)
  where deleted_at is null and hidden_at is null;
create index posts_author_idx on public.posts (author_id);

create table public.replies (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts (id) on delete cascade,
  parent_reply_id uuid references public.replies (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade
    default auth.uid(),
  body text not null
    check (char_length(btrim(body)) between 1 and 1000),
  hidden_at timestamptz,
  hidden_by uuid references public.profiles (id) on delete set null,
  hidden_reason text check (
    hidden_reason is null
    or char_length(btrim(hidden_reason)) between 1 and 300
  ),
  deleted_at timestamptz,
  edited_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint replies_hidden_fields_check check (
    (hidden_at is null and hidden_by is null and hidden_reason is null)
    or (hidden_at is not null and hidden_by is not null and hidden_reason is not null)
  )
);

create index replies_post_idx
  on public.replies (post_id, created_at asc)
  where deleted_at is null and hidden_at is null;
create index replies_author_idx on public.replies (author_id);

alter table public.posts
  add constraint posts_answered_reply_fkey
  foreign key (answered_reply_id) references public.replies (id)
  on delete set null;

create table public.reactions (
  user_id uuid not null references public.profiles (id) on delete cascade
    default auth.uid(),
  target_type text not null check (target_type in ('post', 'reply')),
  target_id uuid not null,
  kind text not null default 'amen' check (kind = 'amen'),
  created_at timestamptz not null default now(),
  primary key (user_id, target_type, target_id)
);

create index reactions_target_idx
  on public.reactions (target_type, target_id, created_at desc);

create table public.read_receipts (
  user_id uuid not null references public.profiles (id) on delete cascade
    default auth.uid(),
  plan_date date not null references public.reading_plan (date)
    on update cascade on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, plan_date)
);

create index read_receipts_date_idx on public.read_receipts (plan_date);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  type text not null check (type in ('reply', 'amen', 'answered')),
  actor_id uuid references public.profiles (id) on delete set null,
  post_id uuid references public.posts (id) on delete cascade,
  reply_id uuid references public.replies (id) on delete cascade,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint notifications_self_check check (
    actor_id is null or user_id <> actor_id
  ),
  constraint notifications_target_check check (
    post_id is not null or reply_id is not null
  )
);

create index notifications_recipient_idx
  on public.notifications (user_id, created_at desc);
create index notifications_unread_idx
  on public.notifications (user_id, created_at desc)
  where read_at is null;

-- Collapse repeated Amens on the same item into one notification.
create unique index notifications_amen_collapse_idx
  on public.notifications (
    user_id,
    actor_id,
    post_id,
    coalesce(reply_id, '00000000-0000-0000-0000-000000000000'::uuid)
  )
  where type = 'amen';

-- ---------------------------------------------------------------------------
-- Updated-at triggers
-- ---------------------------------------------------------------------------

create trigger circle_settings_set_updated_at
  before update on public.circle_settings
  for each row execute function public.set_updated_at();

create trigger reading_plan_set_updated_at
  before update on public.reading_plan
  for each row execute function public.set_updated_at();

create trigger posts_set_updated_at
  before update on public.posts
  for each row execute function public.set_updated_at();

create trigger replies_set_updated_at
  before update on public.replies
  for each row execute function public.set_updated_at();

create trigger notifications_set_updated_at
  before update on public.notifications
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Circle date helper. Every "today" in RLS uses this.
-- ---------------------------------------------------------------------------

create or replace function public.circle_today()
returns date
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  configured_timezone text;
begin
  select timezone
  into configured_timezone
  from public.circle_settings
  where id = true;

  begin
    return (now() at time zone coalesce(configured_timezone, 'Africa/Accra'))::date;
  exception when others then
    return (now() at time zone 'Africa/Accra')::date;
  end;
end;
$$;

revoke all on function public.circle_today() from public;
grant execute on function public.circle_today() to authenticated;

-- ---------------------------------------------------------------------------
-- Content update guards
-- ---------------------------------------------------------------------------

create or replace function public.guard_post_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := (select auth.uid());
  admin boolean := public.is_admin();
begin
  if new.author_id is distinct from old.author_id
     or new.plan_date is distinct from old.plan_date
     or new.kind is distinct from old.kind then
    raise exception 'Protected post fields cannot be changed.';
  end if;

  if new.edited_at is distinct from old.edited_at
     and new.body is not distinct from old.body then
    raise exception 'Edited time is managed by the circle.';
  end if;

  if actor <> old.author_id and not admin then
    raise exception 'Only the author or an admin can change this post.';
  end if;

  if actor = old.author_id then
    if old.deleted_at is not null then
      raise exception 'A deleted post cannot be changed.';
    end if;

    if old.hidden_at is not null then
      raise exception 'A hidden post cannot be changed by its author.';
    end if;

    if new.deleted_at is distinct from old.deleted_at
       and new.deleted_at is null then
      raise exception 'A deleted post cannot be restored by its author.';
    end if;
  else
    if new.body is distinct from old.body
       or new.deleted_at is distinct from old.deleted_at
       or new.edited_at is distinct from old.edited_at then
      raise exception 'Admins may hide posts but cannot edit another member''s words.';
    end if;

    if (new.status is distinct from old.status
        or new.answered_reply_id is distinct from old.answered_reply_id)
       and old.kind <> 'question' then
      raise exception 'Only questions can be marked answered.';
    end if;

    if new.status = 'open' and old.status = 'answered' then
      raise exception 'Admins may not reopen an answered question.';
    end if;
  end if;

  if new.body is distinct from old.body then
    new.edited_at := now();
  end if;

  if new.hidden_at is distinct from old.hidden_at
     or new.hidden_by is distinct from old.hidden_by
     or new.hidden_reason is distinct from old.hidden_reason then
    if not admin then
      raise exception 'Only an admin can hide or restore a post.';
    end if;

    if new.hidden_at is not distinct from old.hidden_at then
      raise exception 'Hide fields must change together with the hidden time.';
    end if;

    if new.hidden_at is not null then
      if new.hidden_reason is null
         or char_length(btrim(new.hidden_reason)) = 0 then
        raise exception 'A reason is required when hiding a post.';
      end if;
      new.hidden_by := actor;
    else
      new.hidden_reason := null;
      new.hidden_by := null;
    end if;
  end if;

  if new.answered_reply_id is not null then
    if new.status <> 'answered' or new.kind <> 'question' then
      raise exception 'Only answered questions can reference an answer.';
    end if;

    if not exists (
      select 1
      from public.replies r
      where r.id = new.answered_reply_id
        and r.post_id = new.id
        and r.hidden_at is null
        and r.deleted_at is null
    ) then
      raise exception 'The selected answer must be a visible reply on this question.';
    end if;
  elsif new.status = 'answered' then
    -- An answered question may be marked answered without selecting a reply.
    null;
  end if;

  if new.status = 'open' and new.answered_reply_id is not null then
    raise exception 'An open question cannot have an answer selected.';
  end if;

  return new;
end;
$$;

revoke all on function public.guard_post_update() from public;

create trigger posts_guard_update
  before update on public.posts
  for each row execute function public.guard_post_update();

create or replace function public.guard_reply_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := (select auth.uid());
  admin boolean := public.is_admin();
  parent_post uuid;
  parent_parent uuid;
begin
  if new.post_id is distinct from old.post_id
     or new.author_id is distinct from old.author_id
     or new.parent_reply_id is distinct from old.parent_reply_id then
    raise exception 'Protected reply fields cannot be changed.';
  end if;

  if new.edited_at is distinct from old.edited_at
     and new.body is not distinct from old.body then
    raise exception 'Edited time is managed by the circle.';
  end if;

  if actor <> old.author_id and not admin then
    raise exception 'Only the author or an admin can change this reply.';
  end if;

  if actor = old.author_id then
    if old.deleted_at is not null then
      raise exception 'A deleted reply cannot be changed.';
    end if;

    if old.hidden_at is not null then
      raise exception 'A hidden reply cannot be changed by its author.';
    end if;

    if new.deleted_at is distinct from old.deleted_at
       and new.deleted_at is null then
      raise exception 'A deleted reply cannot be restored by its author.';
    end if;
  else
    if new.body is distinct from old.body
       or new.deleted_at is distinct from old.deleted_at
       or new.edited_at is distinct from old.edited_at then
      raise exception 'Admins may hide replies but cannot edit another member''s words.';
    end if;
  end if;

  if new.body is distinct from old.body then
    new.edited_at := now();
  end if;

  if new.hidden_at is distinct from old.hidden_at
     or new.hidden_by is distinct from old.hidden_by
     or new.hidden_reason is distinct from old.hidden_reason then
    if not admin then
      raise exception 'Only an admin can hide or restore a reply.';
    end if;

    if new.hidden_at is not distinct from old.hidden_at then
      raise exception 'Hide fields must change together with the hidden time.';
    end if;

    if new.hidden_at is not null then
      if new.hidden_reason is null
         or char_length(btrim(new.hidden_reason)) = 0 then
        raise exception 'A reason is required when hiding a reply.';
      end if;
      new.hidden_by := actor;
    else
      new.hidden_reason := null;
      new.hidden_by := null;
    end if;
  end if;

  if new.parent_reply_id is not null then
    select post_id, parent_reply_id
    into parent_post, parent_parent
    from public.replies
    where id = new.parent_reply_id;

    if parent_post is null or parent_post <> new.post_id or parent_parent is not null then
      raise exception 'Replies may only be one level deep on the same post.';
    end if;
  end if;

  return new;
end;
$$;

revoke all on function public.guard_reply_update() from public;

create trigger replies_guard_update
  before update on public.replies
  for each row execute function public.guard_reply_update();

create or replace function public.validate_reply_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  parent_post uuid;
  parent_parent uuid;
  parent_hidden timestamptz;
  parent_deleted timestamptz;
  target_post record;
begin
  select id, plan_date, hidden_at, deleted_at
  into target_post
  from public.posts
  where id = new.post_id;

  if target_post.id is null
     or target_post.hidden_at is not null
     or target_post.deleted_at is not null
     or target_post.plan_date > public.circle_today() then
    raise exception 'This discussion is not open for replies.';
  end if;

  if new.parent_reply_id is not null then
    select post_id, parent_reply_id, hidden_at, deleted_at
    into parent_post, parent_parent, parent_hidden, parent_deleted
    from public.replies
    where id = new.parent_reply_id;

    if parent_post is null
       or parent_post <> new.post_id
       or parent_parent is not null
       or parent_hidden is not null
       or parent_deleted is not null then
      raise exception 'Replies may only be one level deep on a visible reply.';
    end if;
  end if;

  return new;
end;
$$;

revoke all on function public.validate_reply_insert() from public;

create trigger replies_validate_insert
  before insert on public.replies
  for each row execute function public.validate_reply_insert();

-- ---------------------------------------------------------------------------
-- Notifications: only database triggers may create them.
-- ---------------------------------------------------------------------------

create or replace function public.notify_on_reply()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  post_author uuid;
begin
  select author_id into post_author
  from public.posts
  where id = new.post_id;

  if post_author is not null and post_author <> new.author_id then
    insert into public.notifications (user_id, type, actor_id, post_id, reply_id)
    values (post_author, 'reply', new.author_id, new.post_id, new.id);
  end if;

  return new;
end;
$$;

revoke all on function public.notify_on_reply() from public;

create trigger replies_notify
  after insert on public.replies
  for each row execute function public.notify_on_reply();

create or replace function public.notify_on_amen()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  owner_id uuid;
  related_post uuid;
  related_reply uuid;
begin
  if new.target_type = 'post' then
    select author_id into owner_id
    from public.posts
    where id = new.target_id;
    related_post := new.target_id;
  else
    select r.author_id, r.post_id
    into owner_id, related_post
    from public.replies r
    where r.id = new.target_id;
    related_reply := new.target_id;
  end if;

  if owner_id is null or owner_id = new.user_id then
    return new;
  end if;

  update public.notifications
  set read_at = null,
      created_at = now()
  where user_id = owner_id
    and type = 'amen'
    and actor_id = new.user_id
    and post_id = related_post
    and reply_id is not distinct from related_reply;

  if not found then
    insert into public.notifications (
      user_id, type, actor_id, post_id, reply_id
    )
    values (owner_id, 'amen', new.user_id, related_post, related_reply);
  end if;

  return new;
end;
$$;

revoke all on function public.notify_on_amen() from public;

create trigger reactions_notify
  after insert on public.reactions
  for each row execute function public.notify_on_amen();

create or replace function public.notify_on_answered()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  recipient uuid;
  actor uuid := coalesce((select auth.uid()), new.author_id);
begin
  if new.status = 'answered' and old.status is distinct from 'answered' then
    for recipient in
      select distinct candidates.candidate
      from (
        select new.author_id as candidate
        union all
        select r.author_id
        from public.replies r
        where r.id = new.answered_reply_id
      ) candidates
      where candidates.candidate is not null
        and candidates.candidate <> actor
    loop
      insert into public.notifications (
        user_id, type, actor_id, post_id, reply_id
      )
      values (
        recipient, 'answered', actor, new.id, new.answered_reply_id
      );
    end loop;
  end if;

  return new;
end;
$$;

revoke all on function public.notify_on_answered() from public;

create trigger posts_notify_answered
  after update of status, answered_reply_id on public.posts
  for each row execute function public.notify_on_answered();

-- Basic server/database write throttle: 20 posts + replies per 10 minutes.
create or replace function public.write_allowed()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (
    (
      select count(*)
      from public.posts
      where author_id = (select auth.uid())
        and created_at > now() - interval '10 minutes'
    )
    +
    (
      select count(*)
      from public.replies
      where author_id = (select auth.uid())
        and created_at > now() - interval '10 minutes'
    )
  ) < 20;
$$;

revoke all on function public.write_allowed() from public;
grant execute on function public.write_allowed() to authenticated;

-- ---------------------------------------------------------------------------
-- Aggregate helpers: counts only, never member names or receipt rows.
-- ---------------------------------------------------------------------------

create or replace function public.get_read_summary(p_date date)
returns table (read_count bigint, active_count bigint)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_active_member() then
    return;
  end if;

  return query
  select
    case
      when p_date <= public.circle_today() then (
        select count(*)
        from public.read_receipts rr
        join public.profiles p on p.id = rr.user_id
        where rr.plan_date = p_date
          and p.status = 'active'
      )
      else 0::bigint
    end,
    (select count(*) from public.profiles p where p.status = 'active');
end;
$$;

revoke all on function public.get_read_summary(date) from public;
grant execute on function public.get_read_summary(date) to authenticated;

create or replace function public.get_reaction_summary(
  p_target_type text,
  p_target_ids uuid[]
)
returns table (
  target_id uuid,
  amen_count bigint,
  viewer_amen boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  with targets as (
    select distinct unnest(p_target_ids) as target_id
  )
  select
    t.target_id,
    count(r.user_id)::bigint as amen_count,
    coalesce(
      bool_or(r.user_id = (select auth.uid())),
      false
    ) as viewer_amen
  from targets t
  left join public.reactions r
    on r.target_type = p_target_type
   and r.target_id = t.target_id
   and r.kind = 'amen'
  where public.is_active_member()
    and (
      (
        p_target_type = 'post'
        and exists (
          select 1
          from public.posts p
          where p.id = t.target_id
            and (
              public.is_admin()
              or (
                p.deleted_at is null
                and p.hidden_at is null
                and p.plan_date <= public.circle_today()
              )
            )
        )
      )
      or (
        p_target_type = 'reply'
        and exists (
          select 1
          from public.replies re
          join public.posts p on p.id = re.post_id
          where re.id = t.target_id
            and (
              public.is_admin()
              or (
                re.deleted_at is null
                and re.hidden_at is null
                and p.deleted_at is null
                and p.hidden_at is null
                and p.plan_date <= public.circle_today()
              )
            )
        )
      )
    )
  group by t.target_id;
$$;

revoke all on function public.get_reaction_summary(text, uuid[]) from public;
grant execute on function public.get_reaction_summary(text, uuid[]) to authenticated;

create or replace function public.get_reply_counts(p_post_ids uuid[])
returns table (post_id uuid, reply_count bigint)
language sql
stable
security definer
set search_path = ''
as $$
  select
    p.id as post_id,
    (
      select count(*)
      from public.replies r
      where r.post_id = p.id
        and r.hidden_at is null
        and r.deleted_at is null
        and (
          r.parent_reply_id is null
          or exists (
            select 1
            from public.replies parent
            where parent.id = r.parent_reply_id
              and parent.hidden_at is null
              and parent.deleted_at is null
          )
        )
    )::bigint as reply_count
  from public.posts p
  where p.id = any(p_post_ids)
    and public.is_active_member()
    and (
      public.is_admin()
      or (
        p.hidden_at is null
        and p.deleted_at is null
        and p.plan_date <= public.circle_today()
      )
    );
$$;

revoke all on function public.get_reply_counts(uuid[]) from public;
grant execute on function public.get_reply_counts(uuid[]) to authenticated;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.circle_settings enable row level security;
alter table public.reading_plan enable row level security;
alter table public.posts enable row level security;
alter table public.replies enable row level security;
alter table public.reactions enable row level security;
alter table public.read_receipts enable row level security;
alter table public.notifications enable row level security;

-- circle_settings: members read, admins update. No client insert/delete.
create policy "active members read circle settings"
  on public.circle_settings for select to authenticated
  using (public.is_active_member());

create policy "admins update circle settings"
  on public.circle_settings for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- reading_plan: past/today readable; admins manage. Future rows are hidden.
create policy "members read today and past readings"
  on public.reading_plan for select to authenticated
  using (
    public.is_active_member()
    and (date <= public.circle_today() or public.is_admin())
  );

create policy "admins create readings"
  on public.reading_plan for insert to authenticated
  with check (
    public.is_admin()
    and created_by = (select auth.uid())
  );

create policy "admins update readings"
  on public.reading_plan for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "admins delete readings"
  on public.reading_plan for delete to authenticated
  using (public.is_admin());

-- posts: visible current content for active members; admins may see hidden
-- content for moderation. Authors may edit their own words at any time.
create policy "members read visible posts"
  on public.posts for select to authenticated
  using (
    public.is_active_member()
    and (
      public.is_admin()
      or (
        deleted_at is null
        and hidden_at is null
        and plan_date <= public.circle_today()
      )
    )
  );

create policy "members create their own posts"
  on public.posts for insert to authenticated
  with check (
    public.is_active_member()
    and public.write_allowed()
    and author_id = (select auth.uid())
    and kind in ('thought', 'question')
    and status = 'open'
    and answered_reply_id is null
    and hidden_at is null
    and hidden_by is null
    and hidden_reason is null
    and deleted_at is null
    and edited_at is null
    and plan_date <= public.circle_today()
  );

create policy "authors update their posts, admins hide"
  on public.posts for update to authenticated
  using (
    (
      author_id = (select auth.uid())
      and deleted_at is null
      and hidden_at is null
    )
    or public.is_admin()
  )
  with check (
    author_id = (select auth.uid())
    or public.is_admin()
  );

-- replies: same visibility and ownership model, one level deep.
create policy "members read visible replies"
  on public.replies for select to authenticated
  using (
    public.is_active_member()
    and (
      public.is_admin()
      or (
        deleted_at is null
        and hidden_at is null
        and exists (
          select 1
          from public.posts p
          where p.id = replies.post_id
            and p.deleted_at is null
            and p.hidden_at is null
            and p.plan_date <= public.circle_today()
        )
      )
    )
  );

create policy "members create their own replies"
  on public.replies for insert to authenticated
  with check (
    public.is_active_member()
    and public.write_allowed()
    and author_id = (select auth.uid())
    and hidden_at is null
    and hidden_by is null
    and hidden_reason is null
    and deleted_at is null
    and edited_at is null
    and exists (
      select 1
      from public.posts p
      where p.id = replies.post_id
        and p.deleted_at is null
        and p.hidden_at is null
        and p.plan_date <= public.circle_today()
    )
  );

create policy "authors update their replies, admins hide"
  on public.replies for update to authenticated
  using (
    (
      author_id = (select auth.uid())
      and deleted_at is null
      and hidden_at is null
    )
    or public.is_admin()
  )
  with check (
    author_id = (select auth.uid())
    or public.is_admin()
  );

-- reactions: no direct reads; aggregate RPCs expose counts and viewer state.
create policy "members add their own amen"
  on public.reactions for insert to authenticated
  with check (
    public.is_active_member()
    and user_id = (select auth.uid())
    and (
      exists (
        select 1
        from public.posts p
        where p.id = reactions.target_id
          and reactions.target_type = 'post'
          and p.deleted_at is null
          and p.hidden_at is null
          and p.plan_date <= public.circle_today()
      )
      or exists (
        select 1
        from public.replies re
        join public.posts p on p.id = re.post_id
        where re.id = reactions.target_id
          and reactions.target_type = 'reply'
          and re.deleted_at is null
          and re.hidden_at is null
          and p.deleted_at is null
          and p.hidden_at is null
          and p.plan_date <= public.circle_today()
      )
    )
  );

create policy "members remove their own amen"
  on public.reactions for delete to authenticated
  using (user_id = (select auth.uid()));

-- read receipts: private rows. Only own rows or aggregate counts.
create policy "members read their own receipts"
  on public.read_receipts for select to authenticated
  using (user_id = (select auth.uid()));

create policy "members mark their own reading"
  on public.read_receipts for insert to authenticated
  with check (
    public.is_active_member()
    and user_id = (select auth.uid())
    and plan_date <= public.circle_today()
    and exists (
      select 1 from public.reading_plan p where p.date = read_receipts.plan_date
    )
  );

create policy "members unmark their own reading"
  on public.read_receipts for delete to authenticated
  using (user_id = (select auth.uid()));

-- notifications: recipient-only. No client inserts; triggers create them.
create policy "members read their own notifications"
  on public.notifications for select to authenticated
  using (
    public.is_active_member()
    and user_id = (select auth.uid())
  );

create policy "members mark their own notifications read"
  on public.notifications for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- Privileges
-- ---------------------------------------------------------------------------

revoke all on table public.circle_settings from anon, authenticated;
grant select on table public.circle_settings to authenticated;
grant update (name, timezone, default_bible_source, care_inactivity_days)
  on table public.circle_settings to authenticated;

revoke all on table public.reading_plan from anon, authenticated;
grant select, insert, update, delete on table public.reading_plan to authenticated;

revoke all on table public.posts from anon, authenticated;
grant select on table public.posts to authenticated;
grant insert (plan_date, kind, body) on table public.posts to authenticated;
grant update (
  body, status, answered_reply_id, deleted_at,
  hidden_at, hidden_by, hidden_reason, edited_at
) on table public.posts to authenticated;

revoke all on table public.replies from anon, authenticated;
grant select on table public.replies to authenticated;
grant insert (post_id, parent_reply_id, body) on table public.replies to authenticated;
grant update (
  body, deleted_at, hidden_at, hidden_by, hidden_reason, edited_at
) on table public.replies to authenticated;

revoke all on table public.reactions from anon, authenticated;
grant insert (target_type, target_id, kind) on table public.reactions to authenticated;
grant delete on table public.reactions to authenticated;

revoke all on table public.read_receipts from anon, authenticated;
grant select, insert (plan_date), delete on table public.read_receipts to authenticated;

revoke all on table public.notifications from anon, authenticated;
grant select, update (read_at) on table public.notifications to authenticated;
