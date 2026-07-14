import type { BrandIcon } from "../lib/connect-platforms";

interface PlatformIconProps {
  icon: BrandIcon;
  size?: number;
  color?: string;
  title?: string;
}

/** Renders a real brand SVG (24×24 path) at the given size and color. */
export function PlatformIcon({ icon, size = 18, color = "currentColor", title }: PlatformIconProps) {
  return (
    <svg
      role="img"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill={color}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      xmlns="http://www.w3.org/2000/svg"
    >
      {title ? <title>{title}</title> : null}
      <path d={icon.path} />
    </svg>
  );
}
