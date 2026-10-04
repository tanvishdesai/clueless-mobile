import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

// Closed sets: a shirt is a shirt. These never need discovering, so they're
// enums in the Claude JSON schema (see convex/classify.ts) and typed here.
export const CATEGORIES = [
  "top", "bottom", "dress", "outerwear", "footwear", "accessory", "underlayer",
  "fragrance", "other",
] as const;
export const PATTERNS = [
  "solid", "stripe", "check", "plaid", "floral", "graphic", "logo",
  "colorblock", "textured", "camo", "animal", "abstract", "other",
] as const;
export const FITS = ["slim", "regular", "relaxed", "oversized", "n/a"] as const;
export const FORMALITY = ["loungewear", "casual", "smart-casual", "business", "formal"] as const;
export const SEASONS = ["spring", "summer", "autumn", "winter"] as const;

const attrs = v.object({
  name: v.string(),              // "navy oxford button-down"
  category: v.string(),          // CATEGORIES
  subtype: v.string(),           // open vocab: "oxford shirt", "chinos"
  primaryColor: v.string(),      // open vocab colour name: "navy"
  primaryHex: v.string(),        // "#1b2a4a" - objective, drives outfit matching
  secondaryColors: v.array(v.string()),
  secondaryHexes: v.array(v.string()),
  pattern: v.string(),           // PATTERNS
  material: v.string(),          // open vocab: "cotton", "denim"
  fit: v.string(),               // FITS
  formality: v.string(),         // FORMALITY
  seasons: v.array(v.string()),  // SEASONS
  tags: v.array(v.string()),     // open vocab, free-form
  notes: v.string(),

  // Present on anything with a visible maker; the backbone of a fragrance entry.
  brand: v.optional(v.string()),

  // Fragrance only. Garment fields above stay filled (bottle colour, "n/a" fit)
  // so one table serves every query, but these carry what actually matters when
  // recommending a scent.
  scentFamily: v.optional(v.string()),   // "fresh citrus", "woody aromatic"
  topNotes: v.optional(v.array(v.string())),
  heartNotes: v.optional(v.array(v.string())),
  baseNotes: v.optional(v.array(v.string())),
  sizeMl: v.optional(v.number()),
});

// Roles a piece can play in an outfit. Closed set: the showcase lays a look
// out by role (outerwear behind the top, shoes at the bottom, ...).
export const ROLES = [
  "outerwear", "top", "underlayer", "bottom", "dress", "footwear", "accessory", "fragrance",
] as const;

// What the stylist writes back. Item ids, not the short refs the model saw.
const look = v.object({
  title: v.string(),             // "Monet, But Make It Close-Up"
  tagline: v.string(),           // one line, the pull quote
  direction: v.string(),         // "polished prep", "the bold colour story"
  pieces: v.array(v.object({
    id: v.id("items"),
    role: v.string(),            // ROLES
    note: v.string(),            // margin annotation, a few words
  })),
  why: v.string(),               // why it works for this occasion
  tips: v.array(v.string()),     // how to wear it: tuck, roll, button
  swaps: v.array(v.object({
    id: v.id("items"),           // the alternative
    replaces: v.id("items"),     // the piece it stands in for
    note: v.string(),
  })),
});

const lookbook = v.object({
  read: v.string(),              // the stylist's read of the brief
  gaps: v.string(),              // what the closet is missing for this, or ""
  looks: v.array(look),
});

export default defineSchema({
  items: defineTable({
    frontId: v.id("_storage"),
    backId: v.id("_storage"),
    status: v.union(v.literal("pending"), v.literal("done"), v.literal("error")),
    error: v.optional(v.string()),
    // Operator correction fed back into the next classification attempt.
    hint: v.optional(v.string()),
    attrs: v.optional(attrs),
  }).index("by_status", ["status"]),

  // Running label vocabulary for the open fields. Fed back into every prompt so
  // item #100 reuses the words item #3 invented instead of coining a synonym.
  vocab: defineTable({
    field: v.string(),
    value: v.string(),
    count: v.number(),
  }).index("by_field_value", ["field", "value"]),

  // ── Wardrobe showcase (../wardrobe-showcase) ───────────────────────────────
  // One row per "dress me for X" request. The website inserts it pending; the
  // stylist worker (wardrobe-showcase/worker/stylist.mjs) claims it, asks Claude
  // Opus 5.5 for looks, and writes the lookbook back. Same shape as ingestion:
  // the browser queues, the laptop thinks.
  looks: defineTable({
    occasion: v.string(),
    constraints: v.string(),
    // Pieces every look must be built around ("build a look around this").
    anchorIds: v.optional(v.array(v.id("items"))),
    status: v.union(
      v.literal("pending"), v.literal("styling"), v.literal("done"), v.literal("error"),
    ),
    error: v.optional(v.string()),
    result: v.optional(lookbook),
    favorite: v.optional(v.boolean()),
    model: v.optional(v.string()),
    startedAt: v.optional(v.number()),
    finishedAt: v.optional(v.number()),
  }).index("by_status", ["status"]),

  // Liveness for the stylist worker, so the site can say "the stylist's computer
  // is off" instead of spinning forever.
  heartbeats: defineTable({
    worker: v.string(),
    lastSeen: v.number(),
    model: v.string(),
    busy: v.boolean(),
  }).index("by_worker", ["worker"]),
});
