import type { ReactNode } from "react";

import { cn } from "@/lib/cn";
import { Star } from "@/components/art/star";

type EmptyStateProps = {
  icon?: ReactNode;
  eyebrow?: string;
  title: string;
  description: string;
  action?: ReactNode;
  className?: string;
};

export function EmptyState({
  icon,
  eyebrow,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "rounded-card border border-dashed border-line bg-surface/55 px-6 py-10 text-center",
        className,
      )}
    >
      <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-gold-soft/70 text-gold">
        {icon ?? <Star size={24} animated />}
      </div>
      {eyebrow ? (
        <p className="type-caption mt-5 font-semibold text-gold">{eyebrow}</p>
      ) : null}
      <h2 className="type-heading mt-2 text-ink">{title}</h2>
      <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-ink-soft">
        {description}
      </p>
      {action ? <div className="mt-6 flex justify-center">{action}</div> : null}
    </div>
  );
}
