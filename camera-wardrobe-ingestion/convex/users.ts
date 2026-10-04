import { getAuthUserId } from "@convex-dev/auth/server";
import { query } from "./_generated/server";
import { isMember } from "./access";

/** The signed-in person, for the site's greeting and gate. Null when signed out. */
export const me = query(async (ctx) => {
  const userId = await getAuthUserId(ctx);
  if (!userId) return null;
  const user = await ctx.db.get(userId);
  if (!user) return null;
  return { name: user.name ?? "you", email: user.email ?? "", member: await isMember(ctx, userId) };
});
