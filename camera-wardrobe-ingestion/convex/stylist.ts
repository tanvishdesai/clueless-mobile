import { internalAction } from "./_generated/server";

// Deployment environment variables (Convex dashboard → Settings → Environment).
declare const process: { env: Record<string, string | undefined> };

/**
 * Wake the hosted stylist.
 *
 * With `STYLIST_URL` set, the stylist is a service that sleeps when idle
 * (../../wardrobe-showcase/worker/stylist.mjs --serve) and this nudges it when
 * there's work. Without it, nothing happens and a laptop running
 * `npm run stylist:watch` picks the work up by polling instead - so both
 * setups use the same queue and neither needs the other.
 *
 * Internal only: it carries the closet key, and nobody should be able to make
 * the backend hammer the stylist. It's scheduled, never called from a client.
 *
 * Retries because a sleeping service answers the first request with a 502 while
 * it boots. The worker claims its own work, so a wake-up that never lands only
 * delays a look until the next one - it can't lose or duplicate it.
 */
export const wake = internalAction({
  args: {},
  handler: async () => {
    const url = process.env.STYLIST_URL;
    const key = process.env.CLOSET_KEY;
    if (!url || !key) return;

    for (let attempt = 0; attempt < 3; attempt++) {
      if (attempt) await new Promise((r) => setTimeout(r, 2_000 * attempt));
      try {
        const res = await fetch(url, { method: "POST", headers: { "x-closet-key": key } });
        if (res.ok) return;
        console.warn(`stylist wake: HTTP ${res.status}`);
      } catch (e) {
        console.warn(`stylist wake: ${e instanceof Error ? e.message : String(e)}`);
      }
    }
    console.error("stylist wake: gave up after 3 tries");
  },
});
