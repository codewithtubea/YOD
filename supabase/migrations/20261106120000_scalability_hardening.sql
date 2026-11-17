-- Phase 7C: indexes for the hot read paths used on every Today page load.
-- These keep aggregate counts and birthday lookups fast as the circle grows.

-- Active-member counts (Today, check-in presence, read summary, directory).
create index if not exists profiles_active_idx
  on public.profiles (status)
  where status = 'active';

-- Birthday lookup by month/day without scanning every profile.
create index if not exists profiles_birthday_month_day_idx
  on public.profiles (
    (extract(month from birthday)),
    (extract(day from birthday))
  )
  where birthday is not null and status = 'active';
