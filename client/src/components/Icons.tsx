import type { CSSProperties } from "react";

export type IconName =
  | "search"
  | "user"
  | "heart"
  | "bag"
  | "menu"
  | "close"
  | "star"
  | "truck"
  | "shield"
  | "refresh"
  | "headset"
  | "arrow-right"
  | "chevron-down"
  | "check"
  | "plus"
  | "minus"
  | "filter"
  | "sparkle"
  | "lock"
  | "gift"
  | "wand"
  | "leaf"
  | "droplet"
  | "hanger"
  | "tag"
  | "feather"
  | "chevron-left"
  | "chevron-right"
  | "trash";

type IconProps = {
  name: IconName;
  size?: number;
  strokeWidth?: number;
  className?: string;
  style?: CSSProperties;
  filled?: boolean;
};

const paths: Record<IconName, React.ReactNode> = {
  search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-4.2-4.2" /></>,
  user: <><circle cx="12" cy="8" r="4" /><path d="M4.5 21a7.5 7.5 0 0 1 15 0" /></>,
  heart: <path d="M20.8 4.8a5.5 5.5 0 0 0-7.8 0L12 5.9l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.3 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z" />,
  bag: <><path d="M5 8h14l1 13H4L5 8Z" /><path d="M9 8V6.5a3 3 0 0 1 6 0V8" /></>,
  menu: <><path d="M4 6h16M4 12h16M4 18h16" /></>,
  close: <><path d="m6 6 12 12M18 6 6 18" /></>,
  star: <path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9L12 3Z" />,
  truck: <><path d="M3 6h11v11H3zM14 10h4l3 4v3h-7z" /><circle cx="7" cy="19" r="2" /><circle cx="18" cy="19" r="2" /></>,
  shield: <><path d="M12 3 4.5 6v5.5c0 5 3.2 8.2 7.5 9.5 4.3-1.3 7.5-4.5 7.5-9.5V6L12 3Z" /><path d="m9 12 2 2 4-4" /></>,
  refresh: <><path d="M20 11a8 8 0 1 0-2.3 5.7" /><path d="M20 4v7h-7" /></>,
  headset: <><path d="M4 13v-2a8 8 0 0 1 16 0v2" /><path d="M4 13h3v6H5a1 1 0 0 1-1-1v-5ZM20 13h-3v6h2a1 1 0 0 0 1-1v-5Z" /><path d="M17 19c0 1.7-2.2 2-5 2" /></>,
  "arrow-right": <><path d="M4 12h16M14 6l6 6-6 6" /></>,
  "chevron-down": <path d="m6 9 6 6 6-6" />,
  "chevron-left": <path d="m14 6-6 6 6 6" />,
  "chevron-right": <path d="m10 6 6 6-6 6" />,
  check: <path d="m5 12 4.5 4.5L19 6.5" />,
  plus: <><path d="M12 5v14M5 12h14" /></>,
  minus: <path d="M5 12h14" />,
  filter: <><path d="M4 6h16M7 12h10M10 18h4" /></>,
  sparkle: <><path d="M12 3c.7 5.2 3.1 7.6 8.3 8.3-5.2.7-7.6 3.1-8.3 8.3-.7-5.2-3.1-7.6-8.3-8.3C8.9 10.6 11.3 8.2 12 3Z" /><path d="M19 16c.3 2 1.2 2.9 3.2 3.2-2 .3-2.9 1.2-3.2 3.2-.3-2-1.2-2.9-3.2-3.2 2-.3 2.9-1.2 3.2-3.2Z" /></>,
  lock: <><rect x="5" y="10" width="14" height="10" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></>,
  gift: <><path d="M4 9h16v12H4zM2 5h20v4H2zM12 5v16" /><path d="M12 5C10 1 6 2 7 5M12 5c2-4 6-3 5 0" /></>,
  wand: <><path d="m4 20 11-11" /><path d="m14 4 1.5 1.5L17 4l-1.5-1.5L17 1M20 10l-1.5-1.5L20 7l-1.5-1.5L17 7M17 13l-1.5-1.5L17 10l-1.5-1.5L14 10" /></>,
  leaf: <><path d="M20 4C10 4 5 8.5 5 15c0 3 2 5 5 5 6.5 0 10-5 10-16Z" /><path d="M4 21c2-6 6-9 12-11" /></>,
  droplet: <path d="M12 3s7 7.2 7 12a7 7 0 1 1-14 0c0-4.8 7-12 7-12Z" />,
  hanger: <><path d="M12 7a2 2 0 1 1 2-2c0 1.5-2 1.7-2 3.2" /><path d="m12 8.2 8 5.3v1.5H4v-1.5l8-5.3Z" /></>,
  tag: <><path d="m3 12 9-9h7a2 2 0 0 1 2 2v7l-9 9L3 12Z" /><circle cx="16" cy="8" r="1.6" /></>,
  feather: <><path d="M20 4c-7 0-13 4.5-13 11 0 2.7 1.8 4.5 4.5 4.5C18 19.5 20 12.5 20 4Z" /><path d="M4 21c2.5-5.5 6-9 11.5-12" /><path d="M8 15h6M11 11h5" /></>,
  trash: <><path d="M4 7h16M9 7V4h6v3M6 7l1 14h10l1-14" /><path d="M10 11v6M14 11v6" /></>,
};

export function Icon({ name, size = 20, strokeWidth = 1.8, className, style, filled = false }: IconProps) {
  return (
    <svg
      className={className}
      style={style}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={filled ? 0 : strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {paths[name]}
    </svg>
  );
}
