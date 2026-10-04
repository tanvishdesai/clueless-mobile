import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireKey, requireMember } from "./access";

const key = v.optional(v.string());

/**
 * The fitting room (../wardrobe-showcase): a conversation about one look.
 *
 * `send` writes your note and an empty reply from Cher in one go, so the site
 * can show "Cher is writing…" straight away. The stylist worker picks up the
 * pending reply, reads the thread for context, and fills it in.
 */

const change = v.object({
  add: v.array(v.id("items")),
  swap: v.array(v.object({ out: v.id("items"), in: v.id("items") })),
  remove: v.array(v.id("items")),
});
const outfit = v.array(v.object({ id: v.id("items"), role: v.string() }));

/** Recent notes across every lookbook; a personal closet's worth is small. */
export const list = query(async (ctx) => {
  await requireMember(ctx);
  return ctx.db.query("notes").order("desc").take(400);
});

export const send = mutation({
  args: {
    lookId: v.id("looks"),
    lookIndex: v.number(),
    text: v.string(),
    change: v.optional(change),
    outfit: v.optional(outfit),
  },
  handler: async (ctx, { lookId, lookIndex, text, change, outfit }) => {
    await requireMember(ctx);
    const look = await ctx.db.get(lookId);
    if (!look?.result?.looks[lookIndex]) throw new Error("that look doesn't exist");
    const t = text.trim().slice(0, 1200);
    const changed = change && (change.add.length || change.swap.length || change.remove.length);
    if (!t && !changed) throw new Error("write Cher a note, or try something on");
    await ctx.db.insert("notes", {
      lookId, lookIndex, author: "you", text: t,
      change: changed ? change : undefined,
      outfit,
    });
    return ctx.db.insert("notes", { lookId, lookIndex, author: "cher", text: "", status: "pending" });
  },
});

/** The worker's queue: replies nobody has written yet, oldest first. */
export const pending = query({
  args: { key },
  handler: async (ctx, { key }) => {
    requireKey(key);
    return ctx.db.query("notes").withIndex("by_status", (q) => q.eq("status", "pending")).take(10);
  },
});

/** Everything the worker needs to write one reply. */
export const context = query({
  args: { id: v.id("notes"), key },
  handler: async (ctx, { id, key }) => {
    requireKey(key);
    const note = await ctx.db.get(id);
    if (!note) return null;
    const request = await ctx.db.get(note.lookId);
    const thread = (
      await ctx.db
        .query("notes")
        .withIndex("by_look", (q) => q.eq("lookId", note.lookId).eq("lookIndex", note.lookIndex))
        .collect()
    ).filter((n) => n._creationTime < note._creationTime);
    return { note, request, thread };
  },
});

export const claim = mutation({
  args: { id: v.id("notes"), key },
  handler: async (ctx, { id, key }) => {
    requireKey(key);
    const note = await ctx.db.get(id);
    if (!note || note.status !== "pending") return false;
    await ctx.db.patch(id, { status: "writing" });
    return true;
  },
});

export const finish = mutation({
  args: {
    id: v.id("notes"),
    text: v.optional(v.string()),
    verdict: v.optional(v.string()),
    proposal: v.optional(v.any()),
    error: v.optional(v.string()),
    key,
  },
  handler: async (ctx, { id, text, verdict, proposal, error, key }) => {
    requireKey(key);
    if (error || !text) {
      return ctx.db.patch(id, { status: "error", error: (error ?? "no reply came back").slice(0, 500) });
    }
    await ctx.db.patch(id, { status: "done", text, verdict, proposal, error: undefined });
  },
});

export const retry = mutation({
  args: { id: v.id("notes") },
  handler: async (ctx, { id }) => {
    await requireMember(ctx);
    await ctx.db.patch(id, { status: "pending", error: undefined });
  },
});
