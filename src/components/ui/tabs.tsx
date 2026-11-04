"use client";

import {
  useId,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode,
} from "react";

import { cn } from "@/lib/cn";
import { TabIndicator } from "@/components/motion/tab-indicator";

export type TabItem = {
  id: string;
  label: string;
  icon?: ReactNode;
  content: ReactNode;
};

type TabsProps = {
  items: TabItem[];
  label: string;
  defaultValue?: string;
  className?: string;
};

export function Tabs({ items, label, defaultValue, className }: TabsProps) {
  const baseId = useId();
  const [active, setActive] = useState(() => {
    if (defaultValue && items.some((item) => item.id === defaultValue)) {
      return defaultValue;
    }
    return items[0]?.id ?? "";
  });
  const buttons = useRef(new Map<string, HTMLButtonElement>());
  const activeIndex = Math.max(
    0,
    items.findIndex((item) => item.id === active),
  );

  function moveFocus(event: KeyboardEvent<HTMLDivElement>) {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) {
      return;
    }

    event.preventDefault();
    let nextIndex = activeIndex;

    if (event.key === "ArrowRight") nextIndex = (activeIndex + 1) % items.length;
    if (event.key === "ArrowLeft")
      nextIndex = (activeIndex - 1 + items.length) % items.length;
    if (event.key === "Home") nextIndex = 0;
    if (event.key === "End") nextIndex = items.length - 1;

    const next = items[nextIndex];
    if (!next) return;

    setActive(next.id);
    buttons.current.get(next.id)?.focus();
  }

  return (
    <div className={className}>
      <div
        role="tablist"
        aria-label={label}
        onKeyDown={moveFocus}
        className="relative grid border-b border-line"
        style={
          {
            "--tab-count": items.length,
            "--tab-index": activeIndex,
          } as CSSProperties
        }
      >
        {items.map((item) => {
          const selected = item.id === active;
          return (
            <button
              key={item.id}
              ref={(node) => {
                if (node) buttons.current.set(item.id, node);
                else buttons.current.delete(item.id);
              }}
              type="button"
              role="tab"
              id={`${baseId}-tab-${item.id}`}
              aria-selected={selected}
              aria-controls={`${baseId}-panel-${item.id}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => setActive(item.id)}
              className={cn(
                "inline-flex min-h-11 min-w-0 items-center justify-center gap-2 px-3 text-sm font-medium transition duration-quick ease-settle",
                selected ? "text-ink" : "text-ink-soft hover:text-ink",
              )}
            >
              {item.icon ? (
                <span aria-hidden className="shrink-0">
                  {item.icon}
                </span>
              ) : null}
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}
        <TabIndicator
          index={activeIndex}
          count={items.length}
          className="right-0 bottom-0"
        />
      </div>

      {items.map((item) => (
        <div
          key={item.id}
          role="tabpanel"
          id={`${baseId}-panel-${item.id}`}
          aria-labelledby={`${baseId}-tab-${item.id}`}
          hidden={item.id !== active}
          tabIndex={0}
          className="pt-5 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus"
        >
          {item.content}
        </div>
      ))}
    </div>
  );
}
