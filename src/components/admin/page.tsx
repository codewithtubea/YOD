import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

export function AdminPageHeader({
  eyebrow,
  title,
  description,
  actions,
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <header
      className={cn(
        "flex flex-col gap-5 border-b border-line pb-8 sm:flex-row sm:items-end sm:justify-between",
        className,
      )}
    >
      <div className="max-w-2xl">
        {eyebrow ? (
          <p className="type-label text-gold">{eyebrow}</p>
        ) : null}
        <h1 className="type-page-title mt-2 text-ink">{title}</h1>
        {description ? (
          <p className="type-admin-body mt-3 max-w-[62ch] text-ink-soft">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {actions}
        </div>
      ) : null}
    </header>
  );
}

export function AdminSection({
  id,
  title,
  description,
  action,
  children,
  className,
}: {
  id?: string;
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section id={id} className={cn("admin-section", className)}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="type-section-title text-ink">{title}</h2>
          {description ? (
            <p className="type-meta mt-1.5 max-w-[60ch] text-ink-soft">
              {description}
            </p>
          ) : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      <div className="mt-6">{children}</div>
    </section>
  );
}

export function AdminNotice({
  tone = "neutral",
  title,
  children,
}: {
  tone?: "neutral" | "gold" | "danger";
  title?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "border-l-2 py-1 pl-4 text-sm leading-relaxed",
        tone === "gold" && "border-gold/60 text-ink",
        tone === "danger" && "border-danger/60 text-danger",
        tone === "neutral" && "border-sage text-ink-soft",
      )}
    >
      {title ? <p className="font-medium text-ink">{title}</p> : null}
      <div className={title ? "mt-1" : undefined}>{children}</div>
    </div>
  );
}
