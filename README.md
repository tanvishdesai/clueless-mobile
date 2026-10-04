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

# 2. set up sign-in and the closet key (once): see "Accounts and access" below

# 3. run the showcase + stylist
cd ../wardrobe-showcase && npm install
cp .env.example .env.local   # add CLAUDE_CODE_OAUTH_TOKEN and CLOSET_KEY
npm run dev                  # http://localhost:5173

# or try it with Cher's closet from the film, no setup at all
npm run demo
```

If you had a `.env.local` at the repo root before the split, move it into
`camera-wardrobe-ingestion/`.

## Accounts and access

The closet is private. The site has sign-in (username, email, password via
[Convex Auth](https://labs.convex.dev/auth)), and **every Convex function checks
access itself**, so the deployment URL alone gets nobody anywhere: not your
clothes, and not a single Opus call.

| Who | How they get in | What they can do |
|---|---|---|
| You, on the website | signed in, and a member of the closet | everything |
| Someone else with an account | signed in, not a member | nothing; they see "this closet is private" |
| The camera app, ingest worker, stylist worker | the closet key, `CLOSET_KEY` | their own jobs |
| Anyone else | - | nothing |

**Membership**: if `ALLOWED_EMAILS` is set on the deployment, those emails (and
only those) can register and get in. If it isn't, the first account to
register becomes the owner and registration closes for everyone after that.

### One-time setup

Run these from `camera-wardrobe-ingestion/` (the Convex project):

```sh
npm install
npx convex deploy                    # push the auth tables and the guarded functions

# Sign-in keys and SITE_URL on the deployment (generates JWT_PRIVATE_KEY + JWKS)
npx @convex-dev/auth --prod --web-server-url https://<your-app>.vercel.app

# The closet key: any long random string, shared with the camera app and workers
npx convex env set --prod CLOSET_KEY "$(openssl rand -hex 24)"

# Recommended: say who's allowed, so nobody can register before you do
npx convex env set --prod ALLOWED_EMAILS "you@example.com"
```

(Use the same commands without `--prod` for your dev deployment.)

Then put the same `CLOSET_KEY` in:

- `wardrobe-showcase/.env.local` as `CLOSET_KEY` - the stylist worker won't start without it
- `camera-wardrobe-ingestion/.env.local` as `CLOSET_KEY` (ingest worker) and `EXPO_PUBLIC_CLOSET_KEY` (camera app), then **rebuild the APK**. Until `CLOSET_KEY` is set on the deployment the old APK keeps working; once it is, only the rebuilt one does.

On Vercel, set `VITE_CONVEX_URL` (the site needs nothing else). Then open the
site and create your account: that's the owner.

Never commit the key or put it in `eas.json`; for EAS builds use
`npx eas-cli env:create` instead.

The access rules are tested against an in-process Convex (`convex-test`),
including the real Convex Auth sign-up and sign-in flow:

```sh
cd camera-wardrobe-ingestion && npm test
```
