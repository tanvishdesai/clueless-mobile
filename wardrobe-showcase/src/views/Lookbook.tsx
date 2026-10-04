import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { useData, useItemIndex } from "../lib/data";
import { go } from "../lib/route";
import { isTagged, type Item, type Look, type LookRequest, type Tagged } from "../lib/types";
import { judge } from "../lib/match";
import { close as sameColour } from "../lib/color";
import { Photo, Polaroid, tiltFor } from "../components/Polaroid";
import { Logo } from "../components/Logo";
import hanger from "../assets/hanger.svg";

export function Lookbook({ id }: { id?: string }) {
  const { looks } = useData();
  if (!looks) return null;
  if (id) {
    const req = looks.find((l) => l._id === id);
    if (!req) return <div className="empty"><h2>That issue's sold out.</h2><p>This lookbook was deleted.</p><button className="btn" onClick={() => go("lookbook")}>Back to the lookbook</button></div>;
    return <Issue key={req._id} req={req} />;
  }
  return <Archive looks={looks} />;
}

// ── Archive: every request as a magazine cover ────────────────────────────

const COVER_BG = ["var(--yellow)", "var(--pink)", "var(--blue)", "var(--paper-2)", "#f0b48c"];

function Archive({ looks }: { looks: LookRequest[] }) {
  const [saved, setSaved] = useState(false);
  const index = useItemIndex();
  const shown = saved ? looks.filter((l) => l.favorite) : looks;
  return (
    <div className="archive">
      <header className="closet-head">
        <div>
          <p className="stretch kicker">Every look your stylist ever put together</p>
          <h2 className="closet-title">The Lookbook</h2>
        </div>
        <div className="toolbar-right">
          <div className="seg" role="group" aria-label="Filter">
            <button aria-pressed={!saved} onClick={() => setSaved(false)}>All issues</button>
            <button aria-pressed={saved} onClick={() => setSaved(true)}>♥ Saved</button>
          </div>
          <button className="btn hot default" onClick={() => go("ask")}>New look ✦</button>
        </div>
      </header>
      {shown.length === 0 ? (
        <div className="empty">
          <h2>{saved ? "Nothing saved yet." : "No issues yet."}</h2>
          <p>{saved ? "Heart a lookbook to keep it here." : "Ask Cher for a look and it'll be printed here."}</p>
          {!saved && <button className="btn hot default" onClick={() => go("ask")}>Ask Cher ✦</button>}
        </div>
      ) : (
        <div className="covers">
          {shown.map((l, i) => <Cover key={l._id} req={l} n={looks.length - looks.indexOf(l)} bg={COVER_BG[i % COVER_BG.length]} index={index} />)}
        </div>
      )}
    </div>
  );
}

function Cover({ req, n, bg, index }: { req: LookRequest; n: number; bg: string; index: Map<string, Item> }) {
  const look = req.result?.looks[0];
  const photos = (look?.pieces ?? [])
    .filter((p) => p.role !== "fragrance")
    .map((p) => index.get(p.id))
    .filter(Boolean)
    .slice(0, 3) as Item[];
  return (
    <button className={`cover status-${req.status}`} style={{ background: bg }} onClick={() => go("lookbook", req._id)}>
      <span className="cover-mast">
        <Logo size={30} />
        <span className="mono">ISSUE {String(n).padStart(2, "0")}</span>
      </span>
      <span className="cover-photos">
        {photos.map((it, i) => (
          <span key={it._id} className="cover-photo" style={{ ["--i" as string]: i, ["--tilt" as string]: `${tiltFor(it._id, 6)}deg` } as CSSProperties}>
            <Photo item={it} />
          </span>
        ))}
        {req.status !== "done" && (
          <span className="cover-wait">
            {req.status === "error" ? <span className="mono">MIS-SENT</span> : <><span className="barber" /><span className="mono">{req.status === "styling" ? "STYLING…" : "IN THE QUEUE"}</span></>}
          </span>
        )}
      </span>
      <span className="cover-title">{look?.title ?? (req.status === "error" ? "Way harsh." : "Coming soon")}</span>
      <span className="cover-line stretch">How to dress for: {req.occasion}</span>
      <span className="cover-foot">
        <span className="mono">{new Date(req._creationTime).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</span>
        {req.favorite && <span aria-label="Saved">♥</span>}
        {req.result && <span className="mono">{req.result.looks.length} LOOKS</span>}
      </span>
    </button>
  );
}

// ── One issue: pending, failed, or the spread ─────────────────────────────

function Issue({ req }: { req: LookRequest }) {
  if (req.status === "pending" || req.status === "styling") return <Styling req={req} />;
  if (req.status === "error" || !req.result) return <Failed req={req} />;
  return <Magazine req={req} />;
}

const LINES = [
  "Pulling everything that isn't brown…",
  "Holding the yellow plaid up to the light…",
  "Checking the hex codes against each other…",
  "Vetoing two patterns at once…",
  "Asking whether it's a Monet - fine from far away, a mess up close…",
  "Matching the shoes to the darkest colour up top…",
  "Considering the weather. And the vibe.",
  "Writing it all up in the fuzzy pen…",
];

function Styling({ req }: { req: LookRequest }) {
  const { stylist, mode } = useData();
  const [t, setT] = useState(0);
  useEffect(() => {
    const start = Date.now();
    const timer = setInterval(() => setT(Math.floor((Date.now() - start) / 1000)), 1000);
    return () => clearInterval(timer);
  }, []);
  const offline = mode === "live" && stylist && !stylist.online;
  const line = LINES[Math.floor(t / 3) % LINES.length];
  return (
    <div className="styling">
      <div className="hanger-parade" aria-hidden>
        {Array.from({ length: 7 }, (_, i) => <img key={i} src={hanger} alt="" style={{ animationDelay: `${i * -0.9}s` }} />)}
      </div>
      <div className="dialog">
        <p className="stretch kicker">{req.status === "pending" ? "Your request is in the queue" : "On the phone with your stylist"}</p>
        <h2>{req.status === "pending" ? "Dialing…" : "Styling…"}</h2>
        <div className="progress barber" role="progressbar" aria-label="Styling in progress" />
        <p className="mono styling-line" aria-live="polite">{offline ? "Waiting for the stylist's computer to come on…" : line}</p>
        <p className="mono styling-time">{String(Math.floor(t / 60)).padStart(2, "0")}:{String(t % 60).padStart(2, "0")}</p>
        {offline && (
          <div className="notice">
            <span aria-hidden>☎</span>
            <div><strong>No one's picking up.</strong> Start the stylist on your laptop: <code>cd wardrobe-showcase && npm run stylist:watch</code>. This request will be styled as soon as it's on.</div>
          </div>
        )}
        <div className="brief-card">
          <span className="stretch">The brief</span>
          <p className="hand">{req.occasion}</p>
          {req.constraints && <p className="hand muted">Rules: {req.constraints}</p>}
        </div>
      </div>
    </div>
  );
}

function Failed({ req }: { req: LookRequest }) {
  const { retry, remove } = useData();
  return (
    <div className="empty">
      <h2>Way harsh.</h2>
      <p>The stylist couldn't finish this one.</p>
      {req.error && <p className="mono" style={{ fontSize: 18 }}>{req.error}</p>}
      <div style={{ display: "flex", gap: 10 }}>
        <button className="btn hot default" onClick={() => retry(req._id)}>Try again</button>
        <button className="btn" onClick={async () => { await remove(req._id); go("lookbook"); }}>Delete</button>
      </div>
    </div>
  );
}

function Magazine({ req }: { req: LookRequest }) {
  const index = useItemIndex();
  const { setFavorite, remove, request } = useData();
  const book = req.result!;
  const [n, setN] = useState(0);
  const [copied, setCopied] = useState(false);
  const look = book.looks[Math.min(n, book.looks.length - 1)];
  const seconds = req.finishedAt && req.startedAt ? Math.round((req.finishedAt - req.startedAt) / 1000) : undefined;

  const copy = async () => {
    await navigator.clipboard.writeText(asText(req, index));
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };
  const restyle = async () => go("lookbook", await request({ occasion: req.occasion, constraints: req.constraints, anchorIds: req.anchorIds }));

  return (
    <article className="mag">
      <nav className="mag-tabs" aria-label="Looks">
        <button className="mag-back" onClick={() => go("lookbook")}>◀ All issues</button>
        {book.looks.map((l, i) => (
          <button key={i} aria-current={i === n ? "page" : undefined} onClick={() => setN(i)}>
            <span className="mono">{String(i + 1).padStart(2, "0")}</span> {l.title}
          </button>
        ))}
      </nav>

      <div className="paper">
        <header className="masthead">
          <span className="stretch">Closet Computer</span>
          <span className="mast-mid mono">LOOK {String(n + 1).padStart(2, "0")} / {String(book.looks.length).padStart(2, "0")}</span>
          <span className="stretch">{new Date(req._creationTime).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })}</span>
        </header>

        <div className={`brief-strip ${book.gaps ? "has-gaps" : ""}`}>
          <div><span className="stretch">The brief</span><p>{req.occasion}{req.constraints && <em> — {req.constraints}</em>}</p></div>
          {book.read && <div><span className="stretch">The read</span><p className="hand">{book.read}</p></div>}
          {book.gaps && (
            <aside className="postit hand">
              <span className="stretch">Shopping list</span>
              {book.gaps}
            </aside>
          )}
        </div>

        <Spread look={look} occasion={req.occasion} index={index} />

        <footer className="mag-foot">
          <div className="mag-actions">
            <button className="btn small" onClick={() => setFavorite(req._id, !req.favorite)} aria-pressed={!!req.favorite}>{req.favorite ? "♥ Saved" : "♡ Save"}</button>
            <button className="btn small" onClick={restyle}>Restyle ↻</button>
            <button className="btn small" onClick={copy}>{copied ? "Copied!" : "Copy as text"}</button>
            <button className="btn small ghost" onClick={async () => { if (confirm("Delete this lookbook?")) { await remove(req._id); go("lookbook"); } }}>Delete</button>
          </div>
          <span className="mono">STYLED BY {(req.model ?? "claude-opus-5-5").toUpperCase()}{seconds !== undefined ? ` IN ${seconds}S` : ""}</span>
        </footer>
      </div>

      {book.looks.length > 1 && (
        <div className="mag-pager">
          <button className="btn" disabled={n === 0} onClick={() => setN(n - 1)}>◀ Previous look</button>
          <button className="btn" disabled={n === book.looks.length - 1} onClick={() => setN(n + 1)}>Next look ▶</button>
        </div>
      )}
    </article>
  );
}

function Spread({ look, occasion, index }: { look: Look; occasion: string; index: Map<string, Item> }) {
  const pieces = useMemo(
    () => look.pieces.map((p) => ({ ...p, item: index.get(p.id) })).filter((p): p is typeof p & { item: Tagged } => !!p.item && isTagged(p.item)),
    [look, index],
  );
  const verdict = judge(pieces.map((p) => p.item));
  const palette = pieces.reduce<{ hex: string; name: string }[]>((acc, p) => {
    const { primaryHex: hex, primaryColor: name } = p.item.attrs;
    if (p.role !== "fragrance" && !acc.some((c) => sameColour(c.hex, hex))) acc.push({ hex, name });
    return acc;
  }, []);
  const missing = look.pieces.length - pieces.length;

  return (
    <div className="spread">
      <div className="collage-col">
        <Collage pieces={pieces} />
        <ol className="credits">
          {pieces.map((p, i) => (
            <li key={p.id}>
              <span className="credit-no">{i + 1}</span>
              <span className="credit-name">{p.item.attrs.name}{p.item.attrs.brand ? <em>, {p.item.attrs.brand}</em> : null}</span>
              <span className="credit-note hand">{p.note}</span>
            </li>
          ))}
        </ol>
        {missing > 0 && <p className="mono muted">{missing} piece(s) from this look are no longer in the closet.</p>}
      </div>

      <div className="text-col">
        <p className="stretch kicker red">For: {occasion.length > 56 ? `${occasion.slice(0, 54).trimEnd()}…` : occasion}</p>
        <h2 className="headline">{look.title}</h2>
        {look.direction && <p className="stretch direction">{look.direction}</p>}
        {look.tagline && <blockquote className="pull">{look.tagline}</blockquote>}

        <section className="why">
          <h3 className="stretch">Why it works</h3>
          <p className="dropcap">{look.why}</p>
        </section>

        {palette.length > 0 && (
          <section>
            <h3 className="stretch">The palette</h3>
            <div className="paint-chips">
              {palette.map((c) => (
                <span key={c.hex} className="paint-chip">
                  <span className="paint-chip-colour" style={{ background: c.hex }} />
                  <span className="paint-chip-name">{c.name}</span>
                  <span className="mono">{c.hex.toUpperCase()}</span>
                </span>
              ))}
            </div>
          </section>
        )}

        {look.tips.length > 0 && (
          <section className="tips">
            <h3 className="stretch">How to wear it</h3>
            <ol>{look.tips.map((t, i) => <li key={i}>{t}</li>)}</ol>
          </section>
        )}

        {look.swaps.length > 0 && (
          <section className="swaps">
            <h3 className="stretch">Swap it</h3>
            {look.swaps.map((s, i) => {
              const it = index.get(s.id);
              const was = index.get(s.replaces);
              if (!it?.attrs) return null;
              return (
                <div key={i} className="swap">
                  <span className="swap-photo"><Photo item={it} /></span>
                  <span>
                    <strong>{it.attrs.name}</strong>
                    {was?.attrs && <span className="muted"> instead of the {was.attrs.subtype}</span>}
                    <span className="hand swap-note">{s.note}</span>
                  </span>
                </div>
              );
            })}
          </section>
        )}

        <Stamp score={verdict.score} match={verdict.match} />
      </div>
    </div>
  );
}

type Placed = { id: string; role: string; note: string; item: Tagged };

/** Paper-doll layout: the outfit assembled roughly where it's worn. */
function Collage({ pieces }: { pieces: Placed[] }) {
  const hasOuter = pieces.some((p) => p.role === "outerwear");
  let acc = 0;
  const pos = (p: Placed): [number, number, number, number] => {
    // left %, top %, width %, z
    switch (p.role) {
      case "outerwear": return [3, 4, 40, 2];
      case "top": return hasOuter ? [36, 1, 36, 4] : [27, 1, 40, 4];
      case "dress": return hasOuter ? [35, 2, 40, 4] : [25, 2, 44, 4];
      case "underlayer": return [6, 42, 26, 1];
      case "bottom": return [30, 37, 36, 3];
      case "footwear": return [33, 69, 30, 5];
      case "fragrance": return [5, 70, 22, 6];
      default: { const k = acc++; return [73, 3 + k * 25, 25, 6 + k]; }
    }
  };
  return (
    <div className="collage">
      {pieces.map((p, i) => {
        const [left, top, width, z] = pos(p);
        return (
          <Polaroid
            key={p.id}
            item={p.item}
            tape={i % 2 === 0}
            tilt={tiltFor(p.id, 5)}
            className="collage-piece"
            style={{ left: `${left}%`, top: `${top}%`, width: `${width}%`, zIndex: z }}
            badge={i + 1}
          />
        );
      })}
    </div>
  );
}

/** A rubber stamp from the closet computer: the MATCH engine signs off too. */
function Stamp({ score, match }: { score: number; match: boolean }) {
  return (
    <svg className={`stamp ${match ? "" : "warn"}`} viewBox="0 0 120 120" role="img" aria-label={`${match ? "Match" : "Mis-match"}, ${score} out of 100`}>
      <defs><path id="ring" d="M60 60 m-44 0 a44 44 0 1 1 88 0 a44 44 0 1 1 -88 0" /></defs>
      <circle cx="60" cy="60" r="56" fill="none" stroke="currentColor" strokeWidth="2.5" />
      <circle cx="60" cy="60" r="33" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <text fontFamily="Jost, sans-serif" fontSize="9.5" letterSpacing="2.6" fill="currentColor">
        <textPath href="#ring">CHECKED BY THE CLOSET COMPUTER · 1995 ·</textPath>
      </text>
      <text x="60" y="58" textAnchor="middle" fontFamily="Pixelify Sans, monospace" fontSize={match ? 15 : 12} fontWeight="700" fill="currentColor">{match ? "MATCH" : "MIS-MATCH"}</text>
      <text x="60" y="75" textAnchor="middle" fontFamily="VT323, monospace" fontSize="15" fill="currentColor">{score}/100</text>
    </svg>
  );
}

export function StatusPill({ status }: { status: LookRequest["status"] }) {
  const label = { pending: "QUEUED", styling: "STYLING", done: "READY", error: "FAILED" }[status];
  return <span className={`pill pill-${status} mono`}>{label}</span>;
}

function asText(req: LookRequest, index: Map<string, Item>) {
  const b = req.result!;
  const name = (id: string) => index.get(id)?.attrs?.name ?? "(removed)";
  return [
    `For: ${req.occasion}${req.constraints ? ` (${req.constraints})` : ""}`,
    "",
    ...b.looks.flatMap((l, i) => [
      `LOOK ${i + 1}: ${l.title}`,
      l.tagline,
      ...l.pieces.map((p) => `  - ${name(p.id)} (${p.role}): ${p.note}`),
      l.why,
      ...l.tips.map((t) => `  * ${t}`),
      "",
    ]),
    b.gaps ? `Shopping list: ${b.gaps}` : "",
  ].join("\n").trim();
}

