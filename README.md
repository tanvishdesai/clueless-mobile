# Clueless

My whole closet, photographed, catalogued, and dressed by Claude.

Two apps share one Convex backend:

| Folder | What | Runs on |
|---|---|---|
| [`camera-wardrobe-ingestion/`](camera-wardrobe-ingestion/) | Expo camera app: shoot each garment front + back; a local worker tags it with Claude Sonnet 5. **Also owns the Convex backend** (`convex/`). | Android phone + laptop |
| [`wardrobe-showcase/`](wardrobe-showcase/) | The closet on a 1995 computer, Cher Horowitz–style: browse the rack, try outfits against a MATCH / MIS-MATCH checker, and ask for complete looks for an occasion, styled by **Claude Opus 5.5 (effort `medium`)** on the same Agent SDK harness. | Browser + laptop |

```
phone ──photos──▶ Convex ◀──tags── ingest worker (Sonnet 5)
                    ▲  │
     "dress me for X"  │ closet, lookbooks (live)
                    │  ▼
               showcase site ◀──lookbook── stylist worker (Opus 5.5)
```

## Why the backend lives in the ingestion folder

A Convex deployment has exactly one functions directory. The closet already
lived in `camera-wardrobe-ingestion/convex/`, so the showcase's additions
(`looks.ts`, plus the `looks` and `heartbeats` tables in `schema.ts`) went in
next to it. Deploy from there:

```sh
cd camera-wardrobe-ingestion
npx convex deploy        # or `npx convex dev` while developing
```

The showcase talks to those functions by name and doesn't need the Expo app's
dependencies to build.

## Quick start

```sh
# 1. push the new backend functions (once)
cd camera-wardrobe-ingestion && npm install && npx convex deploy

# 2. run the showcase + stylist
cd ../wardrobe-showcase && npm install
cp .env.example .env.local   # add CLAUDE_CODE_OAUTH_TOKEN
npm run dev                  # http://localhost:5173

# or try it with Cher's closet from the film, no setup at all
npm run demo
```

If you had a `.env.local` at the repo root before the split, move it into
`camera-wardrobe-ingestion/`.
