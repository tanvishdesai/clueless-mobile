import type { App } from "../lib/route";

// 32-unit pixel-grid icons in the spirit of System 7: crisp edges, a hard
// outline, flat colour. Each one is an object from the film.

const P = { shapeRendering: "crispEdges" as const };
const INK = "#1b1816";

/** Gold-and-wood hanger with a pink dress on it: the revolving closet. */
export function ClosetIcon() {
  return (
    <svg viewBox="0 0 32 32" aria-hidden {...P}>
      <path d="M15 2h2v1h1v2h-1v1h-1v2h-1V6h1V4h-1z" fill="#c9a24a" stroke={INK} strokeWidth=".6" />
      <path d="M16 8 3 14h26z" fill="#d39b5a" stroke={INK} strokeWidth="1" strokeLinejoin="round" />
      <path d="M8 14h16l-2 3 4 13H6l4-13z" fill="#f4a6c1" stroke={INK} strokeWidth="1" strokeLinejoin="round" />
      <path d="M10 17h12" stroke={INK} strokeWidth="1" />
      <path d="M12 20h1v1h-1zM17 23h1v1h-1zM14 26h1v1h-1zM19 19h1v1h-1z" fill="#fff" />
    </svg>
  );
}

/** A plaid dress form: the computer that dresses you. */
export function DressIcon() {
  return (
    <svg viewBox="0 0 32 32" aria-hidden {...P}>
      <defs>
        <pattern id="ip" width="4" height="4" patternUnits="userSpaceOnUse">
          <rect width="4" height="4" fill="#f2c12e" />
          <rect width="1" height="4" fill={INK} opacity=".7" />
          <rect width="4" height="1" fill={INK} opacity=".7" />
        </pattern>
      </defs>
      <path d="M11 3h10l1 3-2 5 3 9H9l3-9-2-5z" fill="url(#ip)" stroke={INK} strokeWidth="1" strokeLinejoin="round" />
      <rect x="15" y="20" width="2" height="8" fill="#8a6a22" stroke={INK} strokeWidth=".6" />
      <path d="M9 29h14v1H9z" fill={INK} />
      <rect x="14" y="1" width="4" height="2" fill="#c9a24a" stroke={INK} strokeWidth=".6" />
    </svg>
  );
}

/** Cher's cell phone, antenna up. */
export function PhoneIcon() {
  return (
    <svg viewBox="0 0 32 32" aria-hidden {...P}>
      <rect x="20" y="1" width="2" height="7" fill={INK} />
      <rect x="10" y="6" width="13" height="24" rx="2" fill="#c4c8ce" stroke={INK} strokeWidth="1" />
      <rect x="12" y="9" width="9" height="6" fill="#b9d6a4" stroke={INK} strokeWidth=".8" />
      <path d="M13 11h5M13 13h3" stroke={INK} strokeWidth=".8" />
      {[0, 1, 2].map((r) => [0, 1, 2].map((c) => (
        <rect key={`${r}${c}`} x={12 + c * 3.2} y={17 + r * 3.6} width="2.4" height="2.4" fill="#fbf6ec" stroke={INK} strokeWidth=".5" />
      )))}
      <path d="M2 4h7v5H6l-2 2V9H2z" fill="#fff" stroke={INK} strokeWidth=".8" />
      <path d="M4.5 5.6h2.4v1.2H6v.8" stroke={INK} strokeWidth=".7" fill="none" />
    </svg>
  );
}

/** A glossy teen magazine. */
export function LookbookIcon() {
  return (
    <svg viewBox="0 0 32 32" aria-hidden {...P}>
      <rect x="9" y="4" width="18" height="24" fill="#fbf6ec" stroke={INK} strokeWidth="1" transform="rotate(6 18 16)" />
      <rect x="5" y="3" width="18" height="25" fill="#f4a6c1" stroke={INK} strokeWidth="1" />
      <rect x="7" y="5" width="14" height="4" fill="#f2c12e" stroke={INK} strokeWidth=".6" />
      <path d="M12 12h6v10h-6z" fill="#c8102e" stroke={INK} strokeWidth=".6" />
      <path d="M7 24h7M7 26h5M17 24h4" stroke={INK} strokeWidth="1" />
    </svg>
  );
}

export function SwatchIcon() {
  return (
    <svg viewBox="0 0 32 32" aria-hidden {...P}>
      {["#f2c12e", "#f4a6c1", "#a9c6e6", "#c8102e"].map((c, i) => (
        <rect key={c} x="12" y="4" width="8" height="22" fill={c} stroke={INK} strokeWidth="1" transform={`rotate(${-36 + i * 24} 16 26)`} />
      ))}
      <circle cx="16" cy="26" r="2" fill="#fbf6ec" stroke={INK} />
    </svg>
  );
}

export function MoonIcon() {
  return (
    <svg viewBox="0 0 32 32" aria-hidden {...P}>
      <rect x="2" y="4" width="28" height="20" fill="#d6a35c" stroke={INK} />
      <circle cx="9" cy="10" r="2.4" fill="none" stroke="#2c1d10" strokeWidth="1.6" />
      <circle cx="22" cy="17" r="2.4" fill="none" stroke="#2c1d10" strokeWidth="1.6" />
      <circle cx="16" cy="8" r="1" fill="#2c1d10" />
      <path d="M13 16 9 18h8z" fill="#c9a24a" stroke={INK} strokeWidth=".6" />
      <rect x="11" y="25" width="10" height="3" fill="#dcd8d1" stroke={INK} />
    </svg>
  );
}

export const APP_ICON: Record<App, () => React.JSX.Element> = {
  closet: ClosetIcon,
  dress: DressIcon,
  ask: PhoneIcon,
  lookbook: LookbookIcon,
};

export const APP_LABEL: Record<App, string> = {
  closet: "Closet",
  dress: "Dress Me",
  ask: "Ask Cher",
  lookbook: "Lookbook",
};
