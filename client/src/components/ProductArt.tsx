import { useId } from "react";

export type ArtVariant =
  | "wand"
  | "bullet"
  | "rabbit"
  | "ring"
  | "lube"
  | "candle"
  | "plug"
  | "stroker"
  | "lingerie"
  | "feather"
  | "pebble"
  | "kit"
  | "balm"
  | "blindfold"
  | "default";

type Palette = {
  bg1: string;
  bg2: string;
  glow: string;
  product: string;
  productLight: string;
  dark: string;
};

const palettes: Record<string, Palette> = {
  pink: { bg1: "#ffe7f1", bg2: "#fff9fc", glow: "#ffc4dc", product: "#e989b0", productLight: "#ffd3e5", dark: "#8f3557" },
  lilac: { bg1: "#eee6ff", bg2: "#fbf9ff", glow: "#d8c7ff", product: "#a68bdc", productLight: "#e1d4ff", dark: "#5d438c" },
  peach: { bg1: "#ffeadb", bg2: "#fffaf5", glow: "#ffd0ad", product: "#eaa377", productLight: "#ffd8bd", dark: "#8d4d27" },
  sage: { bg1: "#e5f1e5", bg2: "#f9fcf8", glow: "#c8e1c9", product: "#94b79a", productLight: "#d3e8d4", dark: "#42684a" },
  blue: { bg1: "#e4effa", bg2: "#f8fcff", glow: "#c4dcf5", product: "#8fb4d9", productLight: "#d0e4f7", dark: "#355d84" },
  sand: { bg1: "#f4eadb", bg2: "#fffdf8", glow: "#e8d2ae", product: "#c9aa7c", productLight: "#ead9ba", dark: "#725731" },
  berry: { bg1: "#f5dfe8", bg2: "#fff8fb", glow: "#e8b6ca", product: "#bd7f9b", productLight: "#efccda", dark: "#6f344c" },
  slate: { bg1: "#ebebf1", bg2: "#fbfbfe", glow: "#d1d1df", product: "#a1a0b4", productLight: "#dedde8", dark: "#4c4b60" },
};

const defaultTone: Record<ArtVariant, string> = {
  wand: "pink",
  bullet: "lilac",
  rabbit: "berry",
  ring: "sage",
  lube: "blue",
  candle: "peach",
  plug: "lilac",
  stroker: "slate",
  lingerie: "berry",
  feather: "pink",
  pebble: "sand",
  kit: "peach",
  balm: "sage",
  blindfold: "slate",
  default: "pink",
};

type ProductArtProps = {
  variant?: ArtVariant;
  tone?: string;
  label: string;
  className?: string;
};

export function ProductArt({ variant = "default", tone, label, className }: ProductArtProps) {
  const rawId = useId();
  const uid = rawId.replace(/[^a-zA-Z0-9]/g, "");
  const p = palettes[tone ?? ""] ?? palettes[defaultTone[variant]] ?? palettes.pink;
  const bodyId = `body-${uid}`;
  const headId = `head-${uid}`;
  const bgId = `bg-${uid}`;
  const shineId = `shine-${uid}`;
  const shadowId = `shadow-${uid}`;

  return (
    <svg
      className={className ? `product-art ${className}` : "product-art"}
      viewBox="0 0 400 480"
      role={label ? "img" : "presentation"}
      aria-label={label || undefined}
      aria-hidden={label ? undefined : true}
      preserveAspectRatio="xMidYMid slice"
    >
      <defs>
        <linearGradient id={bgId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={p.bg1} />
          <stop offset="1" stopColor={p.bg2} />
        </linearGradient>
        <linearGradient id={bodyId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={p.productLight} />
          <stop offset=".55" stopColor={p.product} />
          <stop offset="1" stopColor={p.dark} />
        </linearGradient>
        <linearGradient id={headId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffffff" stopOpacity=".95" />
          <stop offset=".4" stopColor={p.productLight} />
          <stop offset="1" stopColor={p.product} />
        </linearGradient>
        <radialGradient id={shineId} cx=".35" cy=".25" r=".8">
          <stop offset="0" stopColor="#ffffff" stopOpacity=".8" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
        <filter id={shadowId} x="-30%" y="-30%" width="160%" height="180%">
          <feDropShadow dx="0" dy="16" stdDeviation="16" floodColor={p.dark} floodOpacity=".22" />
        </filter>
      </defs>

      <rect width="400" height="480" fill={`url(#${bgId})`} />
      <circle cx="335" cy="68" r="152" fill={p.glow} opacity=".66" />
      <circle cx="52" cy="424" r="126" fill={p.glow} opacity=".42" />
      <circle cx="338" cy="382" r="7" fill={p.product} opacity=".55" />
      <circle cx="74" cy="94" r="5" fill={p.dark} opacity=".22" />
      <ellipse cx="200" cy="410" rx="112" ry="19" fill={p.dark} opacity=".13" />
      <g filter={`url(#${shadowId})`}>{artFor(variant, p, bodyId, headId, shineId)}</g>
      <g fill={p.dark} opacity=".45">
        <path d="M55 150c.8 5.4 3.2 7.8 8.6 8.6-5.4.8-7.8 3.2-8.6 8.6-.8-5.4-3.2-7.8-8.6-8.6 5.4-.8 7.8-3.2 8.6-8.6Z" />
        <path d="M330 286c.5 3.6 2 5.1 5.6 5.6-3.6.5-5.1 2-5.6 5.6-.5-3.6-2-5.1-5.6-5.6 3.6-.5 5.1-2 5.6-5.6Z" />
      </g>
    </svg>
  );
}

function artFor(variant: ArtVariant, p: Palette, bodyId: string, headId: string, shineId: string) {
  const body = `url(#${bodyId})`;
  const head = `url(#${headId})`;
  const shine = `url(#${shineId})`;

  switch (variant) {
    case "wand":
      return (
        <g transform="rotate(-15 200 260)">
          <rect x="177" y="214" width="46" height="170" rx="23" fill={body} />
          <rect x="189" y="228" width="10" height="136" rx="5" fill="#fff" opacity=".32" />
          <circle cx="200" cy="152" r="64" fill={head} />
          <circle cx="200" cy="152" r="64" fill={shine} opacity=".7" />
          <circle cx="188" cy="132" r="16" fill="#fff" opacity=".55" />
          <rect x="176" y="344" width="48" height="18" rx="9" fill={p.dark} opacity=".28" />
          <circle cx="200" cy="294" r="7" fill={p.dark} opacity=".35" />
        </g>
      );
    case "bullet":
      return (
        <g transform="rotate(16 200 260)">
          <rect x="154" y="158" width="92" height="196" rx="46" fill={body} />
          <rect x="154" y="264" width="92" height="90" rx="45" fill={p.dark} opacity=".17" />
          <ellipse cx="180" cy="204" rx="16" ry="30" fill={shine} opacity=".8" />
          <rect x="170" y="322" width="60" height="10" rx="5" fill={p.dark} opacity=".28" />
          <circle cx="200" cy="395" r="7" fill={p.dark} opacity=".4" />
        </g>
      );
    case "rabbit":
      return (
        <g transform="rotate(-7 200 260)">
          <path d="M200 142c-50 0-82 42-82 93 0 66 43 129 82 162 39-33 82-96 82-162 0-51-32-93-82-93Z" fill={body} />
          <path d="M166 170c-20-46-10-83 9-86 19-3 30 31 21 76" fill={head} />
          <path d="M234 170c20-46 10-83-9-86-19-3-30 31-21 76" fill={head} />
          <path d="M146 212c12 18 30 28 54 28s42-10 54-28" fill="none" stroke="#fff" strokeOpacity=".28" strokeWidth="5" />
          <circle cx="200" cy="280" r="38" fill={p.dark} opacity=".12" />
          <circle cx="200" cy="280" r="22" fill={head} opacity=".55" />
          <ellipse cx="174" cy="240" rx="10" ry="20" fill={shine} opacity=".7" />
        </g>
      );
    case "ring":
      return (
        <g transform="rotate(-14 200 270)">
          <ellipse cx="200" cy="286" rx="98" ry="60" fill="none" stroke={body} strokeWidth="34" />
          <ellipse cx="200" cy="286" rx="98" ry="60" fill="none" stroke="#fff" strokeOpacity=".18" strokeWidth="8" />
          <rect x="278" y="232" width="48" height="96" rx="24" fill={head} transform="rotate(22 302 280)" />
          <circle cx="295" cy="254" r="9" fill="#fff" opacity=".6" transform="rotate(22 302 280)" />
        </g>
      );
    case "lube":
      return (
        <g>
          <rect x="158" y="196" width="84" height="184" rx="24" fill={body} />
          <rect x="176" y="134" width="48" height="72" rx="13" fill={p.dark} opacity=".9" />
          <rect x="148" y="116" width="72" height="24" rx="11" fill={p.dark} />
          <rect x="158" y="278" width="84" height="92" rx="20" fill="#fff" opacity=".3" />
          <rect x="174" y="298" width="52" height="8" rx="4" fill={p.dark} opacity=".32" />
          <rect x="174" y="316" width="34" height="6" rx="3" fill={p.dark} opacity=".2" />
          <rect x="176" y="218" width="10" height="100" rx="5" fill="#fff" opacity=".3" />
        </g>
      );
    case "candle":
      return (
        <g>
          <path d="M200 146c11 18 20 27 20 38a20 20 0 1 1-40 0c0-11 9-20 20-38Z" fill="#f6b74a" />
          <path d="M200 160c6 11 10 16 10 23a10 10 0 1 1-20 0c0-7 4-12 10-23Z" fill="#ffe2a0" />
          <rect x="138" y="218" width="124" height="142" rx="20" fill={body} />
          <rect x="138" y="198" width="124" height="34" rx="12" fill={p.dark} opacity=".88" />
          <rect x="154" y="252" width="92" height="72" rx="9" fill="#fff" opacity=".42" />
          <rect x="168" y="270" width="64" height="6" rx="3" fill={p.dark} opacity=".45" />
          <rect x="180" y="286" width="40" height="5" rx="2.5" fill={p.dark} opacity=".25" />
          <rect x="146" y="228" width="12" height="110" rx="6" fill="#fff" opacity=".22" />
        </g>
      );
    case "plug":
      return (
        <g>
          <path d="M200 154c-20 28-62 64-62 109 0 47 28 78 62 78s62-31 62-78c0-45-42-81-62-109Z" fill={body} />
          <circle cx="200" cy="284" r="31" fill={head} />
          <path d="m200 260 16 14-6 24h-20l-6-24 16-14Z" fill="#fff" opacity=".5" />
          <path d="M155 254c10 22 28 36 45 40" fill="none" stroke="#fff" strokeOpacity=".2" strokeWidth="5" />
          <rect x="172" y="336" width="56" height="12" rx="6" fill={p.dark} opacity=".2" />
        </g>
      );
    case "stroker":
      return (
        <g transform="rotate(-8 200 280)">
          <rect x="148" y="164" width="104" height="228" rx="46" fill={body} />
          <ellipse cx="200" cy="178" rx="42" ry="18" fill={p.dark} opacity=".38" />
          <ellipse cx="200" cy="208" rx="37" ry="10" fill="none" stroke="#fff" strokeOpacity=".25" strokeWidth="5" />
          <ellipse cx="200" cy="238" rx="37" ry="10" fill="none" stroke={p.dark} strokeOpacity=".25" strokeWidth="5" />
          <ellipse cx="200" cy="268" rx="37" ry="10" fill="none" stroke="#fff" strokeOpacity=".25" strokeWidth="5" />
          <ellipse cx="200" cy="298" rx="37" ry="10" fill="none" stroke={p.dark} strokeOpacity=".25" strokeWidth="5" />
          <rect x="162" y="190" width="10" height="160" rx="5" fill="#fff" opacity=".18" />
        </g>
      );
    case "lingerie":
      return (
        <g fill="none" stroke={p.product} strokeWidth="7" strokeLinecap="round" strokeLinejoin="round">
          <path d="M118 204c28-26 58-34 82-12 24-22 54-14 82 12" />
          <path d="M118 204c-8 43 10 82 30 92 21 10 42-9 52-32 10 23 31 42 52 32 20-10 38-49 30-92" />
          <path d="M118 204 86 150M282 204l32-54" />
          <path d="M148 260c18 11 34 11 52 0M200 260c18 11 34 11 52 0" strokeOpacity=".55" />
          <path d="M143 234c14 9 28 9 42 0M215 234c14 9 28 9 42 0" strokeOpacity=".4" />
          <path d="M200 192v84" strokeOpacity=".4" />
        </g>
      );
    case "feather":
      return (
        <g transform="rotate(12 200 260)">
          <path d="M252 116c-68 44-114 105-114 172 0 23 12 35 29 35 68 0 135-76 151-163-34 12-68 34-103 68" fill={body} />
          <path d="M252 116c-45 56-80 124-80 190" fill="none" stroke={p.dark} strokeOpacity=".4" strokeWidth="5" />
          <path d="M208 166c14-6 28-9 42-9M187 204c14-6 28-10 42-11M169 244c13-6 25-10 37-12M155 284c10-5 20-8 30-9" fill="none" stroke={p.dark} strokeOpacity=".3" strokeWidth="4" />
          <ellipse cx="210" cy="188" rx="34" ry="16" fill={shine} opacity=".5" />
        </g>
      );
    case "pebble":
      return (
        <g>
          <path d="M128 302c-32-42-13-105 39-127 54-23 125 0 136 63 10 60-39 106-91 106-32 0-63-12-84-42Z" fill={body} />
          <path d="M140 298c-16-25-9-60 18-79" fill="none" stroke="#fff" strokeOpacity=".25" strokeWidth="10" strokeLinecap="round" />
          <circle cx="213" cy="291" r="15" fill={p.dark} opacity=".28" />
          <circle cx="213" cy="291" r="6" fill="#fff" opacity=".35" />
          <path d="M168 226c20-12 44-16 67-10" fill="none" stroke={shine} strokeWidth="18" strokeLinecap="round" opacity=".5" />
        </g>
      );
    case "kit":
      return (
        <g>
          <rect x="108" y="228" width="184" height="134" rx="18" fill={body} />
          <rect x="108" y="228" width="184" height="32" fill={p.dark} opacity=".22" />
          <rect x="128" y="154" width="54" height="112" rx="22" fill={head} transform="rotate(-11 155 210)" />
          <rect x="220" y="146" width="48" height="120" rx="24" fill={head} transform="rotate(10 244 206)" />
          <rect x="178" y="278" width="44" height="44" rx="9" fill="#fff" opacity=".42" />
          <path d="M108 260h184" stroke="#fff" strokeOpacity=".18" strokeWidth="3" />
        </g>
      );
    case "balm":
      return (
        <g>
          <ellipse cx="200" cy="298" rx="102" ry="28" fill={p.dark} opacity=".18" />
          <rect x="118" y="238" width="164" height="94" rx="18" fill={body} />
          <ellipse cx="200" cy="238" rx="82" ry="25" fill={head} />
          <ellipse cx="200" cy="237" rx="59" ry="15" fill="#fff" opacity=".35" />
          <rect x="168" y="270" width="64" height="6" rx="3" fill={p.dark} opacity=".3" />
          <rect x="180" y="286" width="40" height="5" rx="2.5" fill={p.dark} opacity=".2" />
        </g>
      );
    case "blindfold":
      return (
        <g transform="rotate(-12 200 260)">
          <path d="M102 262c42-32 154-32 196 0-30 42-166 42-196 0Z" fill={body} />
          <path d="M102 262c-28-17-42-35-34-50M298 262c28-17 42-35 34-50" fill="none" stroke={p.dark} strokeWidth="11" strokeLinecap="round" />
          <ellipse cx="200" cy="270" rx="76" ry="17" fill="#fff" opacity=".13" />
          <path d="M126 254c34-17 116-17 148 0" fill="none" stroke="#fff" strokeOpacity=".18" strokeWidth="4" />
        </g>
      );
    default:
      return (
        <g>
          <rect x="142" y="176" width="116" height="184" rx="40" fill={body} />
          <circle cx="200" cy="176" r="42" fill={head} />
          <rect x="164" y="208" width="72" height="100" rx="30" fill={shine} opacity=".5" />
          <circle cx="200" cy="318" r="8" fill={p.dark} opacity=".3" />
        </g>
      );
  }
}
