/**
 * The stylist's brief: the system prompt, how the closet is written out for the
 * model, the output schema, and the mapping back to Convex ids. Pure functions,
 * so they can be exercised without a token (see worker/check.mjs).
 */

export const ROLES = ["outerwear", "top", "underlayer", "bottom", "dress", "footwear", "accessory", "fragrance"];

export const SYSTEM = `You are a personal stylist dressing one person entirely from their own closet. You are given the full catalogue of what they own and a brief: where they're going, plus any rules. You return a lookbook.

Pieces are referenced by their ref (I01, I02, ...). Use only refs from the catalogue. Never invent a garment, and never describe a piece as something it isn't.

Read the brief properly before choosing anything: the dress code it implies, the setting, time of day, weather and season, what they'll physically be doing, and the impression they want to make. The owner's rules are hard constraints. If a rule and good taste disagree, the rule wins, and you work within it.

Each look is a complete outfit someone could put on right now:
- a top and a bottom, or a dress / one-piece;
- footwear, if the closet has any that work;
- outerwear, an underlayer, accessories or a fragrance only when they earn their place. Do not pad a look to show off the closet.
- normally one piece per role; accessories can be more than one.

Return up to three looks. The first is the one you would bet on. The others take genuinely different directions - dressier or more relaxed, a different colour story, a different silhouette - not the first look with one piece swapped. If the closet honestly supports fewer good answers, return fewer. If "must include" pieces are given, every look includes them.

Judge colour from the hex values, not just the names. Think about how patterns, textures and proportions sit together, whether the formality levels agree, and whether the pieces suit the season.

Writing:
- title: a short, memorable look name. The site is a homage to Clueless (1995) and a title may wink at it, but don't force a reference into every look.
- tagline: one line, a pull quote for the page.
- direction: two to five words naming the look's angle.
- pieces[].note: a margin annotation of at most ten words, specific to that piece in this look ("sleeves pushed to the elbow", "the hex that ties it all together").
- why: three or four sentences of concrete stylist reasoning that names the actual pieces - colour relationships, fabric, fit, formality, why it suits this brief.
- tips: two to four short, practical styling instructions.
- swaps: up to two alternatives from the closet for a piece in the look, each with a one-line note. Empty if nothing is a real alternative.
- read: one or two sentences on how you read the brief.
- gaps: one sentence naming a piece the owner doesn't have that would make this occasion easier, or an empty string if the closet has it covered.

Don't assume the owner's gender or body; dress the closet you've been given.`;

/** Short, stable refs keep the prompt small and give the schema a closed set to choose from. */
export function catalogue(items) {
  const done = items.filter((it) => it.status === "done" && it.attrs);
  const byCat = new Map();
  for (const it of done) {
    const c = it.attrs.category;
    if (!byCat.has(c)) byCat.set(c, []);
    byCat.get(c).push(it);
  }

  const refToId = new Map();
  const idToRef = new Map();
  const lines = [];
  let n = 0;
  for (const [cat, list] of [...byCat].sort(([a], [b]) => a.localeCompare(b))) {
    lines.push(`\n## ${cat}`);
    for (const it of list) {
      const ref = `I${String(++n).padStart(2, "0")}`;
      refToId.set(ref, it._id);
      idToRef.set(it._id, ref);
      lines.push(`${ref}: ${describe(it.attrs)}`);
    }
  }
  return { text: lines.join("\n").trim(), refToId, idToRef };
}

export function describe(a) {
  const colours = [`${a.primaryColor} ${a.primaryHex}`];
  a.secondaryColors?.forEach((c, i) => colours.push(`${c} ${a.secondaryHexes?.[i] ?? ""}`.trim()));
  const parts = [
    `${a.name} (${a.subtype})`,
    `colour: ${colours.join(", ")}`,
    `pattern: ${a.pattern}`,
    `material: ${a.material}`,
    a.fit !== "n/a" && `fit: ${a.fit}`,
    `formality: ${a.formality}`,
    a.seasons?.length && `seasons: ${a.seasons.join("/")}`,
    a.brand && `brand: ${a.brand}`,
    a.tags?.length && `tags: ${a.tags.join(", ")}`,
  ];
  if (a.category === "fragrance") {
    parts.push(
      a.scentFamily && `family: ${a.scentFamily}`,
      [a.topNotes, a.heartNotes, a.baseNotes].some((x) => x?.length) &&
        `notes: ${[a.topNotes, a.heartNotes, a.baseNotes].map((x) => x?.join(", ") || "-").join(" / ")}`,
    );
  }
  parts.push(a.notes && `- ${a.notes}`);
  return parts.filter(Boolean).join(" | ");
}

export function schema(refs) {
  const ref = { type: "string", enum: refs };
  const str = { type: "string" };
  return {
    type: "object",
    additionalProperties: false,
    required: ["read", "gaps", "looks"],
    properties: {
      read: str,
      gaps: str,
      looks: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["title", "tagline", "direction", "pieces", "why", "tips", "swaps"],
          properties: {
            title: str,
            tagline: str,
            direction: str,
            pieces: {
              type: "array",
              items: {
                type: "object",
                additionalProperties: false,
                required: ["ref", "role", "note"],
                properties: { ref, role: { type: "string", enum: ROLES }, note: str },
              },
            },
            why: str,
            tips: { type: "array", items: str },
            swaps: {
              type: "array",
              items: {
                type: "object",
                additionalProperties: false,
                required: ["ref", "replaces", "note"],
                properties: { ref, replaces: ref, note: str },
              },
            },
          },
        },
      },
    },
  };
}

export function brief(req, cat) {
  const anchors = (req.anchorIds ?? []).map((id) => cat.idToRef.get(id)).filter(Boolean);
  const today = new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  return `Today is ${today}.

WHERE THEY'RE GOING
${req.occasion}

THEIR RULES
${req.constraints || "(none given)"}
${anchors.length ? `\nMUST INCLUDE IN EVERY LOOK\n${anchors.join(", ")}\n` : ""}
THE CLOSET
${cat.text}`;
}

/** Back from refs to Convex ids, dropping anything malformed rather than failing the whole lookbook. */
export function resolve(out, cat) {
  const id = (ref) => cat.refToId.get(ref);
  const looks = (out.looks ?? []).slice(0, 3).map((l) => {
    const seen = new Set();
    const pieces = (l.pieces ?? [])
      .filter((p) => id(p.ref) && ROLES.includes(p.role) && !seen.has(p.ref) && seen.add(p.ref))
      .map((p) => ({ id: id(p.ref), role: p.role, note: String(p.note ?? "") }));
    const swaps = (l.swaps ?? [])
      .filter((s) => id(s.ref) && id(s.replaces) && seen.has(s.replaces) && !seen.has(s.ref))
      .slice(0, 2)
      .map((s) => ({ id: id(s.ref), replaces: id(s.replaces), note: String(s.note ?? "") }));
    return {
      title: String(l.title ?? "Untitled"),
      tagline: String(l.tagline ?? ""),
      direction: String(l.direction ?? ""),
      pieces,
      why: String(l.why ?? ""),
      tips: (l.tips ?? []).map(String).slice(0, 5),
      swaps,
    };
  }).filter((l) => l.pieces.length >= 2);

  if (!looks.length) throw new Error("no wearable look came back");
  return { read: String(out.read ?? ""), gaps: String(out.gaps ?? ""), looks };
}

// ── The fitting room: replying to a note about one look ─────────────────────

export const NOTE_SYSTEM = `You are a personal stylist. Earlier you put together a lookbook for an occasion from the owner's own closet. Now they're passing you notes about one of those looks: trying a piece on, swapping one out, or asking a question. You get the brief, the look, the conversation so far, their new note, the outfit they're asking about, and the full closet.

Reply like a note passed back in class: two to four sentences, warm and decisive, about the actual pieces - colour (judge it from the hex values), fabric, proportion, formality, and what the occasion needs. Honest beats agreeable. If their idea works, say why. If it doesn't, say so plainly and give them the better move from their own closet.

verdict: "yes" if they should do it, "no" if they shouldn't, "depends" if it only works under a condition you name in the reply. For a question with no change attached, pick the verdict that answers it.

look: the complete outfit you would now tell them to wear for this occasion, with a role and a margin note of at most ten words for each piece. If you agree with what they're asking about, that's their outfit. If not, it's your better alternative, which can be the original look. title names that outfit in a few words.

Use only refs from the catalogue. The owner's rules from the brief still apply. Don't assume the owner's gender or body. The site is a homage to Clueless (1995); a wink at it now and then is fine, never at the expense of the advice.`;

export function noteSchema(refs) {
  return {
    type: "object",
    additionalProperties: false,
    required: ["verdict", "reply", "look"],
    properties: {
      verdict: { type: "string", enum: ["yes", "no", "depends"] },
      reply: { type: "string" },
      look: {
        type: "object",
        additionalProperties: false,
        required: ["title", "pieces"],
        properties: {
          title: { type: "string" },
          pieces: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              required: ["ref", "role", "note"],
              properties: {
                ref: { type: "string", enum: refs },
                role: { type: "string", enum: ROLES },
                note: { type: "string" },
              },
            },
          },
        },
      },
    },
  };
}

/** How a tried-on change reads in the prompt: "add I14 (denim jacket); swap I05 (watch) for I22 (silver watch)". */
function describeChange(change, cat, nameOf) {
  if (!change) return "";
  const r = (id) => `${cat.idToRef.get(id) ?? "?"} (${nameOf(id)})`;
  return [
    ...change.add.map((id) => `add ${r(id)}`),
    ...change.swap.map((s) => `swap ${r(s.out)} for ${r(s.in)}`),
    ...change.remove.map((id) => `take off ${r(id)}`),
  ].join("; ");
}

export function noteBrief({ note, request, thread }, items, cat) {
  const look = request.result.looks[note.lookIndex];
  const byId = new Map(items.map((it) => [it._id, it]));
  const nameOf = (id) => byId.get(id)?.attrs?.name ?? "a piece no longer in the closet";
  const ref = (id) => cat.idToRef.get(id) ?? "?";
  const yours = thread.filter((n) => n.author === "you").at(-1);
  const history = thread.slice(0, -1);
  const line = (n) => n.author === "you"
    ? `THEM: ${n.text || "(no words, just tried something on)"}${n.change ? `\n  tried: ${describeChange(n.change, cat, nameOf)}` : ""}`
    : n.status === "done" ? `YOU (${n.verdict}): ${n.text}` : null;
  const today = new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  return `Today is ${today}.

THE BRIEF
${request.occasion}
Rules: ${request.constraints || "(none given)"}

THE LOOK YOU PUT TOGETHER: "${look.title}"
${look.pieces.map((p) => `${ref(p.id)} ${nameOf(p.id)} - ${p.role} - "${p.note}"`).join("\n")}
Why: ${look.why}
${history.length ? `\nTHE CONVERSATION SO FAR\n${history.map(line).filter(Boolean).join("\n")}\n` : ""}
THEIR NEW NOTE
${yours?.text || "(no words, just tried something on)"}${yours?.change ? `\nTried: ${describeChange(yours.change, cat, nameOf)}` : ""}

THE OUTFIT THEY'RE ASKING ABOUT
${(yours?.outfit ?? look.pieces).map((p) => `${ref(p.id)} ${nameOf(p.id)} - ${p.role}`).join("\n")}

THE CLOSET
${cat.text}`;
}

export function resolveNote(out, cat) {
  const verdict = ["yes", "no", "depends"].includes(out?.verdict) ? out.verdict : "depends";
  const text = String(out?.reply ?? "").trim();
  if (!text) throw new Error("Cher's note came back blank");
  const seen = new Set();
  const pieces = (out.look?.pieces ?? [])
    .filter((p) => cat.refToId.has(p.ref) && ROLES.includes(p.role) && !seen.has(p.ref) && seen.add(p.ref))
    .map((p) => ({ id: cat.refToId.get(p.ref), role: p.role, note: String(p.note ?? "") }));
  const proposal = pieces.length >= 2 ? { title: String(out.look.title ?? "Her version"), pieces } : undefined;
  return { text, verdict, proposal };
}
