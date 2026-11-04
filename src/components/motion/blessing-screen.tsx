"use client";

import { useEffect, useId, useRef } from "react";
import { AnimatePresence, m } from "motion/react";

import { GuardianWings } from "@/components/art/guardian-wings";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

type BlessingScreenProps = {
  open: boolean;
  onClose: () => void;
  eyebrow?: string;
  title?: string;
  line?: string;
  autoDismissMs?: number;
  className?: string;
};

export function BlessingScreen({
  open,
  onClose,
  eyebrow = "A quiet blessing",
  title = "You are seen.",
  line = "Grace is already here. You do not have to carry today alone.",
  autoDismissMs,
  className,
}: BlessingScreenProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);
  const titleId = useId();

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;

    const previouslyFocused =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const focusTimer = window.setTimeout(() => closeRef.current?.focus(), 40);
    const autoTimer = autoDismissMs
      ? window.setTimeout(() => onCloseRef.current(), autoDismissMs)
      : undefined;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onCloseRef.current();
        return;
      }

      if (event.key !== "Tab") return;

      const panel = panelRef.current;
      if (!panel) return;

      const focusable = Array.from(
        panel.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((element) => element.offsetParent !== null);

      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);

    return () => {
      window.clearTimeout(focusTimer);
      if (autoTimer) window.clearTimeout(autoTimer);
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      if (previouslyFocused?.isConnected) previouslyFocused.focus();
    };
  }, [open, autoDismissMs]);

  return (
    <AnimatePresence>
      {open ? (
        <m.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          className={cn(
            "fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-canvas/95 px-6 py-10 backdrop-blur-md",
            className,
          )}
          onClick={(event) => {
            if (event.target === event.currentTarget) onCloseRef.current();
          }}
        >
          <m.div
            ref={panelRef}
            initial={{ opacity: 0, y: 10, scale: 0.99 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.99 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="relative w-full max-w-lg text-center"
          >
            <button
              ref={closeRef}
              type="button"
              onClick={() => onCloseRef.current()}
              aria-label="Close blessing"
              className="absolute right-0 top-0 inline-flex size-11 items-center justify-center rounded-full text-ink-soft transition hover:bg-surface-soft hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
            >
              <svg
                aria-hidden
                viewBox="0 0 24 24"
                className="size-5"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.8}
                strokeLinecap="round"
              >
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>

            <div className="mx-auto flex justify-center">
              <GuardianWings size={96} animated />
            </div>
            <p className="type-caption mt-6 font-semibold text-gold">
              {eyebrow}
            </p>
            <h2 id={titleId} className="type-title mt-3 text-ink">
              {title}
            </h2>
            <p className="type-body mx-auto mt-4 max-w-md text-ink-soft">
              {line}
            </p>

            <Button onClick={() => onCloseRef.current()} className="mt-8">
              Return
            </Button>
          </m.div>
        </m.div>
      ) : null}
    </AnimatePresence>
  );
}
