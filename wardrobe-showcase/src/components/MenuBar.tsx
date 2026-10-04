import { useEffect, useRef, useState } from "react";
import { useData } from "../lib/data";
import { APPS, go, type App } from "../lib/route";
import { firstName, isTagged } from "../lib/types";
import { APP_LABEL } from "./Icons";
import { LogoMark } from "./Logo";

export type Wallpaper = "plaid" | "dionne" | "leopard" | "closet";
export const WALLPAPERS: [Wallpaper, string][] = [
  ["plaid", "Cher (yellow plaid)"],
  ["dionne", "Dionne (black & white)"],
  ["leopard", "Screensaver leopard"],
  ["closet", "Closet wall grey"],
];

type Props = {
  app: App;
  wallpaper: Wallpaper;
  setWallpaper: (w: Wallpaper) => void;
  onSaver: () => void;
};

export function MenuBar({ app, wallpaper, setWallpaper, onSaver }: Props) {
  const { items, stylist, mode, me, signOut } = useData();
  const [open, setOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);
  const clock = useClock();

  useEffect(() => {
    if (!open && !userOpen) return;
    const off = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
      if (!userRef.current?.contains(e.target as Node)) setUserOpen(false);
    };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") { setOpen(false); setUserOpen(false); } };
    window.addEventListener("pointerdown", off);
    window.addEventListener("keydown", esc);
    return () => { window.removeEventListener("pointerdown", off); window.removeEventListener("keydown", esc); };
  }, [open, userOpen]);

  const count = (items ?? []).filter(isTagged).length;
  const state = !stylist ? "…" : stylist.busy ? "Styling" : stylist.online ? "Stylist on call" : "Stylist off duty";

  return (
    <nav className="menubar" aria-label="Menu bar">
      <div ref={ref} style={{ position: "relative" }}>
        <button className="brand" onClick={() => setOpen(!open)} aria-expanded={open} aria-haspopup="menu">
          <LogoMark /> clueless
        </button>
        {open && (
          <div className="menu-pop" role="menu">
            <button role="menuitem" onClick={() => { setOpen(false); go("closet"); }}>About this closet <span>{count} pieces</span></button>
            <hr />
            <div className="stretch" style={{ padding: "6px 16px 4px", fontSize: 10 }}>Desktop pattern</div>
            {WALLPAPERS.map(([w, label]) => (
              <button key={w} role="menuitemradio" aria-checked={w === wallpaper} onClick={() => { setWallpaper(w); setOpen(false); }}>
                <span><span className="check">{w === wallpaper ? "✓" : ""}</span>{label}</span>
              </button>
            ))}
            <hr />
            <button role="menuitem" onClick={() => { setOpen(false); onSaver(); }}>Screensaver <span>⌥Z</span></button>
            {mode === "live" && (
              <>
                <hr />
                <button role="menuitem" onClick={() => { setOpen(false); void signOut(); }}>Log out {firstName(me.name)}…</button>
              </>
            )}
          </div>
        )}
      </div>
      {APPS.map((a) => (
        <button key={a} className="menu-item" aria-current={a === app ? "page" : undefined} onClick={() => go(a)}>{APP_LABEL[a]}</button>
      ))}
      <span className="spacer" />
      {mode === "demo" && <span className="status demo-flag" title="Cher's closet from the film. Set VITE_CONVEX_URL to see yours.">DEMO CLOSET</span>}
      <span className="status count">{count} pieces</span>
      <span className="status" title={stylist?.model ? `Stylist: ${stylist.model}` : undefined}>
        <span className={`dot ${stylist?.busy ? "busy" : stylist?.online ? "on" : ""}`} aria-hidden />
        <span className="label">{state}</span>
      </span>
      <div ref={userRef} className="user-menu">
        <button className="user-btn" onClick={() => setUserOpen(!userOpen)} aria-expanded={userOpen} aria-haspopup="menu">
          <span className="user-mark" aria-hidden>{firstName(me.name).charAt(0).toUpperCase()}</span>
          <span className="user-name">{firstName(me.name)}</span>
        </button>
        {userOpen && (
          <div className="menu-pop right" role="menu">
            <div className="menu-who">
              <strong>{me.name}</strong>
              <span>{me.email}</span>
            </div>
            <hr />
            {mode === "live"
              ? <button role="menuitem" onClick={() => { setUserOpen(false); void signOut(); }}>Log out</button>
              : <button role="menuitem" disabled>Demo closet, no account</button>}
          </div>
        )}
      </div>
      <span className="clock">{clock}</span>
    </nav>
  );
}

function useClock() {
  const fmt = () => new Date().toLocaleString(undefined, { weekday: "short", hour: "numeric", minute: "2-digit" });
  const [t, setT] = useState(fmt);
  useEffect(() => {
    const timer = setInterval(() => setT(fmt()), 15_000);
    return () => clearInterval(timer);
  }, []);
  return t;
}
