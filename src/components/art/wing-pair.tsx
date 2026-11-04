import { cn } from "@/lib/cn";
import { defaultArtSize, type ArtProps } from "./types";

type WingPairProps = ArtProps & {
  open?: boolean;
};

const FEATHERS = [
  "M31 31C22 19 12 16 6 20C12 28 20 32 31 35",
  "M31 35C22 27 13 27 8 31C14 38 22 40 31 41",
  "M31 40C24 35 17 36 12 40C18 45 25 46 31 45",
];

export function WingPair({
  size = defaultArtSize,
  animated = false,
  title,
  className,
  open = true,
  ...props
}: WingPairProps) {
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
      <g className={animated ? "art-wing-breathe" : undefined}>
        <g
          className="transition-transform duration-settle ease-settle"
          style={{ transform: open ? "translateX(0)" : "translateX(9px)" }}
        >
          {FEATHERS.map((path, index) => (
            <path
              key={path}
              d={path}
              pathLength={1}
              className={
                animated
                  ? index === 1
                    ? "art-draw art-draw-delay-1"
                    : index === 2
                      ? "art-draw art-draw-delay-2"
                      : "art-draw"
                  : undefined
              }
            />
          ))}
        </g>
        <g
          className="transition-transform duration-settle ease-settle"
          style={{ transform: open ? "translateX(0)" : "translateX(-9px)" }}
        >
          <g transform="translate(64 0) scale(-1 1)">
            {FEATHERS.map((path, index) => (
              <path
                key={path}
                d={path}
                pathLength={1}
                className={
                  animated
                    ? index === 1
                      ? "art-draw art-draw-delay-1"
                      : index === 2
                        ? "art-draw art-draw-delay-2"
                        : "art-draw"
                    : undefined
                }
              />
            ))}
          </g>
        </g>
        <path
          d="M32 29V48"
          opacity={0.35}
          pathLength={1}
          className={animated ? "art-draw art-draw-delay-2" : undefined}
        />
      </g>
    </svg>
  );
}
