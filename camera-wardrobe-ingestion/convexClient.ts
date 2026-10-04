import { ConvexReactClient } from "convex/react";

const url = process.env.EXPO_PUBLIC_CONVEX_URL;
if (!url) throw new Error("EXPO_PUBLIC_CONVEX_URL is not set — run `npx convex dev` once to create .env.local");

export const convex = new ConvexReactClient(url, { unsavedChangesWarning: false });

/**
 * The closet key: what the backend asks of anything that isn't a signed-in
 * person. Set EXPO_PUBLIC_CLOSET_KEY in .env.local (or as an EAS environment
 * variable) to the CLOSET_KEY on the Convex deployment, then rebuild.
 */
export const closetKey = process.env.EXPO_PUBLIC_CLOSET_KEY || undefined;
