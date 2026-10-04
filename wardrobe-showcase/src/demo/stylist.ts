import { judge } from "../lib/match";
import { FORMALITY, type Look, type Lookbook, type LookRequest, type Piece, type Tagged } from "../lib/types";

/**
 * The demo's stand-in for Claude Opus 5.5: enumerates outfits, scores them with
 * the same MIS-MATCH judge Dress Me uses, and writes them up from templates.
 * Good enough to show the flow; the real stylist actually reads the brief.
 */

type F = (typeof FORMALITY)[number];

const CUES: [RegExp, F[]][] = [
  [/gala|black.?tie|wedding|prom|formal|opera|cocktail/i, ["formal", "business", "smart-casual"]],
  [/interview|office|work|meeting|debate|present|court|lawyer|pitch/i, ["business", "smart-casual"]],
  [/party|date|dinner|club|opening|screening|night out/i, ["smart-casual", "formal"]],
  [/school|class|brunch|lunch|coffee|museum|shopping|mall/i, ["smart-casual", "casual"]],
  [/beach|picnic|park|hang|homies|errand|hike|bike|game/i, ["casual", "loungewear"]],
  [/home|lounge|sleepover|movie night|study/i, ["loungewear", "casual"]],
];

const TITLES = [
  "Ray of Sunshine", "Two Snaps Up", "A Full-On Monet (Up Close, Too)", "Totally Buggin'",
  "As If (In a Good Way)", "Rollin' With the Homies", "Way Harsh on Everyone Else", "Sporadically Perfect",
  "Surfing the Colour Wave", "Not Even Remotely Clueless",
];
const TAGLINES = [
  "Searching for a better outfit would be as useless as searching for meaning in a Pauly Shore movie.",
  "Ensemble-y challenged? Not today.",
  "Looks good from far away, and from up close.",
  "Two snaps, and a twist.",
  "Whatever. (It's perfect.)",
];

const NOTES: Record<string, string[]> = {
  outerwear: ["the layer that makes it look planned", "drape it over the shoulders indoors"],
  top: ["keep it tucked for a clean waist", "the quiet piece that lets the rest talk"],
  underlayer: ["peeking out at the hem on purpose"],
  bottom: ["sets the proportion for everything else", "the anchor of the look"],
  dress: ["one piece, zero decisions", "let it do all the work"],
  footwear: ["grounds the look", "repeats the darkest colour up top"],
  accessory: ["the wink", "one detail, not five"],
  fragrance: ["a spritz on the wrists, not a cloud"],
};

const roleOf = (it: Tagged): Piece["role"] =>
  ({ outerwear: "outerwear", top: "top", bottom: "bottom", dress: "dress", footwear: "footwear",
    accessory: "accessory", underlayer: "underlayer", fragrance: "fragrance" } as Record<string, string>)[it.attrs.category] ?? "accessory";

const pick = <T,>(xs: T[], seed: number) => xs[Math.abs(seed) % xs.length];
const hash = (s: string) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) | 0, 7);

export function demoStyle(closet: Tagged[], req: Pick<LookRequest, "occasion" | "constraints" | "anchorIds">): Lookbook {
  const brief = `${req.occasion} ${req.constraints}`;
  const target = CUES.find(([re]) => re.test(brief))?.[1] ?? ["smart-casual", "casual"];
  const banned = [...req.constraints.matchAll(/no\s+([a-z]+)/gi)].map((m) => m[1].toLowerCase());
  const ok = (it: Tagged) => !banned.some((b) => it.attrs.primaryColor.includes(b) || it.attrs.subtype.includes(b));
  const pool = closet.filter(ok);
  const by = (c: string) => pool.filter((it) => it.attrs.category === c);
  const anchors = (req.anchorIds ?? []).map((id) => closet.find((c) => c._id === id)).filter(Boolean) as Tagged[];

  const fit = (pieces: Tagged[]) =>
    pieces.filter((p) => p.attrs.category !== "fragrance").reduce((s, p) => s + (target.includes(p.attrs.formality as F) ? 6 : -8), 0);
  const score = (pieces: Tagged[]) => judge(pieces).score + fit(pieces);

  // A pinned top, bottom or dress decides the outfit's base; anything else is added on.
  const isCore = (it: Tagged) => ["top", "bottom", "dress"].includes(it.attrs.category);
  const coreAnchors = anchors.filter(isCore);
  const bases: Tagged[][] = [
    ...by("dress").map((d) => [d]),
    ...by("top").flatMap((t) => by("bottom").map((b) => [t, b])),
  ].filter((base) => coreAnchors.every((a) => base.includes(a)));
  const best = (base: Tagged[], options: Tagged[]) =>
    options.reduce<{ it?: Tagged; s: number }>((acc, it) => {
      const s = score([...base, it]);
      return s > acc.s ? { it, s } : acc;
    }, { s: score(base) - 4 }).it;

  const candidates = bases
    .map((base) => {
      const look = [...base];
      for (const a of anchors) if (!isCore(a) && !look.includes(a)) look.push(a);
      const shoe = best(look, by("footwear")); if (shoe) look.push(shoe);
      const layer = best(look, by("outerwear")); if (layer && !look.includes(layer)) look.push(layer);
      const acc = best(look, by("accessory").filter((x) => !look.includes(x))); if (acc) look.push(acc);
      return { look, s: score(look) };
    })
    .filter((c) => anchors.every((a) => c.look.includes(a)))
    .sort((a, b) => b.s - a.s);

  const chosen: Tagged[][] = [];
  for (const c of candidates) {
    const core = c.look.filter((p) => ["top", "bottom", "dress"].includes(p.attrs.category));
    if (chosen.some((l) => core.some((p) => l.includes(p)))) continue;
    chosen.push(c.look);
    if (chosen.length === 3) break;
  }
  if (!chosen.length) throw new Error("Nothing in the closet fits that brief. Way harsh.");

  const seed = hash(brief);
  const looks: Look[] = chosen.map((pieces, i) => {
    const v = judge(pieces);
    const names = pieces.map((p) => p.attrs.name);
    return {
      title: pick(TITLES, seed + i * 5),
      tagline: pick(TAGLINES, seed + i * 3),
      direction: i === 0 ? "the safe bet" : i === 1 ? "a different colour story" : "the wildcard",
      pieces: pieces.map((p, j) => ({ id: p._id, role: roleOf(p), note: pick(NOTES[roleOf(p)] ?? ["the wink"], seed + j) })),
      why: `${names.slice(0, -1).join(", ")} and ${names.at(-1)}. ${v.notes.filter((n) => n.ok).map((n) => n.text).join(" ")} Pitched at ${target[0]} for "${req.occasion.slice(0, 60)}".`,
      tips: ["Tuck the top to give the waist a line.", "Pick one statement and let everything else be quiet."],
      swaps: [],
    };
  });

  return {
    read: `Demo stylist: I heard "${target.join(" / ")}" in that. The real one (Claude Opus 5.5) actually reads your brief.`,
    gaps: "",
    looks,
  };
}

/**
 * The demo's fitting-room replies: judge the outfit before and after what you
 * tried on, and answer from the MATCH checker's notes. The real Cher reads the
 * words too; this one only has eyes.
 */
export function demoNote(
  closet: Tagged[],
  before: Piece[],
  after: Piece[],
  tried: boolean,
): { text: string; verdict: "yes" | "no" | "depends"; proposal?: { title: string; pieces: Piece[] } } {
  const items = (ps: Piece[]) => ps.map((p) => closet.find((c) => c._id === p.id)).filter(Boolean) as Tagged[];
  if (!tried) {
    return {
      verdict: "depends",
      text: "I'm the demo stand-in, so I can only judge what you try on. Click a piece on the left to swap it, or pull something off the rack, and pass me the note again. The real Cher (Claude Opus 5.5) reads every word.",
    };
  }
  const was = judge(items(before));
  const now = judge(items(after));
  const cap = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);
  const good = now.notes.filter((n) => n.ok).map((n) => cap(n.text));
  const bad = now.notes.filter((n) => !n.ok).map((n) => cap(n.text));
  if (now.match && now.score >= was.score - 6) {
    return {
      verdict: "yes",
      text: `Totally. ${good.slice(0, 2).join(" ")} It scores ${now.score} against ${was.score} for the original.`,
      proposal: { title: "Your version", pieces: after.map((p) => ({ ...p, note: p.note || "your call, and a good one" })) },
    };
  }
  if (!now.match) {
    return {
      verdict: "no",
      text: `As if. ${bad.slice(0, 2).join(" ")} I'd stay with what we had.`,
      proposal: { title: "Back to the original", pieces: before },
    };
  }
  return {
    verdict: "depends",
    text: `It works, just not as well: ${now.score} against ${was.score}. ${bad[0] ?? good[0] ?? ""} Wear it if you love that piece.`,
    proposal: { title: "Your version", pieces: after.map((p) => ({ ...p, note: p.note || "only if you love it" })) },
  };
}
