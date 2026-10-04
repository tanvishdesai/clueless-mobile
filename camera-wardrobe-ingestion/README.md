# Clueless — camera wardrobe ingestion

Closet ingestion. Point the camera at a garment, shoot front then back, and the
pair uploads itself and gets catalogued by Claude. Browse the result in the
second tab.

- **App**: React Native / Expo SDK 57 (Android APK via EAS)
- **Backend**: Convex — `elegant-owl-354` ([dashboard](https://dashboard.convex.dev/d/elegant-owl-354))
- **Classifier**: Claude Sonnet 5, effort `medium`, JSON-schema structured output

The Convex backend in `convex/` is shared with [`../wardrobe-showcase`](../wardrobe-showcase),
which reads the closet and stores its lookbooks here (`convex/looks.ts`). A
deployment has one functions directory, so deploy both apps' functions from
this folder. Keep `.env.local` in this folder too.

## Tagging

Classification runs in `worker/ingest.mjs` on your machine, driving the **Claude
Agent SDK** with your `claude setup-token` credential (in `.env.local`).

```sh
npm run ingest         # tag everything pending, then exit
npm run ingest:watch   # keep polling - run this while you shoot the closet
```

The worker pulls pending items from Convex, downloads both photos, has Claude
Sonnet 5 (effort `medium`) read them, and writes the tags back. Nothing to
deploy; the phone just uploads, the laptop tags.

### Why a local worker and not a Convex action

The setup token is **rejected by raw `/v1/messages`** - Bearer + the
`oauth-2025-04-20` beta header still returns `429 rate_limit_error`. The Agent
SDK is the supported client for that credential and works fine. It drives the
Claude Code CLI as a subprocess, and Convex actions cannot spawn subprocesses,
so the agent runs here instead.

Images reach the model through the agent's `Read` tool (it is given a temp dir
containing `front.jpg` and `back.jpg`), not as inline base64 blocks - inline
image blocks in streaming input are silently dropped by the harness.

### Cost shape

Each garment is one Agent SDK session, and every session re-sends the Claude
Code base prompt: ~25k cached tokens of overhead per item, ~2.7M across a
110-piece closet. That is quota on a subscription, not dollars. If it bites,
batch ~10 garments per session - see the `ponytail:` note in `worker/ingest.mjs`.

## How the tags stay consistent

Two different problems, two mechanisms:

**Closed sets** — `category`, `pattern`, `fit`, `formality`, `seasons` — are
`enum`s in the JSON schema (`convex/schema.ts` holds the lists). A shirt is a
shirt; there is nothing to discover, and the model cannot coin a synonym.

**Open sets** — `subtype`, `primaryColor`, `material`, `tags` — go in the `vocab`
table, which counts every label ever used. Each request is handed the running
vocabulary, most-used first, and told to reuse before inventing. Item 3 coins
"oxford shirt"; item 60 reuses it instead of writing "button-down oxford". It
converges around item 15–20.

**Colour also carries a hex**, not just a word. Words are where colour
vocabularies die ("navy" / "midnight" / "dark blue"), and a hex is what outfit
matching will actually need.

## Layout

| File | |
|---|---|
| `convex/schema.ts` | tables + the closed-set enums |
| `convex/items.ts` | upload URLs, create, list, pending, vocab, saveTags, retry, delete |
| `convex/looks.ts` | the showcase's outfit requests, lookbooks and stylist heartbeat |
| `convex/notes.ts` | the showcase's fitting-room threads: notes about one look |
| `worker/ingest.mjs` | the Sonnet 5 call, via the Claude Agent SDK |
| `Capture.tsx` | camera; front → back → fire-and-forget upload |
| `Closet.tsx` | grid, category filter, detail sheet |
| `App.tsx` | two tabs |

## Development

```sh
npx convex dev          # backend, watches convex/
npm run ingest:watch    # tagging worker
npx expo start          # Metro, for the dev client
npx tsc --noEmit        # typecheck
npx expo export -p android   # verify the bundle builds
```

Rebuild the APK locally (no EAS queue, ~19 min cold / ~2 min incremental):

```sh
npx expo prebuild --platform android   # only after changing app.json or deps
cd android && ./gradlew assembleRelease
# -> android/app/build/outputs/apk/release/app-release.apk
```

Needs JDK 17 and `android/local.properties` pointing at the SDK with forward
slashes (`sdk.dir=C:/Users/DELL/AppData/Local/Android/Sdk`) — Java properties
treat `\` as an escape. Release is signed with React Native's debug keystore,
which is fine for sideloading but not for the Play Store.

The 90MB APK is universal (4 ABIs). For arm64 only, ~35MB, add to
`android/gradle.properties`:

```
reactNativeArchitectures=arm64-v8a
```

Via EAS instead:

```sh
npx eas-cli build --platform android --profile preview
```

`EXPO_PUBLIC_CONVEX_URL` lives in `eas.json` under each build profile — `.env.local`
is gitignored and never reaches EAS, so the URL has to be baked in there.

## Not built

- In-app label editing. The Convex dashboard edits rows fine for the handful
  that come out wrong.
- Outfit / colour-combination logic lives in the next app,
  [`../wardrobe-showcase`](../wardrobe-showcase), which uses the stored hex codes.
- Prompt caching on the system block. Would shave maybe 15% off $1.35.
