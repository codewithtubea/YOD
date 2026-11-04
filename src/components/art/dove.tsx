import { cn } from "@/lib/cn";
import { defaultArtSize, type ArtProps } from "./types";

type DoveProps = ArtProps & {
  flap?: "up" | "rest";
};

export function Dove({
  size = defaultArtSize,
  animated = false,
  title,
  className,
  flap = "rest",
  ...props
}: DoveProps) {
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
        d="M17 37C23 29 35 26 50 31C43 36 35 40 23 43C25 39 23 38 17 37Z"
        pathLength={1}
        className={animated ? "art-draw" : undefined}
      />
      <path
        d="M24 41C20 45 15 47 10 46C12 42 16 39 21 38"
        pathLength={1}
        className={animated ? "art-draw art-draw-delay-1" : undefined}
      />
      <path d="M50 31L57 28" pathLength={1} />
      <g
        className={cn(
          "transition-transform duration-settle ease-settle",
          animated && "art-wing-breathe",
        )}
        style={{ transform: flap === "up" ? "rotate(-11deg)" : "rotate(7deg)" }}
      >
        <path
          d="M30 35C34 23 44 18 53 20C48 29 40 35 31 39"
          pathLength={1}
          className={animated ? "art-draw art-draw-delay-2" : undefined}
        />
      </g>
    </svg>
  );
}
