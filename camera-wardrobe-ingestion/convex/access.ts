import { getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError } from "convex/values";
import type { GenericDatabaseReader } from "convex/server";
import type { QueryCtx } from "./_generated/server";

// Deployment environment variables (Convex dashboard → Settings → Environment).
declare const process: { env: Record<string, string | undefined> };

/**
 * Who may touch the closet.
 *
 * - People sign in (Convex Auth, email + password) and must be members: an
 *   email in ALLOWED_EMAILS if that's set, otherwise the closet's owner, i.e.
 *   whoever registered first. Registration is closed to everyone else, so a
 *   stranger can't sign up and spend the Opus quota.
 * - Machines (the camera app, the ingest and stylist workers) present
 *   CLOSET_KEY, a secret set on the deployment, instead of a session.
 */

type Reader = { db: GenericDatabaseReader<any> };

const allowList = () =>
  (process.env.ALLOWED_EMAILS ?? "").split(",").map((s: string) => s.trim().toLowerCase()).filter(Boolean);

/** Sign-up gate: listed emails only; with no list, only until the owner exists. */
export async function mayRegister(ctx: Reader, email: string) {
  const list = allowList();
  if (list.length) return list.includes(email.toLowerCase());
  return (await ctx.db.query("users").first()) === null;
}

export async function isMember(ctx: Reader, userId: string) {
  const user = await ctx.db.get(userId as never) as { _id: string; email?: string } | null;
  if (!user) return false;
  const list = allowList();
  if (list.length) return !!user.email && list.includes(user.email.toLowerCase());
  const owner = await ctx.db.query("users").order("asc").first();
  return owner?._id === user._id;
}

export async function requireMember(ctx: QueryCtx) {
  const userId = await getAuthUserId(ctx);
  if (!userId || !(await isMember(ctx, userId))) throw new ConvexError("Sign in to your closet first.");
  return userId;
}

const keyMatches = (key?: string) => {
  const secret = process.env.CLOSET_KEY;
  return !!secret && !!key && key === secret;
};

/** Worker-only functions: the key, always. */
export function requireKey(key?: string) {
  if (!process.env.CLOSET_KEY) throw new ConvexError("Set CLOSET_KEY on the Convex deployment (see README).");
  if (!keyMatches(key)) throw new ConvexError("Wrong closet key.");
}

/**
 * The closet itself, used by the website (a member) and by the camera app and
 * ingest worker (the key). Until CLOSET_KEY is set, keyless calls still pass,
 * so a camera app built before the key existed keeps working; once it's set,
 * nothing gets in without a session or the key.
 */
export async function requireMemberOrKey(ctx: QueryCtx, key?: string) {
  if (keyMatches(key)) return;
  const userId = await getAuthUserId(ctx);
  if (userId && (await isMember(ctx, userId))) return;
  if (!process.env.CLOSET_KEY) return;
  throw new ConvexError("This closet is private.");
}
