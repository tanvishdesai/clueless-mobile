/**
 * Ingest worker. Pulls unclassified items out of Convex, shows both photos to
 * Claude Sonnet 5, writes the tags back.
 *
 * Runs on your machine because it drives the Claude Agent SDK, which is the
 * supported client for a `claude setup-token` credential. Raw /v1/messages
 * rejects that token (429); the Agent SDK is how the token is meant to be spent.
 *
 *   node --env-file=.env.local worker/ingest.mjs          # drain and exit
 *   node --env-file=.env.local worker/ingest.mjs --watch  # keep polling
 */

import { Buffer } from "node:buffer";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ConvexHttpClient } from "convex/browser";
import { anyApi } from "convex/server";
import { query } from "@anthropic-ai/claude-agent-sdk";

const CONVEX_URL = process.env.EXPO_PUBLIC_CONVEX_URL;
const TOKEN = process.env.CLAUDE_CODE_OAUTH_TOKEN;
const WATCH = process.argv.includes("--watch");
// The backend's closet key (see convex/access.ts). Optional until CLOSET_KEY is set on the deployment.
const KEY = process.env.CLOSET_KEY || undefined;

if (!CONVEX_URL) throw new Error("EXPO_PUBLIC_CONVEX_URL missing (expected in .env.local)");
if (!TOKEN) throw new Error("CLAUDE_CODE_OAUTH_TOKEN missing — add it to .env.local");

const convex = new ConvexHttpClient(CONVEX_URL);

// Closed sets. A shirt is a shirt; nothing here needs discovering.
const CATEGORIES = ["top", "bottom", "dress", "outerwear", "footwear", "accessory", "underlayer", "fragrance", "other"];
const PATTERNS = ["solid", "stripe", "check", "plaid", "floral", "graphic", "logo", "colorblock", "textured", "camo", "animal", "abstract", "other"];
const FITS = ["slim", "regular", "relaxed", "oversized", "n/a"];
const FORMALITY = ["loungewear", "casual", "smart-casual", "business", "formal"];
const SEASONS = ["spring", "summer", "autumn", "winter"];

const SYSTEM = `You catalogue a personal wardrobe — clothing, accessories AND fragrances. Output raw JSON only — no prose, no code fences, no commentary.

You are shown two photos of ONE item: front, then back. They are the same item, never two items.

Fragrances belong in this catalogue. A perfume, cologne, body spray or attar is a deliberate, wanted entry — it is never a mistake, never "not a garment", and you must never say so in any field. It is worn, it is chosen per occasion and season, and downstream features recommend it alongside clothes.

Rules for every item:
- Judge colour from the object itself, not the lighting or background. primaryHex must be the colour you would get sampling the largest flat area with a colour picker — the actual pixel value, not the textbook hex for the colour's name.
- secondaryColors covers trim, panels, print colours, prominent hardware. Empty for a plain solid.
- Guess material from what you can see; do not refuse because there is no label.
- formality and seasons mean "when would the owner wear this" and matter for every item type, fragrances included.
- Everything lowercase except proper nouns.
- Be decisive. A plausible specific answer beats a vague one.
- notes is a plain description of the item. Never use it to comment on the photo, the catalogue, or whether the item belongs here.

Rules for garments:
- fit is "n/a" for footwear, accessories and fragrances.

Rules for fragrances:
- category is "fragrance". subtype is the concentration — "eau de parfum", "eau de toilette", "eau de cologne", "body spray", "attar", "perfume oil".
- Colour fields describe the bottle and its liquid: sample the juice if you can see it, otherwise the bottle glass. material is "glass", "plastic" etc.
- brand is the house on the bottle. Set brand on garments too whenever a maker is legible.
- scentFamily is the olfactory family: "fresh citrus", "woody aromatic", "oriental spicy", "floral", "fougère", "gourmand", "chypre", "aquatic".
- topNotes, heartNotes, baseNotes: if you recognise the fragrance, give its real notes. If not, infer conservatively from the name, colour and marketing, and prefer fewer confident notes over a long invented list. Empty arrays are acceptable.
- sizeMl is the millilitre figure printed on the bottle or box. Omit it if you cannot read one.
- formality and seasons describe when the scent suits: fresh citrus skews summer and daytime, heavy woody or oriental skews winter and evening.`;

const SHAPE = `{
  "name": string,              // short human label, e.g. "navy oxford button-down"
  "category": one of ${JSON.stringify(CATEGORIES)},
  "subtype": string,           // specific garment type, lowercase singular, e.g. "oxford shirt"
  "primaryColor": string,      // dominant colour, one or two lowercase words
  "primaryHex": string,        // "#rrggbb", lowercase, sampled from the fabric
  "secondaryColors": string[],
  "secondaryHexes": string[],  // same length as secondaryColors
  "pattern": one of ${JSON.stringify(PATTERNS)},
  "material": string,          // e.g. "cotton", "denim", "wool"
  "fit": one of ${JSON.stringify(FITS)},
  "formality": one of ${JSON.stringify(FORMALITY)},
  "seasons": subset of ${JSON.stringify(SEASONS)},
  "tags": string[],            // 3-6 lowercase descriptors: details, occasions, styling notes
  "notes": string,             // one sentence: distinguishing details, wear, what it pairs with
  "brand": string | omitted,   // maker, when legible. Required for fragrances.
  // The five below are for category "fragrance" only — omit them entirely otherwise.
  "scentFamily": string | omitted,
  "topNotes": string[] | omitted,
  "heartNotes": string[] | omitted,
  "baseNotes": string[] | omitted,
  "sizeMl": number | omitted
}`;

function vocabBlock(v) {
  const lines = Object.entries(v ?? {})
    .filter(([, vals]) => vals?.length)
    .map(([field, vals]) => `${field}: ${vals.slice(0, 60).join(", ")}`);
  if (!lines.length) {
    return "This is the first item in the closet, so there is no vocabulary yet. Choose words you would be happy to reuse for every later garment.";
  }
  return `Labels already used in this closet, most common first. Prefer an existing label whenever it genuinely fits: if you would otherwise coin a synonym of something here, use the word here instead.

Accuracy still wins. Never apply a label that is factually wrong just because it is the closest one on the list — a boot is not a sneaker, an attar is not an eau de parfum. When nothing here is actually correct, coin a new word.

${lines.join("\n")}`;
}

const REQUIRED_STR = ["name", "category", "subtype", "primaryColor", "primaryHex",
  "pattern", "material", "fit", "formality", "notes"];
const REQUIRED_ARR = ["secondaryColors", "secondaryHexes", "seasons", "tags"];
const REQUIRED = [...REQUIRED_STR, ...REQUIRED_ARR];
// Fragrance extras (plus brand, which any item may carry). Dropped when absent
// rather than written as null — the table validator rejects nulls on optionals.
const OPTIONAL_STR = ["brand", "scentFamily"];
const OPTIONAL_ARR = ["topNotes", "heartNotes", "baseNotes"];

function parseAttrs(text) {
  const m = String(text).match(/\{[\s\S]*\}/);
  if (!m) throw new Error(`no JSON in reply: ${String(text).slice(0, 160)}`);
  const o = JSON.parse(m[0]);
  const missing = REQUIRED.filter((k) => o[k] === undefined || o[k] === null);
  if (missing.length) throw new Error(`missing fields: ${missing.join(", ")}`);

  const out = {};
  for (const k of REQUIRED_STR) out[k] = String(o[k]);
  for (const k of REQUIRED_ARR) out[k] = (o[k] ?? []).map(String);
  for (const k of OPTIONAL_STR) if (o[k]) out[k] = String(o[k]);
  for (const k of OPTIONAL_ARR) if (Array.isArray(o[k]) && o[k].length) out[k] = o[k].map(String);
  if (Number.isFinite(Number(o.sizeMl)) && Number(o.sizeMl) > 0) out.sizeMl = Number(o.sizeMl);
  return out;
}

async function download(url, path) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`fetch image ${res.status}`);
  writeFileSync(path, Buffer.from(await res.arrayBuffer()));
}

/**
 * ponytail: one Agent SDK session per garment. Each session re-sends the Claude
 * Code base prompt (~25k cached tokens), so 110 items costs ~2.7M tokens of
 * pure overhead. If that eats your quota, batch ~10 garments per session —
 * amortises the overhead 10x and improves vocabulary consistency within a batch.
 */
async function classify(item, vocab) {
  const dir = mkdtempSync(join(tmpdir(), "clueless-"));
  try {
    await Promise.all([
      download(item.frontUrl, join(dir, "front.jpg")),
      download(item.backUrl, join(dir, "back.jpg")),
    ]);

    // A hint is the owner telling you the last read was wrong. It outranks
    // whatever the photos appear to show.
    const hint = item.hint
      ? `\nCORRECTION FROM THE OWNER — this is authoritative, trust it over your own reading of the photos:\n"${item.hint}"\nClassify accordingly, including formality, subtype and tags.\n`
      : "";

    const prompt = `Read the image files front.jpg and back.jpg — two photos of one garment.
${hint}
${vocabBlock(vocab)}

Reply with a single JSON object of exactly this shape:
${SHAPE}`;

    let text = "";
    for await (const m of query({
      prompt,
      options: {
        model: "claude-sonnet-5",
        effort: "medium",
        systemPrompt: SYSTEM,
        maxTurns: 6,
        allowedTools: ["Read"],
        settingSources: [],
        permissionMode: "bypassPermissions",
        cwd: dir,
        env: { ...process.env, CLAUDE_CODE_OAUTH_TOKEN: TOKEN },
      },
    })) {
      if (m.type === "result") {
        if (m.is_error) throw new Error(`agent: ${m.subtype} ${JSON.stringify(m.result ?? "").slice(0, 200)}`);
        text = m.result ?? "";
      }
    }
    return parseAttrs(text);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function drain() {
  let worked = 0;
  for (;;) {
    const items = await convex.query(anyApi.items.pending, { key: KEY });
    if (!items.length) return worked;

    for (const item of items) {
      // Re-read each time so the vocabulary from item N primes item N+1.
      const vocab = await convex.query(anyApi.items.vocab, { key: KEY });
      const t0 = Date.now();
      try {
        const attrs = await classify(item, vocab);
        await convex.mutation(anyApi.items.saveTags, { id: item._id, attrs, key: KEY });
        console.log(`✓ ${attrs.name}  (${attrs.primaryHex} ${attrs.category}/${attrs.subtype})  ${Date.now() - t0}ms`);
      } catch (e) {
        const msg = String(e?.message ?? e);
        console.error(`✗ ${item._id}: ${msg}`);
        await convex.mutation(anyApi.items.saveTags, { id: item._id, error: msg, key: KEY });
      }
      worked++;
    }
  }
}

const n = await drain();
console.log(n ? `\nDone — ${n} item(s) processed.` : "Nothing pending.");

if (WATCH) {
  console.log("Watching for new photos… Ctrl+C to stop.");
  for (;;) {
    await sleep(3000);
    await drain();
  }
}
