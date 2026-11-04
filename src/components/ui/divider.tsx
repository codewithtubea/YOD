import { cn } from "@/lib/cn";
import { OliveBranch } from "@/components/art/olive-branch";

type DividerProps = {
  label?: string;
  className?: string;
  ornament?: boolean;
};

export function Divider({ label, className, ornament = false }: DividerProps) {
  if (!label && !ornament) {
    return (
      <div
        role="separator"
        aria-orientation="horizontal"
        className={cn("h-px w-full bg-line", className)}
      />
    );
  }

  return (
    <div
      role="separator"
      aria-orientation="horizontal"
      className={cn("flex items-center gap-3 text-gold", className)}
    >
      <span className="h-px flex-1 bg-line" />
      {ornament ? (
        <OliveBranch size={18} aria-hidden className="opacity-80" />
      ) : null}
      {label ? <span className="type-caption font-semibold">{label}</span> : null}
      <span className="h-px flex-1 bg-line" />
    </div>
  );
}
