import type { HTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/cn";

type CardProps = HTMLAttributes<HTMLDivElement> & {
  variant?: "default" | "soft" | "gold" | "quiet";
  padding?: "none" | "sm" | "md" | "lg";
};

const VARIANTS = {
  default: "border-line bg-surface shadow-soft",
  soft: "border-line/70 bg-surface-soft/80",
  gold: "border-gold/30 bg-gold-soft/60",
  quiet: "border-transparent bg-transparent",
};

const PADDING = {
  none: "",
  sm: "p-4",
  md: "p-5 sm:p-6",
  lg: "p-6 sm:p-8",
};

export function Card({
  variant = "default",
  padding = "md",
  className,
  children,
  ...props
}: CardProps) {
  return (
    <div
      className={cn(
        "rounded-card border",
        VARIANTS[variant],
        PADDING[padding],
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        {eyebrow ? (
          <p className="type-caption font-semibold text-gold">{eyebrow}</p>
        ) : null}
        <h2 className="type-heading mt-1 text-ink">{title}</h2>
        {description ? (
          <p className="mt-2 text-sm leading-relaxed text-ink-soft">
            {description}
          </p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
