# AGENTS.md — YOD Circle

Persistent rules for AI agents and humans working in this repo. Read this before changing code.

## Product

YOD Circle is a private, approval-gated community for a small Christian circle: one Bible chapter a
day, reflections/questions, prayer, affirmations, and weekly check-ins. Anyone may request an account
with an email and password; an admin approves each request before entry. Invites pre-approve a specific
email. Optimise for a member arriving from WhatsApp on a phone: the daily action must take under ~10
seconds. Care, not surveillance.

## Stack

- Next.js App Router, TypeScript strict, Tailwind CSS
- Supabase (Postgres, Auth, Storage; Realtime only if needed) via `@supabase/ssr`
- Zod for server-side validation; server actions / route handlers for writes
- `motion` for interaction animation; plain CSS/SVG for ambient effects
- Vitest (unit), Playwright (e2e)
- pnpm as package manager; Vercel for deployment (later)

Verify installed versions before using APIs. Follow docs for those versions, never memory.

## Commands

Set these after Phase 1 scaffolding; keep them accurate.

```bash
pnpm dev          # local dev
pnpm lint         # ESLint
pnpm typecheck    # tsc --noEmit (add if missing)
pnpm build        # production build
pnpm test         # Vitest
pnpm test:e2e     # Playwright
pnpm db:push      # apply migrations to linked project (Supabase CLI)
```

Next.js 16 uses `src/proxy.ts` (formerly `middleware.ts`) and Node.js runtime by default. Keep Supabase
session refresh there. `cacheComponents` is disabled for now (decision D13).

## Structure

- `src/app` — routes. Groups: `(auth)`, `(app)`, `(admin)`; `api/auth/callback` for OAuth/OTP exchange.
- `src/components` — UI; `src/components/motion` for the shared motion kit.
- `src/lib/supabase` — `client.ts`, `server.ts`, `admin.ts` (server-only, only if truly needed).
- `src/lib` — validation, auth helpers, date/timezone, shared types.
- `supabase/migrations` — version-controlled SQL. Never edit an applied migration; add a new one.
- `tests` — unit and e2e.

## Security non-negotiables

- RLS enabled on every table; default deny; explicit policies per operation.
- Identity always from `auth.uid()`; never trust client-supplied user IDs, roles, or author IDs.
- Roles live in a member-unwritable table; admin checks via a `security definer` `is_admin()` helper
  with `set search_path = ''`.
- Service-role / secret key never in client code or `NEXT_PUBLIC_*`. No secrets in logs or commits.
- Registration is approval-gated: a new account starts `pending`, may read only its own profile and the
  waiting room, and enters the circle only after an admin approves it. An `invites` row pre-approves one
  email and writes the role atomically with the profile. Never let a pending or deactivated account
  reach member content.
- Private prayer and admin-only check-ins must not appear in any public query, feed, notification,
  recap, search, or log. Test this explicitly.
- Validate all writes server-side with Zod and constrain in Postgres (lengths, enums, NOT NULL, unique).
- Members must never read another member's email. Member-facing profile reads use `member_directory`,
  not raw `profiles` joins.
- No dead controls. If a setting or feature does not exist, do not render its toggle or button.
- Tests that touch a Supabase project run against **staging only**. Refuse production project ref
  `mfcmqvgypomcfbrqiqrm`. Never claim a test passed without observed output.
- Soft-delete user content; hard delete only via explicit admin/account-deletion path.
- Storage buckets private by default; signed URLs; size/type limits.
- Never disable a security check to make a test pass.

## Data conventions

- UUID primary keys; `timestamptz` timestamps; `created_at` / `updated_at` with a trigger.
- Content visibility is explicit: private (author/admin), circle-visible, admin-only.
- "Today" is computed server-side in the circle timezone (`circle_settings.timezone`, default
  `Africa/Accra`).
- Do not reproduce copyrighted Bible translations. Store references and build outbound links.
- Aggregate presence only. No streaks, leaderboards, rankings, or public inactivity lists.

## Design tokens

Warm cream background, forest green primary, sage secondary, restrained muted gold accent, warm
near-black text (never pure black). Serif headings (Fraunces), clean sans UI (Inter/DM Sans). Dark mode
supported. Mobile-first: bottom tab bar on mobile, slim top nav on desktop. Primary destinations:
Today, Prayer, Affirmation, and Check-in once it ships. One primary action per screen. Generous whitespace, subtle borders,
accessible contrast (4.5:1), large tap targets.

Motion: ambient light rays and gold motes; small "gift" moments (Amen wings, dove, answered sunrise,
candle). Interactions < 600ms, transform/opacity only, no layout shift. Honour
`prefers-reduced-motion` and the in-app Reduce motion toggle. All art inline SVG/CSS, drawn for this
project, reverent and abstract, no faces.

## Workflow

- Follow `PROJECT_PLAN.md` phase by phase. **Stop and report after each phase; wait for approval.**
- Work in small verifiable steps. Run lint, typecheck, build, and relevant tests; report real results.
- Do not claim something works without evidence. Diagnose failures; never fake success.
- Commit after each meaningful step with clear messages. Never commit `.env.local` or secrets.
- Ask before destructive actions or public deployment. Otherwise choose a sensible default and record
  it in `PROJECT_PLAN.md` under Decisions.
- Keep the privacy table honest: every shipped member-facing feature needs a row in
  `src/lib/account/privacy.ts`, covered by the unit test.
- Keep `README.md` and `PROJECT_PLAN.md` current. No dead buttons: unbuilt features are not shown.
- Server Components by default; client components only for interactivity. Accessible by default.
