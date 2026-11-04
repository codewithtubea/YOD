import { cn } from "@/lib/cn";

type SkeletonProps = {
  variant?: "text" | "rect" | "circle";
  lines?: number;
  className?: string;
  announce?: boolean;
};

export function Skeleton({
  variant = "text",
  lines = 1,
  className,
  announce = true,
}: SkeletonProps) {
  return (
    <div role={announce ? "status" : undefined} aria-live={announce ? "polite" : undefined}>
      {announce ? <span className="sr-only">Loading</span> : null}
      <div aria-hidden className="space-y-2">
        {variant === "circle" ? (
          <div className={cn("skeleton-light size-10 rounded-full", className)} />
        ) : variant === "rect" ? (
          <div className={cn("skeleton-light h-24 rounded-soft", className)} />
        ) : (
          Array.from({ length: lines }, (_, index) => (
            <div
              key={index}
              className={cn(
                "skeleton-light h-3 rounded-full",
                index === lines - 1 && lines > 1 ? "w-2/3" : "w-full",
                index === 0 && lines === 1 ? "w-3/4" : undefined,
                className,
              )}
            />
          ))
        )}
      </div>
    </div>
  );
}
