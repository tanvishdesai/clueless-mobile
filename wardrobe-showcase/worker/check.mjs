/**
 * Exercises the stylist's prompt plumbing without a token or a network:
 *   node worker/check.mjs
 */
import assert from "node:assert/strict";
import { brief, catalogue, noteBrief, noteSchema, resolve, resolveNote, schema } from "./prompt.mjs";

const item = (_id, attrs) => ({ _id, status: "done", attrs: {
  secondaryColors: [], secondaryHexes: [], pattern: "solid", material: "cotton", fit: "regular",
  formality: "casual", seasons: ["summer"], tags: [], notes: "", ...attrs } });

const items = [
  item("id_tee", { name: "white tee", category: "top", subtype: "t-shirt", primaryColor: "white", primaryHex: "#ffffff" }),
  item("id_jeans", { name: "blue jeans", category: "bottom", subtype: "jeans", primaryColor: "blue", primaryHex: "#3a5a8c" }),
  item("id_shoes", { name: "white sneakers", category: "footwear", subtype: "sneakers", primaryColor: "white", primaryHex: "#f5f5f5", fit: "n/a" }),
  item("id_scent", { name: "ck one", category: "fragrance", subtype: "eau de toilette", primaryColor: "clear", primaryHex: "#dddddd",
    fit: "n/a", scentFamily: "fresh citrus", topNotes: ["bergamot"], heartNotes: [], baseNotes: ["musk"] }),
  { _id: "id_pending", status: "pending" },
];

const cat = catalogue(items);
assert.equal(cat.refToId.size, 4, "only tagged items are catalogued");
assert.match(cat.text, /## bottom\nI01: blue jeans/);
assert.match(cat.text, /family: fresh citrus \| notes: bergamot \/ - \/ musk/);
assert.doesNotMatch(cat.text, /fit: n\/a/, "n/a fits are left out");

const refs = [...cat.refToId.keys()];
const s = schema(refs);
assert.deepEqual(s.properties.looks.items.properties.pieces.items.properties.ref.enum, refs);

const req = { occasion: "picnic", constraints: "", anchorIds: ["id_tee"], by: "Tanvish" };
const text = brief(req, cat);
assert.match(text, /MUST INCLUDE IN EVERY LOOK\nI0\d/);
assert.match(text, /\(none given\)/);
assert.match(text, /You're dressing Tanvish\./);
assert.doesNotMatch(brief({ occasion: "x", constraints: "" }, cat), /dressing/, "no name, no line");

const ref = (id) => cat.idToRef.get(id);
const out = resolve({
  read: "r", gaps: "",
  looks: [
    { title: "A", tagline: "", direction: "", why: "", tips: ["t"], pieces: [
      { ref: ref("id_tee"), role: "top", note: "n" },
      { ref: ref("id_tee"), role: "top", note: "duplicate" },
      { ref: "I99", role: "top", note: "hallucinated" },
      { ref: ref("id_jeans"), role: "bottom", note: "n" },
      { ref: ref("id_shoes"), role: "hat", note: "bad role" },
    ], swaps: [
      { ref: ref("id_shoes"), replaces: ref("id_jeans"), note: "ok" },
      { ref: ref("id_jeans"), replaces: ref("id_tee"), note: "already in the look" },
    ] },
    { title: "B", tagline: "", direction: "", why: "", tips: [], pieces: [{ ref: ref("id_tee"), role: "top", note: "" }], swaps: [] },
  ],
}, cat);
assert.equal(out.looks.length, 1, "a one-piece look is dropped");
assert.deepEqual(out.looks[0].pieces.map((p) => p.id), ["id_tee", "id_jeans"]);
assert.deepEqual(out.looks[0].swaps.map((x) => x.id), ["id_shoes"]);
assert.throws(() => resolve({ looks: [] }, cat), /no wearable look/);

// ── Fitting-room notes ──
const request = {
  occasion: "picnic", constraints: "no black", by: "Tanvish",
  result: { looks: [{ title: "Sunday Best", why: "w", pieces: [
    { id: "id_tee", role: "top", note: "tucked" }, { id: "id_jeans", role: "bottom", note: "rolled" },
  ] }] },
};
const thread = [
  { author: "you", text: "jacket?", change: { add: ["id_shoes"], swap: [], remove: [] } },
  { author: "cher", status: "done", verdict: "no", text: "too much" },
  { author: "cher", status: "error", text: "" },
  { author: "you", text: "", change: { add: [], swap: [{ out: "id_jeans", in: "id_scent" }], remove: [] },
    outfit: [{ id: "id_tee", role: "top" }, { id: "id_scent", role: "fragrance" }] },
];
const nb = noteBrief({ note: { lookIndex: 0 }, request, thread }, items, cat);
assert.match(nb, /THE LOOK YOU PUT TOGETHER: "Sunday Best"/);
assert.match(nb, /You're writing to Tanvish\./);
assert.match(nb, /THEM: jacket\?\n {2}tried: add I0\d \(white sneakers\)/);
assert.match(nb, /YOU \(no\): too much/);
assert.doesNotMatch(nb, /YOU \(undefined\)/, "failed replies stay out of the history");
assert.match(nb, /THEIR NEW NOTE\n\(no words, just tried something on\)\nTried: swap I0\d \(blue jeans\) for I0\d \(ck one\)/);
assert.match(nb, /THE OUTFIT THEY'RE ASKING ABOUT\nI0\d white tee - top\nI0\d ck one - fragrance/);
assert.deepEqual(noteSchema(refs).properties.look.properties.pieces.items.properties.ref.enum, refs);

const r = resolveNote({ verdict: "maybe", reply: " ok ", look: { title: "T", pieces: [
  { ref: ref("id_tee"), role: "top", note: "a" }, { ref: "I99", role: "top", note: "x" }, { ref: ref("id_jeans"), role: "bottom", note: "b" },
] } }, cat);
assert.equal(r.verdict, "depends", "unknown verdicts become depends");
assert.equal(r.text, "ok");
assert.deepEqual(r.proposal.pieces.map((p) => p.id), ["id_tee", "id_jeans"]);
assert.equal(resolveNote({ verdict: "yes", reply: "fine", look: { title: "T", pieces: [] } }, cat).proposal, undefined);
assert.throws(() => resolveNote({ verdict: "yes", reply: " " }, cat), /blank/);

console.log("stylist prompt plumbing: ok");
