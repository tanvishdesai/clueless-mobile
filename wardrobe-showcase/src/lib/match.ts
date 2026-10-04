import { close, hexToHsl, hueGap, isNeutral } from "./color";
import { FORMALITY, type Tagged } from "./types";

export type Verdict = {
  score: number;          // 0-100
  match: boolean;
  notes: { ok: boolean; text: string }[];
};

const BUSY = new Set(["stripe", "check", "plaid", "floral", "graphic", "logo", "colorblock", "camo", "animal", "abstract"]);
const short = (it: Tagged) => it.attrs.subtype || it.attrs.name;

/**
 * Cher's computer said MATCH or MIS-MATCH. This is the same call, made the way
 * a stylist would: colour harmony from the actual hexes, whether the dress
 * codes agree, whether two patterns are shouting, whether it's all one season.
 * Instant and local; the considered opinion comes from Ask Cher.
 */
export function judge(pieces: Tagged[]): Verdict {
  const notes: Verdict["notes"] = [];
  let score = 100;
  const worn = pieces.filter((p) => p.attrs.category !== "fragrance");
  if (worn.length < 2) return { score: 0, match: false, notes: [{ ok: false, text: "Pick at least two pieces." }] };

  // Formality: a tux jacket with gym shorts is the classic MIS-MATCH.
  const levels = worn
    .map((p) => ({ p, i: FORMALITY.indexOf(p.attrs.formality as (typeof FORMALITY)[number]) }))
    .filter((x) => x.i >= 0);
  if (levels.length >= 2) {
    const lo = levels.reduce((a, b) => (b.i < a.i ? b : a));
    const hi = levels.reduce((a, b) => (b.i > a.i ? b : a));
    const spread = hi.i - lo.i;
    if (spread >= 3) {
      score -= 45;
      notes.push({ ok: false, text: `Dress-code whiplash: ${short(hi.p)} is ${hi.p.attrs.formality}, ${short(lo.p)} is ${lo.p.attrs.formality}.` });
    } else if (spread === 2) {
      score -= 18;
      notes.push({ ok: false, text: `A stretch between ${hi.p.attrs.formality} and ${lo.p.attrs.formality} - make it look deliberate.` });
    } else {
      notes.push({ ok: true, text: `Dress codes agree (${[...new Set(levels.map((l) => l.p.attrs.formality))].join(" / ")}).` });
    }
  }

  // Colour: neutrals are free; count the colour families that are left.
  const chroma = worn.filter((p) => !isNeutral(p.attrs.primaryHex));
  const families: { h: number; p: Tagged }[] = [];
  for (const p of chroma) {
    const h = hexToHsl(p.attrs.primaryHex).h;
    if (!families.some((f) => hueGap(f.h, h) < 32)) families.push({ h, p });
  }
  if (families.length === 0) {
    notes.push({ ok: true, text: "All neutrals - quiet, expensive, impossible to get wrong." });
  } else if (families.length === 1) {
    notes.push({ ok: true, text: `One colour story (${families[0].p.attrs.primaryColor}) on a neutral base.` });
  } else if (families.length === 2) {
    const [a, b] = families;
    const gap = hueGap(a.h, b.h);
    const pair = `${a.p.attrs.primaryColor} + ${b.p.attrs.primaryColor}`;
    if (gap <= 45) notes.push({ ok: true, text: `${pair} sit next to each other on the wheel - harmonious.` });
    else if (gap >= 150) {
      score -= 6;
      notes.push({ ok: true, text: `${pair} are complements - bold, so commit to it.` });
    } else if (gap >= 105) {
      score -= 12;
      notes.push({ ok: false, text: `${pair} is a triad - works if one of them leads.` });
    } else {
      score -= 28;
      notes.push({ ok: false, text: `${pair}: close enough to look like a near-miss.` });
    }
  } else {
    score -= 34;
    notes.push({ ok: false, text: `${families.length} loud colours (${families.map((f) => f.p.attrs.primaryColor).join(", ")}) fighting for the lead.` });
  }

  // Pattern: two busy prints clash, unless they're a matched set (the yellow plaid suit).
  const busy = worn.filter((p) => BUSY.has(p.attrs.pattern));
  if (busy.length >= 2) {
    const coord = busy.every((p) => p.attrs.pattern === busy[0].attrs.pattern && close(p.attrs.primaryHex, busy[0].attrs.primaryHex));
    if (coord) {
      score = Math.min(100, score + 8);
      notes.push({ ok: true, text: `Matching ${busy[0].attrs.pattern} set. Very first-day-of-school.` });
    } else {
      score -= 30;
      notes.push({ ok: false, text: `${busy.map((p) => p.attrs.pattern).join(" vs ")} - two patterns competing.` });
    }
  }

  // Season: everything should want the same weather.
  const seasonal = worn.filter((p) => p.attrs.seasons?.length);
  if (seasonal.length >= 2) {
    const common = seasonal.reduce<string[]>(
      (acc, p) => acc.filter((s) => p.attrs.seasons.includes(s)),
      seasonal[0].attrs.seasons,
    );
    if (!common.length) {
      score -= 15;
      notes.push({ ok: false, text: "These pieces don't share a season." });
    } else if (common.length < 4) {
      notes.push({ ok: true, text: `Works for ${common.join(" & ")}.` });
    }
  }

  score = Math.max(0, Math.min(100, Math.round(score)));
  return { score, match: score >= 60, notes };
}
