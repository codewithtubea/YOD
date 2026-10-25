# YOD Circle

A private, invite-only community for a small faith circle: one Bible chapter a day, thoughts and
questions, prayer, affirmations, and weekly check-ins. Mobile-first, warm, and calm.

## Status

Phase 1 (foundation) in progress. The Next.js app, Supabase clients, session refresh, migration 1, and
a temporary connection check exist. Auth UI and the protected shell are next. See `PROJECT_PLAN.md`.

## Stack

Next.js 16 (App Router) · TypeScript strict · Tailwind CSS 4 · Supabase (Postgres, Auth, Storage) ·
`@supabase/ssr` · Zod · motion · Vitest · Playwright · pnpm.

## Prerequisites

- Node 20+ and pnpm 11+
- A Supabase project (this repo is wired for project ref `mfcmqvgypomcfbrqiqrm`)
- No local Docker required unless you want the full local Supabase stack

## Setup

```bash
pnpm install
cp .env.example .env.local
```

Fill `.env.local` from Supabase → Project Settings → API:

```
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

Use the **publishable** key. Never put the secret/service-role key in `.env.local`, `NEXT_PUBLIC_*`,
client code, logs, or Git. `.env.local` is gitignored.

```bash
pnpm dev
```

## Apply the database migration

Migration 1 creates `profiles`, `member_roles`, `invites`, RLS policies, the invite gate, and the
`updated_at` trigger.

**Option A — Dashboard (easiest, no DB password needed)**

1. Open Supabase → SQL Editor.
2. Paste the contents of `supabase/migrations/20261025120000_foundation.sql`.
3. Run it. It is safe to run once on a fresh project. Do not edit an applied migration; add a new one.

**Option B — Supabase CLI**

```bash
pnpm supabase login
pnpm supabase link --project-ref mfcmqvgypomcfbrqiqrm
pnpm db:push
```

`link` asks for the database password (never commit it). If the CLI is already authenticated, use
`SUPABASE_ACCESS_TOKEN` in your shell only.

### First admin (one-time SQL)

The first admin must be seeded from the dashboard, never from a public route:

```sql
-- Replace with the real email. Role is carried by the invite and applied at signup.
insert into public.invites (email, role, note)
values ('you@example.com', 'admin', 'first admin');
```

Invite the rest of the circle with `role = 'member'`. When someone first signs in, a database trigger
creates their profile and role, and marks the invite accepted. Non-invited emails are rejected.

## Verify the connection

```bash
pnpm dev
```

Open http://localhost:3000/setup-check. Expected after the migration:

- Environment: OK
- Auth API: OK
- Database: OK (`health_check` returns `ok`)

If the database check says the migration is missing, apply it (above). The page never displays
credentials.

## Supabase Auth settings (needed when the sign-in UI lands)

Authentication → URL Configuration:

- Site URL: `http://localhost:3000` for local development
- Redirect URLs: `http://localhost:3000/api/auth/callback` and `http://localhost:3000/**`
- Add the deployed Vercel URL and its callback URL when it exists; do not assume it now.

Auth → Providers → Email: enable Email OTP / magic link. The sign-in page will offer both a magic link
and a 6-digit code (links often open in a different browser from WhatsApp's in-app browser).

Before inviting real people, configure custom SMTP (e.g. Resend) in Auth → SMTP. Supabase's built-in
sender is heavily rate-limited and not for production.

## Commands

```bash
pnpm dev          # dev server
pnpm lint         # ESLint
pnpm typecheck    # tsc --noEmit
pnpm build        # production build
pnpm test         # Vitest (added in a later phase)
pnpm test:e2e     # Playwright (added in a later phase)
pnpm db:push      # apply supabase/migrations to the linked project
pnpm db:reset     # reset the linked/local DB (destructive; local only by default)
```

## Project layout

```
src/app          routes (setup-check is temporary)
src/lib/env.ts   env validation (reports missing names, never values)
src/lib/supabase client.ts, server.ts, proxy.ts
src/proxy.ts     Next.js 16 proxy: refreshes the Supabase session
supabase/        config.toml, migrations/, seed.sql
.agents/skills/  Supabase agent skills (installed via `npx skills add supabase/agent-skills`)
```

## Security notes

- RLS is enabled on every table; policies are explicit and default-deny.
- Identity comes from `auth.uid()`. Roles live in `member_roles` (read-only to members) and are checked
  with `security definer` `is_admin()`.
- The invite gate is enforced in the database at `auth.users` insert, not just in UI.
- The diagnostic `/setup-check` and `health_check()` are temporary; remove/repurpose after verification.
- Rotate any secret key that has been pasted into chat, a ticket, or a log.

## Docs

- `AGENTS.md` — rules for contributors and AI agents.
- `PROJECT_PLAN.md` — phases, decisions, open questions, verification log.
