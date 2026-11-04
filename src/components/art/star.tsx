import { cn } from "@/lib/cn";
import { defaultArtSize, type ArtProps } from "./types";

export function Star({
  size = defaultArtSize,
  animated = false,
  title,
  className,
  ...props
}: ArtProps) {
  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.4}
      strokeLinecap="round"
      strokeLinejoin="round"
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      focusable="false"
      className={cn("shrink-0 text-gold", className)}
      {...props}
    >
      {title ? <title>{title}</title> : null}
      <path
        d="M32 8C34 24 40 30 56 32C40 34 34 40 32 56C30 40 24 34 8 32C24 30 30 24 32 8Z"
        pathLength={1}
        className={animated ? "art-draw" : undefined}
        fill="currentColor"
        fillOpacity={0.08}
      />
      <circle cx="32" cy="32" r="2" fill="currentColor" opacity={0.5} />
    </svg>
  );
}
