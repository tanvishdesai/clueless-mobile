// Mirrors camera-wardrobe-ingestion/convex/schema.ts. Kept by hand rather than
// imported so this site doesn't need the Expo app's node_modules to build.

export type Attrs = {
  name: string;
  category: string;
  subtype: string;
  primaryColor: string;
  primaryHex: string;
  secondaryColors: string[];
  secondaryHexes: string[];
  pattern: string;
  material: string;
  fit: string;
  formality: string;
  seasons: string[];
  tags: string[];
  notes: string;
  brand?: string;
  scentFamily?: string;
  topNotes?: string[];
  heartNotes?: string[];
  baseNotes?: string[];
  sizeMl?: number;
};

export type Item = {
  _id: string;
  _creationTime: number;
  status: "pending" | "done" | "error";
  error?: string;
  attrs?: Attrs;
  frontUrl: string | null;
  backUrl: string | null;
};

/** An item the ingest worker has finished tagging. */
export type Tagged = Item & { attrs: Attrs };
export const isTagged = (it: Item): it is Tagged => it.status === "done" && !!it.attrs;

export const ROLES = [
  "outerwear", "top", "underlayer", "bottom", "dress", "footwear", "accessory", "fragrance",
] as const;
export type Role = (typeof ROLES)[number];

export type Piece = { id: string; role: Role | string; note: string };
export type Swap = { id: string; replaces: string; note: string };

export type Look = {
  title: string;
  tagline: string;
  direction: string;
  pieces: Piece[];
  why: string;
  tips: string[];
  swaps: Swap[];
};

export type Lookbook = { read: string; gaps: string; looks: Look[] };

export type LookRequest = {
  _id: string;
  _creationTime: number;
  occasion: string;
  constraints: string;
  anchorIds?: string[];
  status: "pending" | "styling" | "done" | "error";
  error?: string;
  result?: Lookbook;
  favorite?: boolean;
  model?: string;
  startedAt?: number;
  finishedAt?: number;
};

export type Heartbeat = { lastSeen: number; model: string; busy: boolean } | null;

export const FORMALITY = ["loungewear", "casual", "smart-casual", "business", "formal"] as const;
