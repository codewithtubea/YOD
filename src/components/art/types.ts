import type { SVGProps } from "react";

export type ArtProps = {
  size?: number | string;
  animated?: boolean;
  title?: string;
  className?: string;
} & Omit<SVGProps<SVGSVGElement>, "width" | "height" | "title" | "className">;

export const defaultArtSize = 32;
