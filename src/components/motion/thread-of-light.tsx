import { cn } from "@/lib/cn";

type ThreadOfLightProps = {
  animated?: boolean;
  label?: string;
  className?: string;
};

export function ThreadOfLight({
  animated = true,
  label,
  className,
}: ThreadOfLightProps) {
  return (
    <svg
      viewBox="0 0 320 64"
      preserveAspectRatio="none"
      fill="none"
      role={label ? "img" : undefined}
      aria-hidden={label ? undefined : true}
      focusable="false"
      className={cn("h-12 w-full text-gold", className)}
    >
      {label ? <title>{label}</title> : null}
      <path
        d="M6 42C48 42 54 20 96 20C138 20 146 44 190 44C234 44 244 22 314 25"
        stroke="currentColor"
        strokeWidth={1.2}
        strokeLinecap="round"
        strokeDasharray={animated ? undefined : "3 6"}
        pathLength={1}
        className={animated ? "art-draw" : undefined}
        vectorEffect="non-scaling-stroke"
        opacity={0.85}
      />
      <circle cx="6" cy="42" r="2.5" fill="currentColor" />
      <circle cx="314" cy="25" r="2.5" fill="currentColor" />
      <circle cx="190" cy="44" r="1.5" fill="currentColor" opacity={0.5} />
    </svg>
  );
}
