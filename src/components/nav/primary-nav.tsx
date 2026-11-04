"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { CSSProperties } from "react";
import { Menu, Users } from "lucide-react";

import { Candle } from "@/components/art/candle";
import { OpenBook } from "@/components/art/open-book";
import { Star } from "@/components/art/star";
import { TabIndicator } from "@/components/motion/tab-indicator";
import { cn } from "@/lib/cn";
import {
  MEMBER_PRIMARY_NAV,
  memberNavActiveId,
  type MemberNavItem,
} from "@/lib/features";

function NavIcon({
  item,
  active,
  size,
}: {
  item: MemberNavItem;
  active: boolean;
  size: number;
}) {
  const className = active ? "text-gold" : "text-ink-soft";

  if (item.icon === "prayer") {
    return <Candle size={size} lit={active} className={className} />;
  }

  if (item.icon === "today") {
    return <OpenBook size={size} className={className} />;
  }

  if (item.icon === "affirmation") {
    return <Star size={size} className={className} />;
  }

  if (item.icon === "circle") {
    return <Users aria-hidden size={size} strokeWidth={1.5} className={className} />;
  }

  return <Menu aria-hidden size={size} strokeWidth={1.5} className={className} />;
}

function NavBadge({
  item,
  encouragementUnread,
  attention,
}: {
  item: MemberNavItem;
  encouragementUnread: number;
  attention: boolean;
}) {
  if (item.badge === "encouragement" && encouragementUnread > 0) {
    return (
      <>
        <span
          aria-hidden
          className="tabular absolute right-2 top-1.5 min-w-4 rounded-full bg-gold px-1 text-center text-[0.5625rem] font-semibold leading-4 text-on-gold"
        >
          {encouragementUnread > 99 ? "99+" : encouragementUnread}
        </span>
        <span className="sr-only">
          {encouragementUnread} unread encouragement
          {encouragementUnread === 1 ? "" : "s"}
        </span>
      </>
    );
  }

  if (item.badge === "attention" && attention) {
    return (
      <>
        <span
          aria-hidden
          className="absolute right-2 top-2 size-2 rounded-full bg-gold ring-2 ring-canvas"
        />
        <span className="sr-only">Needs attention</span>
      </>
    );
  }

  return null;
}

export function PrimaryNav({
  variant,
  encouragementUnread = 0,
  attention = false,
}: {
  variant: "top" | "bottom";
  encouragementUnread?: number;
  attention?: boolean;
}) {
  const pathname = usePathname();
  const activeId = memberNavActiveId(pathname);
  const activeIndex = MEMBER_PRIMARY_NAV.findIndex((item) => item.id === activeId);
  const style = {
    "--tab-count": MEMBER_PRIMARY_NAV.length,
    "--tab-index": activeIndex >= 0 ? activeIndex : 0,
  } as CSSProperties;

  if (variant === "top") {
    return (
      <nav
        aria-label="Primary"
        className="relative hidden w-full max-w-lg md:grid"
        style={{
          ...style,
          gridTemplateColumns: "repeat(var(--tab-count), minmax(0, 1fr))",
        }}
      >
        {MEMBER_PRIMARY_NAV.map((item, index) => {
          const active = index === activeIndex;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative inline-flex min-h-11 items-center justify-center gap-1.5 px-2 text-sm font-medium transition-colors duration-quick",
                active ? "text-ink" : "text-ink-soft hover:text-ink",
              )}
            >
              <NavIcon item={item} active={active} size={16} />
              {item.label}
              {item.badge === "encouragement" && encouragementUnread > 0 ? (
                <span className="tabular rounded-full bg-gold-soft px-1.5 py-0.5 text-[0.625rem] font-semibold text-gold">
                  {encouragementUnread > 99 ? "99+" : encouragementUnread}
                </span>
              ) : null}
              {item.badge === "attention" && attention ? (
                <span
                  aria-hidden
                  className="size-1.5 rounded-full bg-gold"
                />
              ) : null}
            </Link>
          );
        })}
        {activeIndex >= 0 ? (
          <TabIndicator
            index={activeIndex}
            count={MEMBER_PRIMARY_NAV.length}
            className="right-0 bottom-0"
          />
        ) : null}
      </nav>
    );
  }

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-canvas/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
      style={style}
    >
      <div
        className="relative mx-auto grid max-w-lg"
        style={{ gridTemplateColumns: "repeat(var(--tab-count), minmax(0, 1fr))" }}
      >
        {MEMBER_PRIMARY_NAV.map((item, index) => {
          const active = index === activeIndex;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative flex min-h-16 flex-col items-center justify-center gap-1 px-1 pb-1 pt-2 text-[0.6875rem] font-medium transition-colors duration-quick",
                active ? "text-ink" : "text-ink-soft",
              )}
            >
              <NavIcon item={item} active={active} size={22} />
              <span>{item.label}</span>
              <NavBadge
                item={item}
                encouragementUnread={encouragementUnread}
                attention={attention}
              />
            </Link>
          );
        })}
        {activeIndex >= 0 ? (
          <TabIndicator
            index={activeIndex}
            count={MEMBER_PRIMARY_NAV.length}
            className="right-0 top-0"
          />
        ) : null}
      </div>
    </nav>
  );
}
