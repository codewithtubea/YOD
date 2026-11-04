"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, m, useReducedMotion } from "motion/react";
import {
  ArrowLeft,
  BookOpenText,
  CornerDownLeft,
  FileClock,
  HeartHandshake,
  LogOut,
  Megaphone,
  Menu,
  MessageCircleQuestion,
  Search,
  Settings2,
  ShieldCheck,
  Sparkles,
  UserPlus,
  Users,
  Video,
  X,
  type LucideIcon,
} from "lucide-react";

import { Avatar } from "@/components/ui/avatar";
import { Sheet } from "@/components/ui/sheet";
import { cn } from "@/lib/cn";
import { signOut } from "@/lib/actions/sign-out";
import {
  activeAdminModule,
  type AdminModule,
} from "@/lib/admin/registry";
import {
  ADMIN_COMMANDS,
  adminCommandMatches,
  type AdminCommand,
} from "@/lib/features";
import type { Membership } from "@/lib/types";

const MODULE_ICONS: Record<AdminModule["icon"], LucideIcon> = {
  overview: ShieldCheck,
  members: Users,
  care: HeartHandshake,
  reading: BookOpenText,
  affirmations: Sparkles,
  moderation: ShieldCheck,
  questions: MessageCircleQuestion,
  announcements: Megaphone,
  sermons: Video,
  settings: Settings2,
  audit: FileClock,
};

const COMMAND_ICONS: Record<string, LucideIcon> = {
  "add-reading": BookOpenText,
  "invite-someone": UserPlus,
  "write-announcement": Megaphone,
  "write-affirmation": Sparkles,
  "add-sermon": Video,
  "review-waiting": Users,
  "answer-questions": MessageCircleQuestion,
  "review-reports": ShieldCheck,
};

type PaletteItem = {
  id: string;
  label: string;
  href: string;
  description: string;
  synonyms: string[];
  group: string;
  icon: LucideIcon;
  kind: "page" | "action";
};

function Brand() {
  return (
    <Link
      href="/admin"
      className="inline-flex items-center gap-2 font-serif text-lg tracking-tight text-ink"
    >
      <span
        aria-hidden
        className="block size-2.5 rounded-full bg-gold shadow-[0_0_18px_4px] shadow-gold/25"
      />
      YOD <span className="text-gold">Circle</span>
    </Link>
  );
}

function NavLink({
  module,
  active,
  onNavigate,
}: {
  module: AdminModule;
  active: boolean;
  onNavigate?: () => void;
}) {
  const reduceMotion = useReducedMotion();
  const Icon = MODULE_ICONS[module.icon];

  return (
    <Link
      href={module.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        "relative flex min-h-10 items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors duration-quick",
        active
          ? "bg-sage-soft text-forest dark:text-ink"
          : "text-ink-soft hover:bg-surface-soft hover:text-ink",
      )}
    >
      {active ? (
        <m.span
          layoutId="admin-active-marker"
          className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-gold"
          transition={
            reduceMotion
              ? { duration: 0 }
              : { type: "spring", stiffness: 420, damping: 36 }
          }
        />
      ) : null}
      <Icon
        aria-hidden
        size={20}
        strokeWidth={1.5}
        className={active ? "text-gold" : "text-ink-soft"}
      />
      <span className="min-w-0 flex-1 truncate">{module.label}</span>
      {module.badgeCount ? (
        <span className="tabular rounded-full bg-gold-soft px-2 py-0.5 text-[0.6875rem] font-semibold text-gold">
          {module.badgeCount}
        </span>
      ) : null}
    </Link>
  );
}

function NavList({
  modules,
  pathname,
  onNavigate,
}: {
  modules: AdminModule[];
  pathname: string;
  onNavigate?: () => void;
}) {
  const activeId = activeAdminModule(pathname);
  const overview = modules.find((module) => module.id === "overview");
  const groups = modules
    .filter((module) => module.id !== "overview" && module.group)
    .reduce<{ label: string; items: AdminModule[] }[]>((result, module) => {
      const label = module.group as string;
      const existing = result.find((group) => group.label === label);
      if (existing) existing.items.push(module);
      else result.push({ label, items: [module] });
      return result;
    }, []);

  return (
    <nav aria-label="Admin" className="space-y-5">
      {overview ? (
        <NavLink
          module={overview}
          active={overview.id === activeId}
          onNavigate={onNavigate}
        />
      ) : null}

      {groups.map((group) => (
        <div key={group.label}>
          <p className="px-3 pb-1.5 text-[0.625rem] font-semibold uppercase tracking-[0.16em] text-ink-soft/60">
            {group.label}
          </p>
          <div className="space-y-1">
            {group.items.map((module) => (
              <NavLink
                key={module.id}
                module={module}
                active={module.id === activeId}
                onNavigate={onNavigate}
              />
            ))}
          </div>
        </div>
      ))}
    </nav>
  );
}

function Sidebar({
  modules,
  membership,
  onSearch,
}: {
  modules: AdminModule[];
  membership: Membership;
  onSearch: () => void;
}) {
  const pathname = usePathname();

  return (
    <aside className="admin-sidebar fixed inset-y-0 left-0 z-30 hidden flex-col border-r border-line bg-canvas/95 px-4 pb-5 pt-6 md:flex">
      <div className="px-3">
        <Brand />
        <p className="mt-2 text-[0.6875rem] font-medium uppercase tracking-[0.16em] text-ink-soft/70">
          Admin
        </p>
      </div>

      <button
        type="button"
        onClick={onSearch}
        className="mt-7 flex min-h-10 items-center gap-2.5 rounded-xl border border-line bg-surface/70 px-3 text-left text-sm text-ink-soft transition hover:border-sage hover:text-ink"
      >
        <Search aria-hidden size={17} strokeWidth={1.5} />
        <span className="flex-1">Jump to…</span>
        <kbd className="rounded border border-line bg-canvas px-1.5 py-0.5 font-mono text-[0.625rem] text-ink-soft">
          ⌘K
        </kbd>
      </button>

      <div className="admin-scroll mt-6 flex-1 overflow-y-auto">
        <NavList modules={modules} pathname={pathname} />
      </div>

      <div className="border-t border-line pt-4">
        <div className="flex items-center gap-3 px-2">
          <Avatar name={membership.display_name} size="sm" />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-ink">
              {membership.display_name}
            </p>
            <p className="text-xs text-ink-soft">Administrator</p>
          </div>
        </div>
        <Link
          href="/today"
          className="mt-3 flex min-h-10 items-center gap-2.5 rounded-xl px-3 text-sm text-ink-soft transition hover:bg-surface-soft hover:text-ink"
        >
          <ArrowLeft aria-hidden size={17} strokeWidth={1.5} />
          Back to Today
        </Link>
        <form action={signOut}>
          <button
            type="submit"
            className="flex min-h-10 w-full items-center gap-2.5 rounded-xl px-3 text-sm text-ink-soft transition hover:bg-surface-soft hover:text-ink"
          >
            <LogOut aria-hidden size={17} strokeWidth={1.5} />
            Sign out
          </button>
        </form>
      </div>
    </aside>
  );
}

function MobileTopbar({
  membership,
  onMenu,
  onSearch,
}: {
  membership: Membership;
  onMenu: () => void;
  onSearch: () => void;
}) {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-line bg-canvas/95 px-5 backdrop-blur md:hidden">
      <Brand />
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={onSearch}
          aria-label="Jump to an admin page"
          className="inline-flex size-10 items-center justify-center rounded-full text-ink-soft transition hover:bg-surface-soft hover:text-ink"
        >
          <Search aria-hidden size={20} strokeWidth={1.5} />
        </button>
        <button
          type="button"
          onClick={onMenu}
          aria-label="Open admin menu"
          className="inline-flex size-10 items-center justify-center rounded-full text-ink-soft transition hover:bg-surface-soft hover:text-ink"
        >
          <Menu aria-hidden size={21} strokeWidth={1.5} />
        </button>
        <Avatar name={membership.display_name} size="sm" />
      </div>
    </header>
  );
}

function CommandPalette({
  open,
  onClose,
  modules,
}: {
  open: boolean;
  onClose: () => void;
  modules: AdminModule[];
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState(0);
  const reduceMotion = useReducedMotion();

  const pages: PaletteItem[] = modules.map((module) => ({
    id: module.id,
    label: module.label,
    href: module.href,
    description: module.description,
    synonyms: module.synonyms,
    group: module.group ?? "Admin",
    icon: MODULE_ICONS[module.icon],
    kind: "page",
  }));
  const actions: PaletteItem[] = ADMIN_COMMANDS.map((command: AdminCommand) => ({
    id: command.id,
    label: command.label,
    href: command.href,
    description: command.description,
    synonyms: command.synonyms,
    group: "Actions",
    icon: COMMAND_ICONS[command.id] ?? CornerDownLeft,
    kind: "action",
  }));
  const items = [...pages, ...actions];

  const filtered = items.filter((item) => adminCommandMatches(item, query));

  const safeCursor = filtered.length
    ? Math.min(cursor, filtered.length - 1)
    : 0;

  function choose(index: number) {
    const item = filtered[index];
    if (!item) return;
    onClose();
    router.push(item.href);
  }

  return (
    <AnimatePresence>
      {open ? (
        <m.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduceMotion ? 0 : 0.18 }}
          className="fixed inset-0 z-50 bg-forest/25 px-4 pt-[12vh] backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) onClose();
          }}
        >
          <m.div
            role="dialog"
            aria-modal="true"
            aria-label="Admin command palette"
            initial={{ opacity: 0, y: -10, scale: 0.99 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.99 }}
            transition={{ duration: reduceMotion ? 0 : 0.22 }}
            className="mx-auto w-full max-w-xl overflow-hidden rounded-2xl border border-line bg-surface shadow-2xl shadow-forest/15"
          >
            <div className="flex items-center gap-3 border-b border-line px-4">
              <Search aria-hidden size={18} strokeWidth={1.5} className="text-ink-soft" />
              <input
                ref={inputRef}
                autoFocus
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setCursor(0);
                }}
                onKeyDown={(event) => {
                  if (event.key === "Escape") onClose();
                  if (event.key === "ArrowDown") {
                    event.preventDefault();
                    setCursor((current) =>
                      filtered.length ? (current + 1) % filtered.length : 0,
                    );
                  }
                  if (event.key === "ArrowUp") {
                    event.preventDefault();
                    setCursor((current) =>
                      filtered.length
                        ? (current - 1 + filtered.length) % filtered.length
                        : 0,
                    );
                  }
                  if (event.key === "Enter") {
                    event.preventDefault();
                    choose(safeCursor);
                  }
                }}
                placeholder="Search pages and actions…"
                aria-label="Search admin pages and actions"
                className="h-14 w-full bg-transparent text-base text-ink outline-none placeholder:text-ink-soft/60"
              />
              <button
                type="button"
                onClick={onClose}
                aria-label="Close command palette"
                className="inline-flex size-9 items-center justify-center rounded-full text-ink-soft hover:bg-surface-soft hover:text-ink"
              >
                <X aria-hidden size={17} strokeWidth={1.5} />
              </button>
            </div>
            <ul className="max-h-80 overflow-y-auto p-2">
              {filtered.length === 0 ? (
                <li className="px-3 py-8 text-center text-sm text-ink-soft">
                  No admin page or action matches that.
                </li>
              ) : (
                filtered.map((item, index) => {
                  const Icon = item.icon;
                  return (
                    <li key={`${item.kind}-${item.id}`}>
                      <button
                        type="button"
                        onMouseEnter={() => setCursor(index)}
                        onClick={() => choose(index)}
                        className={cn(
                          "flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm transition",
                          index === cursor
                            ? "bg-sage-soft text-ink"
                            : "text-ink-soft hover:bg-surface-soft hover:text-ink",
                        )}
                      >
                        <Icon
                          aria-hidden
                          size={18}
                          strokeWidth={1.5}
                          className={index === cursor ? "text-gold" : ""}
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate">{item.label}</span>
                          <span className="mt-0.5 block truncate text-xs text-ink-soft">
                            {item.description}
                          </span>
                        </span>
                        {item.kind === "action" ? (
                          <span className="rounded-full bg-gold-soft px-2 py-0.5 text-[0.625rem] font-semibold uppercase tracking-wide text-gold">
                            Action
                          </span>
                        ) : (
                          <span className="text-[0.625rem] uppercase tracking-wide text-ink-soft/70">
                            {item.group}
                          </span>
                        )}
                        {index === cursor ? (
                          <CornerDownLeft
                            aria-hidden
                            size={14}
                            className="text-ink-soft"
                          />
                        ) : null}
                      </button>
                    </li>
                  );
                })
              )}
            </ul>
          </m.div>
        </m.div>
      ) : null}
    </AnimatePresence>
  );
}

export function AdminShell({
  modules,
  membership,
  children,
}: {
  modules: AdminModule[];
  membership: Membership;
  children: ReactNode;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setPaletteOpen((current) => !current);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <div className="relative min-h-dvh bg-canvas">
      <a
        href="#admin-main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-surface focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-ink focus:outline-2 focus:outline-focus"
      >
        Skip to content
      </a>

      <Sidebar
        modules={modules}
        membership={membership}
        onSearch={() => setPaletteOpen(true)}
      />

      <div className="md:pl-[15.5rem]">
        <MobileTopbar
          membership={membership}
          onMenu={() => setMenuOpen(true)}
          onSearch={() => setPaletteOpen(true)}
        />
        <main id="admin-main" className="admin-page">
          <div className="mx-auto admin-content">{children}</div>
        </main>
      </div>

      <Sheet
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        title="Admin"
        description="Manage the circle with care."
        className="h-[calc(100dvh-1rem)] max-w-none rounded-t-sheet sm:max-w-none"
        footer={
          <div className="space-y-2 border-t border-line pt-4">
            <Link
              href="/today"
              className="flex min-h-11 items-center gap-2.5 rounded-xl px-3 text-sm text-ink-soft hover:bg-surface-soft hover:text-ink"
            >
              <ArrowLeft aria-hidden size={17} strokeWidth={1.5} />
              Back to Today
            </Link>
            <form action={signOut}>
              <button
                type="submit"
                className="flex min-h-11 w-full items-center gap-2.5 rounded-xl px-3 text-sm text-ink-soft hover:bg-surface-soft hover:text-ink"
              >
                <LogOut aria-hidden size={17} strokeWidth={1.5} />
                Sign out
              </button>
            </form>
          </div>
        }
      >
        <button
          type="button"
          onClick={() => {
            setMenuOpen(false);
            setPaletteOpen(true);
          }}
          className="mb-4 flex min-h-11 w-full items-center gap-2.5 rounded-xl border border-line bg-surface-soft/60 px-3 text-left text-sm text-ink-soft"
        >
          <Search aria-hidden size={17} strokeWidth={1.5} />
          Jump to…
        </button>
        <NavList
          modules={modules}
          pathname={pathname}
          onNavigate={() => setMenuOpen(false)}
        />
      </Sheet>

      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        modules={modules}
      />
    </div>
  );
}
