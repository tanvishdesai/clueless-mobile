/**
 * Exercises the stylist's prompt plumbing without a token or a network:
 *   node worker/check.mjs
 */
import assert from "node:assert/strict";
import { brief, catalogue, resolve, schema } from "./prompt.mjs";

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

const req = { occasion: "picnic", constraints: "", anchorIds: ["id_tee"] };
const text = brief(req, cat);
assert.match(text, /MUST INCLUDE IN EVERY LOOK\nI0\d/);
assert.match(text, /\(none given\)/);

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

console.log("stylist prompt plumbing: ok");
