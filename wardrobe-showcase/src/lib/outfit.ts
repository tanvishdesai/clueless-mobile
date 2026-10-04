import type { Change, Item, Piece } from "./types";

// The fitting room's arithmetic: what's on the collage after you try things on.

const ROLE_OF: Record<string, string> = {
  outerwear: "outerwear", top: "top", underlayer: "underlayer", bottom: "bottom", dress: "dress",
  footwear: "footwear", accessory: "accessory", fragrance: "fragrance",
};
export const roleFor = (it: Item | undefined) => ROLE_OF[it?.attrs?.category ?? ""] ?? "accessory";

export const NO_CHANGE: Change = { add: [], swap: [], remove: [] };
export const isEmpty = (c: Change) => !c.add.length && !c.swap.length && !c.remove.length;

export function applyChange(worn: Piece[], c: Change, index: Map<string, Item>): Piece[] {
  const out = worn
    .filter((p) => !c.remove.includes(p.id))
    .map((p) => {
      const s = c.swap.find((x) => x.out === p.id);
      return s ? { id: s.in, role: roleFor(index.get(s.in)), note: "" } : p;
    });
  for (const id of c.add) if (!out.some((p) => p.id === id)) out.push({ id, role: roleFor(index.get(id)), note: "" });
  return out;
}

/** Folding one more action into the pending change, so "add X, then swap X for Y" reads as "add Y". */
export function addTo(c: Change, action: { add: string } | { swap: { out: string; in: string } } | { remove: string }): Change {
  if ("add" in action) {
    if (c.remove.includes(action.add)) return { ...c, remove: c.remove.filter((x) => x !== action.add) };
    return { ...c, add: [...c.add, action.add] };
  }
  if ("swap" in action) {
    const { out, in: inn } = action.swap;
    if (c.add.includes(out)) return { ...c, add: c.add.map((x) => (x === out ? inn : x)) };
    const prior = c.swap.find((s) => s.in === out);
    if (prior) return { ...c, swap: c.swap.map((s) => (s === prior ? { ...s, in: inn } : s)) };
    return { ...c, swap: [...c.swap, { out, in: inn }] };
  }
  const id = action.remove;
  if (c.add.includes(id)) return { ...c, add: c.add.filter((x) => x !== id) };
  const prior = c.swap.find((s) => s.in === id);
  if (prior) return { ...c, swap: c.swap.filter((s) => s !== prior), remove: [...c.remove, prior.out] };
  return { ...c, remove: [...c.remove, id] };
}

export const samePieces = (a: { id: string }[], b: { id: string }[]) =>
  a.length === b.length && a.every((p) => b.some((q) => q.id === p.id));

/** "What if I add the denim jacket and swap the watch for the silver watch?" */
export function askAbout(c: Change, index: Map<string, Item>): string {
  const name = (id: string) => `the ${index.get(id)?.attrs?.name ?? "piece"}`;
  const bits = [
    ...c.add.map((id) => `add ${name(id)}`),
    ...c.swap.map((s) => `swap ${name(s.out)} for ${name(s.in)}`),
    ...c.remove.map((id) => `lose ${name(id)}`),
  ];
  if (!bits.length) return "";
  const list = bits.length > 1 ? `${bits.slice(0, -1).join(", ")} and ${bits.at(-1)}` : bits[0];
  return `What if I ${list}?`;
}
