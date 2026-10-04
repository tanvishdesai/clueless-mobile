import { colorSortKey } from "./color";
import { FORMALITY, type Tagged } from "./types";

export const CATEGORY_ORDER = [
  "outerwear", "top", "dress", "bottom", "underlayer", "footwear", "accessory", "fragrance", "other",
];

export const CATEGORY_LABEL: Record<string, string> = {
  outerwear: "Outerwear", top: "Tops", dress: "Dresses", bottom: "Bottoms", underlayer: "Underlayers",
  footwear: "Shoes", accessory: "Accessories", fragrance: "Fragrance", other: "Other",
};

/** Things that hang. Everything else sits on the shelf. */
export const HANGS = new Set(["outerwear", "top", "dress", "bottom", "underlayer"]);

export type Sort = "colour" | "recent" | "formality";

export function sortItems(items: Tagged[], sort: Sort): Tagged[] {
  const out = [...items];
  if (sort === "colour") out.sort((a, b) => colorSortKey(a.attrs.primaryHex) - colorSortKey(b.attrs.primaryHex));
  if (sort === "recent") out.sort((a, b) => b._creationTime - a._creationTime);
  if (sort === "formality") {
    const f = (x: Tagged) => FORMALITY.indexOf(x.attrs.formality as (typeof FORMALITY)[number]);
    out.sort((a, b) => f(a) - f(b) || colorSortKey(a.attrs.primaryHex) - colorSortKey(b.attrs.primaryHex));
  }
  return out;
}

export function groupByCategory(items: Tagged[]): [string, Tagged[]][] {
  const map = new Map<string, Tagged[]>();
  for (const it of items) {
    const c = CATEGORY_ORDER.includes(it.attrs.category) ? it.attrs.category : "other";
    if (!map.has(c)) map.set(c, []);
    map.get(c)!.push(it);
  }
  return CATEGORY_ORDER.filter((c) => map.has(c)).map((c) => [c, map.get(c)!]);
}

export function matchesQuery(it: Tagged, q: string): boolean {
  if (!q) return true;
  const a = it.attrs;
  const hay = [a.name, a.subtype, a.primaryColor, a.material, a.pattern, a.brand, a.formality, ...a.tags, ...a.secondaryColors]
    .filter(Boolean).join(" ").toLowerCase();
  return q.toLowerCase().split(/\s+/).every((w) => hay.includes(w));
}

/** "FILE 007" - a stable catalogue number, in upload order. */
export function fileNumbers(items: { _id: string; _creationTime: number }[]) {
  const sorted = [...items].sort((a, b) => a._creationTime - b._creationTime);
  return new Map(sorted.map((it, i) => [it._id, String(i + 1).padStart(3, "0")]));
}
