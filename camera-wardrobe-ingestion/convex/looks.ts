import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/**
 * Outfit requests for the wardrobe showcase (../wardrobe-showcase).
 *
 * Lives here because a Convex deployment has exactly one functions directory and
 * this one already owns the closet. The website queues a request; the stylist
 * worker on your laptop claims it, asks Claude Opus 5.5, and writes the lookbook
 * back. The website is subscribed to the row, so the result just appears.
 */

const STYLIST_WORKER = "stylist";

export const request = mutation({
  args: {
    occasion: v.string(),
    constraints: v.string(),
    anchorIds: v.optional(v.array(v.id("items"))),
  },
  handler: async (ctx, { occasion, constraints, anchorIds }) => {
    const o = occasion.trim();
    if (!o) throw new Error("tell the stylist where you're going");
    return ctx.db.insert("looks", {
      occasion: o.slice(0, 600),
      constraints: constraints.trim().slice(0, 1200),
      anchorIds: anchorIds?.length ? anchorIds.slice(0, 4) : undefined,
      status: "pending",
    });
  },
});

/** The lookbook archive, newest first. */
export const list = query(async (ctx) => ctx.db.query("looks").order("desc").take(60));

export const get = query({
  args: { id: v.id("looks") },
  handler: async (ctx, { id }) => ctx.db.get(id),
});

/** The stylist worker's queue, oldest first. */
export const pending = query(async (ctx) =>
  ctx.db.query("looks").withIndex("by_status", (q) => q.eq("status", "pending")).take(10),
);

/** Worker takes a request. False if someone else already did. */
export const claim = mutation({
  args: { id: v.id("looks"), model: v.string() },
  handler: async (ctx, { id, model }) => {
    const row = await ctx.db.get(id);
    if (!row || row.status !== "pending") return false;
    await ctx.db.patch(id, { status: "styling", model, startedAt: Date.now() });
    return true;
  },
});

/** Worker writes the lookbook (or the failure) back. */
export const finish = mutation({
  args: { id: v.id("looks"), result: v.optional(v.any()), error: v.optional(v.string()) },
  handler: async (ctx, { id, result, error }) => {
    const finishedAt = Date.now();
    if (error || !result) {
      return ctx.db.patch(id, {
        status: "error",
        error: (error ?? "the stylist came back empty-handed").slice(0, 500),
        finishedAt,
      });
    }
    // The table validator checks the lookbook's shape on write.
    await ctx.db.patch(id, { status: "done", result, error: undefined, finishedAt });
  },
});

/** Put a failed or stuck request back in the queue. */
export const retry = mutation({
  args: { id: v.id("looks") },
  handler: async (ctx, { id }) =>
    ctx.db.patch(id, { status: "pending", error: undefined, result: undefined }),
});

export const setFavorite = mutation({
  args: { id: v.id("looks"), favorite: v.boolean() },
  handler: async (ctx, { id, favorite }) => ctx.db.patch(id, { favorite }),
});

export const remove = mutation({
  args: { id: v.id("looks") },
  handler: async (ctx, { id }) => {
    const notes = await ctx.db.query("notes").withIndex("by_look", (q) => q.eq("lookId", id)).collect();
    for (const n of notes) await ctx.db.delete(n._id);
    await ctx.db.delete(id);
  },
});

/** "Keep this version" from the fitting room: add a look to a finished lookbook. */
export const addLook = mutation({
  args: { id: v.id("looks"), look: v.any() },
  handler: async (ctx, { id, look }) => {
    const row = await ctx.db.get(id);
    if (!row?.result) throw new Error("that lookbook isn't finished");
    if (row.result.looks.length >= 9) throw new Error("this issue is full - nine looks is plenty");
    // The table validator checks the look's shape on write.
    await ctx.db.patch(id, { result: { ...row.result, looks: [...row.result.looks, look] } });
    return row.result.looks.length;
  },
});

export const heartbeat = mutation({
  args: { model: v.string(), busy: v.boolean() },
  handler: async (ctx, { model, busy }) => {
    const row = await ctx.db
      .query("heartbeats")
      .withIndex("by_worker", (q) => q.eq("worker", STYLIST_WORKER))
      .unique();
    const lastSeen = Date.now();
    if (row) await ctx.db.patch(row._id, { lastSeen, model, busy });
    else await ctx.db.insert("heartbeats", { worker: STYLIST_WORKER, lastSeen, model, busy });
  },
});

/**
 * When the stylist last checked in. Queries can't read the clock reactively,
 * so the client compares `lastSeen` against its own time.
 */
export const stylist = query(async (ctx) =>
  ctx.db
    .query("heartbeats")
    .withIndex("by_worker", (q) => q.eq("worker", STYLIST_WORKER))
    .unique(),
);
