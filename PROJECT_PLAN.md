# PROJECT_PLAN.md — YOD Circle

Status: **Phase 1 in progress** (Phase 0 complete). Stop for approval after each phase.

## Vision

A private, invite-only web app for a small faith community: one Bible chapter a day, thoughts and
questions, prayer, affirmations, weekly check-ins. Mobile-first, WhatsApp-adjacent, calm and warm.
Success = the daily action takes under ~10 seconds and nobody feels surveilled.

## Phases

- [x] **Phase 0 — Plan.** Inspect workspace/tools; write AGENTS.md, PROJECT_PLAN.md, README.md; propose structure.
- [ ] **Phase 1 — Foundation.** (in progress)
  - [x] Next.js 16.4.3 scaffold (App Router, TS strict, Tailwind v4, ESLint, `src/`)
  - [x] Supabase clients + `proxy.ts` session refresh (`@supabase/ssr` 0.12.7)
  - [x] Migration 1 written (`profiles`, `invites`, `member_roles`, RLS, invite gate, `updated_at`)
  - [x] Temporary `/setup-check` diagnostic
  - [x] `pnpm lint`, `pnpm typecheck`, `pnpm build` pass
  - [ ] Migration 1 applied to the hosted project (needs dashboard SQL or CLI link)
  - [ ] Magic link + 6-digit code auth, callback route, protected layout, sign-out
  - [ ] Design tokens, fonts, nav shell, protected placeholder Today page
  - [ ] README auth/SMTP/first-admin steps finalized
- [ ] **Phase 2 — Design system & motion kit.** Buttons, cards, tabs, sheet, toast, empty state; SVG art
      (wings, dove, halo, candle, rays); motion pieces; reduced-motion; `/design` showcase.
- [ ] **Phase 3 — Daily study.** Reading plan, thoughts/questions, replies, Amen, I-read-it, question
      queue, archive, notifications.
- [ ] **Phase 4 — Prayer wall.** Visibility, I-prayed, updates, answered/testimonies; heaviest RLS tests.
- [ ] **Phase 5 — Affirmations.** Admin scheduling, today's featured, Amen, favorites, archive, images.
- [ ] **Phase 6 — Check-in & being seen.** Weekly check-in, Circle directory, encouragement notes,
      aggregate presence, admin care view, unanswered-thought nudge.
- [ ] **Phase 7 — Admin & moderation.** Invites UI, circle settings, audit log, content moderation.
- [ ] **Phase 8 — Recaps & extras.** Weekly recap, search, opt-in reminders, PWA, birthdays (consent).
- [ ] **Phase 9 — Hardening & launch.** Security review, accessibility pass, performance, Playwright,
      Vercel deploy, backups, soft launch.

## Decisions

Recorded defaults; change only with a reason.

| # | Decision | Rationale |
|---|----------|-----------|
| D1 | pnpm as package manager | Already installed; fast, disk-efficient. |
| D2 | `src/` directory + `@/*` import alias | Clear separation of app code and repo config. |
| D3 | Tailwind CSS v4 (as scaffolded) | Current create-next-app default; verify before styling. |
| D4 | Circle timezone default `Africa/Accra` | Brief default; stored in `circle_settings`. |
| D5 | Bible reading = reference + outbound link only | Avoid reproducing copyrighted translations. |
| D6 | Default Bible link source: BibleGateway, admin-configurable | Stable URL built from reference; no translation text stored. |
| D7 | Auth = email magic link **and** 6-digit OTP | Links break in WhatsApp in-app browsers; code is essential. |
| D8 | Invite-only via `invites` allowlist checked in DB trigger + server | RLS is not enough to stop auth signups. |
| D9 | No service-role key unless a documented server-only need appears | Least privilege. |
| D10 | Session refresh file named per installed Next.js version (`middleware.ts` vs `proxy.ts`) | Next 16 renamed middleware to proxy; verify version. |
| D11 | Store only `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` in client env | Publishable key is safe to expose; secret key is not. |
| D12 | Temporary `/setup-check` diagnostic, removed/repurposed after verification | Prove connection with evidence, then reduce attack surface. |
| D13 | Disable `cacheComponents` / `partialPrefetching` for now | Auth-first app is request-specific; avoids Suspense ceremony on every private route. Revisit with caching strategy later. |
| D14 | Supabase CLI pinned as a devDependency (`pnpm db:push`) | Reproducible migrations for every contributor; no global install required. |
| D15 | Invites carry the role; `auth.users` trigger creates profile + role atomically | One source of truth; non-invited emails are rolled back at signup. |
| D16 | `profiles` readable by any authenticated member; only display fields writable | Directory is intentional; role lives elsewhere and is unwritable. Tighten in later privacy pass. |

## Open questions

1. Approx. circle size (10? 30? 100?) — affects invitation and presence UI, not schema.
2. Preferred Bible translation/source for outbound links (BibleGateway NIV? YouVersion? other?).
3. Reading plan starting point (book/chapter/date) or will admin bulk-paste later?
4. Is a custom SMTP provider (e.g. Resend) available now, or use Supabase's rate-limited sender for dev?
5. GitHub remote for this repo? (Local commits can start without one.)

Defaults if unanswered: small circle (<50), BibleGateway NIV links, no seeded plan until admin entry,
Supabase email sender in dev, local git only.

## Architecture (proposed)

```
src/
  app/
    (auth)/sign-in/page.tsx          magic link + OTP form
    (app)/layout.tsx                 protected shell: top nav / bottom tabs
    (app)/today/page.tsx             chapter, affirmation, circle presence
    (app)/prayer/page.tsx
    (app)/affirmations/page.tsx
    (app)/check-in/page.tsx
    (app)/circle/page.tsx
    (app)/profile/page.tsx
    (admin)/admin/...                 members, invites, plan, settings, care
    api/auth/callback/route.ts        exchange code / confirm magic link
    api/auth/sign-out/route.ts
    setup-check/page.tsx              temporary connection diagnostic
    design/page.tsx                   Phase 2 component showcase (hidden)
    layout.tsx, globals.css
  components/
    motion/                           reusable animated primitives + SVG art
    ui/                               buttons, cards, tabs, sheets, toasts
  lib/
    supabase/{client,server,middleware}.ts
    auth.ts                           requireMember / requireAdmin helpers
    validation/                       Zod schemas
    dates.ts                          circle-timezone "today"
    types.ts
supabase/
  migrations/                         versioned SQL, one per phase minimum
tests/
  unit/  e2e/
```

## Verification log

- Phase 0: inspected empty dir; Node v24.13.0, npm 11.6.2, pnpm 11.5.2, git 2.50.1; Supabase CLI not
  installed. No git repo yet.
- Phase 1 scaffold: Next.js 16.4.3, React 19.3.0, Tailwind 4.3.3, TypeScript 5.9.3,
  `@supabase/ssr` 0.12.7, `@supabase/supabase-js` 2.118.0, Supabase CLI 2.122.0.
- `pnpm lint` — pass.
- `pnpm typecheck` — pass.
- `pnpm build` — pass; `/` static, `/setup-check` dynamic, proxy registered.
- `GET /setup-check` — HTTP 200. Auth API check **OK** ("Reached the Supabase Auth service").
  Database check **fails as expected**: "foundation migration is not applied yet (`health_check` is
  missing)". Apply migration 1 to finish verification.
- Security: a Supabase **secret key** was pasted into chat and was not written to any file. Rotate it;
  only the publishable key is used by the app.

## Known risks

- Adoption: friction kills usage. Keep auth and daily action short.
- WhatsApp in-app browser: magic links can open in another browser; OTP path must be first-class.
- Supabase built-in email is rate-limited; custom SMTP needed before real invites.
- Privacy bugs: private prayer/admin-only check-ins must be tested at the query and RLS level.
- Next.js 16 renamed `middleware.ts` → `proxy.ts`; confirm installed version and API.
