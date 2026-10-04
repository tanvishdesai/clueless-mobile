import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useData } from "../lib/data";
import { firstName, isTagged, type Change, type Item, type Look, type LookRequest, type Note, type Piece } from "../lib/types";
import { addTo, askAbout, isEmpty, NO_CHANGE, samePieces } from "../lib/outfit";
import { CATEGORY_LABEL, CATEGORY_ORDER } from "../lib/closet";
import { colorSortKey } from "../lib/color";
import { Photo, Polaroid, tiltFor } from "../components/Polaroid";

/**
 * The fitting room: notes passed back and forth with Cher about one look.
 * Your notes go on lined paper in your pen; hers come back on her stationery
 * with a stamp. The collage beside it is the mannequin: whatever you try on
 * shows up there before you even ask.
 */

const STARTERS = [
  "Make it dressier.",
  "Make it more relaxed.",
  "It's colder than I thought.",
  "Different shoes?",
];

const VERDICT: Record<string, string> = { yes: "Totally.", no: "As if.", depends: "Depends." };

export type Picking = { swapFor?: string } | null;

type Props = {
  req: LookRequest;
  lookIndex: number;
  look: Look;
  base: Piece[];          // the look as the magazine printed it
  worn: Piece[];          // on the mannequin before the pending change
  preview: Piece[];       // worn + pending change
  change: Change;
  setChange: (c: Change) => void;
  onWear: (pieces: Piece[]) => void;
  onKept: (index: number) => void;
  onClose: () => void;
  picking: Picking;
  setPicking: (p: Picking) => void;
  index: Map<string, Item>;
};

export function FittingRoom(props: Props) {
  const { req, lookIndex, look, base, worn, preview, change, setChange, onWear, onClose, picking, setPicking, index } = props;
  const { notes, sendNote, stylist, mode, me } = useData();
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scroller = useRef<HTMLDivElement>(null);

  const thread = useMemo(
    () => (notes ?? []).filter((n) => n.lookId === req._id && n.lookIndex === lookIndex).sort((a, b) => a._creationTime - b._creationTime),
    [notes, req._id, lookIndex],
  );
  const waiting = thread.some((n) => n.author === "cher" && (n.status === "pending" || n.status === "writing"));
  const suggestion = askAbout(change, index);
  const canSend = !sending && !waiting && (!!text.trim() || !isEmpty(change));

  // Keep the newest note in view: inside the notes column on desktop, on the
  // page on a phone. Not on first open, which shows the collage first.
  const seen = useRef(-1);
  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    if (seen.current === -1) {
      el.scrollTop = el.scrollHeight;
    } else if (thread.length > seen.current) {
      el.lastElementChild?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
    seen.current = thread.length;
  }, [thread.length]);

  async function send(e?: FormEvent) {
    e?.preventDefault();
    if (!canSend) return;
    setSending(true);
    setError(null);
    try {
      await sendNote({
        lookId: req._id,
        lookIndex,
        text: text.trim() || suggestion,
        change: isEmpty(change) ? undefined : change,
        outfit: preview.map((p) => ({ id: p.id, role: p.role })),
      });
      onWear(preview);
      setText("");
    } catch (err) {
      setError((err as Error).message ?? String(err));
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="fitting-col">
      <header className="fitting-head">
        <div>
          <p className="stretch kicker red">The fitting room</p>
          <h2 className="fitting-title">Notes on “{look.title}”</h2>
        </div>
        <button className="btn small ghost" onClick={onClose}>✕ Back to the article</button>
      </header>

      <div className="thread" ref={scroller} aria-live="polite">
        <CherCard>
          <p>Hi {firstName(me.name)}! Try something on, or just ask. Click any piece in the collage to swap it out or lose it, or pull one off the rack. I'll tell you if it works.</p>
          {thread.length === 0 && (
            <div className="starters">
              {STARTERS.map((s) => <button key={s} type="button" className="chip" onClick={() => setText(s)}>{s}</button>)}
            </div>
          )}
        </CherCard>

        {thread.map((n) =>
          n.author === "you"
            ? <YourNote key={n._id} note={n} index={index} />
            : <CherReply key={n._id} note={n} req={req} worn={worn} base={base} index={index} onWear={onWear} onKept={props.onKept} offline={mode === "live" && stylist !== undefined && !stylist.online} />,
        )}
      </div>

      <form className="composer" onSubmit={send}>
        {!isEmpty(change) && (
          <div className="trying" aria-label="Trying on">
            <span className="stretch">Trying on</span>
            <ChangeChips change={change} index={index} onUndo={(next) => setChange(next)} />
          </div>
        )}
        <textarea
          className="lined"
          rows={2}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(); } }}
          placeholder={suggestion || "What if I wore my denim jacket with it?"}
          aria-label="Your note to Cher"
        />
        {error && <p className="composer-error">Way harsh: {error}</p>}
        <div className="composer-row">
          <button type="button" className="btn small" onClick={() => setPicking({})}>+ Try a piece</button>
          {!samePieces(preview, base) && (
            <button type="button" className="btn small ghost" onClick={() => { setChange(NO_CHANGE); onWear(base); }}>Back to the original</button>
          )}
          <button type="submit" className="btn hot default composer-send" disabled={!canSend}>
            {waiting ? "Cher's writing…" : sending ? "Folding…" : "Pass the note ➜"}
          </button>
        </div>
      </form>

      {picking && (
        <Rack
          preview={preview}
          swapFor={picking.swapFor}
          index={index}
          onClose={() => setPicking(null)}
          onPick={(action) => { setChange(addTo(change, action)); setPicking(null); }}
        />
      )}
    </div>
  );
}

function CherCard({ children, verdict }: { children: React.ReactNode; verdict?: string }) {
  return (
    <article className="cher-note">
      <header className="stationery-head">
        <span className="stretch">From the desk of Cher H.</span>
        {verdict && <span className={`verdict-stamp v-${verdict}`}>{VERDICT[verdict] ?? verdict}</span>}
      </header>
      <div className="cher-body">{children}</div>
    </article>
  );
}

function YourNote({ note, index }: { note: Note; index: Map<string, Item> }) {
  return (
    <article className="your-note" style={{ ["--tilt" as string]: `${tiltFor(note._id, 1.2)}deg` }}>
      {note.change && <ChangeChips change={note.change} index={index} />}
      {note.text && <p className="hand">{note.text}</p>}
    </article>
  );
}

function CherReply({ note, req, worn, base, index, onWear, onKept, offline }: {
  note: Note; req: LookRequest; worn: Piece[]; base: Piece[]; index: Map<string, Item>;
  onWear: (p: Piece[]) => void; onKept: (i: number) => void; offline: boolean;
}) {
  const { retryNote, keepLook } = useData();
  const [keeping, setKeeping] = useState(false);

  if (note.status === "pending" || note.status === "writing") {
    return (
      <CherCard>
        <div className="writing">
          <svg viewBox="0 0 120 24" className="squiggle" aria-hidden><path d="M2 16 C 12 2, 18 22, 28 12 S 44 4, 52 14 S 70 22, 78 10 S 96 4, 104 14 L 118 12" /></svg>
          <span className="mono">{offline ? "Waiting for the stylist's computer…" : "Cher is writing…"}</span>
        </div>
        {offline && <p className="muted small">Start it with <code>npm run stylist:watch</code>; your note will be answered as soon as it's on.</p>}
      </CherCard>
    );
  }
  if (note.status === "error") {
    return (
      <CherCard>
        <p>Ugh, I couldn't get through. <span className="mono muted">{note.error}</span></p>
        <button className="btn small" onClick={() => retryNote(note._id)}>Try again</button>
      </CherCard>
    );
  }

  const prop = note.proposal;
  const kept = prop ? (req.result?.looks ?? []).findIndex((l) => samePieces(l.pieces, prop.pieces)) : -1;
  const showing = prop ? samePieces(prop.pieces, worn) : false;

  const keep = async () => {
    if (!prop) return;
    setKeeping(true);
    try {
      const i = await keepLook(req._id, {
        title: prop.title,
        // The first real sentence makes the pull quote; "Totally." on its own doesn't.
        tagline: note.text.split(/(?<=[.!?])\s+/).find((x) => x.length > 24) ?? "",
        direction: "revised in the fitting room",
        pieces: prop.pieces,
        why: note.text,
        tips: [],
        swaps: [],
      });
      onKept(i);
    } finally {
      setKeeping(false);
    }
  };

  return (
    <CherCard verdict={note.verdict}>
      <p>{note.text}</p>
      {prop && (
        <div className="proposal">
          <div className="proposal-strip">
            {prop.pieces.map((p) => {
              const it = index.get(p.id);
              return it ? <span key={p.id} className="proposal-photo" title={it.attrs?.name}><Photo item={it} /></span> : null;
            })}
          </div>
          <div className="proposal-row">
            <span className="proposal-title">{prop.title}</span>
            <span className="proposal-actions">
              {!showing && <button className="btn small" onClick={() => onWear(prop.pieces)}>{samePieces(prop.pieces, base) ? "Back to the original" : "Try her version"}</button>}
              {kept >= 0
                ? <span className="mono kept">IN THE ISSUE AS LOOK {String(kept + 1).padStart(2, "0")}</span>
                : <button className="btn small hot" onClick={keep} disabled={keeping}>{keeping ? "Printing…" : "Keep this version"}</button>}
            </span>
          </div>
        </div>
      )}
      <span className="signature hand">— C.</span>
    </CherCard>
  );
}

function ChangeChips({ change, index, onUndo }: { change: Change; index: Map<string, Item>; onUndo?: (c: Change) => void }) {
  const name = (id: string) => index.get(id)?.attrs?.name ?? "a piece";
  const thumb = (id: string) => { const it = index.get(id); return it ? <span className="chip-photo"><Photo item={it} /></span> : null; };
  const x = (next: Change) => onUndo && <button type="button" className="chip-x" onClick={() => onUndo(next)} aria-label="Undo">×</button>;
  return (
    <div className="change-chips">
      {change.add.map((id) => (
        <span key={`a${id}`} className="change-chip add">{thumb(id)}<span>+ {name(id)}</span>{x({ ...change, add: change.add.filter((y) => y !== id) })}</span>
      ))}
      {change.swap.map((s) => (
        <span key={`s${s.out}`} className="change-chip swap">{thumb(s.in)}<span>{name(s.in)} <em>instead of the {index.get(s.out)?.attrs?.subtype ?? "piece"}</em></span>{x({ ...change, swap: change.swap.filter((y) => y !== s) })}</span>
      ))}
      {change.remove.map((id) => (
        <span key={`r${id}`} className="change-chip remove"><span>− without the {name(id)}</span>{x({ ...change, remove: change.remove.filter((y) => y !== id) })}</span>
      ))}
    </div>
  );
}

type Action = { add: string } | { swap: { out: string; in: string } } | { remove: string };

/** Off the rack: pick a piece to try on, then say where it goes. */
function Rack({ preview, swapFor, index, onClose, onPick }: {
  preview: Piece[]; swapFor?: string; index: Map<string, Item>; onClose: () => void; onPick: (a: Action) => void;
}) {
  const { items } = useData();
  const target = swapFor ? index.get(swapFor) : undefined;
  const [cat, setCat] = useState<string>(target?.attrs?.category ?? "all");
  const [chosen, setChosen] = useState<string | null>(null);

  const pool = useMemo(
    () => (items ?? []).filter(isTagged).filter((it) => !preview.some((p) => p.id === it._id))
      .sort((a, b) => colorSortKey(a.attrs.primaryHex) - colorSortKey(b.attrs.primaryHex)),
    [items, preview],
  );
  const cats = CATEGORY_ORDER.filter((c) => pool.some((it) => it.attrs.category === c));
  const shown = pool.filter((it) => cat === "all" || it.attrs.category === cat);

  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [onClose]);

  const pick = (id: string) => {
    if (swapFor) return onPick({ swap: { out: swapFor, in: id } });
    setChosen(id);
  };
  const picked = chosen ? index.get(chosen) : undefined;
  // Where could the picked piece go? Same-category pieces first: that's usually the swap you mean.
  const swapOptions = picked
    ? [...preview].sort((a, b) => Number(index.get(b.id)?.attrs?.category === picked.attrs?.category) - Number(index.get(a.id)?.attrs?.category === picked.attrs?.category))
    : [];

  return (
    <div className="rack-panel" role="dialog" aria-label={target ? `Swap the ${target.attrs?.subtype}` : "Try a piece on"}>
      <header className="rack-head">
        <div>
          <p className="stretch kicker">{target ? "Swap it out" : "Off the rack"}</p>
          <h3>{target ? <>Instead of the {target.attrs?.subtype}…</> : picked ? <>Where does it go?</> : <>Try a piece on</>}</h3>
        </div>
        <button className="btn small ghost" onClick={onClose} aria-label="Close the rack">✕</button>
      </header>

      {picked ? (
        <div className="rack-place">
          <div className="rack-picked">
            <Polaroid item={picked} tilt={-2} tape caption={<span className="hand">{picked.attrs?.name}</span>} />
          </div>
          <div className="rack-choices">
            <button className="btn hot default" onClick={() => onPick({ add: picked._id })}>Add it to the look</button>
            <p className="stretch">or wear it instead of</p>
            <div className="rack-swaps">
              {swapOptions.map((p) => {
                const it = index.get(p.id);
                return it ? (
                  <button key={p.id} className="rack-swap" onClick={() => onPick({ swap: { out: p.id, in: picked._id } })}>
                    <span className="chip-photo"><Photo item={it} /></span>{it.attrs?.name}
                  </button>
                ) : null;
              })}
            </div>
            <button className="btn small ghost" onClick={() => setChosen(null)}>◀ Pick something else</button>
          </div>
        </div>
      ) : (
        <>
          <div className="rack-filters">
            <div className="seg" role="group" aria-label="Category">
              <button aria-pressed={cat === "all"} onClick={() => setCat("all")}>All</button>
              {cats.map((c) => <button key={c} aria-pressed={cat === c} onClick={() => setCat(c)}>{CATEGORY_LABEL[c]}</button>)}
            </div>
            {swapFor && <button className="btn small" onClick={() => onPick({ remove: swapFor })}>Just take it off</button>}
          </div>
          <div className="rack-grid">
            {shown.map((it) => (
              <Polaroid key={it._id} item={it} onClick={() => pick(it._id)} caption={<span className="hand">{it.attrs.name}</span>} />
            ))}
            {shown.length === 0 && <p className="muted">Nothing else in this section.</p>}
          </div>
        </>
      )}
    </div>
  );
}
