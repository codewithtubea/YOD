-- Phase 6 functional checks. Run only against staging with:
--   psql "$STAGING_DATABASE_URL" -v ON_ERROR_STOP=1 -f tests/staging/phase6-functional.sql
-- Runs inside a transaction and rolls back. Every failed assertion stops the run.

begin;

insert into public.invites (email, role)
values
  ('phase6-member-1@example.com', 'member'),
  ('phase6-member-2@example.com', 'member'),
  ('phase6-admin@example.com', 'admin');

insert into auth.users (id, email, raw_user_meta_data)
values
  (
    '11111111-1111-1111-1111-111111111111',
    'phase6-member-1@example.com',
    '{"display_name": "Member One"}'::jsonb
  ),
  (
    '22222222-2222-2222-2222-222222222222',
    'phase6-member-2@example.com',
    '{"display_name": "Member Two"}'::jsonb
  ),
  (
    '33333333-3333-3333-3333-333333333333',
    'phase6-admin@example.com',
    '{"display_name": "Care Admin"}'::jsonb
  );

update public.member_roles
set role = 'admin'
where user_id = '33333333-3333-3333-3333-333333333333';

insert into public.member_settings (user_id, notify_encouragements)
values
  ('11111111-1111-1111-1111-111111111111', true),
  ('22222222-2222-2222-2222-222222222222', true)
on conflict (user_id) do nothing;

select set_config(
  'request.jwt.claim.sub',
  '11111111-1111-1111-1111-111111111111',
  false
);

do $$
declare
  v_week date;
  v_mood text;
  v_note text;
  v_updated timestamptz;
  v_checked boolean;
  v_week_start date;
  v_circle_size bigint;
  v_checked_in_count bigint;
  v_viewer_checked_in boolean;
  v_rows integer;
begin
  select week_start, mood, note, updated_at, checked_in
  into v_week, v_mood, v_note, v_updated, v_checked
  from public.save_my_check_in('grateful', '  Thankful for a quiet week.  ');

  if v_mood <> 'grateful' then
    raise exception 'save_my_check_in returned mood %', v_mood;
  end if;

  if v_note <> 'Thankful for a quiet week.' then
    raise exception 'save_my_check_in did not trim the note: %', v_note;
  end if;

  if not v_checked then
    raise exception 'save_my_check_in did not mark the row checked in';
  end if;

  select week_start, mood, note, updated_at, checked_in
  into v_week, v_mood, v_note, v_updated, v_checked
  from public.save_my_check_in('steady', 'Still here.');

  if v_mood <> 'steady' or v_note <> 'Still here.' then
    raise exception 'save_my_check_in did not update the same week';
  end if;

  select count(*) into v_rows
  from private.check_ins
  where user_id = '11111111-1111-1111-1111-111111111111';

  if v_rows <> 1 then
    raise exception 'expected one weekly check-in row, found %', v_rows;
  end if;

  select week_start, mood into v_week, v_mood from public.get_my_check_in();

  if v_mood <> 'steady' or v_week is null then
    raise exception 'get_my_check_in did not return the saved row';
  end if;

  select week_start, circle_size, checked_in_count, viewer_checked_in
  into v_week_start, v_circle_size, v_checked_in_count, v_viewer_checked_in
  from public.get_check_in_presence();

  if v_circle_size <> 3 then
    raise exception 'expected 3 active members, found %', v_circle_size;
  end if;

  if v_checked_in_count <> 1 or not v_viewer_checked_in then
    raise exception 'aggregate presence is wrong: % of % (viewer %)',
      v_checked_in_count, v_circle_size, v_viewer_checked_in;
  end if;

  begin
    perform public.save_my_check_in('heavy', repeat('a', 281));
    raise exception 'over-long note was accepted';
  exception
    when sqlstate '22023' then null;
  end;
end $$;

do $$
declare
  v_id uuid;
  v_body text;
  v_sender uuid;
  v_read_at timestamptz;
  v_unread integer;
  v_notifications integer;
begin
  select public.send_encouragement(
    '22222222-2222-2222-2222-222222222222',
    'You are not alone this week.'
  ) into v_id;

  if v_id is null then
    raise exception 'send_encouragement did not return an id';
  end if;

  perform set_config(
    'request.jwt.claim.sub',
    '22222222-2222-2222-2222-222222222222',
    false
  );

  select body, sender_id, read_at
  into v_body, v_sender, v_read_at
  from public.get_my_encouragements(30)
  where id = v_id;

  if v_body <> 'You are not alone this week.' then
    raise exception 'recipient did not see the note body';
  end if;

  if v_sender <> '11111111-1111-1111-1111-111111111111' then
    raise exception 'recipient saw the wrong sender';
  end if;

  if v_read_at is not null then
    raise exception 'new encouragement was already read';
  end if;

  select public.mark_encouragements_read() into v_unread;

  if v_unread <> 1 then
    raise exception 'mark_encouragements_read marked % rows', v_unread;
  end if;

  select count(*) into v_notifications
  from public.notifications
  where user_id = '22222222-2222-2222-2222-222222222222'
    and type = 'encouragement';

  if v_notifications <> 1 then
    raise exception 'expected one encouragement notification, found %',
      v_notifications;
  end if;

  perform set_config(
    'request.jwt.claim.sub',
    '11111111-1111-1111-1111-111111111111',
    false
  );

  begin
    perform public.send_encouragement(
      '11111111-1111-1111-1111-111111111111',
      'Talking to myself.'
    );
    raise exception 'self-encouragement was accepted';
  exception
    when sqlstate 'P0001' then null;
  end;
end $$;

insert into public.member_settings (user_id, notify_encouragements)
values ('22222222-2222-2222-2222-222222222222', false)
on conflict (user_id) do update
set notify_encouragements = false;

do $$
declare
  v_notifications integer;
begin
  perform set_config(
    'request.jwt.claim.sub',
    '11111111-1111-1111-1111-111111111111',
    false
  );

  perform public.send_encouragement(
    '22222222-2222-2222-2222-222222222222',
    'One more quiet word.'
  );

  select count(*) into v_notifications
  from public.notifications
  where user_id = '22222222-2222-2222-2222-222222222222'
    and type = 'encouragement';

  if v_notifications <> 1 then
    raise exception 'notification preference was ignored (found %)',
      v_notifications;
  end if;

  perform set_config(
    'request.jwt.claim.sub',
    '22222222-2222-2222-2222-222222222222',
    false
  );

  perform public.save_my_check_in('heavy', 'Please pray for my family.');
end $$;

select set_config(
  'request.jwt.claim.sub',
  '33333333-3333-3333-3333-333333333333',
  false
);

insert into public.reading_plan (date, book, chapter_start, reference_text)
values ('2026-10-01', 'Psalms', 23, 'Psalm 23')
on conflict (date) do nothing;

insert into public.posts (
  id, plan_date, author_id, kind, body, created_at
)
values (
  '44444444-4444-4444-4444-444444444444',
  '2026-10-01',
  '22222222-2222-2222-2222-222222222222',
  'thought',
  'A thought that has been waiting.',
  now() - interval '3 days'
);

do $$
declare
  v_circle_size bigint;
  v_checked_in integer;
  v_heavy integer;
  v_note text;
  v_thought uuid;
begin
  select circle_size, checked_in_count, heavy
  into v_circle_size, v_checked_in, v_heavy
  from public.admin_get_care_summary();

  if v_circle_size <> 3 or v_checked_in <> 2 or v_heavy <> 1 then
    raise exception 'care summary is wrong: circle %, checked %, heavy %',
      v_circle_size, v_checked_in, v_heavy;
  end if;

  select note into v_note
  from public.admin_list_care_members()
  where id = '22222222-2222-2222-2222-222222222222';

  if v_note <> 'Please pray for my family.' then
    raise exception 'admin care list did not include the private note';
  end if;

  select id into v_thought
  from public.admin_list_unanswered_thoughts(1)
  where id = '44444444-4444-4444-4444-444444444444';

  if v_thought is null then
    raise exception 'old unanswered thought was not listed';
  end if;

  perform public.admin_send_nudge(
    '22222222-2222-2222-2222-222222222222',
    '44444444-4444-4444-4444-444444444444'
  );

  if not exists (
    select 1 from public.notifications
    where user_id = '22222222-2222-2222-2222-222222222222'
      and type = 'nudge'
  ) then
    raise exception 'nudge notification was not created';
  end if;

  begin
    perform public.admin_send_nudge(
      '22222222-2222-2222-2222-222222222222',
      '44444444-4444-4444-4444-444444444444'
    );
    raise exception 'repeat nudge was accepted';
  exception
    when sqlstate 'P0001' then null;
  end;
end $$;

do $$
declare
  v_sub text := nullif(current_setting('request.jwt.claim.sub', true), '');
begin
  perform set_config(
    'request.jwt.claim.sub',
    '11111111-1111-1111-1111-111111111111',
    false
  );

  begin
    perform public.admin_get_care_summary();
    raise exception 'non-admin read the care summary';
  exception
    when sqlstate '42501' then null;
  end;

  perform set_config('request.jwt.claim.sub', coalesce(v_sub, ''), false);
end $$;

select set_config(
  'request.jwt.claim.sub',
  '11111111-1111-1111-1111-111111111111',
  false
);

do $$
declare
  v_export jsonb;
begin
  select public.export_my_data() into v_export;

  if jsonb_array_length(v_export -> 'check_ins') <> 1 then
    raise exception 'export is missing the weekly check-in';
  end if;

  if jsonb_array_length(v_export -> 'encouragements_sent') <> 2 then
    raise exception 'export is missing sent encouragements';
  end if;

  if v_export #>> '{settings,notify_encouragements}' is null then
    raise exception 'export is missing the encouragement preference';
  end if;
end $$;

rollback;
