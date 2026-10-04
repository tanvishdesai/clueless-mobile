import { useMemo, useRef, useState } from "react";
import { useData } from "../lib/data";
import { go } from "../lib/route";
import { isTagged, type Item, type Tagged } from "../lib/types";
import { CATEGORY_LABEL, HANGS, fileNumbers, groupByCategory, matchesQuery, sortItems, type Sort } from "../lib/closet";
import { colorSortKey } from "../lib/color";
import { Polaroid, tiltFor } from "../components/Polaroid";
import hanger from "../assets/hanger.svg";

type View = "rack" | "catalogue";

export function Closet() {
  const { items } = useData();
  const [cat, setCat] = useState("all");
  const [sort, setSort] = useState<Sort>("colour");
  const [view, setView] = useState<View>("rack");
  const [q, setQ] = useState("");

  const tagged = useMemo(() => (items ?? []).filter(isTagged), [items]);
  const untagged = useMemo(() => (items ?? []).filter((it) => !isTagged(it)), [items]);
  const files = useMemo(() => fileNumbers(items ?? []), [items]);
  const groups = useMemo(() => groupByCategory(tagged), [tagged]);
  const shown = useMemo(
    () => groupByCategory(sortItems(tagged.filter((it) => (cat === "all" || it.attrs.category === cat) && matchesQuery(it, q)), sort)),
    [tagged, cat, q, sort],
  );
  const total = shown.reduce((n, [, xs]) => n + xs.length, 0);

  if (!items) return <Loading />;
  if (!items.length) {
    return (
      <div className="empty">
        <h2>Ugh, an empty closet.</h2>
        <p>Nothing's been photographed yet. Shoot your wardrobe with the camera app and it'll hang itself up here.</p>
      </div>
    );
  }

  return (
    <div className="closet">
      <header className="closet-head">
        <div>
          <p className="stretch kicker">Everything you own · colour-coordinated</p>
          <h2 className="closet-title">The Closet</h2>
        </div>
        <ClosetStrip items={tagged} />
        <dl className="closet-stats mono">
          {groups.map(([c, xs]) => (
            <div key={c}><dt>{CATEGORY_LABEL[c]}</dt><dd>{String(xs.length).padStart(2, "0")}</dd></div>
          ))}
        </dl>
      </header>

      <div className="toolbar">
        <div className="seg" role="group" aria-label="Category">
          <button aria-pressed={cat === "all"} onClick={() => setCat("all")}>All</button>
          {groups.map(([c]) => (
            <button key={c} aria-pressed={cat === c} onClick={() => setCat(c)}>{CATEGORY_LABEL[c]}</button>
          ))}
        </div>
        <div className="toolbar-right">
          <input className="field search" type="search" placeholder="Search: plaid, wool, date night…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search the closet" />
          <label className="sort">
            <span className="sr-only">Sort</span>
            <select className="field" value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
              <option value="colour">By colour</option>
              <option value="recent">Newest first</option>
              <option value="formality">By formality</option>
            </select>
          </label>
          <div className="seg" role="group" aria-label="View">
            <button aria-pressed={view === "rack"} onClick={() => setView("rack")}>Rack</button>
            <button aria-pressed={view === "catalogue"} onClick={() => setView("catalogue")}>Catalogue</button>
          </div>
        </div>
      </div>

      {total === 0 && (
        <div className="empty"><h2>As if.</h2><p>Nothing in the closet matches that. Try fewer words.</p></div>
      )}

      {view === "rack"
        ? shown.map(([c, xs]) => <Rail key={c} category={c} items={xs} files={files} />)
        : <Catalogue groups={shown} files={files} />}

      {untagged.length > 0 && <Untagged items={untagged} />}
    </div>
  );
}

function Loading() {
  return (
    <div className="empty">
      <div className="barber" aria-hidden />
      <p className="mono" style={{ fontSize: 20 }}>Opening the closet…</p>
    </div>
  );
}

/** The whole wardrobe as one band of colour, in hanging order. */
function ClosetStrip({ items }: { items: Tagged[] }) {
  const hexes = useMemo(
    () => items.map((it) => it.attrs.primaryHex).sort((a, b) => colorSortKey(a) - colorSortKey(b)),
    [items],
  );
  return (
    <div className="closet-strip" role="img" aria-label={`${items.length} pieces by colour`}>
      {hexes.map((h, i) => <span key={i} style={{ background: h }} />)}
    </div>
  );
}

/** One run of the revolving closet: a brass rail, gold-and-wood hangers. */
function Rail({ category, items, files }: { category: string; items: Tagged[]; files: Map<string, string> }) {
  const ref = useRef<HTMLDivElement>(null);
  const hangs = HANGS.has(category);
  const rotate = (dir: number) => ref.current?.scrollBy({ left: dir * ref.current.clientWidth * 0.7, behavior: "smooth" });
  return (
    <section className={`rail ${hangs ? "hangs" : "shelf"}`} aria-label={CATEGORY_LABEL[category]}>
      <header className="rail-head">
        <h3>{CATEGORY_LABEL[category]}</h3>
        <span className="mono">{items.length}</span>
        <span className="rail-rule" />
        <div className="rail-nav">
          <button className="btn small" onClick={() => rotate(-1)} aria-label="Rotate left">◀</button>
          <button className="btn small" onClick={() => rotate(1)} aria-label="Rotate right">▶</button>
        </div>
      </header>
      <div className="rail-track" ref={ref}>
        {items.map((it) => (
          <div className="hanging" key={it._id}>
            {hangs && <img className="hanger" src={hanger} alt="" aria-hidden />}
            <Polaroid
              item={it}
              peek
              tilt={hangs ? 0 : tiltFor(it._id, 2.5)}
              onClick={() => go("closet", it._id)}
              caption={<><span className="hand">{it.attrs.name}</span><span className="polaroid-no mono">#{files.get(it._id)}</span></>}
            />
          </div>
        ))}
      </div>
    </section>
  );
}

/** Heckerling catalogued her friend's wine cellar; this is that, for clothes. */
function Catalogue({ groups, files }: { groups: [string, Tagged[]][]; files: Map<string, string> }) {
  return (
    <div className="catalogue">
      {groups.flatMap(([, xs]) => xs).map((it) => (
        <button key={it._id} className="card" onClick={() => go("closet", it._id)}>
          <Polaroid item={it} peek />
          <span className="card-body">
            <span className="card-file mono">FILE {files.get(it._id)} · {it.attrs.category.toUpperCase()}</span>
            <span className="card-name">{it.attrs.name}</span>
            <span className="card-meta">
              <span className="swatch" style={{ background: it.attrs.primaryHex }} />
              {it.attrs.secondaryHexes.slice(0, 3).map((h, i) => <span key={i} className="swatch small" style={{ background: h }} />)}
              <span>{it.attrs.material} · {it.attrs.formality}</span>
            </span>
          </span>
        </button>
      ))}
    </div>
  );
}

function Untagged({ items }: { items: Item[] }) {
  return (
    <section className="rail shelf untagged" aria-label="Still being tagged">
      <header className="rail-head">
        <h3>Still at the tailor</h3>
        <span className="mono">{items.length}</span>
        <span className="rail-rule" />
      </header>
      <p className="untagged-note">
        Photographed but not tagged yet - run <code className="mono">npm run ingest</code> in the camera app.
        They'll join the rack (and the stylist's options) once they're catalogued.
      </p>
      <div className="rail-track">
        {items.map((it) => (
          <div className="hanging" key={it._id}>
            <Polaroid item={it} tilt={tiltFor(it._id, 3)} caption={<span className="hand">{it.status === "error" ? "couldn't read this one" : "being tagged…"}</span>} />
          </div>
        ))}
      </div>
    </section>
  );
}
