import type { ButtonHTMLAttributes } from "react";

import { cn } from "@/lib/cn";

type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string;
  variant?: "ghost" | "quiet" | "primary";
  size?: "sm" | "md";
};

const VARIANTS = {
  ghost: "text-ink-soft hover:bg-surface-soft hover:text-ink",
  quiet: "bg-sage-soft text-ink hover:bg-sage/35",
  primary: "bg-forest text-on-forest hover:bg-forest-hover",
};

const SIZES = {
  sm: "size-9 min-h-9 min-w-9",
  md: "size-11 min-h-11 min-w-11",
};

export function IconButton({
  label,
  variant = "ghost",
  size = "md",
  className,
  children,
  type = "button",
  ...props
}: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      title={props.title ?? label}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full transition duration-quick ease-settle active:scale-95 motion-reduce:active:scale-100",
        "disabled:pointer-events-none disabled:opacity-55",
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
