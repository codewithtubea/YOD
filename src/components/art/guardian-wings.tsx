import { cn } from "@/lib/cn";
import { WingPair } from "./wing-pair";
import type { ArtProps } from "./types";

export function GuardianWings({
  size = 64,
  animated = false,
  title,
  className,
  ...props
}: ArtProps) {
  return (
    <span
      className={cn("relative inline-flex items-center justify-center", className)}
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      <span
        aria-hidden
        className="absolute inset-[12%] rounded-full bg-gold/20 blur-xl"
      />
      <WingPair
        size={size}
        animated={animated}
        className="relative text-gold"
        {...props}
      />
    </span>
  );
}
