import { useEffect, useMemo, useState } from "react";
import { useData, useItemIndex } from "../lib/data";
import { go } from "../lib/route";
import { FORMALITY, isTagged, type Tagged } from "../lib/types";
import { fileNumbers } from "../lib/closet";
import { inkOn } from "../lib/color";
import { Photo } from "../components/Polaroid";
import { Window } from "../components/Window";

const SEASONS = ["spring", "summer", "autumn", "winter"];

/** The floating file card for one garment. */
export function ItemFile({ id }: { id: string }) {
  const index = useItemIndex();
  const { items } = useData();
  const item = index.get(id);
  const files = useMemo(() => fileNumbers(items ?? []), [items]);
  const close = () => go("closet");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && go("closet");
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (!items) return null;
  return (
    <div className="float-layer" onClick={(e) => e.target === e.currentTarget && close()}>
      {item && isTagged(item)
        ? <File item={item} file={files.get(item._id) ?? "???"} onClose={close} />
        : (
          <Window title="File not found" onClose={close}>
            <div className="empty"><h2>Whatever.</h2><p>That piece isn't in the closet any more.</p></div>
          </Window>
        )}
    </div>
  );
}

function File({ item, file, onClose }: { item: Tagged; file: string; onClose: () => void }) {
  const [side, setSide] = useState<"front" | "back">("front");
  const a = item.attrs;
  const formality = FORMALITY.indexOf(a.formality as (typeof FORMALITY)[number]);
  const colours = [[a.primaryColor, a.primaryHex], ...a.secondaryColors.map((c, i) => [c, a.secondaryHexes[i] ?? "#ccc"])];
  const isScent = a.category === "fragrance";

  return (
    <Window
      title={`FILE ${file} — ${a.name}`}
      onClose={onClose}
      className="file-window"
      footer={<><span>{a.category} / {a.subtype}</span><span>{a.primaryHex.toUpperCase()}</span></>}
    >
      <div className="file">
        <div className="file-photo">
          <button className={`flip ${side}`} onClick={() => setSide(side === "front" ? "back" : "front")} aria-label="Flip the photo">
            <span className="flip-face front"><Photo item={item} side="front" /></span>
            <span className="flip-face back"><Photo item={item} side="back" /></span>
          </button>
          <div className="seg" role="group" aria-label="Side">
            <button aria-pressed={side === "front"} onClick={() => setSide("front")}>Front</button>
            <button aria-pressed={side === "back"} onClick={() => setSide("back")}>Back</button>
          </div>
        </div>

        <div className="file-info">
          <p className="mono file-no">FILE {file} · {a.category.toUpperCase()}{a.brand ? ` · ${a.brand.toUpperCase()}` : ""}</p>
          <h2 className="file-name">{a.name}</h2>
          <p className="stretch">{a.subtype}</p>

          <div className="chips-row">
            {colours.map(([name, hex], i) => (
              <span key={i} className={`paint ${i === 0 ? "lead" : ""}`} style={{ background: hex, color: inkOn(hex) }}>
                <span>{name}</span><span className="mono">{hex.toUpperCase()}</span>
              </span>
            ))}
          </div>

          <dl className="readout mono">
            <Row k="Pattern" v={a.pattern} />
            <Row k="Material" v={a.material} />
            {a.fit !== "n/a" && <Row k="Fit" v={a.fit} />}
            <div className="row">
              <dt>Formality</dt>
              <dd className="scale" aria-label={a.formality}>
                {FORMALITY.map((f, i) => <span key={f} className={i <= formality ? "on" : ""} title={f} />)}
                <em>{a.formality}</em>
              </dd>
            </div>
            <div className="row">
              <dt>Seasons</dt>
              <dd className="seasons">
                {SEASONS.map((s) => <span key={s} className={a.seasons.includes(s) ? "on" : ""}>{s.slice(0, 3)}</span>)}
              </dd>
            </div>
            {isScent && a.scentFamily && <Row k="Family" v={a.scentFamily} />}
            {isScent && a.sizeMl && <Row k="Size" v={`${a.sizeMl} ml`} />}
          </dl>

          {isScent && (a.topNotes?.length || a.heartNotes?.length || a.baseNotes?.length) ? (
            <div className="pyramid">
              {[["Top", a.topNotes], ["Heart", a.heartNotes], ["Base", a.baseNotes]].map(([k, v]) => (
                <div key={k as string}><span className="stretch">{k as string}</span><p>{(v as string[] | undefined)?.join(" · ") || "—"}</p></div>
              ))}
            </div>
          ) : null}

          {a.tags.length > 0 && <div className="stickers">{a.tags.map((t) => <span key={t} className="sticker">{t}</span>)}</div>}
          {a.notes && <p className="hand file-notes">“{a.notes}”</p>}

          <div className="file-actions">
            <button className="btn hot default" onClick={() => go("ask", undefined, { anchor: item._id })}>Build a look around this ✦</button>
            {!isScent && <button className="btn" onClick={() => go("dress", undefined, { wear: item._id })}>Try it on</button>}
          </div>
        </div>
      </div>
    </Window>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return <div className="row"><dt>{k}</dt><dd>{v}</dd></div>;
}
