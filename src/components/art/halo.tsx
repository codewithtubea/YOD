import { cn } from "@/lib/cn";
import { defaultArtSize, type ArtProps } from "./types";

export function Halo({
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
      strokeWidth={1.6}
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
        d="M22 51C12 46 8 39 8 32C8 18 18 8 32 8C46 8 56 18 56 32C56 41 51 48 43 52"
        pathLength={1}
        className={animated ? "art-draw" : undefined}
      />
      <path
        d="M18 51C12 47 10 42 10 37"
        opacity={0.35}
        pathLength={1}
        className={animated ? "art-draw art-draw-delay-2" : undefined}
      />
      <path
        d="M46 52C51 48 54 43 54 38"
        opacity={0.35}
        pathLength={1}
        className={animated ? "art-draw art-draw-delay-2" : undefined}
      />
    </svg>
  );
}
