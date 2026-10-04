/**
 * Stylist worker. Takes "dress me for X" requests from Convex, shows Claude
 * Opus 5.5 the whole closet, and writes a three-look lookbook back.
 *
 * Same harness as the ingest worker (../camera-wardrobe-ingestion/worker): the
 * Claude Agent SDK, spending a `claude setup-token` credential. That credential
 * only works through the Agent SDK, and the Agent SDK spawns the Claude Code CLI,
 * which a Convex action can't do - so this runs on your machine and the website
 * just queues requests.
 *
 *   npm run stylist          # style everything queued, then exit
 *   npm run stylist:watch    # keep listening (npm run dev starts this for you)
 */

import { ConvexHttpClient } from "convex/browser";
import { anyApi } from "convex/server";
import { query } from "@anthropic-ai/claude-agent-sdk";
import { NOTE_SYSTEM, SYSTEM, brief, catalogue, noteBrief, noteSchema, resolve, resolveNote, schema } from "./prompt.mjs";

const MODEL = "claude-opus-5-5";
const EFFORT = "medium";

const CONVEX_URL = process.env.VITE_CONVEX_URL ?? process.env.EXPO_PUBLIC_CONVEX_URL;
const TOKEN = process.env.CLAUDE_CODE_OAUTH_TOKEN;
// The backend only lets the stylist in with the closet key (see convex/access.ts).
const KEY = process.env.CLOSET_KEY;
const WATCH = process.argv.includes("--watch");

if (!CONVEX_URL || !TOKEN || !KEY) {
  console.error(
    [
      "The stylist needs two things in wardrobe-showcase/.env.local:",
      !CONVEX_URL && "  VITE_CONVEX_URL=https://<your-deployment>.convex.cloud",
      !TOKEN && "  CLAUDE_CODE_OAUTH_TOKEN=<from `claude setup-token`>",
      !KEY && "  CLOSET_KEY=<the same value as CLOSET_KEY on the Convex deployment>",
      "(The website still runs without it - try `npm run demo`.)",
    ].filter(Boolean).join("\n"),
  );
  process.exit(1);
}

const convex = new ConvexHttpClient(CONVEX_URL);

async function style(req) {
  const items = await convex.query(anyApi.items.list, { key: KEY });
  const cat = catalogue(items);
  if (!cat.refToId.size) throw new Error("the closet is empty - ingest some clothes first");

  let output;
  for await (const m of query({
    prompt: brief(req, cat),
    options: {
      model: MODEL,
      effort: EFFORT,
      systemPrompt: SYSTEM,
      tools: [],                       // pure reasoning over the catalogue
      outputFormat: { type: "json_schema", schema: schema([...cat.refToId.keys()]) },
      maxTurns: 4,
      settingSources: [],
      persistSession: false,
      env: { ...process.env, CLAUDE_CODE_OAUTH_TOKEN: TOKEN },
    },
  })) {
    if (m.type === "result") {
      if (m.is_error) throw new Error(`agent: ${m.subtype} ${JSON.stringify(m.result ?? "").slice(0, 200)}`);
      output = m.structured_output ?? parseLoose(m.result);
    }
  }
  if (!output) throw new Error("no lookbook in the reply");
  return resolve(output, cat);
}

/** One reply in the fitting room. Same harness, model and effort as a lookbook. */
async function reply(noteId) {
  const ctx = await convex.query(anyApi.notes.context, { id: noteId, key: KEY });
  if (!ctx?.request?.result?.looks[ctx.note.lookIndex]) throw new Error("that look no longer exists");
  const items = await convex.query(anyApi.items.list, { key: KEY });
  const cat = catalogue(items);

  let output;
  for await (const m of query({
    prompt: noteBrief(ctx, items, cat),
    options: {
      model: MODEL,
      effort: EFFORT,
      systemPrompt: NOTE_SYSTEM,
      tools: [],
      outputFormat: { type: "json_schema", schema: noteSchema([...cat.refToId.keys()]) },
      maxTurns: 4,
      settingSources: [],
      persistSession: false,
      env: { ...process.env, CLAUDE_CODE_OAUTH_TOKEN: TOKEN },
    },
  })) {
    if (m.type === "result") {
      if (m.is_error) throw new Error(`agent: ${m.subtype} ${JSON.stringify(m.result ?? "").slice(0, 200)}`);
      output = m.structured_output ?? parseLoose(m.result);
    }
  }
  return resolveNote(output, cat);
}

function parseLoose(text) {
  const m = String(text ?? "").match(/\{[\s\S]*\}/);
  return m ? JSON.parse(m[0]) : undefined;
}

let busy = false;
const beat = () => convex.mutation(anyApi.looks.heartbeat, { model: MODEL, busy, key: KEY }).catch(() => {});

/** Notes first: someone is standing in the fitting room waiting for an answer. */
async function drainNotes() {
  let worked = 0;
  for (;;) {
    const queue = await convex.query(anyApi.notes.pending, { key: KEY });
    if (!queue.length) return worked;
    for (const note of queue) {
      if (!(await convex.mutation(anyApi.notes.claim, { id: note._id, key: KEY }))) continue;
      busy = true;
      void beat();
      const t0 = Date.now();
      try {
        const r = await reply(note._id);
        await convex.mutation(anyApi.notes.finish, { id: note._id, ...r, key: KEY });
        console.log(`✎ ${r.verdict}: ${r.text.slice(0, 80)}  (${((Date.now() - t0) / 1000).toFixed(0)}s)`);
      } catch (e) {
        const msg = String(e?.message ?? e);
        console.error(`✗ note ${note._id}: ${msg}`);
        await convex.mutation(anyApi.notes.finish, { id: note._id, error: msg, key: KEY });
      } finally {
        busy = false;
        void beat();
      }
      worked++;
    }
  }
}

async function drain() {
  let worked = 0;
  for (;;) {
    worked += await drainNotes();
    const queue = await convex.query(anyApi.looks.pending, { key: KEY });
    if (!queue.length) return worked;
    for (const req of queue) {
      if (!(await convex.mutation(anyApi.looks.claim, { id: req._id, model: MODEL, key: KEY }))) continue;
      busy = true;
      void beat();
      const t0 = Date.now();
      console.log(`… styling "${req.occasion.slice(0, 70)}"`);
      try {
        const result = await style(req);
        await convex.mutation(anyApi.looks.finish, { id: req._id, result, key: KEY });
        console.log(`✓ ${result.looks.map((l) => l.title).join("  ·  ")}  (${((Date.now() - t0) / 1000).toFixed(0)}s)`);
      } catch (e) {
        const msg = String(e?.message ?? e);
        console.error(`✗ ${req._id}: ${msg}`);
        await convex.mutation(anyApi.looks.finish, { id: req._id, error: msg, key: KEY });
      } finally {
        busy = false;
        void beat();
      }
      worked++;
    }
  }
}

if (WATCH) {
  console.log(`Stylist on duty - ${MODEL}, effort ${EFFORT}. Ctrl+C to clock out.`);
  await beat();
  setInterval(beat, 10_000);
  for (;;) {
    try {
      await drain();
    } catch (e) {
      console.error(`convex: ${e?.message ?? e}`);
    }
    await new Promise((r) => setTimeout(r, 1500));
  }
} else {
  const n = await drain();
  console.log(n ? `\nDone - ${n} lookbook(s) styled.` : "Nothing queued.");
}
