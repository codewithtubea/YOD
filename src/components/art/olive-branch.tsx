import { cn } from "@/lib/cn";
import { defaultArtSize, type ArtProps } from "./types";

const LEAVES = [
  "M22 43C17 41 15 36 18 32C23 34 25 39 22 43Z",
  "M30 34C25 32 23 27 26 23C31 25 33 30 30 34Z",
  "M38 25C33 23 31 18 34 14C39 16 41 21 38 25Z",
  "M27 39C25 33 27 28 32 27C34 33 32 38 27 39Z",
  "M36 30C34 24 36 19 41 18C43 24 41 29 36 30Z",
];

export function OliveBranch({
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
        d="M10 54C22 45 34 32 52 12"
        pathLength={1}
        className={animated ? "art-draw" : undefined}
      />
      {LEAVES.map((path, index) => (
        <path
          key={path}
          d={path}
          pathLength={1}
          className={animated ? "art-draw art-draw-delay-1" : undefined}
          opacity={1 - index * 0.07}
        />
      ))}
    </svg>
  );
}
