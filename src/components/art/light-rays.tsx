import { cn } from "@/lib/cn";
import { defaultArtSize, type ArtProps } from "./types";

export function LightRays({
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
      fill="currentColor"
      stroke="none"
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      focusable="false"
      className={cn("shrink-0 text-gold", className)}
      {...props}
    >
      {title ? <title>{title}</title> : null}
      <g className={cn("ambient-anim", animated && "art-drift")}>
        <path d="M-8 0H10L42 64H24Z" opacity={0.08} />
        <path d="M18 0H34L66 64H50Z" opacity={0.055} />
        <path d="M42 0H52L84 64H72Z" opacity={0.07} />
      </g>
    </svg>
  );
}
