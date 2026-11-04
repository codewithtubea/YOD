import { cn } from "@/lib/cn";
import { defaultArtSize, type ArtProps } from "./types";

type LampProps = ArtProps & {
  lit?: boolean;
};

export function Lamp({
  size = defaultArtSize,
  animated = false,
  title,
  className,
  lit = true,
  ...props
}: LampProps) {
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
        d="M18 36C18 46 24 52 32 52C40 52 46 46 46 36Z"
        pathLength={1}
        className={animated ? "art-draw" : undefined}
      />
      <path d="M46 39C55 39 58 32 53 27" pathLength={1} />
      <path d="M18 36L10 31" pathLength={1} />
      <path d="M21 31H43" opacity={0.35} />
      <g
        className={cn(
          "transition-opacity duration-quick ease-settle",
          lit ? "opacity-100" : "opacity-0",
        )}
      >
        <path
          d="M10 27C14 23 14 18 10 13C6 18 6 23 10 27Z"
          fill="currentColor"
          fillOpacity={0.16}
          className={cn(lit && animated && "art-flicker")}
        />
      </g>
    </svg>
  );
}
