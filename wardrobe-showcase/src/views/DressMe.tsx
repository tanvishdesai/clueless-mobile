import { useCallback, useEffect, useMemo, useState } from "react";
import { useData } from "../lib/data";
import { go, useRoute } from "../lib/route";
import { isTagged, type Tagged } from "../lib/types";
import { judge } from "../lib/match";
import { colorSortKey, close as sameColour, inkOn } from "../lib/color";
import { Photo } from "../components/Polaroid";

type SlotKey = "layer" | "top" | "bottom" | "shoes" | "extra";

const SLOTS: { key: SlotKey; label: string; cats: string[]; optional?: boolean; big?: boolean }[] = [
  { key: "layer", label: "Layer", cats: ["outerwear"], optional: true },
  { key: "top", label: "Top", cats: ["top", "dress"], big: true },
  { key: "bottom", label: "Bottom", cats: ["bottom"], big: true },
  { key: "shoes", label: "Shoes", cats: ["footwear"], optional: true },
  { key: "extra", label: "Extra", cats: ["accessory"], optional: true },
];

type State = Record<SlotKey, { i: number; on: boolean; locked: boolean }>;

const byColour = (a: Tagged, b: Tagged) => colorSortKey(a.attrs.primaryHex) - colorSortKey(b.attrs.primaryHex);

/**
 * Cher's closet program: tops and bottoms swinging past, and the computer's
 * verdict. "MIS-MATCH" in red if you got it wrong.
 */
export function DressMe() {
  const { items } = useData();
  const { query } = useRoute();
  const wear = query.get("wear");

  const lists = useMemo(() => {
    const tagged = (items ?? []).filter(isTagged);
    return Object.fromEntries(
      SLOTS.map((s) => [s.key, tagged.filter((it) => s.cats.includes(it.attrs.category)).sort(byColour)]),
    ) as Record<SlotKey, Tagged[]>;
  }, [items]);

  const [state, setState] = useState<State>(() => initial());
  const [focus, setFocus] = useState<SlotKey>("top");

  // "Try it on" from a file card: put that piece in its slot and lock it.
  const [placed, setPlaced] = useState<string | null>(null);
  if (wear && wear !== placed && items) {
    setPlaced(wear);
    const slot = SLOTS.find((s) => lists[s.key].some((it) => it._id === wear));
    if (slot) {
      const i = lists[slot.key].findIndex((it) => it._id === wear);
      setState((st) => ({ ...st, [slot.key]: { i, on: true, locked: true } }));
      setFocus(slot.key);
    }
  }

  const current = (k: SlotKey) => {
    const l = lists[k];
    const s = state[k];
    return s.on && l.length ? l[((s.i % l.length) + l.length) % l.length] : undefined;
  };
  const top = current("top");
  const isDress = top?.attrs.category === "dress";
  const pieces = (["layer", "top", "bottom", "shoes", "extra"] as SlotKey[])
    .filter((k) => !(k === "bottom" && isDress))
    .map(current)
    .filter(Boolean) as Tagged[];

  const verdict = judge(pieces);
  const comboKey = pieces.map((p) => p._id).join("|");

  const step = useCallback((k: SlotKey, d: number) => {
    setState((st) => ({ ...st, [k]: { ...st[k], i: st[k].i + d, on: true } }));
  }, []);

  const shuffle = () => setState((st) => randomize(st, lists));
  const autoMatch = () => {
    let best = state;
    let bestScore = -1;
    for (let n = 0; n < 240; n++) {
      const cand = randomize(state, lists);
      const s = judge(piecesFor(cand, lists)).score;
      if (s > bestScore) { best = cand; bestScore = s; }
    }
    setState(best);
  };

  useEffect(() => {
    const keys = SLOTS.map((s) => s.key);
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.closest("input, textarea, select")) return;
      if (e.key === "ArrowLeft") { e.preventDefault(); step(focus, -1); }
      if (e.key === "ArrowRight") { e.preventDefault(); step(focus, 1); }
      if (e.key === "ArrowUp") { e.preventDefault(); setFocus(keys[Math.max(0, keys.indexOf(focus) - 1)]); }
      if (e.key === "ArrowDown") { e.preventDefault(); setFocus(keys[Math.min(keys.length - 1, keys.indexOf(focus) + 1)]); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [focus, step]);

  if (!items) return null;
  if (!lists.top.length) {
    return <div className="empty"><h2>Nothing to try on.</h2><p>Once the closet has tops and bottoms tagged, they'll swing by here.</p></div>;
  }

  const palette = pieces.reduce<{ hex: string; name: string }[]>((acc, p) => {
    if (!acc.some((c) => sameColour(c.hex, p.attrs.primaryHex))) acc.push({ hex: p.attrs.primaryHex, name: p.attrs.primaryColor });
    return acc;
  }, []);

  return (
    <div className="dress">
      <div className="crt" aria-label="Wardrobe screen">
        <div className="crt-head mono">
          <span>WARDROBE 1.995</span>
          <span>◀ ▶ to browse · ▲ ▼ to pick a row</span>
        </div>
        {SLOTS.map((s) => {
          const disabled = s.key === "bottom" && isDress;
          return (
            <Slot
              key={s.key}
              label={s.label}
              items={lists[s.key]}
              state={state[s.key]}
              focused={focus === s.key}
              disabled={disabled}
              optional={s.optional}
              big={s.big}
              onFocus={() => setFocus(s.key)}
              onStep={(d) => step(s.key, d)}
              onToggle={() => setState((st) => ({ ...st, [s.key]: { ...st[s.key], on: !st[s.key].on } }))}
              onLock={() => setState((st) => ({ ...st, [s.key]: { ...st[s.key], locked: !st[s.key].locked } }))}
            />
          );
        })}
        <div className="crt-scan" aria-hidden />
      </div>

      <aside className="verdict-panel">
        <div key={comboKey} className={`verdict ${verdict.match ? "match" : "mismatch"}`} role="status" aria-live="polite">
          {verdict.match ? "MATCH" : "MIS-MATCH"}
        </div>
        <div className="meter" aria-label={`Score ${verdict.score} of 100`}>
          <span style={{ width: `${verdict.score}%` }} />
          <em className="mono">{verdict.score}/100</em>
        </div>
        <ul className="verdict-notes">
          {verdict.notes.map((n, i) => (
            <li key={i} className={n.ok ? "ok" : "no"}><span aria-hidden>{n.ok ? "✓" : "✗"}</span>{n.text}</li>
          ))}
        </ul>
        <div className="mini-palette" aria-label="Palette">
          {palette.map((c) => (
            <span key={c.hex} style={{ background: c.hex, color: inkOn(c.hex) }} title={`${c.name} ${c.hex}`}>{c.name}</span>
          ))}
        </div>
        <div className="verdict-actions">
          <button className="btn" onClick={shuffle}>Shuffle</button>
          <button className="btn hot" onClick={autoMatch}>Auto-match</button>
          <button
            className="btn default"
            onClick={() => go("ask", undefined, { anchor: pieces.filter((p) => p.attrs.category !== "accessory").slice(0, 4).map((p) => p._id).join(",") })}
          >
            {verdict.match ? "Style it up ✦" : "Make it work ✦"}
          </button>
        </div>
        <p className="verdict-foot hand">Locked rows stay put when you shuffle.</p>
      </aside>
    </div>
  );
}

function initial(): State {
  return {
    layer: { i: 0, on: false, locked: false },
    top: { i: 0, on: true, locked: false },
    bottom: { i: 0, on: true, locked: false },
    shoes: { i: 0, on: true, locked: false },
    extra: { i: 0, on: false, locked: false },
  };
}

function randomize(st: State, lists: Record<SlotKey, Tagged[]>): State {
  const next = { ...st };
  for (const s of SLOTS) {
    const cur = st[s.key];
    if (cur.locked || !lists[s.key].length) continue;
    next[s.key] = { ...cur, i: Math.floor(Math.random() * lists[s.key].length) };
  }
  return next;
}

function piecesFor(st: State, lists: Record<SlotKey, Tagged[]>): Tagged[] {
  const get = (k: SlotKey) => (st[k].on && lists[k].length ? lists[k][((st[k].i % lists[k].length) + lists[k].length) % lists[k].length] : undefined);
  const top = get("top");
  const dress = top?.attrs.category === "dress";
  return (["layer", "top", "bottom", "shoes", "extra"] as SlotKey[])
    .filter((k) => !(k === "bottom" && dress))
    .map(get)
    .filter(Boolean) as Tagged[];
}

type SlotProps = {
  label: string;
  items: Tagged[];
  state: { i: number; on: boolean; locked: boolean };
  focused: boolean;
  disabled: boolean;
  optional?: boolean;
  big?: boolean;
  onFocus: () => void;
  onStep: (d: number) => void;
  onToggle: () => void;
  onLock: () => void;
};

function Slot({ label, items, state, focused, disabled, optional, big, onFocus, onStep, onToggle, onLock }: SlotProps) {
  const n = items.length;
  const at = (d: number) => items[(((state.i + d) % n) + n) % n];
  const off = !state.on || disabled || !n;
  return (
    <div className={`slot ${big ? "big" : ""} ${focused ? "focused" : ""} ${off ? "off" : ""}`} onClick={onFocus}>
      <div className="slot-label mono">
        <span>{label.toUpperCase()}</span>
        <span>{n ? `${String((((state.i % n) + n) % n) + 1).padStart(2, "0")}/${String(n).padStart(2, "0")}` : "--/--"}</span>
        <span className="slot-tools">
          {optional && <button onClick={onToggle} aria-pressed={state.on}>{state.on ? "ON" : "OFF"}</button>}
          <button onClick={onLock} aria-pressed={state.locked} aria-label={`Lock ${label}`}>{state.locked ? "■ LOCK" : "□ LOCK"}</button>
        </span>
      </div>
      <div className="slot-row">
        <button className="arrow" onClick={() => onStep(-1)} disabled={off || state.locked} aria-label={`Previous ${label}`}>◀</button>
        <div className="slot-view">
          {off ? (
            <div className="slot-empty mono">{disabled ? "DRESS ON — NO BOTTOM NEEDED" : n ? "— OFF —" : "NOTHING IN THIS ROW"}</div>
          ) : (
            <>
              {n > 2 && <span className="slot-peek prev"><Photo item={at(-1)} /></span>}
              <span className="slot-current" key={at(0)._id}>
                <Photo item={at(0)} />
                <span className="slot-name">{at(0).attrs.name}</span>
              </span>
              {n > 1 && <span className="slot-peek next"><Photo item={at(1)} /></span>}
            </>
          )}
        </div>
        <button className="arrow" onClick={() => onStep(1)} disabled={off || state.locked} aria-label={`Next ${label}`}>▶</button>
      </div>
    </div>
  );
}
