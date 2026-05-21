"use client";

import { motion } from "framer-motion";
import type { AvatarConfig, Stats } from "@/lib/game/types";

interface Props {
  config: AvatarConfig;
  stats?: Stats;
  size?: number;
  className?: string;
}

/**
 * Stylised, composable SVG avatar. Layers (hair / face / outfit / accessory)
 * are driven by AvatarConfig. Mood overrides the eye + mouth shapes so
 * "tired" / "stressed" / "happy" read at a glance.
 *
 * Designed to be cheap to render dozens of times on the graph view as well.
 */
export function Avatar({ config, stats, size = 96, className }: Props) {
  const mood = deriveMood(config.mood, stats);
  const skin = config.skin;
  const hair = config.hairColor;
  const outfit = config.outfitColor;

  return (
    <motion.svg
      key={`${config.hair}-${config.outfit}-${config.accessory}-${mood}`}
      width={size}
      height={size}
      viewBox="0 0 120 120"
      className={className}
      initial={{ scale: 0.92, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
    >
      <defs>
        <radialGradient id="bg-grad" cx="50%" cy="40%" r="60%">
          <stop offset="0%" stopColor="rgba(255,214,0,0.15)" />
          <stop offset="100%" stopColor="rgba(255,214,0,0)" />
        </radialGradient>
      </defs>

      <circle cx="60" cy="60" r="58" fill="url(#bg-grad)" />

      <Outfit kind={config.outfit} color={outfit} />

      <Neck skin={skin} />

      <Head skin={skin} />

      <Hair kind={config.hair} color={hair} />

      <Eyes mood={mood} />
      <Mouth mood={mood} />

      <Accessory kind={config.accessory} />
    </motion.svg>
  );
}

type Mood = AvatarConfig["mood"];

function deriveMood(declared: Mood, stats?: Stats): Mood {
  if (!stats) return declared;
  if (stats.energy <= 20) return "tired";
  if (stats.study >= 80 && stats.energy < 40) return "stressed";
  if (stats.social >= 80 && stats.energy >= 40) return "happy";
  return declared;
}

function Head({ skin }: { skin: string }) {
  return (
    <>
      <ellipse cx="60" cy="52" rx="22" ry="24" fill={skin} />
      <ellipse cx="38" cy="56" rx="3" ry="4" fill={skin} opacity={0.8} />
      <ellipse cx="82" cy="56" rx="3" ry="4" fill={skin} opacity={0.8} />
    </>
  );
}

function Neck({ skin }: { skin: string }) {
  return <rect x="52" y="70" width="16" height="14" rx="4" fill={skin} />;
}

function Outfit({
  kind,
  color,
}: {
  kind: AvatarConfig["outfit"];
  color: string;
}) {
  switch (kind) {
    case "tee":
      return (
        <path
          d="M28 100 L40 80 Q60 88 80 80 L92 100 L92 120 L28 120 Z"
          fill={color}
        />
      );
    case "jacket":
      return (
        <>
          <path
            d="M22 100 L42 78 Q60 86 78 78 L98 100 L98 120 L22 120 Z"
            fill={color}
          />
          <path d="M60 86 L60 120" stroke="rgba(0,0,0,0.25)" strokeWidth="1.5" />
        </>
      );
    case "lab-coat":
      return (
        <>
          <path
            d="M24 100 L42 78 Q60 86 78 78 L96 100 L96 120 L24 120 Z"
            fill="#f6f6f6"
          />
          <path
            d="M60 84 L60 120"
            stroke={color}
            strokeWidth="3"
            strokeDasharray="2 3"
          />
        </>
      );
    case "uniform":
      return (
        <>
          <path
            d="M26 100 L42 80 Q60 88 78 80 L94 100 L94 120 L26 120 Z"
            fill="#1f2a44"
          />
          <path d="M48 82 L60 96 L72 82" fill="none" stroke="#fff" strokeWidth="2" />
        </>
      );
    case "hoodie":
    default:
      return (
        <>
          <path
            d="M22 100 L40 80 Q60 90 80 80 L98 100 L98 120 L22 120 Z"
            fill={color}
          />
          <path
            d="M44 80 Q60 92 76 80 L76 90 Q60 100 44 90 Z"
            fill={shade(color, -20)}
          />
        </>
      );
  }
}

function Hair({
  kind,
  color,
}: {
  kind: AvatarConfig["hair"];
  color: string;
}) {
  switch (kind) {
    case "buzz":
      return <path d="M40 36 Q60 28 80 36 L80 42 Q60 38 40 42 Z" fill={color} />;
    case "long":
      return (
        <>
          <path
            d="M38 36 Q60 22 82 36 L86 78 L78 78 L78 50 Q60 46 42 50 L42 78 L34 78 Z"
            fill={color}
          />
        </>
      );
    case "curly":
      return (
        <>
          <circle cx="44" cy="34" r="9" fill={color} />
          <circle cx="56" cy="28" r="10" fill={color} />
          <circle cx="68" cy="28" r="10" fill={color} />
          <circle cx="78" cy="34" r="9" fill={color} />
          <path d="M40 44 Q60 30 80 44 L80 50 Q60 46 40 50 Z" fill={color} />
        </>
      );
    case "messy":
      return (
        <>
          <path d="M38 38 Q44 22 58 30 Q68 18 78 32 Q88 30 84 46 Q60 36 40 46 Z" fill={color} />
        </>
      );
    case "short":
    default:
      return (
        <path
          d="M38 42 Q42 26 60 26 Q78 26 82 42 Q70 36 60 38 Q50 36 38 42 Z"
          fill={color}
        />
      );
  }
}

function Eyes({ mood }: { mood: Mood }) {
  if (mood === "tired") {
    return (
      <>
        <path d="M46 56 L54 56" stroke="#1a1a1a" strokeWidth="2.2" strokeLinecap="round" />
        <path d="M66 56 L74 56" stroke="#1a1a1a" strokeWidth="2.2" strokeLinecap="round" />
      </>
    );
  }
  if (mood === "happy") {
    return (
      <>
        <path d="M46 56 Q50 52 54 56" stroke="#1a1a1a" strokeWidth="2.2" fill="none" strokeLinecap="round" />
        <path d="M66 56 Q70 52 74 56" stroke="#1a1a1a" strokeWidth="2.2" fill="none" strokeLinecap="round" />
      </>
    );
  }
  if (mood === "stressed") {
    return (
      <>
        <circle cx="50" cy="56" r="2" fill="#1a1a1a" />
        <circle cx="70" cy="56" r="2" fill="#1a1a1a" />
        <path d="M44 50 L54 53" stroke="#1a1a1a" strokeWidth="1.6" strokeLinecap="round" />
        <path d="M76 50 L66 53" stroke="#1a1a1a" strokeWidth="1.6" strokeLinecap="round" />
      </>
    );
  }
  if (mood === "focused") {
    return (
      <>
        <circle cx="50" cy="56" r="1.8" fill="#1a1a1a" />
        <circle cx="70" cy="56" r="1.8" fill="#1a1a1a" />
        <path d="M44 53 L54 53" stroke="#1a1a1a" strokeWidth="1.6" strokeLinecap="round" />
        <path d="M66 53 L76 53" stroke="#1a1a1a" strokeWidth="1.6" strokeLinecap="round" />
      </>
    );
  }
  return (
    <>
      <circle cx="50" cy="56" r="2.4" fill="#1a1a1a" />
      <circle cx="70" cy="56" r="2.4" fill="#1a1a1a" />
    </>
  );
}

function Mouth({ mood }: { mood: Mood }) {
  if (mood === "happy") {
    return (
      <path
        d="M52 66 Q60 74 68 66"
        stroke="#1a1a1a"
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
      />
    );
  }
  if (mood === "tired") {
    return (
      <path
        d="M54 68 Q60 66 66 68"
        stroke="#1a1a1a"
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
      />
    );
  }
  if (mood === "stressed") {
    return (
      <path
        d="M54 70 Q60 64 66 70"
        stroke="#1a1a1a"
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
      />
    );
  }
  if (mood === "focused") {
    return <path d="M54 68 L66 68" stroke="#1a1a1a" strokeWidth="2" strokeLinecap="round" />;
  }
  return <path d="M54 68 Q60 70 66 68" stroke="#1a1a1a" strokeWidth="2" fill="none" strokeLinecap="round" />;
}

function Accessory({ kind }: { kind: AvatarConfig["accessory"] }) {
  switch (kind) {
    case "glasses":
      return (
        <>
          <circle cx="50" cy="56" r="6" fill="none" stroke="#1a1a1a" strokeWidth="1.8" />
          <circle cx="70" cy="56" r="6" fill="none" stroke="#1a1a1a" strokeWidth="1.8" />
          <path d="M56 56 L64 56" stroke="#1a1a1a" strokeWidth="1.8" />
        </>
      );
    case "headphones":
      return (
        <>
          <path d="M36 50 Q60 22 84 50" fill="none" stroke="#1a1a1a" strokeWidth="3" />
          <rect x="32" y="48" width="8" height="14" rx="3" fill="#1a1a1a" />
          <rect x="80" y="48" width="8" height="14" rx="3" fill="#1a1a1a" />
        </>
      );
    case "beanie":
      return (
        <path
          d="M36 34 Q60 14 84 34 L84 42 L36 42 Z"
          fill="#FFD600"
        />
      );
    case "none":
    default:
      return null;
  }
}

function shade(hex: string, amt: number) {
  const c = hex.startsWith("#") ? hex.slice(1) : hex;
  const num = parseInt(c, 16);
  let r = (num >> 16) + amt;
  let g = ((num >> 8) & 0xff) + amt;
  let b = (num & 0xff) + amt;
  r = clamp(r);
  g = clamp(g);
  b = clamp(b);
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}
function clamp(n: number) {
  return Math.max(0, Math.min(255, n));
}
