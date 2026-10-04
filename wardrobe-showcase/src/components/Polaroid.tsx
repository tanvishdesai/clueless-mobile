import { useState, type CSSProperties, type ReactNode } from "react";
import type { Item } from "../lib/types";
import { inkOn } from "../lib/color";

type Props = {
  item: Item;
  caption?: ReactNode;
  side?: "front" | "back";
  /** Show the back photo on hover. */
  peek?: boolean;
  tilt?: number;
  tape?: boolean;
  badge?: ReactNode;
  className?: string;
  style?: CSSProperties;
  onClick?: () => void;
};

/**
 * The film's virtual closet started as Polaroids of every garment, cut out
 * like paper dolls. Every photo here sits in one.
 */
export function Polaroid({ item, caption, side = "front", peek, tilt = 0, tape, badge, className = "", style, onClick }: Props) {
  const Tag = onClick ? "button" : "span";
  return (
    <Tag
      className={`polaroid ${peek ? "peek" : ""} ${className}`}
      style={{ ...style, ["--tilt" as string]: `${tilt}deg` }}
      onClick={onClick}
      type={onClick ? "button" : undefined}
    >
      {tape && <span className="tape" aria-hidden />}
      <span className="polaroid-photo">
        <Photo item={item} side={side} />
        {peek && item.backUrl && <Photo item={item} side="back" className="polaroid-back" />}
      </span>
      {caption && <span className="polaroid-caption">{caption}</span>}
      {badge && <span className="polaroid-badge">{badge}</span>}
    </Tag>
  );
}

export function Photo({ item, side = "front", className = "" }: { item: Item; side?: "front" | "back"; className?: string }) {
  const [failed, setFailed] = useState(false);
  const url = side === "back" ? item.backUrl ?? item.frontUrl : item.frontUrl;
  const hex = item.attrs?.primaryHex ?? "#d3cec6";
  if (!url || failed) {
    return (
      <span className={`photo-missing ${className}`} style={{ background: hex, color: inkOn(hex) }}>
        {item.attrs?.subtype ?? "…"}
      </span>
    );
  }
  return (
    <img
      className={className}
      src={url}
      alt={item.attrs ? `${item.attrs.name}, ${side}` : `garment, ${side}`}
      loading="lazy"
      decoding="async"
      draggable={false}
      onError={() => setFailed(true)}
    />
  );
}

/** Deterministic little tilt per id, so a collage doesn't reshuffle on every render. */
export function tiltFor(id: string, range = 4) {
  let h = 0;
  for (const c of id) h = (h * 33 + c.charCodeAt(0)) | 0;
  return ((Math.abs(h) % 1000) / 1000 - 0.5) * 2 * range;
}
