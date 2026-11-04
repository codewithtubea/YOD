import { cn } from "@/lib/cn";

const PALETTES = [
  "bg-sage-soft text-ink",
  "bg-gold-soft text-gold",
  "bg-surface-soft text-ink-soft",
  "bg-sage/30 text-ink",
];

const SIZES = {
  sm: "size-8 text-xs",
  md: "size-10 text-sm",
  lg: "size-14 text-lg",
};

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

function paletteFor(name: string) {
  let hash = 0;
  for (let index = 0; index < name.length; index += 1) {
    hash = (hash * 31 + name.charCodeAt(index)) >>> 0;
  }
  return PALETTES[hash % PALETTES.length];
}

type AvatarProps = {
  name: string;
  src?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
};

export function Avatar({ name, src, size = "md", className }: AvatarProps) {
  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full font-medium ring-1 ring-line",
        SIZES[size],
        !src && paletteFor(name || "?"),
        className,
      )}
      role="img"
      aria-label={name || "Member"}
      title={name || "Member"}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt=""
          width={size === "lg" ? 56 : size === "md" ? 40 : 32}
          height={size === "lg" ? 56 : size === "md" ? 40 : 32}
          className="size-full object-cover"
        />
      ) : (
        <span aria-hidden>{initials(name) || "?"}</span>
      )}
    </span>
  );
}
