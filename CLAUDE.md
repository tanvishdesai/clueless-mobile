Two apps, one Convex backend. See README.md for the layout.

- `camera-wardrobe-ingestion/` - Expo app. Its own CLAUDE.md / AGENTS.md apply there. Owns `convex/`, the only Convex functions directory; schema or function changes for either app go there.
- `wardrobe-showcase/` - Vite + React site and the stylist worker. Mirrors the Convex types by hand in `src/lib/types.ts` and references functions by name in `src/lib/api.ts`; keep both in step with `camera-wardrobe-ingestion/convex/`.

Before calling a change done, run the checks for whichever app you touched:

```sh
cd camera-wardrobe-ingestion && npx tsc --noEmit && npx expo lint
cd wardrobe-showcase && npm run typecheck && npm run lint && node worker/check.mjs && npm run build
```
