"use client";

import { useState, type ReactNode } from "react";

import {
  Candle,
  Dove,
  GuardianWings,
  Halo,
  Lamp,
  LightRays,
  OliveBranch,
  OpenBook,
  Star,
  WingPair,
} from "@/components/art";
import {
  AffirmationVeil,
  AmenButton,
  AnsweredReveal,
  BlessingScreen,
  CandleLight,
  CircleCandles,
  GuardianAngel,
  LivingSky,
  PageTransition,
  PostAscend,
  PrayedButton,
  ThreadOfLight,
  VerseReveal,
} from "@/components/motion";
import {
  AdminNotice,
  AdminPageHeader,
  AdminSection,
} from "@/components/admin/page";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Divider } from "@/components/ui/divider";
import { EmptyState } from "@/components/ui/empty-state";
import { IconButton } from "@/components/ui/icon-button";
import { OverflowMenu } from "@/components/ui/overflow-menu";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Sheet } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Tabs } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { useMotionPreference } from "@/components/motion/motion-preference";
import { useTheme } from "@/components/theme-provider";
import { GUARDIAN_LINES } from "@/lib/guardian-lines";
import type { SkyPeriod } from "@/lib/sky";
import { cn } from "@/lib/cn";

const SWATCHES = [
  { name: "Canvas", token: "canvas", className: "bg-canvas" },
  { name: "Surface", token: "surface", className: "bg-surface" },
  { name: "Surface soft", token: "surface-soft", className: "bg-surface-soft" },
  { name: "Line", token: "line", className: "bg-line" },
  { name: "Ink", token: "ink", className: "bg-ink" },
  { name: "Ink soft", token: "ink-soft", className: "bg-ink-soft" },
  { name: "Forest", token: "forest", className: "bg-forest" },
  { name: "Sage", token: "sage", className: "bg-sage" },
  { name: "Sage soft", token: "sage-soft", className: "bg-sage-soft" },
  { name: "Gold", token: "gold", className: "bg-gold" },
  { name: "Gold soft", token: "gold-soft", className: "bg-gold-soft" },
  { name: "Clay", token: "clay", className: "bg-clay" },
  { name: "Success", token: "success", className: "bg-success" },
  { name: "Danger", token: "danger", className: "bg-danger" },
  { name: "Danger soft", token: "danger-soft", className: "bg-danger-soft" },
  { name: "Focus", token: "focus", className: "bg-focus" },
];

const PERIODS: SkyPeriod[] = ["dawn", "morning", "afternoon", "dusk", "night"];

function Section({
  id,
  eyebrow,
  title,
  description,
  children,
}: {
  id: string;
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-title`}
      className="scroll-mt-24 border-t border-line pt-10"
    >
      <p className="type-caption font-semibold text-gold">{eyebrow}</p>
      <h2 id={`${id}-title`} className="type-heading mt-2 text-ink">
        {title}
      </h2>
      <p className="mt-2 max-w-prose text-sm leading-relaxed text-ink-soft">
        {description}
      </p>
      <div className="mt-6 space-y-5">{children}</div>
    </section>
  );
}

function Swatch({
  name,
  token,
  className,
}: {
  name: string;
  token: string;
  className: string;
}) {
  return (
    <div className="rounded-soft border border-line bg-surface p-2.5">
      <div
        className={cn(
          "h-12 rounded-[calc(var(--radius-soft)-0.35rem)] border border-line/70",
          className,
        )}
      />
      <p className="mt-2 text-xs font-medium text-ink">{name}</p>
      <p className="text-[0.6875rem] text-ink-soft">--color-{token}</p>
    </div>
  );
}

function ArtTile({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-28 flex-col items-center justify-center gap-3 rounded-card border border-line bg-surface p-4 text-center">
      <div className="flex size-16 items-center justify-center text-gold">
        {children}
      </div>
      <span className="text-xs font-medium text-ink-soft">{label}</span>
    </div>
  );
}

export function DesignShowcase() {
  const [replay, setReplay] = useState(0);
  const [period, setPeriod] = useState<SkyPeriod>("dusk");
  const [answered, setAnswered] = useState(false);
  const [ascending, setAscending] = useState(false);
  const [guardian, setGuardian] = useState(true);
  const [blessingOpen, setBlessingOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [noteMode, setNoteMode] = useState("thought");

  const { mode, resolved, setMode } = useTheme();
  const {
    reduceMotion,
    systemReduced,
    preference,
    setReduceMotion,
    clearPreference,
  } = useMotionPreference();
  const { toast } = useToast();

  return (
    <div className="space-y-12">
      <header>
        <div className="flex flex-wrap items-center gap-2">
          <p className="type-caption font-semibold text-gold">
            Design system · Admin only
          </p>
          <Badge tone="gold">Living Light</Badge>
        </div>
        <h1 className="type-title mt-3 text-ink">A quiet visual language.</h1>
        <p className="mt-3 max-w-prose text-sm leading-relaxed text-ink-soft">
          Every surface, word, and movement is drawn for YOD Circle. Light
          reveals, answers, and accompanies. Nothing bounces. Nothing competes
          for attention.
        </p>
      </header>

      <Card variant="soft" padding="md" className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-ink">Preview controls</p>
            <p className="mt-0.5 text-xs text-ink-soft">
              Currently {mode === "system" ? `system (${resolved})` : mode}.
              {reduceMotion ? " Motion is reduced." : " Motion is active."}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="quiet"
              size="sm"
              onClick={() => setReplay((current) => current + 1)}
            >
              Replay all
            </Button>
            <OverflowMenu
              label="Jump to"
              items={[
                { href: "#palette", label: "Palette" },
                { href: "#type", label: "Type" },
                { href: "#controls", label: "Controls" },
                { href: "#art", label: "Art" },
                { href: "#motion", label: "Motion" },
                { href: "#sky", label: "Living sky" },
              ]}
            />
          </div>
        </div>

        <div className="grid gap-5 border-t border-line pt-4 md:grid-cols-2">
          <div>
            <p className="mb-2 text-xs font-medium text-ink-soft">Theme</p>
            <SegmentedControl
              label="Theme"
              value={mode}
              onChange={(value) =>
                setMode(value as "system" | "light" | "dark")
              }
              options={[
                { id: "light", label: "Light" },
                { id: "system", label: "System" },
                { id: "dark", label: "Dark" },
              ]}
            />
          </div>
          <div>
            <Switch
              label="Reduce motion"
              description={
                systemReduced
                  ? "Your device requests reduced motion. In-app motion cannot override it."
                  : "Ambient light rests. Every piece of content remains."
              }
              checked={reduceMotion}
              disabled={systemReduced}
              onCheckedChange={setReduceMotion}
            />
            {preference !== null && !systemReduced ? (
              <button
                type="button"
                onClick={clearPreference}
                className="mt-2 text-xs font-medium text-link underline-offset-4 hover:underline"
              >
                Use my device setting
              </button>
            ) : null}
          </div>
        </div>
      </Card>

      <Section
        id="palette"
        eyebrow="01 · Foundations"
        title="Palette and surfaces"
        description="Warm cream, forest green, sage, and a restrained muted gold. Dark mode is deep green-black, never grey. Every token resolves with light-dark() from the device or the in-app choice."
      >
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {SWATCHES.map((swatch) => (
            <Swatch key={swatch.token} {...swatch} />
          ))}
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-card border border-line bg-surface p-4">
            <p className="type-caption text-ink-soft">Soft radius</p>
            <div className="mt-3 h-14 rounded-soft bg-sage-soft" />
          </div>
          <div className="rounded-card border border-line bg-surface p-4">
            <p className="type-caption text-ink-soft">Card radius</p>
            <div className="mt-3 h-14 rounded-card bg-gold-soft" />
          </div>
          <div className="rounded-card border border-line bg-surface p-4">
            <p className="type-caption text-ink-soft">Warm shadow</p>
            <div className="mt-3 h-14 rounded-soft border border-line bg-surface shadow-soft" />
          </div>
        </div>

        <div className="flex flex-wrap gap-2 text-xs text-ink-soft">
          {[
            "press · 120ms",
            "quick · 240ms",
            "settle · 480ms",
            "slow · 900ms",
          ].map((item) => (
            <span
              key={item}
              className="rounded-full border border-line bg-surface px-3 py-1"
            >
              {item}
            </span>
          ))}
        </div>
      </Section>

      <Section
        id="type"
        eyebrow="02 · Typography"
        title="Serif for reverence, sans for the hand"
        description="Fraunces carries Scripture, headings, and blessings. Inter carries controls, labels, and the ordinary work of showing up."
      >
        <div className="space-y-5 rounded-card border border-line bg-surface p-5 sm:p-7">
          <p className="type-display text-ink">Living light</p>
          <p className="type-title text-ink">A word for today</p>
          <p className="type-heading text-ink">The circle is ready.</p>
          <p className="type-scripture text-ink">
            “Your word is a lamp to my feet and a light to my path.”
          </p>
          <p className="type-body max-w-prose text-ink-soft">
            This is body text for reflections and care. It stays quiet, generous,
            and easy to read on a phone in the middle of a day.
          </p>
          <p className="type-caption text-gold">Caption · small and steady</p>
        </div>
      </Section>

      <Section
        id="controls"
        eyebrow="03 · Controls"
        title="One primary action at a time"
        description="Tap targets are at least 44px. Focus rings are visible. Loading is announced. Nothing depends on hover alone."
      >
        <div className="flex flex-wrap items-center gap-3">
          <Button>Primary</Button>
          <Button variant="quiet">Quiet</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="danger">Danger</Button>
          <Button loading>Working</Button>
          <Button disabled>Disabled</Button>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button size="sm">Small</Button>
          <Button size="md">Medium</Button>
          <Button size="lg">Large</Button>
          <ButtonLink href="/today" variant="quiet">
            Link button
          </ButtonLink>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <IconButton label="Search" variant="quiet">
            <svg
              aria-hidden
              viewBox="0 0 24 24"
              className="size-5"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.7}
              strokeLinecap="round"
            >
              <circle cx="11" cy="11" r="6.5" />
              <path d="m16 16 4 4" />
            </svg>
          </IconButton>
          <IconButton label="Add" variant="primary">
            <svg
              aria-hidden
              viewBox="0 0 24 24"
              className="size-5"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.7}
              strokeLinecap="round"
            >
              <path d="M12 5v14M5 12h14" />
            </svg>
          </IconButton>
          <IconButton label="Disabled action" disabled>
            <Star size={20} className="text-ink-soft" />
          </IconButton>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <Card>
            <p className="mb-3 text-sm font-medium text-ink">Tabs</p>
            <Tabs
              label="Reflection type"
              defaultValue="thought"
              items={[
                {
                  id: "thought",
                  label: "Thought",
                  content: (
                    <p className="text-sm leading-relaxed text-ink-soft">
                      A thought is a small beginning. The gold line moves with
                      the selected tab and the panel keeps its reading rhythm.
                    </p>
                  ),
                },
                {
                  id: "question",
                  label: "Question",
                  content: (
                    <p className="text-sm leading-relaxed text-ink-soft">
                      A question makes room. One clear prompt, no scores, no
                      pressure to perform.
                    </p>
                  ),
                },
              ]}
            />
          </Card>

          <Card>
            <p className="mb-3 text-sm font-medium text-ink">
              Segmented control
            </p>
            <SegmentedControl
              label="Note type"
              value={noteMode}
              onChange={setNoteMode}
              options={[
                { id: "thought", label: "Thought" },
                { id: "question", label: "Question" },
              ]}
            />
            <p className="mt-3 text-sm text-ink-soft">
              Selected: {noteMode}
            </p>
          </Card>
        </div>
      </Section>

      <Section
        id="form"
        eyebrow="04 · Writing"
        title="Room to think, with a gentle edge"
        description="The textarea counts live and makes room for a full thought without shouting. Limits are enforced on the server later; this is the visual contract."
      >
        <Card>
          <Textarea
            label="A reflection"
            hint="Private by default. Only you and the circle see what you choose to share."
            placeholder="What is resting on your heart today?"
            maxLength={280}
          />
        </Card>
      </Section>

      <Section
        id="surfaces"
        eyebrow="05 · Surfaces"
        title="Cards, badges, dividers, and quiet states"
        description="Surfaces hold content without becoming containers for anxiety. Empty states are honest, not pressuring."
      >
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader
              eyebrow="Today"
              title="A small beginning"
              description="The default card carries the daily action."
            />
          </Card>
          <Card variant="soft">
            <CardHeader
              eyebrow="Prayer"
              title="Held in confidence"
              description="Soft cards are for reflection and care."
            />
          </Card>
          <Card variant="gold">
            <CardHeader
              eyebrow="Answered"
              title="A remembered light"
              description="Gold is used sparingly for moments worth marking."
            />
          </Card>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Badge>Neutral</Badge>
          <Badge tone="sage">Sage</Badge>
          <Badge tone="gold">Gold</Badge>
          <Badge tone="danger">Danger</Badge>
          <Badge tone="gold" size="md">
            Answered
          </Badge>
        </div>

        <Divider label="A quiet pause" ornament />

        <div className="flex items-center gap-3">
          <Avatar name="Abena Mensah" />
          <Avatar name="Kwame Boateng" size="lg" />
          <Avatar name="Yaa" size="sm" />
          <div className="text-sm text-ink-soft">
            Initials are stable and warm. Photos are optional.
          </div>
        </div>

        <EmptyState
          eyebrow="Nothing yet"
          title="This space is ready."
          description="When the circle begins, this is where a gentle prompt will appear. There is no streak to keep."
          action={
            <ButtonLink href="/today" variant="quiet" size="sm">
              Return to Today
            </ButtonLink>
          }
        />

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <p className="mb-3 text-sm font-medium text-ink">Loading</p>
            <Skeleton lines={3} />
          </Card>
          <Card>
            <p className="mb-3 text-sm font-medium text-ink">Avatar skeleton</p>
            <div className="flex items-center gap-3">
              <Skeleton variant="circle" announce={false} />
              <div className="flex-1">
                <Skeleton lines={2} announce={false} />
              </div>
            </div>
          </Card>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button variant="quiet" size="sm" onClick={() => setSheetOpen(true)}>
            Open sheet
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              toast({
                title: "Quiet reminder",
                description: "No streaks. Just a place to show up.",
                tone: "gold",
              })
            }
          >
            Show toast
          </Button>
        </div>
      </Section>

      <Section
        id="art"
        eyebrow="06 · Drawn art"
        title="Reverent, abstract, and made here"
        description="Single-weight lines, no faces, no stock icons. Every piece is inline SVG and can draw itself once with pathLength."
      >
        <div
          key={replay}
          className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4"
        >
          <ArtTile label="WingPair">
            <WingPair size={56} animated open />
          </ArtTile>
          <ArtTile label="Dove · rest">
            <Dove size={56} animated flap="rest" />
          </ArtTile>
          <ArtTile label="Dove · up">
            <Dove size={56} animated flap="up" />
          </ArtTile>
          <ArtTile label="Halo">
            <Halo size={56} animated />
          </ArtTile>
          <ArtTile label="Candle · lit">
            <Candle size={56} lit animated />
          </ArtTile>
          <ArtTile label="Candle · unlit">
            <Candle size={56} />
          </ArtTile>
          <ArtTile label="LightRays">
            <LightRays size={56} animated />
          </ArtTile>
          <ArtTile label="OliveBranch">
            <OliveBranch size={56} animated />
          </ArtTile>
          <ArtTile label="OpenBook">
            <OpenBook size={56} animated />
          </ArtTile>
          <ArtTile label="Star">
            <Star size={56} animated />
          </ArtTile>
          <ArtTile label="Lamp · lit">
            <Lamp size={56} lit animated />
          </ArtTile>
          <ArtTile label="GuardianWings">
            <GuardianWings size={56} animated />
          </ArtTile>
        </div>
      </Section>

      <Section
        id="motion"
        eyebrow="07 · Motion"
        title="Light arrives, answers, and accompanies"
        description="Interactions settle in under 600ms. Ambient light drifts slowly. Every effect has a text or ARIA equivalent, and reduced motion preserves all content."
      >
        <div className="flex flex-wrap items-center gap-3">
          <AmenButton />
          <PrayedButton />
          <CandleLight />
          <CircleCandles total={7} lit={3} />
        </div>

        <Card variant="soft">
          <p className="type-caption font-semibold text-gold">Thread of light</p>
          <p className="mt-1 text-sm text-ink-soft">
            A thin gold line ties a prayer to the reflection it belongs to.
          </p>
          <div key={replay}>
            <ThreadOfLight animated label="Thread of light" />
          </div>
        </Card>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <p className="mb-3 text-sm font-medium text-ink">Answered</p>
            <Button
              variant="quiet"
              size="sm"
              onClick={() => setAnswered((current) => !current)}
            >
              {answered ? "Reset" : "Mark answered"}
            </Button>
            <div className="mt-4">
              <AnsweredReveal answered={answered}>
                <Card variant="soft" padding="sm">
                  <p className="text-sm leading-relaxed text-ink">
                    A prayer for patience, remembered with gratitude.
                  </p>
                </Card>
              </AnsweredReveal>
            </div>
          </Card>

          <Card>
            <p className="mb-3 text-sm font-medium text-ink">Verse reveal</p>
            <VerseReveal key={`verse-${replay}`}>
              <div className="rounded-soft border border-line bg-surface p-4">
                <p className="type-scripture text-ink">
                  “Let your light shine before others.”
                </p>
                <p className="type-caption mt-3 text-gold">Matthew 5:16</p>
              </div>
            </VerseReveal>
          </Card>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <AffirmationVeil key={`veil-${replay}`}>
            <Card variant="gold" padding="lg">
              <p className="type-caption font-semibold text-gold">
                Today&apos;s affirmation
              </p>
              <p className="type-scripture mt-3 text-ink">
                You are loved, not measured.
              </p>
              <p className="mt-3 text-sm text-ink-soft">
                A quiet word for the middle of the day.
              </p>
            </Card>
          </AffirmationVeil>

          <Card>
            <p className="mb-3 text-sm font-medium text-ink">Post ascend</p>
            <Button
              variant="quiet"
              size="sm"
              disabled={ascending}
              onClick={() => setAscending(true)}
            >
              {ascending ? "Ascending…" : "Send a prayer"}
            </Button>
            <div className="mt-4">
              <PostAscend
                active={ascending}
                onComplete={() => setAscending(false)}
              >
                <Card variant="soft" padding="sm">
                  <p className="text-sm leading-relaxed text-ink">
                    Please hold my family in your peace.
                  </p>
                </Card>
              </PostAscend>
            </div>
          </Card>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <p className="mb-3 text-sm font-medium text-ink">Guardian</p>
            {guardian ? (
              <GuardianAngel
                line={GUARDIAN_LINES[2]}
                onDismiss={() => setGuardian(false)}
              />
            ) : (
              <Button
                variant="quiet"
                size="sm"
                onClick={() => setGuardian(true)}
              >
                Show guardian
              </Button>
            )}
          </Card>

          <Card>
            <p className="mb-3 text-sm font-medium text-ink">Blessing screen</p>
            <p className="text-sm leading-relaxed text-ink-soft">
              A full-screen return moment. Focus is trapped, Escape closes, and
              the previous focus is restored.
            </p>
            <Button
              variant="quiet"
              size="sm"
              className="mt-4"
              onClick={() => setBlessingOpen(true)}
            >
              Open blessing
            </Button>
          </Card>
        </div>

        <Card>
          <p className="mb-3 text-sm font-medium text-ink">
            Page transition
          </p>
          <PageTransition key={`page-${replay}`}>
            <div className="rounded-soft border border-line bg-surface-soft p-4 text-sm text-ink-soft">
              Pages arrive with a small rise and fade. The header stays still.
            </div>
          </PageTransition>
        </Card>
      </Section>

      <Section
        id="sky"
        eyebrow="08 · Living sky"
        title="Time of day, held gently"
        description="The sky is a slow ambient field, not a dashboard. It pauses when the tab is hidden or the element is off-screen, and it rests entirely under reduced motion."
      >
        <div className="flex flex-wrap gap-2">
          {PERIODS.map((item) => (
            <button
              key={item}
              type="button"
              aria-pressed={period === item}
              onClick={() => setPeriod(item)}
              className={cn(
                "min-h-10 rounded-full border px-3 text-xs font-medium capitalize transition",
                period === item
                  ? "border-gold/50 bg-gold-soft text-ink"
                  : "border-line bg-surface text-ink-soft hover:text-ink",
              )}
            >
              {item}
            </button>
          ))}
        </div>

        <div className="relative h-64 overflow-hidden rounded-card border border-line bg-canvas">
          <LivingSky contained period={period} className="opacity-100" />
          <div className="relative z-10 flex h-full flex-col justify-end p-6">
            <p className="type-caption font-semibold text-gold">Today</p>
            <p className="type-heading mt-2 text-ink">
              The {period} sky over the circle.
            </p>
            <p className="mt-1 max-w-sm text-sm text-ink-soft">
              Light drifts. Gold motes rise. Nothing needs your attention.
            </p>
          </div>
        </div>
      </Section>

      <Section
        id="notices"
        eyebrow="09 · Notices"
        title="Transient moments"
        description="Toasts and sheets are notices, not destinations. Both are dismissible, keyboard-safe, and never the only way to reach a required action."
      >
        <div className="flex flex-wrap gap-3">
          <Button variant="quiet" size="sm" onClick={() => setSheetOpen(true)}>
            Open sheet again
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              toast({
                title: "A gentle notice",
                description: "The circle is quiet today.",
              })
            }
          >
            Neutral toast
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              toast({
                title: "Something needs attention",
                description: "This is a design-only alert tone.",
                tone: "danger",
              })
            }
          >
            Danger toast
          </Button>
        </div>
      </Section>

      <Section
        id="admin"
        eyebrow="10 · Admin"
        title="Care, with a quiet hand"
        description="The console uses the same warm materials as the member app, with a slimmer rail and a little more density. Admin-only surfaces still read as a place of care, not a control room."
      >
        <div className="overflow-hidden rounded-card border border-line bg-surface">
          <div className="grid gap-0 md:grid-cols-[13rem_1fr]">
            <div className="border-b border-line bg-surface-soft p-4 md:border-r md:border-b-0">
              <p className="font-serif text-sm text-ink">YOD Circle</p>
              <div className="mt-4 space-y-1 text-xs">
                {["Overview", "Members", "Invites", "Moderation", "Settings"].map(
                  (item, index) => (
                    <p
                      key={item}
                      className={cn(
                        "relative rounded-lg px-3 py-2",
                        index === 0
                          ? "bg-sage-soft font-medium text-forest"
                          : "text-ink-soft",
                      )}
                    >
                      {index === 0 ? (
                        <span className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-gold" />
                      ) : null}
                      {item}
                    </p>
                  ),
                )}
              </div>
            </div>
            <div className="space-y-6 p-5 sm:p-7">
              <AdminPageHeader
                eyebrow="Moderation"
                title="Care, not surveillance."
                description="Reports are a quiet signal from members. Read the context, hide only what needs hiding, and write a short reason for the record."
              />
              <AdminSection title="Open reports" description="Two reports need a gentle look.">
                <AdminNotice tone="gold" title="A member flagged a reply">
                  Read the whole thread before deciding. The note is kept in the
                  audit log.
                </AdminNotice>
              </AdminSection>
            </div>
          </div>
        </div>
      </Section>

      <footer className="border-t border-line pt-6 text-xs leading-relaxed text-ink-soft">
        <p>
          All art is inline SVG drawn for YOD Circle. No third-party imagery, no
          faces, no stock icons. Motion is transform and opacity only.
        </p>
      </footer>

      <Sheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title="A small note"
        description="This sheet is a native dialog. Focus stays inside until it closes."
        footer={
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="ghost" onClick={() => setSheetOpen(false)}>
              Not now
            </Button>
            <Button onClick={() => setSheetOpen(false)}>Keep</Button>
          </div>
        }
      >
        <Textarea
          label="What would you like to remember?"
          hint="A design-only field. Nothing is saved."
          placeholder="A quiet thought…"
          maxLength={140}
        />
      </Sheet>

      <BlessingScreen
        open={blessingOpen}
        onClose={() => setBlessingOpen(false)}
        line={GUARDIAN_LINES[4]}
      />
    </div>
  );
}
