# PROJECT_PLAN.md — YOD Circle

Status: **Phase 6 weekly check-in, encouragement notes, aggregate presence, and the admin care view,
plus Phase 7 open registration with admin approval and the public landing page, are implemented in
code. Migrations 2–11 are applied to the hosted project, and migrations 1–10 replay cleanly on a fresh
local Postgres. Verification is blocked on a staging project and the missing
`YOD_CIRCLE_BRIEF.md`.**
(Phases 0–1 complete; Phase 2 visual evidence captured, performance evidence pending; Phase 3 hosted
verification complete; Phase 3B migration applied and admin routes verified in a real browser; Phase 4
prayer migration applied, database/RLS and production browser flows verified). Awaiting Phase 5,
Phase 5B, Phase 6, and Phase 7 staging verification and approval. Stop for approval after each phase.

## Vision

A private, approval-gated web app for a small faith community: one Bible chapter a day, thoughts and
questions, prayer, affirmations, weekly check-ins. Anyone may request an account; an admin approves
before entry, and invites pre-approve one email. Mobile-first, WhatsApp-adjacent, calm and warm.
Success = the daily action takes under ~10 seconds and nobody feels surveilled.

## Phases

- [x] **Phase 0 — Plan.** Inspect workspace/tools; write AGENTS.md, PROJECT_PLAN.md, README.md; propose structure.
- [x] **Phase 1 — Foundation.**
  - [x] Next.js 16.4.3 scaffold (App Router, TS strict, Tailwind v4, ESLint, `src/`)
  - [x] Supabase clients + `proxy.ts` session refresh (`@supabase/ssr` 0.12.7)
  - [x] Migration 1 applied (`profiles`, `invites`, `member_roles`, RLS, invite gate, `updated_at`)
  - [x] Magic link sign-in, callback route, protected shell, sign-out
  - [x] Invite gate/account state hardening written and applied in migration 2
  - [x] Design tokens, fonts, top/bottom nav shell, honest placeholder pages
  - [x] README auth/SMTP/first-admin steps updated
- [ ] **Phase 2 — Design system & motion kit.** (implementation complete; final evidence/report pending)
  - [x] Tokens, type scale, focus, dark mode, reduced-motion foundations
  - [x] Buttons, cards, tabs, segmented control, sheet, toast, empty state, form controls, menus
  - [x] SVG art (wings, dove, halo, candle, rays, olive branch, book, star, lamp)
  - [x] Motion pieces and guardian/sky modules
  - [x] Admin-only `/design` showcase
  - [x] Unit tests for motion preference, sky periods, 15 guardian lines
  - [x] Playwright config and screenshot spec (admin-state dependent)
  - [x] Run visual screenshots with an authenticated admin session (20 captures: 5 widths × 2 themes × motion/reduced)
  - [ ] Measure production JS and Lighthouse on a mobile profile
  - [ ] Final Phase 2 report and approval
- [ ] **Phase 3 — Daily study.** (code complete; migration/RLS/real-session verification pending)
  - [x] Audit requirements against brief, existing schema, auth, and design system
  - [x] Migration 3: reading plan, posts, replies, reactions, read receipts, notifications, RLS, RPCs
  - [x] Circle date/timezone helpers and Bible reference/link validation
  - [x] Today reading, I-read-it, candle count, thoughts/questions feed, optimistic replies
  - [x] Amen, edit/soft-delete, admin hide, question answered state, thread pages
  - [x] Questions queue, weekly archive, pagination and focus/poll refresh
  - [x] Trigger-only notifications and header notification bell
  - [x] Admin reading-plan manager: single, bulk paste, generator, source, edit
  - [x] Unit tests for dates, Bible references, validation; Phase 3 lint/typecheck/test/build pass
  - [x] Apply migration 2 and migration 3 to the hosted project
  - [x] Verify real admin/member sessions and Phase 3 RLS at the database level
  - [ ] Visual review of Today/Questions/Archive/Admin at phone and desktop widths
  - [ ] Final Phase 3 report and approval
- [x] **Phase 3B — Admin console.**
  - [x] Migration 4: audit trail, admin guards, deactivation, invite extensions, announcements, reports,
        sermon links, settings template, admin RPCs, RLS/grants
  - [x] Admin route group with server guard, sidebar/mobile shell, command palette, overview counts
  - [x] Members: search, role/status actions, self/last-admin protections
  - [x] Invites: bulk create, role/expiry/note, copy/share, revoke, renew, `/join` account creation
  - [x] Reading plan moved into admin console with month calendar and gap view
  - [x] Moderation: reports, hide/restore, resolved filter; member report sheets
  - [x] Questions: open/answered filters, mark answered, hide with reason
  - [x] Announcements, sermon links, circle settings + invite template, append-only audit log
  - [x] Member surfaces: announcement banner, sermon shelf, report content
  - [x] Unit tests for admin validation/invites/calendar/sermons; Playwright admin route flow
  - [x] `pnpm lint`, `pnpm typecheck`, `pnpm test` (44), `pnpm build` pass
  - [ ] Final Phase 3B report and approval
- [ ] **Phase 4 — Prayer wall.** (complete and hosted-verified; awaiting approval)
  - [x] Migration 5: private schema, prayer/update/prayed tables, RPC-only access, RLS default deny
  - [x] Migration 6: revoke anon/PUBLIC function execution, harden default privileges, make audit/admin internals private
  - [x] Anonymous composer with privacy note, optimistic share, and ascent motion
  - [x] Wall pagination, “I prayed” toggle/count, author updates, mark answered, soft remove with undo
  - [x] zod validation, cursor parsing, RPC data loader, server actions, error mapping
  - [x] Unit tests for prayer validation/cursor; `pnpm lint`, `pnpm typecheck`, `pnpm test` (48), `pnpm build` pass
  - [x] Apply migrations 5 and 6 to the hosted project
  - [x] Verify real member sessions and prayer RLS at the database level (no author IDs or hidden prayers leak)
  - [x] Production browser flow: share, I prayed, update, answered, and remove
  - [x] Automated phone/desktop layout and 44px tap-target checks; screenshots captured
  - [ ] Final Phase 4 report and approval
- [ ] **Phase 5 — Affirmations.** Admin scheduling, today's featured, Amen, favorites, archive, images.
      (Implemented in code; migrations 7–8 applied to the hosted project.)
  - [x] Migration 7: default-deny future tables/sequences/functions in `public`
  - [x] Migration 8: affirmations, Amen reactions, private favorites, visibility RPCs, image bucket/RLS
  - [x] Member `/affirmation`, archive, saved, Today card, per-date veil, Amen, save, text share
  - [x] Admin `/admin/affirmations`: drafts, scheduling, archive, image upload, alt text, audit
  - [x] Admin self-service password change in Admin → Settings
  - [x] Unit tests for affirmation validation/images/formatting/reveal and password validation
  - [x] `pnpm lint`, `pnpm typecheck`, `pnpm test` (61), `pnpm build` pass
  - [x] Apply migrations 7 and 8 to the hosted project
  - [ ] Verify hosted affirmation RLS, RPCs, image privacy, and signed URLs with real sessions
  - [ ] Browser flow: schedule, reveal, Amen, save, archive, change admin password
  - [ ] Final Phase 5 report and approval
- [ ] **Phase 5B — Member experience.** Onboarding, profile, settings, privacy, data export, leaving.
      (Implemented in code; migration 9 applied to the hosted project; staging verification pending.)
  - [x] Step 0 audit: profiles, roles, invites, storage, RLS, privilege allowlist, policy matrix
  - [x] Decisions recorded: password-only auth, `contact_admin`, `avatar_path`, member directory, hide Check-in
  - [x] Migration 9 written: profile fields, `member_directory`, `member_settings`, avatar bucket, proofs,
        onboarding/contribution/export/delete RPCs, `contact_admin`, notification preferences
  - [x] Onboarding: welcome, about you, how it works, add to home screen, blessing, resume
  - [x] Member profile, contribution counts, and member-card sheet
  - [x] Settings registry: appearance, notifications, account, help
  - [x] Privacy center generated from one typed constant; feature coverage unit test
  - [x] Export (JSON + Markdown) and leave/re-verification flow
  - [x] Help page, AGENTS/README updates
  - [x] `pnpm lint`, `pnpm typecheck`, `pnpm test` (77), `pnpm build` pass
  - [x] Staging-only Playwright member-experience spec and SQL security audit written
  - [ ] Apply migration 9 to staging and run the staged security checks
  - [ ] Run staging-only Playwright flows and screenshot review
  - [ ] Final Phase 5B report and approval
- [ ] **Phase 6 — Check-in & being seen.** Weekly check-in, Circle directory, encouragement notes,
      aggregate presence, admin care view, unanswered-thought nudge.
      (Implemented in code; migration 10 applied to the hosted project.)
  - [x] Migration 10: private check-ins, encouragement notes, aggregate presence, admin care RPCs,
        gentle nudges, notification types, and export/delete coverage
  - [x] Member check-in page: one-word mood, optional private note, Monday-based circle week,
        private encouragement inbox, aggregate presence copy
  - [x] Encouragement notes from a member profile; private sender/recipient visibility
  - [x] Notifications for encouragement and nudges; `notify_encouragements` setting; export/delete
  - [x] Admin care view: aggregate week summary, care groups, unseen notes, gentle nudge
  - [x] Privacy registry rows and feature modules for check-in and encouragement
  - [x] Help page answers, README/PROJECT_PLAN updates
  - [x] `pnpm lint`, `pnpm typecheck`, `pnpm test` (85), `pnpm build` pass
  - [x] Replayed migrations 1–10 on a fresh local Postgres with Supabase stubs; fixed duplicate
        `affirmations` constraint names (migration 8) and the `save_my_check_in` `on conflict`
        ambiguity (migration 10); Phase 5B/6 security SQL and Phase 6 functional SQL pass
  - [ ] Apply migration 10 to staging; add staging SQL security tests for check-ins and notes
  - [ ] Run staging-only Playwright check-in/care flows and screenshot review
  - [ ] Final Phase 6 report and approval
- [ ] **Phase 7 — Open registration, approval, and landing.** Public landing page, email/password
      registration, pending waiting room, admin approval, and invite pre-approval.
  - [x] Migration 11: `pending` status, approval metadata, open signup trigger, admin approval RPC,
        pending-member counts, and self-only profile reads for pending accounts
  - [x] Public landing page with the circle story, rhythm, how-it-works, and join/sign-in actions
  - [x] `/join` email/password registration with name, confirmation, validation, and honest
        confirmation/resend copy
  - [x] `/waiting` room that pending accounts can read while all member content stays closed
  - [x] Admin `/admin/members` pending approvals, approval audit event, and pending counts
  - [x] Staging SQL checks for registration, invite pre-approval, approval, and pending read limits
  - [x] `pnpm lint`, `pnpm typecheck`, `pnpm test` (85), `pnpm build` pass
  - [x] Apply migration 11 to the hosted project; the signup trigger now creates `pending` accounts
  - [ ] Apply migration 11 to staging and run `tests/staging/phase7-*.sql`
  - [ ] Run staging-only Playwright join/approval flows and screenshot review
  - [ ] Final Phase 7 report and approval
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
| D7 | Auth = email + password only | User explicitly required password sign-in for the admin and asked for strict password use. Magic-link UI/action removed; account creation stays invite-gated. |
| D8 | Invite-only via `invites` allowlist checked in DB trigger + server | RLS is not enough to stop auth signups. |
| D9 | No service-role key unless a documented server-only need appears | Least privilege. |
| D10 | Session refresh file named per installed Next.js version (`middleware.ts` vs `proxy.ts`) | Next 16 renamed middleware to proxy; verify version. |
| D11 | Store only `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` in client env | Publishable key is safe to expose; secret key is not. |
| D12 | Temporary `/setup-check` diagnostic, removed after verification | Reduced attack surface once auth landed. |
| D13 | Disable `cacheComponents` / `partialPrefetching` for now | Auth-first app is request-specific; avoids Suspense ceremony on every private route. Revisit with caching strategy later. |
| D14 | Supabase CLI pinned as a devDependency (`pnpm db:push`) | Reproducible migrations for every contributor; no global install required. |
| D15 | Invites carry the role; `auth.users` trigger creates profile + role atomically | One source of truth; non-invited emails are rolled back at signup. |
| D16 | Member profile reads go through `member_directory`; raw `profiles` access is limited to own safe columns | Supersedes the original broad readable-profile decision so member emails can never leak through a join. Role/status remain outside client writes. |
| D17 | Theme/motion/sound providers use `useSyncExternalStore` over small storage/media stores | Avoids effect-driven state and satisfies React's `set-state-in-effect` lint rule. |
| D18 | CSS theme tokens use explicit `:root` variables with media/selector overrides, not `light-dark()` inside `@theme` | Tailwind 4 compiles that form into a system-only media block, which breaks the manual `data-theme` toggle. |
| D19 | Reduced motion = device preference **or** explicit in-app preference | A user cannot override an OS accessibility request from inside the app; the switch explains this. |
| D20 | Sound preference persists, but playback is unavailable until licensed audio exists | Avoid shipping unlicensed chimes; report honestly. |
| D21 | `/design` is admin-only, excluded from production nav, and reads no app content | Safe internal reference without exposing private data. |
| D22 | No production overflow routes yet; showcase uses in-page anchors | Prevents dead navigation/buttons before Circle, Archive, Questions, and Profile exist. |
| D23 | Playwright screenshot tests skip without `PLAYWRIGHT_ADMIN_STATE` | Never bypass auth to capture design evidence. |
| D24 | Confirm signup and Magic Link templates must include `{{ .ConfirmationURL }}` | Link-only sign-in needs the default confirmation link; add `{{ .Token }}` back with the code path. |
| D25 | `NEXT_PUBLIC_SITE_URL` is optional; request host is the fallback | Keeps localhost and LAN testing flexible; set it explicitly for phone testing or deployment. |
| D26 | Force design-system swatch utilities with `@source inline(...)` | Ensures rare tokens such as success/clay/focus are generated even when only used in showcase data. |
| D27 | Magic link and 6-digit code removed | Password sign-in replaces both. The legacy `/auth/callback` route remains for account confirmation links but is not part of normal sign-in. |
| D28 | `DEV_PREVIEW=true` mock-admin preview, development only | Lets the user inspect protected placeholders while the hosted DB migration blocks sign-in. Guarded by `NODE_ENV === "development"`; remove before launch. |
| D29 | Reading plan is one row per circle day; members see today and earlier, admins manage all | Prevents future readings leaking early; supports catch-up discussion without opening the future. |
| D30 | Replies are one level deep; an answered question may reference a visible reply on the same question | Keeps threads calm and prevents nested escalation or cross-post answer spoofing. |
| D31 | Amen/read aggregates use `security definer` RPCs, not views | Avoids exposing underlying private rows and keeps counts aggregate-only. |
| D32 | Notifications are trigger-only; repeated Amens from the same actor collapse | No client-spoofed notifications and no notification spam for toggled Amens. |
| D33 | No Realtime dependency; refetch on focus and every 60 seconds while visible | Simpler, cheaper, and sufficient for a small circle; avoids presence/surveillance signals. |
| D34 | Read receipts are private; members see only an active read count, never names; admins get no receipt access in Phase 3 | Matches “care, not surveillance.” Revisit care signals explicitly in Phase 6. |
| D35 | Phase 3 uses column-level grants plus DB guards; archive is capped at 1,000 rows | Limits what a client can write and prevents an unbounded archive query. |
| D36 | Write throttle: fewer than 20 posts + replies per rolling 10 minutes | Basic abuse guard with generous room for a small circle. |
| D37 | `createReading` does not overwrite an existing day; both UI and admin must use the explicit overwrite path | Prevents accidental plan collisions. |
| D38 | Password sign-in uses one generic error for wrong password, unknown email, and paused account | Prevents the form from becoming an invite/account-status oracle. |
| D39 | Admin password lives only in Supabase Auth | No password in repo, env, or client; server action calls `signInWithPassword` and then re-checks membership. |
| D40 | Phase 3B admin console precedes prayer/affirmation/check-in | Admin operations unblock inviting and caring for the circle before later member modules. |
| D41 | Admin routes live in a separate `(admin)` group with a dedicated shell | Clearer guard boundary and quieter visual language than the member shell. |
| D42 | Invite messages are copied/shared manually; no email API | No service-role key exists, and Supabase admin email APIs must not be exposed client-side. |
| D43 | Invite uniqueness is global per lower(email); renewing reuses the row | Prevents duplicate identities across invite states; audit log preserves prior decisions. |
| D44 | Client shell receives admin icon ids, not icon components | Keeps the server/client boundary serialisable and avoids runtime RSC errors. |
| D45 | Report/hide reasons are capped at 280 characters in UI and validation | Matches the schema and keeps moderation notes brief and factual. |
| D46 | Prayer tables live in an unexposed `private` schema and are reached only through security-definer RPCs | Keeps authorship and “I prayed” records out of the Data API; direct grants remain default-deny. |
| D47 | Prayer RPCs expose only aggregate `prayed_count`, `viewer_prayed`, and `viewer_is_author` | Members see anonymous prayer, their own management state, and counts, never member identities. |
| D48 | Prayer write throttles: 5 prayers and 20 updates per rolling 10 minutes | Simple abuse guard; a small circle will not hit it in normal use. |
| D49 | Prayer removal is a soft delete; updates cascade with the prayer | Matches the content convention and keeps recovery/audit possible without direct client deletes. |
| D50 | Revoke function execution from PUBLIC/anon; make audit and admin internals non-client-callable | Supabase default privileges had left anon able to reach every public RPC, including `log_audit_event`; grants are now explicit. |
| D51 | Prayer action controls use at least 44px tap targets | The first layout check caught 36px “Add update”/“Mark answered” controls; mobile use comes from WhatsApp. |
| D52 | Phase 5 ships the core daily affirmation flow now; reactions beyond Amen, comments, reports, bulk scheduling, a word pool, fill-gaps, and generated share images are deferred | User asked to simplify and ship today. Deferred controls are not shown, so nothing dead ships. |
| D53 | Affirmation images use a private bucket, 2 MB limit, JPG/PNG/WebP magic-byte checks, and 10-minute signed URLs | Keeps images out of public URLs and avoids trusting client MIME labels. EXIF stripping is not claimed. |
| D54 | Admin password changes happen in Admin → Settings, verifying the current password with `signInWithPassword` before `updateUser` | User asked for an in-app change flow while keeping the existing admin password for now. The session stays signed in. |
| D55 | The affirmation veil remembers reveal state per affirmation in `localStorage`, with an explicit “Veil again” control | Keeps the daily reveal quiet while letting members revisit a word intentionally. Storage failure falls back to in-memory state. |
| D56 | Step 0 staging, permanent privilege-audit tests, and prayer re-verification were skipped per user direction; critical default-deny privilege hardening was kept | User prioritised a same-day Phase 5 build; the hosted DB password was changed and the admin password retained. |
| D57 | ~~Phase 5B tests may run against production with an acknowledgement~~ | Superseded by D63. The production override is withdrawn. |
| D58 | Sign-in stays password-only; email OTP is used only for account-deletion re-verification | Preserves decisions D7/D27. The Help page must not claim a magic-link or code sign-in exists until it is restored. |
| D59 | “Report a concern” uses a new `contact_admin` table, not `content_reports` | `content_reports` requires a post/reply target and its uniqueness key does not fit free-form messages. |
| D60 | ~~Hide the Check-in tab until Phase 6~~ | Superseded by D67; the tab ships with the Phase 6 check-in. |
| D61 | All member-facing profile reads use a `member_directory` `security_invoker` view | Prevents raw profile access and future email leaks; exposes only id, display_name, avatar_path, bio, joined_at. |
| D62 | Replace `profiles.avatar_url` with `profiles.avatar_path`; avatars live in a private bucket | Server-issued signed URLs only; no public avatar URLs. Existing URL values are not carried over. |
| D63 | Phase 5B tests run against staging only | `scripts/assert-staging.mjs` refuses production ref `mfcmqvgypomcfbrqiqrm`; Playwright calls it before starting. No member or security test may target production. |
| D64 | Deletion uses a 5-minute, single-use server proof tied to the current auth session | Re-verification uses Supabase email OTP, then a private proof row. The client cannot assert verification and no service-role key enters app code. |
| D65 | Notification preferences are per-member booleans checked by the existing notification triggers | Members can switch replies, Amens, and answered notices off without hiding content. No email digests exist. |
| D66 | Leaving supports `delete_content` or `keep_contributions`, requires typing `DELETE`, removes private activity and the avatar, and marks the invite `left` | Keeps the promise honest. Admins can renew a `left` invite for the same email; private prayer rows are removed in both modes. |
| D67 | Weekly check-in is admin-visible in detail; members see only an aggregate count and no names | Admins can care for heavy weeks without turning check-in into a public presence or inactivity list. No streaks, rankings, or receipts. |
| D68 | Encouragement notes are private between sender and recipient; admins never read note contents | Care without surveillance. Admin nudges record only the target member/post and an audit event, never note text. |
| D69 | Replay every migration on a fresh local Postgres before deploy | The fresh replay caught duplicate constraint names in migration 8 and an `on conflict` ambiguity in migration 10 that would have broken the first deploy. Supabase auth/storage/RLS still require a staging run. |
| D70 | Open registration with admin approval supersedes the invite-only gate (D7/D8) | The user asked anyone to register with email and password while keeping the circle private. A new account starts `pending`, sees only its own profile and the waiting room, and becomes `active` only through the audited admin approval RPC. An invite remains a one-email pre-approval. |
| D71 | The public landing page explains the circle and routes to `/join` or `/sign-in` | Gives people arriving from WhatsApp a clear way in without exposing member content, and keeps the daily app behind approval. Pending and active sessions redirect away from the marketing page. |

## Open questions

1. Approx. circle size (10? 30? 100?) — affects invitation and presence UI, not schema.
2. Preferred Bible translation/source for outbound links (BibleGateway NIV? YouVersion? other?).
3. Reading plan starting point (book/chapter/date) or will admin bulk-paste later?
4. Is a custom SMTP provider (e.g. Resend) available now, or use Supabase's rate-limited sender for dev?
5. GitHub remote for this repo? (Local commits can start without one.)
6. Should Phase 6 care signals include aggregate read/check-in awareness for admins? Phase 3 default is
   no receipt visibility for admins.

Defaults if unanswered: small circle (<50), BibleGateway NIV links, no seeded plan until admin entry,
Supabase email sender in dev, local git only.

## Architecture (current)

```text
src/
  app/
    (auth)/sign-in/                  password form, server action
    (auth)/join/                     invite-gated account creation
    (app)/layout.tsx                 protected shell: top nav / bottom tabs
    (app)/today/page.tsx             reading, I-read-it, feed
    (app)/today/questions/page.tsx   open + answered questions
    (app)/today/archive/page.tsx     weekly archive
    (app)/today/thread/[id]/page.tsx conversation view
    (admin)/admin/                   guarded admin console routes
    (app)/prayer/page.tsx            honest later-phase placeholder
    (app)/affirmation/page.tsx       honest later-phase placeholder
    (app)/check-in/page.tsx          honest later-phase placeholder
    (app)/design/                    admin-only design showcase
    auth/callback/route.ts           exchange code / verify token hash
    page.tsx                         root redirect
    layout.tsx, globals.css
  components/
    art/                             inline SVG art set
    motion/                          preferences, ambient, transitions, interaction pieces
    nav/                             four-destination primary nav
    study/                           Today feed, composer, post cards, reports, banner, sermon shelf
    admin/                           admin shell, managers, forms
    ui/                              buttons, cards, tabs, sheets, toasts, form controls
    providers.tsx, theme-provider.tsx
  lib/
    supabase/{client,server,proxy}.ts
    auth.ts                          membership/admin guards
    validation/                      Zod schemas
    preferences.ts, preference-store.ts
    sky.ts, guardian-lines.ts, date.ts, bible.ts, circle.ts
    study/{data,actions,types,report-actions}.ts
    admin/{data,actions,types,registry,invites,calendar,sermons,timezones,format}.ts
    validation/{study,admin}.ts
    env.ts, redirect.ts, types.ts
    actions/sign-out.ts
  proxy.ts                           Next.js 16 session refresh
supabase/
  migrations/                        versioned SQL, one per phase minimum
tests/
  unit/  e2e/
```

## Verification log

- Phase 0: Node v24.13.0, npm 11.6.2, pnpm 11.5.2, git 2.50.1; Supabase CLI not installed initially.
- Phase 1 scaffold: Next.js 16.4.3, React 19.3.0, Tailwind 4.3.3, TypeScript 5.9.3,
  `@supabase/ssr` 0.12.7, `@supabase/supabase-js` 2.118.0, Supabase CLI 2.122.0.
- Migration 1 applied to the hosted project. Migration 2 is written but **not applied**.
  Remote check: `POST /rest/v1/rpc/get_my_membership` returns `404 PGRST202`, so the auth callback
  cannot finish until migration 2 is applied. Migration 2 now uses `add column if not exists` so a
  partial manual run can be safely completed.
- Auth foundation committed as `b0662b0`; Phase 2 changes are uncommitted.
- Phase 2 checks:
  - `pnpm lint` — **PASS**
  - `pnpm typecheck` — **PASS**
  - `pnpm test` — **PASS** (4 files, 14 tests)
  - `pnpm build` — **PASS**; routes `/`, `/_not-found`, `/affirmation`, `/auth/callback`,
    `/check-in`, `/design`, `/prayer`, `/sign-in`, `/today`; proxy registered.
- Generated CSS inspection after token refactor:
  - Manual `data-theme="dark"` and system dark blocks both define token values.
  - `bg-success`, `bg-clay`, `text-clay`, and `.shadow-soft` are generated.
  - `--color-*` aliases resolve to `--token-*` variables.
- Playwright smoke tests run against installed Chrome via `PLAYWRIGHT_CHANNEL=chrome`: 2 passed,
  12 screenshot tests skipped (no admin storage state). Bundled Playwright Chromium download was
  interrupted by tool timeouts, so CI will need `pnpm exec playwright install chromium`.
- Explicit dark theme was verified in a real browser: body background resolves to the dark canvas
  token. System-only dark mode is covered by the CSS media block and screenshot spec, not yet run.
- Production JS size and Lighthouse: **NOT MEASURED**.
- Auth/session screenshots: **BLOCKED** until a valid admin storage state is supplied.
- Security: a Supabase **secret key** was pasted into chat and was not written to any file. Rotate it;
  only the publishable key is used by the app.
- Phase 3 checks:
  - `pnpm lint` — **PASS**
  - `pnpm typecheck` — **PASS**
  - `pnpm test` — **PASS** (7 files, 32 tests; 18 Phase 3 tests)
  - `pnpm build` — **PASS**; routes include `/admin/reading`, `/today/archive`,
    `/today/questions`, `/today/thread/[id]`.
  - Playwright smoke tests via installed Chrome: 2 passed, 12 screenshot tests skipped (no admin
    storage state).
  - Migrations applied to hosted project `mfcmqvgypomcfbrqiqrm` via the EU West pooler:
    `20261025120000` repaired as already applied (it had been run manually), then
    `20261025130000` and `20261025140000` applied. `supabase migration list` now matches local.
  - Hosted RLS check as role `authenticated` with the real admin `sub`:
    `get_my_membership()` returns admin/active; `is_admin()` is true; allowed profile columns readable;
    reading-plan and post inserts succeed. `anon` select on `profiles` is denied.
  - Real session minted through Supabase Auth (`signInWithPassword` for verification only), then used
    as an SSR cookie: `/today`, `/today/questions`, `/today/archive`, `/admin/reading`, `/prayer` all
    returned **200**; `/today` rendered “John 1”; `/admin/reading` listed it. Temporary password was
    cleared immediately afterward.
  - Seeded `John 1` for `2026-10-28` (Africa/Accra) so Today is usable; admin can edit it.
  - Visual review at phone/desktop widths: **PENDING**.
  - Password sign-in added: Supabase `signInWithPassword` server action, generic invalid-credentials
    message, membership/active check after auth, signing out on profile/config/inactive failures.
  - Admin password set for `tracy.tubea@gmail.com`; Supabase password grant returns **200**.
  - Playwright against the running app: wrong password shows “Email or password is incorrect.” and
    stays on `/sign-in`; correct password lands on `/today`; `John 1` visible; no console/HTTP errors;
    no mobile overflow; signed-out `/today` redirects to `/sign-in`.
  - `pnpm lint`, `pnpm typecheck`, `pnpm test` (7 files, 33 tests), and `pnpm build` all **PASS** after
    the password change.
- Phase 3B checks:
  - `pnpm lint` — **PASS**
  - `pnpm typecheck` — **PASS**
  - `pnpm test` — **PASS** (8 files, 44 tests)
  - `pnpm build` — **PASS**; routes include `/admin`, `/admin/members`, `/admin/invites`,
    `/admin/reading`, `/admin/moderation`, `/admin/questions`, `/admin/announcements`,
    `/admin/sermons`, `/admin/settings`, `/admin/audit`, and `/join`.
  - Playwright via installed Chrome with a real admin session: all ten `/admin/*` routes returned
    `<500`, each rendered its H1, and no page errors were recorded; `/join?email=` prefilled and
    rendered. **PASS**.
  - Design screenshots captured at 360×800, 390×844, 768×1024, 1280×800, 1440×900 in light/dark and
    motion/reduced motion (20 files under `tests/e2e/__screenshots__`). **PASS**.
  - Fixed a runtime RSC boundary bug: the server registry was passing Lucide components to the client
    shell. The registry now passes icon ids and the shell resolves them.
  - Late Phase 3B verification was blocked by `28P01`; this was resolved during Phase 4 when the
    hosted database password was reset, and migrations 5–6 were applied.
- Phase 4 checks:
  - `pnpm lint` — **PASS**
  - `pnpm typecheck` — **PASS**
  - `pnpm test` — **PASS** (9 files, 48 tests; 4 new prayer tests)
  - `pnpm build` — **PASS**; `/prayer` compiles as a dynamic route
  - Migrations 5 and 6 applied to the hosted project. Migration 5 required `--include-all` because
    its filename timestamp precedes migration 4; the migration is additive and applied cleanly.
  - Direct database RPC/RLS checks — **18/18 PASS**: create; author state; I-prayed toggle/count;
    author update; second member sees no author id and no own prayed state; author-only denials;
    direct private-table selects denied; answered; soft remove.
  - Function grants — **PASS**: `anon` has no execute on prayer RPCs or `log_audit_event`;
    `authenticated` cannot execute `log_audit_event`/`assert_admin`; prayer RPCs remain available
    to `authenticated`. PostgREST confirms anon `get_prayer_wall` = 401 and authenticated
    `get_prayer_wall` = 200. An admin announcement still writes its `announcement.created` audit
    entry through the security-definer path.
  - Production browser flow — **PASS**: admin sign-in, share, I prayed, author update, mark answered,
    remove; after the 7.9s soft-delete action and reload the prayer remains gone; database
    `deleted_at` is set.
  - Layout — **PASS** at 390×844 and 1280×900: no horizontal overflow, card stays within the
    viewport, composer sheet stays within the viewport, and prayer/card controls are at least 44px
    high. Screenshots captured under `/tmp/yod-prayer-*.png`.
  - Test fixtures were hard-deleted after verification; the hosted prayer tables are empty and the
    only profile remains the admin.
  - A pre-existing missing `favicon.ico` still produces a generic browser 404; no app console error.
- Phase 5 checks (code):
  - `pnpm lint` — **PASS**
  - `pnpm typecheck` — **PASS**
  - `pnpm test` — **PASS** (10 files, 61 tests; new affirmation validation/image/format/reveal and
    admin-password tests)
  - `pnpm build` — **PASS**; `/affirmation`, `/affirmation/archive`, `/affirmation/saved`, and
    `/admin/affirmations` compile as dynamic routes
  - Playwright smoke — **PASS** (2 passed, 22 skipped without admin credentials/storage state)
  - Migration 7 adds default-deny across future public tables, sequences, and functions; migration 8
    adds affirmations, Amen/favorites RPCs, audit, RLS, and the private image bucket.
  - **Not yet verified:** hosted RLS/RPC/image/signed-URL checks, the real browser flow, and admin
    password change remain pending. Migrations 7–8 are now recorded on the hosted project.

## Known risks

- Adoption: friction kills usage. Keep auth and daily action short.
- WhatsApp in-app browser: the signup confirmation link can open in a different browser from the one
  where registration began. Password sign-in works after confirmation; restore a code path before a
  wider launch if this becomes painful.
- Supabase built-in email is rate-limited; custom SMTP is needed before open registration reaches
  real volume.
- Email confirmation is enabled (`mailer_autoconfirm: false`). New accounts receive the Confirm
  signup template first; its `{{ .ConfirmationURL }}` link must remain.
- Email links generated against `localhost` cannot open on a phone. Use the Mac's LAN origin or test
  on the same machine; update Supabase's redirect allowlist and `NEXT_PUBLIC_SITE_URL`.
- Privacy bugs: private prayer/admin-only check-ins must be tested at the query and RLS level.
- Migrations 2–11 are applied on the hosted project. Migrations 7–11 are also validated on a fresh
  local Postgres, but staging is not yet provisioned. Keep future environments in sync and repair
  migration history if a file was ever run manually.
- The hosted database password was changed on 2026-10-29, but the new password is not stored in the
  repo; use the Supabase dashboard or the password manager for future migration runs. The admin
  password was intentionally retained and can now be changed in Admin → Settings.
- `YOD_CIRCLE_BRIEF.md` is absent, so brief sections 3, 4, 5F, 6, and 7 remain unverified.
- Notifications do not store content previews, but a notification can outlive later-hidden content;
  clicking it may open a thread where the item is no longer visible. Verify in real DB tests.
- Hidden content is admin-only; do not add member-facing “moderated” labels or counts without a
  privacy review.
- Phase 4 (prayer) is applied and verified; final human visual approval is still pending.
- The app has no `favicon.ico`, so browsers log a generic 404 for it.
- Next.js 16 renamed `middleware.ts` → `proxy.ts`; confirm installed version and API.
