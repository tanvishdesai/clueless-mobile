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
});
