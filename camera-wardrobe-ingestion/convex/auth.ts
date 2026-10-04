import { Password } from "@convex-dev/auth/providers/Password";
import { convexAuth } from "@convex-dev/auth/server";
import { ConvexError } from "convex/values";
import { mayRegister } from "./access";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    Password({
      profile(params): { [field: string]: string; email: string } {
        const email = String(params.email ?? "").trim().toLowerCase();
        if (!EMAIL.test(email)) throw new ConvexError("That email doesn't look right.");
        if (params.flow !== "signUp") return { email };
        const name = String(params.name ?? "").trim().replace(/\s+/g, " ");
        if (name.length < 2 || name.length > 24) throw new ConvexError("Pick a username between 2 and 24 characters.");
        return { email, name };
      },
    }),
  ],
  callbacks: {
    // Only runs when an account is created: the moment to keep strangers out.
    async createOrUpdateUser(ctx, { existingUserId, profile }) {
      if (existingUserId) return existingUserId;
      const email = String(profile.email ?? "").toLowerCase();
      if (!(await mayRegister(ctx, email))) {
        throw new ConvexError("This closet is private. Registration is closed.");
      }
      return ctx.db.insert("users", { email, name: String(profile.name ?? email.split("@")[0]) });
    },
  },
});
