import { v } from "convex/values";
import { mutation, query, type QueryCtx } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";
import { requireMemberOrKey } from "./access";

// Every function takes an optional closet key: the camera app and ingest worker
// send it; the website is signed in instead. See access.ts.
const key = v.optional(v.string());

export const OPEN_FIELDS = ["subtype", "primaryColor", "material", "tags", "brand", "scentFamily"];

export const generateUploadUrl = mutation({
  args: { key },
  handler: async (ctx, { key }) => {
    await requireMemberOrKey(ctx, key);
    return ctx.storage.generateUploadUrl();
  },
});

/** Called by the camera once both photos of one article are uploaded. */
export const create = mutation({
  args: { frontId: v.id("_storage"), backId: v.id("_storage"), key },
  handler: async (ctx, { frontId, backId, key }) => {
    await requireMemberOrKey(ctx, key);
    return ctx.db.insert("items", { frontId, backId, status: "pending" });
  },
});

async function withUrls(ctx: QueryCtx, items: Doc<"items">[]) {
  return Promise.all(
    items.map(async (it) => ({
      ...it,
      frontUrl: await ctx.storage.getUrl(it.frontId),
      backUrl: await ctx.storage.getUrl(it.backId),
    })),
  );
}

export const list = query({
  args: { key },
  handler: async (ctx, { key }) => {
    await requireMemberOrKey(ctx, key);
    return withUrls(ctx, await ctx.db.query("items").order("desc").collect());
  },
});

/** The ingest worker's queue. */
export const pending = query({
  args: { key },
  handler: async (ctx, { key }) => {
    await requireMemberOrKey(ctx, key);
    return withUrls(
      ctx,
      await ctx.db.query("items").withIndex("by_status", (q) => q.eq("status", "pending")).collect(),
    );
  },
});

/** Running open-field vocabulary, most-used first, as {field: values[]}. */
export const vocab = query({
  args: { key },
  handler: async (ctx, { key }) => {
  await requireMemberOrKey(ctx, key);
  const rows = await ctx.db.query("vocab").collect();
  rows.sort((a, b) => b.count - a.count);
  const out: Record<string, string[]> = {};
  for (const f of OPEN_FIELDS) out[f] = [];
  for (const r of rows) (out[r.field] ??= []).push(r.value);
  return out;
  },
});

/** Worker writes a classification back. Table schema validates the shape. */
export const saveTags = mutation({
  args: { id: v.id("items"), attrs: v.optional(v.any()), error: v.optional(v.string()), key },
  handler: async (ctx, { id, attrs, error, key }) => {
    await requireMemberOrKey(ctx, key);
    if (error) return ctx.db.patch(id, { status: "error", error: error.slice(0, 500) });
    await ctx.db.patch(id, { status: "done", attrs, error: undefined });
    await learn(ctx, attrs);
  },
});

export const retry = mutation({
  args: { id: v.id("items"), key },
  handler: async (ctx, { id, key }) => {
    await requireMemberOrKey(ctx, key);
    await ctx.db.patch(id, { status: "pending", error: undefined });
  },
});

/**
 * Re-tag an item you know was read wrong, telling the model what it actually is.
 * The bad labels are unlearned first, otherwise a wrong word keeps biasing every
 * later garment through the vocabulary prompt.
 */
export const correct = mutation({
  args: { id: v.id("items"), hint: v.string(), key },
  handler: async (ctx, { id, hint, key }) => {
    await requireMemberOrKey(ctx, key);
    const it = await ctx.db.get(id);
    if (!it) throw new Error("no such item");
    await unlearn(ctx, it.attrs);
    await ctx.db.patch(id, { status: "pending", hint, attrs: undefined, error: undefined });
  },
});

/** Re-queues everything that never got classified. */
export const retryPending = mutation({
  args: { key },
  handler: async (ctx, { key }) => {
  await requireMemberOrKey(ctx, key);
  const stuck = (await ctx.db.query("items").collect()).filter((i) => i.status !== "done");
  for (const it of stuck) {
    await ctx.db.patch(it._id, { status: "pending", error: undefined });
  }
  return stuck.length;
  },
});

export const remove = mutation({
  args: { id: v.id("items"), key },
  handler: async (ctx, { id, key }) => {
    await requireMemberOrKey(ctx, key);
    const it = await ctx.db.get(id);
    if (!it) return;
    await ctx.storage.delete(it.frontId);
    await ctx.storage.delete(it.backId);
    await ctx.db.delete(id);
  },
});

/** Walks the open fields of `attrs`, calling `fn` for each (field, value). */
async function eachLabel(attrs: any, fn: (field: string, value: string) => Promise<void>) {
  if (!attrs) return;
  for (const field of OPEN_FIELDS) {
    const raw = attrs[field];
    for (const value of (Array.isArray(raw) ? raw : [raw]).filter(Boolean)) {
      await fn(field, value);
    }
  }
}

const vocabRow = (ctx: any, field: string, value: string) =>
  ctx.db
    .query("vocab")
    .withIndex("by_field_value", (q: any) => q.eq("field", field).eq("value", value))
    .unique();

/** Drops a wrong classification's labels back out of the vocabulary. */
async function unlearn(ctx: any, attrs: any) {
  await eachLabel(attrs, async (field, value) => {
    const row = await vocabRow(ctx, field, value);
    if (!row) return;
    if (row.count <= 1) await ctx.db.delete(row._id);
    else await ctx.db.patch(row._id, { count: row.count - 1 });
  });
}

async function learn(ctx: any, attrs: any) {
  await eachLabel(attrs, async (field, value) => {
    const row = await vocabRow(ctx, field, value);
    if (row) await ctx.db.patch(row._id, { count: row.count + 1 });
    else await ctx.db.insert("vocab", { field, value, count: 1 });
  });
}
