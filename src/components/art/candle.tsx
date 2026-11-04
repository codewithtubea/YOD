import { cn } from "@/lib/cn";
import { defaultArtSize, type ArtProps } from "./types";

type CandleProps = ArtProps & {
  lit?: boolean;
};

export function Candle({
  size = defaultArtSize,
  animated = false,
  title,
  className,
  lit = false,
  ...props
}: CandleProps) {
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
      <path d="M25 32H39V53C39 54.1 38.1 55 37 55H27C25.9 55 25 54.1 25 53V32Z" />
      <path d="M20 57H44" opacity={0.45} />
      <path d="M32 32V28" />
      <g
        className={cn(
          "transition-opacity duration-quick ease-settle",
          lit ? "opacity-100" : "opacity-0",
        )}
      >
        <circle cx="32" cy="23" r="9" opacity={0.12} fill="currentColor" />
        <path
          d="M32 13C36 18 36 24 32 28C28 24 28 18 32 13Z"
          fill="currentColor"
          fillOpacity={0.15}
          className={cn(lit && animated && "art-flicker")}
        />
      </g>
      {!lit ? <path d="M32 28V25" opacity={0.4} /> : null}
    </svg>
  );
}
