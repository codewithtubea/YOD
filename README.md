# YOD Circle

A private, approval-gated community for a small faith circle: one Bible chapter a day, thoughts and
questions, prayer, affirmations, and weekly check-ins. Mobile-first, warm, and calm.

## Status

Phase 3B (admin console) and Phase 4 (anonymous prayer wall) are complete and hosted-verified.
Phase 5 (affirmations), Phase 5B (member experience), Phase 6 (weekly check-in, Circle care,
encouragement notes, admin care view), and Phase 7 (open registration with admin approval and the
public landing page) are implemented in code, with migrations 7–11 applied to the hosted project.
Auth, the protected shell, the design system, the motion kit, daily study, the public landing
page, email/password registration, the approval-gated waiting room, admin member approval, invites,
the admin console, the prayer wall, the affirmation flow, onboarding, profiles, settings, privacy, data
export, account deletion, weekly check-ins, encouragement notes, aggregate presence, and the admin care
view are built. Hosted migrations 2–11 are applied; lint, typecheck, 85 unit tests, and build pass.
Phase 5B, Phase 6, and Phase 7 verification is staging-only. Migrations 1–10 were also replayed against
a fresh local Postgres to catch deploy blockers; the fixes are in migration 8 and migration 10. See
`PROJECT_PLAN.md` for the phase plan and verification log.

## Stack

Next.js 16 (App Router) · TypeScript strict · Tailwind CSS 4 · Supabase (Postgres, Auth, Storage) ·
`@supabase/ssr` · Zod · motion · Vitest · Playwright · pnpm.

## Prerequisites

- Node 20+ and pnpm 11+
- A Supabase project (`mfcmqvgypomcfbrqiqrm` is the current project)
- No local Docker required unless you want the full local Supabase stack

## Setup

```bash
pnpm install
cp .env.example .env.local
```

Fill `.env.local` from Supabase → Project Settings → API:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

Use the **publishable** key. Never put the secret/service-role key in `.env.local`, `NEXT_PUBLIC_*`,
client code, logs, or Git. `.env.local` is gitignored.

`NEXT_PUBLIC_SITE_URL` is optional. It is used for invite links and the legacy auth callback route.
For phone testing use your Mac's LAN address, not `localhost`; see
[Sign-in troubleshooting](#sign-in-troubleshooting).

```bash
pnpm dev
```

## Database migrations

Apply migrations in order to a fresh project:

```bash
pnpm supabase login
pnpm supabase link --project-ref mfcmqvgypomcfbrqiqrm
pnpm db:push
```

Or paste each file into Supabase → SQL Editor:

1. `supabase/migrations/20261025120000_foundation.sql`
2. `supabase/migrations/20261025130000_auth_hardening.sql`
3. `supabase/migrations/20261025140000_daily_study.sql`
4. `supabase/migrations/20261028125732_anonymous_prayer_wall.sql`
5. `supabase/migrations/20261028150000_admin_console.sql`
6. `supabase/migrations/20261029120000_function_execute_hardening.sql`
7. `supabase/migrations/20261029130000_default_privileges.sql`
8. `supabase/migrations/20261029140000_affirmations.sql`
9. `supabase/migrations/20261029150000_member_experience.sql`
10. `supabase/migrations/20261102120000_weekly_check_in.sql`
11. `supabase/migrations/20261103120000_open_registration.sql`

The foundation migration creates `profiles`, `member_roles`, `invites`, RLS, the original invite
gate, and the `updated_at` trigger. The auth migration adds profile status, invite reservation/acceptance,
active-member awareness, and hardened RPC/RLS policies. The daily-study migration adds the reading
plan, thoughts, replies, Amens, read receipts, notifications, aggregate RPCs, and Phase 3 RLS. The
prayer migration adds the private prayer schema and RPCs. The admin-console migration adds the audit
trail, admin RPCs, invites/renewal, member status, reports, announcements, sermon links, and the
invite template. The hardening migration revokes anon/PUBLIC function execution. The default-deny
migration extends that to future public tables, sequences, and functions. The affirmations migration
adds affirmations, Amen, private favorites, and the private image bucket. The member-experience
migration adds onboarding, profile fields, the member directory view, private member settings and
notification preferences, avatars, data export, account deletion, and concerns. The weekly check-in
migration adds private check-ins and encouragement notes, aggregate presence, admin care RPCs, gentle
nudges, and extends the notification and export/delete paths. The open-registration migration lets
anyone request an account, starts every non-invited account as `pending`, and adds the admin approval
RPC and pending-member counts. Do not edit an applied migration; add a new one.

### Deploy checklist

1. **Apply migrations 7–11 on staging first.** Link the staging project, run `pnpm db:push`, and confirm with
   `pnpm supabase migration list`. Do not re-run migrations 1–6. If migration history is messy, paste
   only the five pending files into the SQL Editor in order. The app shows an honest “not ready” state
   until they are applied. Registration stays invite-only until migration 11 is applied.
2. **Run the staging checks** before production:
   ```bash
   node scripts/assert-staging.mjs
   psql "$STAGING_DATABASE_URL" -v ON_ERROR_STOP=1 -f tests/staging/phase5b-security.sql
   psql "$STAGING_DATABASE_URL" -v ON_ERROR_STOP=1 -f tests/staging/phase6-security.sql
   psql "$STAGING_DATABASE_URL" -v ON_ERROR_STOP=1 -f tests/staging/phase6-functional.sql
   psql "$STAGING_DATABASE_URL" -v ON_ERROR_STOP=1 -f tests/staging/phase7-registration.sql
   psql "$STAGING_DATABASE_URL" -v ON_ERROR_STOP=1 -f tests/staging/phase7-security.sql
   ```
   `phase6-functional.sql` and `phase7-registration.sql` run in a transaction and roll back; they need
   the same Supabase auth trigger stubs as the real project and are staging-only.
3. **Vercel env** (`Production` and `Preview`):
   `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, and
   `NEXT_PUBLIC_SITE_URL=https://<your-domain>`. Never add a service-role/secret key.
4. **Supabase Auth**: set the production Site URL, add `https://<your-domain>/auth/callback` and
   `https://<your-domain>/join` to the redirect allowlist, and confirm the email template still uses
   `{{ .ConfirmationURL }}`. Configure custom SMTP before inviting real members.
5. **Seed the first admin** from the dashboard (see below), then verify `/join` and the approval flow
   in `/admin/members`.
6. **Build gate**: `pnpm lint && pnpm typecheck && pnpm test && pnpm build`.
7. **Post-deploy smoke** on a phone: sign in, open Today, save a reflection, pray, open Affirmation,
   save a check-in, and open `/admin/care` as an admin. Confirm private notes do not appear anywhere
   member-facing.

### First admin

The first admin must be seeded from the dashboard, never from a public route:

```sql
insert into public.invites (email, role, note)
values ('you@example.com', 'admin', 'first admin');
```

Invites are optional. Anyone can request an account from the landing page at `/join`; the request is
created as `pending` and waits in **Admin → Members** until an admin approves it. An invite pre-approves
one email: the person still creates their own account at `/join?email=their@email` with a name and
password, but the database trigger marks it active immediately and applies the invite's role.

Sign-in is **password-only**; there is no magic-link flow. Accounts created with **Auto Confirm User**
in Supabase → Authentication → Users can sign in immediately, but they still need admin approval unless
an invite covered that email. After signup, the person can sign in and see only the waiting room until
an admin approves them.

## Member experience

After an admin approves them, a new member completes a four-step welcome flow: welcome, profile, how
the circle works, and add-to-home-screen guidance, then a short blessing. The flow resumes mid-way if the
tab closes. Profile photos are cropped and resized in the browser, uploaded only to the member's own
private avatar folder, and checked again on the server by file signature. Avatars use short-lived signed
URLs.

Settings cover appearance and in-app notification preferences. The privacy center is generated from
`src/lib/account/privacy.ts`; a unit test fails if a shipped feature has no privacy row. Members can
download a JSON + Markdown export once an hour and leave the circle after a 5-minute, single-use email
code. Leaving either keeps contributions without a name or deletes them, removes private activity and
the avatar, and marks the invite `left` so an admin can renew it later.

## Staging-only tests

Phase 5B member and security tests must run against a **staging** Supabase project, never production
(`mfcmqvgypomcfbrqiqrm`). `scripts/assert-staging.mjs` refuses that project ref, and
`playwright.config.ts` calls it before starting and launches the dev server with the staging URL and
publishable key. Set both `STAGING_SUPABASE_URL` and `STAGING_SUPABASE_PUBLISHABLE_KEY`, or place both
`NEXT_PUBLIC_SUPABASE_*` values in an ignored `.env.test.local`. A staging URL is never paired with the
production key.

```bash
node scripts/assert-staging.mjs
pnpm test
pnpm test:e2e
psql "$STAGING_DATABASE_URL" -v ON_ERROR_STOP=1 -f tests/staging/phase5b-security.sql
psql "$STAGING_DATABASE_URL" -v ON_ERROR_STOP=1 -f tests/staging/phase7-registration.sql
psql "$STAGING_DATABASE_URL" -v ON_ERROR_STOP=1 -f tests/staging/phase7-security.sql
```

The SQL check asserts RPC signatures, function grants, `search_path` pinning, the member-directory view,
profile column privileges, private prayer access, settings columns, the `left` invite status, and the
private avatars bucket. The Phase 7 checks cover pending registration, invite pre-approval, admin
approval, and pending-member read limits.

## Admin console

Admins land on `/admin`: overview, members, invites, reading plan, affirmations, moderation,
questions, announcements, sermon links, settings, and the audit log. Open requests wait under
**Members → Waiting for approval**; approving one is quiet and audited. Creating an invite does not
send email; copy the generated message and share it yourself. An invite pre-approves that email so it
skips the waiting room. Renewing a revoked or expired invite reuses the same email row and writes the
decision to the audit log.

Affirmations are written in **Admin → Affirmations**. A draft has no day; a scheduled affirmation
appears at the circle's midnight boundary. Images are private and limited to JPG/PNG/WebP under 2 MB.
Members can Amen, save privately, and share the text.

### Admin password

The admin account is `tracy.tubea@gmail.com`. Its password is set in Supabase Auth. Change it in
**Admin → Settings → Your password** (the current password is verified first), or use
Authentication → Users → the user → **Reset password**. Passwords are never stored in the repo or
sent to the browser.

## Supabase Auth settings

Authentication → URL Configuration:

- Site URL: `http://localhost:3000` for local development on the same Mac.
- Redirect URLs are only needed for the legacy callback route:
  - `http://localhost:3000/auth/callback`
  - `http://localhost:3000/**`
  - Add the LAN or deployed equivalents when needed.

Auth → Providers → Email: keep the email provider enabled. Email confirmation may stay enabled;
accounts created by an admin with **Auto Confirm User** can sign in immediately. Sign-in never sends
email, but account deletion re-verification sends a one-time code, so configure SMTP before relying on
the leave flow. Accounts created with **Auto Confirm User** can sign in immediately.

## Sign-in troubleshooting

**The password is rejected.**

Check that the account exists under Authentication → Users, that the email is confirmed, and that the
profile status is `active` rather than `pending` or `deactivated`. Use **Reset password** there if
needed. The app returns the same “Email or password is incorrect.” message for a wrong password, an
unknown address, and a paused account, so it cannot be used to probe who has an account.

**Today says the daily study is not set up yet.**

The hosted database is missing migration 3. Run `pnpm db:push` or paste
`supabase/migrations/20261025140000_daily_study.sql` into the SQL Editor, then refresh.

**Sign-in succeeds but I land back on the sign-in page.**

The database is missing migration 2 or the membership lookup failed. Verify:

```sql
select proname from pg_proc where proname = 'get_my_membership';
```

If it is missing, apply `supabase/migrations/20261025130000_auth_hardening.sql`. Do not run
`pnpm db:push` blindly if migration 1 was applied manually; repair the migration history first.

**I need to test on my phone.**

Use the Mac's LAN address instead of `localhost`:

```bash
ipconfig getifaddr en0
```

Both devices must be on the same network and the Mac must stay awake. No redirect allowlist changes
are needed for password sign-in.

## Daily study

Sign in with an admin account, open **Admin → Reading plan**, and add a reading for today or a future
date. Bulk paste accepts one line per day:

```text
2026-10-26 | John 1
2026-10-27 | John 2
```

The reference is stored and linked out to BibleGateway or YouVersion; no Bible translation text is
stored. Members see today and earlier readings only, can mark “I read it”, leave a thought, ask a
question, reply, and give Amen. Notifications appear in the header bell.

Admins can edit and delete their own writing, hide any member’s content, and mark questions answered.
Admins cannot edit another member’s words. Read receipts are private; the app shows only an active
member count.

## Affirmations

Members receive one short line a day at `/affirmation`, also shown on Today. The veil remembers
whether you revealed that day's word and offers **Veil again**. Amen counts are aggregate-only; saves
are private. The archive and saved pages link back to the original day. Admins schedule drafts in
**Admin → Affirmations** and can add an optional private image with alt text.

## Temporary local preview

To inspect protected pages without a Supabase session while auth is being fixed:

```bash
DEV_PREVIEW=true pnpm dev
```

Then open `/today`, `/today/questions`, `/today/archive`, `/admin/reading`, `/prayer`,
`/affirmation`, `/check-in`, or `/design`. This uses a mock active
admin identity and must only run with `NODE_ENV=development`; it is not available in a production
build. Remove the bypass before launch.

## Commands

```bash
pnpm dev          # dev server
pnpm lint         # ESLint
pnpm typecheck    # tsc --noEmit
pnpm build        # production build
pnpm test         # Vitest unit tests
pnpm test:e2e     # Playwright end-to-end tests
pnpm db:push      # apply supabase/migrations to the linked project
pnpm db:reset     # reset the linked/local DB (destructive; local only by default)
```

The admin flow and `/design` screenshots need an authenticated admin storage state:

```bash
PLAYWRIGHT_ADMIN_STATE=path/to/admin-state.json pnpm test:e2e
```

Without it, those tests are skipped; the public smoke tests still run. Admin credentials are read from
`PLAYWRIGHT_ADMIN_EMAIL` and `PLAYWRIGHT_ADMIN_PASSWORD`. If bundled Playwright Chromium is not
installed, use your installed Chrome: `PLAYWRIGHT_CHANNEL=chrome pnpm test:e2e`. In development, use
`http://localhost:3000` for Playwright; `127.0.0.1` can be blocked by Next.js HMR origin checks.

## Project layout

```text
src/app                  routes; (auth), (app), (admin), design showcase, auth callback
src/components            UI, art, motion kit, navigation, study feed, admin console
src/lib                   env, auth, validation, preferences, timezone, sky, study, admin
src/proxy.ts              Next.js 16 session refresh
supabase/migrations/      version-controlled SQL
tests/unit                Vitest (61 tests)
tests/e2e                 Playwright
```

## Security notes

- RLS is enabled on every table; policies are explicit and default-deny.
- Identity comes from `auth.uid()`. Roles live in `member_roles` (read-only to members) and are
  checked with a `security definer` `is_admin()`.
- Approval is enforced in the database: a new `auth.users` row always gets a profile, non-invited
  accounts start `pending`, and only an admin RPC can set them `active`. RLS and the protected layout
  keep pending or deactivated accounts out of member content. An invite is a pre-approval for one email.
- Private prayer and admin-only check-ins must never appear in public queries, feeds, notifications,
  recaps, search, or logs.
- Notifications are created by database triggers only; members cannot insert them.
- Reading-plan writes are admin-only. Members see only today and earlier readings.
- Hidden content is visible to admins for moderation but never to members. Admins get no extra read
  receipts.
- Affirmation images are private; signed URLs last 10 minutes. Saves are private to the member, and
  Amen counts expose no identities.
- Future public tables/sequences/functions are default-deny at the privilege layer (migration 7).
- Rotate any secret key that has been pasted into chat, a ticket, or a log.

## Docs

- `AGENTS.md` — rules for contributors and AI agents.
- `PROJECT_PLAN.md` — phases, decisions, open questions, verification log.
