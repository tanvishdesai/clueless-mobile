import { useMemo, useState, type FormEvent } from "react";
import { useData, useItemIndex } from "../lib/data";
import { go, useRoute } from "../lib/route";
import { isTagged } from "../lib/types";
import { Polaroid, tiltFor } from "../components/Polaroid";
import { StatusPill } from "./Lookbook";

const OCCASIONS: [label: string, brief: string][] = [
  ["The Valley party", "A party in the Valley. Outdoors at someone's house, goes late, everyone will be there."],
  ["First day of school", "First day back at school. Debate class first period, lunch on the quad."],
  ["Driving test", "My driving test at the DMV. I want to look responsible but still like me."],
  ["Dinner with lawyers", "Dinner with Dad's lawyer friends at a good steakhouse."],
  ["Art-house date", "A date: an art-house screening, then coffee and a walk after."],
  ["Mall, then beach", "Rollin' with the homies: the mall in the afternoon, then the beach at sunset."],
  ["Charity drive", "Running a charity donation drive. Hands-on, outdoors, lots of lifting boxes."],
];

const RULES = [
  "No black.",
  "Comfortable shoes, lots of walking.",
  "It's hot out, 30°C+.",
  "Chilly in the evening.",
  "Nothing too tight.",
  "Keep it low-key.",
];

export function AskCher() {
  const { items, looks, stylist, request, mode } = useData();
  const index = useItemIndex();
  const { query } = useRoute();

  const [occasion, setOccasion] = useState("");
  const [rules, setRules] = useState("");
  const [anchors, setAnchors] = useState<string[]>([]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Anchors arrive by URL from "Build a look around this" and "Make it work".
  const fromUrl = query.get("anchor") ?? "";
  const [seen, setSeen] = useState("");
  if (fromUrl !== seen) {
    setSeen(fromUrl);
    if (fromUrl) setAnchors(fromUrl.split(",").filter(Boolean).slice(0, 4));
  }

  const tagged = useMemo(() => (items ?? []).filter(isTagged).sort((a, b) => a.attrs.name.localeCompare(b.attrs.name)), [items]);
  const recent = (looks ?? []).slice(0, 6);

  const addRule = (r: string) => setRules((cur) => (cur.includes(r) ? cur : `${cur.trim()} ${r}`.trim()));

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!occasion.trim()) return;
    setSending(true);
    setError(null);
    try {
      const id = await request({ occasion, constraints: rules, anchorIds: anchors.length ? anchors : undefined });
      go("lookbook", id);
    } catch (err) {
      setError((err as Error).message ?? String(err));
      setSending(false);
    }
  }

  return (
    <div className="ask">
      <form className="notepad" onSubmit={submit}>
        <header className="notepad-head">
          <p className="stretch kicker">Personal stylist · on call</p>
          <h2>Ask Cher</h2>
          <p className="notepad-sub">Tell her where you're going. She'll go through every piece you own and send back three complete looks.</p>
        </header>

        <label className="pad-label stretch" htmlFor="occasion">Where are we going?</label>
        <textarea
          id="occasion"
          className="lined"
          rows={3}
          value={occasion}
          placeholder="A party in the Valley…"
          onChange={(e) => setOccasion(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit(e as unknown as FormEvent); }}
          required
        />
        <div className="presets" aria-label="Occasion ideas">
          {OCCASIONS.map(([label, brief]) => (
            <button type="button" key={label} className="chip" onClick={() => setOccasion(brief)}>{label}</button>
          ))}
        </div>

        <label className="pad-label stretch" htmlFor="rules">Any rules?</label>
        <textarea id="rules" className="lined" rows={2} value={rules} placeholder="No stilettos. It might rain." onChange={(e) => setRules(e.target.value)} />
        <div className="presets" aria-label="Rule ideas">
          {RULES.map((r) => <button type="button" key={r} className="chip" onClick={() => addRule(r)}>+ {r.replace(/\.$/, "")}</button>)}
        </div>

        <div className="pad-label stretch">Must include</div>
        <div className="anchors">
          {anchors.map((id) => {
            const it = index.get(id);
            return it ? (
              <div className="anchor" key={id}>
                <Polaroid item={it} tilt={tiltFor(id, 4)} tape caption={<span className="hand">{it.attrs?.name}</span>} />
                <button type="button" className="anchor-x" onClick={() => setAnchors((a) => a.filter((x) => x !== id))} aria-label={`Remove ${it.attrs?.name}`}>×</button>
              </div>
            ) : null;
          })}
          {anchors.length < 4 && (
            <select
              className="field anchor-add"
              value=""
              onChange={(e) => e.target.value && setAnchors((a) => [...new Set([...a, e.target.value])])}
              aria-label="Add a piece every look must include"
            >
              <option value="">{anchors.length ? "+ another piece…" : "Optional: build around a piece…"}</option>
              {tagged.filter((it) => !anchors.includes(it._id)).map((it) => (
                <option key={it._id} value={it._id}>{it.attrs.name} ({it.attrs.category})</option>
              ))}
            </select>
          )}
        </div>

        {mode === "live" && stylist && !stylist.online && (
          <div className="notice">
            <span aria-hidden>☎</span>
            <div>
              <strong>The stylist's computer is off.</strong> Your request will wait in the queue until it's on:
              run <code>npm run stylist:watch</code> in <code>wardrobe-showcase</code> (or just <code>npm run dev</code>).
            </div>
          </div>
        )}
        {error && <div className="notice error"><strong>Way harsh.</strong> {error}</div>}

        <div className="pad-foot">
          <button className="btn hot default big" type="submit" disabled={sending || !occasion.trim()}>
            {sending ? "Dialing…" : "Dress me ✦"}
          </button>
          <span className="mono pad-model">
            {mode === "demo" ? "DEMO STYLIST · OFFLINE" : `STYLED BY ${(stylist?.model ?? "claude-opus-5-5").toUpperCase()} · EFFORT MEDIUM`}
          </span>
        </div>
      </form>

      <aside className="ask-side">
        <div className="tipcard">
          <p className="stretch kicker">How to brief your stylist</p>
          <ol>
            <li>Say the dress code, or describe the room.</li>
            <li>Mention the weather and what you'll actually be doing.</li>
            <li>Rules are rules: anything off-limits, she won't touch.</li>
            <li>Pin a piece to build the whole look around it.</li>
          </ol>
        </div>
        <div className="recent">
          <p className="stretch kicker">Recently on the phone</p>
          {recent.length === 0 && <p className="hand muted">No calls yet.</p>}
          {recent.map((l) => (
            <button key={l._id} className="recent-row" onClick={() => go("lookbook", l._id)}>
              <span className="recent-title">{l.result?.looks[0]?.title ?? l.occasion}</span>
              <span className="recent-sub">{l.occasion}</span>
              <StatusPill status={l.status} />
            </button>
          ))}
        </div>
      </aside>
    </div>
  );
}
