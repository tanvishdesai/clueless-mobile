# Wardrobe Showcase — the Closet Computer

The closet from the camera app, on the computer Cher Horowitz picks her outfits
with in *Clueless* (1995). Browse everything you own, mix and match against a
MATCH / MIS-MATCH checker, and tell the stylist where you're going: Claude
Opus 5.5 reads the whole closet and sends back three complete looks, laid out
as a teen-magazine spread.

- **Site**: Vite + React, static build, live data from Convex
- **Stylist**: `worker/stylist.mjs`, Claude Agent SDK, `claude-opus-5-5`, effort `medium`, JSON-schema structured output
- **Backend**: the same Convex deployment as the camera app (`../camera-wardrobe-ingestion/convex/looks.ts`)

## Run it

```sh
npm install
cp .env.example .env.local   # VITE_CONVEX_URL + CLAUDE_CODE_OAUTH_TOKEN
npm run dev                  # site on :5173 and the stylist worker, together
```

First time only, push the backend functions this site uses:

```sh
cd ../camera-wardrobe-ingestion && npx convex deploy
```

No deployment or token? `npm run demo` runs the whole thing on Cher's closet
from the film (27 pieces, illustrated as flat lays) with an offline stand-in
stylist. Any URL with `?demo` does the same.

| Script | |
|---|---|
| `npm run dev` | site + stylist worker |
| `npm run site` | site only |
| `npm run stylist:watch` | stylist worker only, keeps listening |
| `npm run stylist` | style whatever's queued, then exit |
| `npm run demo` | demo closet, no backend |
| `npm run build` | static site in `dist/` (deploy anywhere; set `VITE_CONVEX_URL`) |
| `node worker/check.mjs` | offline checks for the stylist's prompt plumbing |

## How a look gets made

1. **Ask Cher** inserts a `looks` row (`pending`): occasion, rules, and optionally pieces every look must include.
2. The **stylist worker** on your laptop claims it, pulls every tagged item, and writes the closet out as a compact catalogue: short refs (`I01`…), colours *with hexes*, pattern, material, fit, formality, seasons, tags, notes, and fragrance notes.
3. One Agent SDK `query()` with `model: "claude-opus-5-5"`, `effort: "medium"`, no tools, and an `outputFormat` JSON schema whose `ref` fields are an **enum of the real refs**, so the model can only pick pieces you own.
4. Refs map back to Convex ids; duplicates, unknown refs and one-piece "looks" are dropped. The row flips to `done` and the site, subscribed to it, renders the spread.

### The fitting room

Every look has a **"Pass Cher a note"** card at the end of its article. It turns
the page into a fitting room: the collage becomes a mannequin and the article
column becomes a thread of notes.

- **Try before you ask.** Click any piece in the collage to swap it or take it off, or pull something off the rack. The mannequin shows the change straight away (marked *new*), and the closet computer's instant MATCH score updates beside it.
- **Pass the note.** Ask in your own words, or let it pre-write "What if I swap the watch for…". Each note carries the whole outfit being discussed.
- **Cher writes back** on her stationery with a stamped verdict (*Totally.* / *As if.* / *Depends.*) and the outfit she'd actually wear: yours if it works, her better alternative if not. **Try her version** puts it on the mannequin; **Keep this version** prints it into the issue as a new look.

Under the hood: `notes.send` writes your note and an empty reply; the worker
answers pending replies before any queued lookbooks (someone is waiting),
using the same model, effort and closet catalogue, plus the brief, the look and
the thread so far. Threads live in Convex per look, so they survive reloads.

It runs locally for the same reason ingestion does: the `claude setup-token`
credential only works through the Agent SDK, and the Agent SDK spawns the
Claude Code CLI, which a Convex action can't. The worker heartbeats every 10s
so the site can tell you when it's off instead of spinning.

**Cost shape** (estimated, not yet measured against the live model): one Agent
SDK session per request, so the Claude Code base prompt (~25k cached tokens,
same as ingestion) plus the catalogue at roughly 60–80 tokens per garment, about
8k for a 110-piece closet. Expect a lookbook to take tens of seconds at medium
effort; the worker logs the real time for each one.

## The design

The brief was "disgustingly tasteful", so each element points at something
specific in the film rather than at generic 90s nostalgia:

- **The computer.** Cher's closet program let her flick tops and bottoms past a picture of herself and told her when it didn't work. **Dress Me** is that: rows you cycle with ◀ ▶, a CRT with a platinum bezel and scanlines, and a verdict that blinks a red **MIS-MATCH**. The verdict is a real check (`src/lib/match.ts`): colour harmony from the hex hues, with neutrals treated as free; dress-code spread; competing patterns, with an exception for matched sets like the yellow suit; and season overlap.
- **The revolving closet.** Built on a dry cleaner's conveyor, gold-and-wood hangers, everything colour-coordinated. **Closet** hangs your clothes on a brass rail in that order (neutrals light to dark, then round the colour wheel), swings them on hover, and puts shoes and accessories on a shelf.
- **Polaroids.** Heckerling's idea started as Polaroids of her clothes she could play with like paper dolls, and the film's closet images were photographs. Every photo here sits in a Polaroid, and each look is laid out as a paper doll: layer and top over the bottom, shoes below, accessories pinned at the side.
- **The screensaver.** The art department gave the closet computer a leopard-print screensaver with flying hangers. It's here: idle for three minutes, or ⌥Z.
- **Palette.** Gaultier yellow plaid (the suit was nearly blue, then red, which was "too Christmas"), the grey walls of Cher's closet, Alaïa red, baby pink, powder blue, gold. The desktop pattern can be Cher's plaid, Dionne's black-and-white answer to it, the leopard, or the closet's grey wall.
- **Type.** The title card is Ad Lib on a bouncing baseline inside an ellipse; **Kavoon** is the closest free relative, set the same way. The poster credits are stretched light Futura Condensed caps, imitated with **Jost**. **Pixelify Sans** and **VT323** are the 1995 machine; **Bodoni Moda** and **Gloria Hallelujah** are the magazine and the notebook margins.
- **The lookbook.** Each recommendation is an issue: masthead, the brief and the stylist's read, a Bodoni headline, a drop cap, numbered credits with handwritten notes, the palette as paint chips, how-to-wear tips, swaps from your own closet, a "shopping list" post-it for what's missing, and a rubber stamp from the MATCH checker. Past requests are magazine covers.

Sources: Amy Heckerling, Mona May, Steven Jordan and Amy Wells in NYLON's
[oral history of Cher's closet](https://www.nylon.com/fashion/cher-closet-clueless-an-oral-history);
[Fonts In Use on the titles](https://fontsinuse.com/uses/40143/clueless-titles-and-promotional-materials);
[1-800-VINTAGE's costume breakdown](https://1800vintage.substack.com/p/14100-clueless-1995).

## Layout

| Path | |
|---|---|
| `worker/stylist.mjs` | the Opus 5.5 calls (lookbooks and fitting-room replies), queue loop, heartbeat |
| `worker/prompt.mjs` | system prompts, catalogue, schemas, ref → id mapping |
| `src/lib/data.tsx` | live (Convex) and demo data providers |
| `src/lib/match.ts` | the MATCH / MIS-MATCH checker |
| `src/views/` | Closet, ItemFile, DressMe, AskCher, Lookbook, Fitting |
| `src/lib/outfit.ts` | the fitting room's arithmetic: applying swaps, adds and removals |
| `src/demo/` | the film's wardrobe, its flat-lay art, the offline stylist |
| `src/styles/` | tokens, desktop and window chrome, one file per view |

## Not built

- Auth. Like the camera app, the Convex functions are open to anyone with the deployment URL. Fine for a personal closet; add Convex auth before sharing the link.
- Showing the stylist the photos. It works from the tags (which include hexes); adding the `Read` tool and the images would help with texture and fit at a few times the latency.
