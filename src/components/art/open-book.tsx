import { cn } from "@/lib/cn";
import { defaultArtSize, type ArtProps } from "./types";

export function OpenBook({
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
      strokeWidth={1.5}
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
        d="M32 20C26 16 18 15 12 17V48C18 46 26 47 32 51C38 47 46 46 52 48V17C46 15 38 16 32 20Z"
        pathLength={1}
        className={animated ? "art-draw" : undefined}
      />
      <path d="M32 20V51" pathLength={1} opacity={0.55} />
      <path d="M18 24C22 24 26 25 29 27" pathLength={1} opacity={0.35} />
      <path d="M18 31C22 31 26 32 29 34" pathLength={1} opacity={0.35} />
      <path d="M46 24C42 24 38 25 35 27" pathLength={1} opacity={0.35} />
      <path d="M46 31C42 31 38 32 35 34" pathLength={1} opacity={0.35} />
    </svg>
  );
}
