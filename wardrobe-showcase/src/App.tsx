import { useCallback, useEffect, useState } from "react";
import { useData } from "./lib/data";
import { APPS, go, useRoute, type App as AppName } from "./lib/route";
import { isTagged } from "./lib/types";
import { MenuBar, WALLPAPERS, type Wallpaper } from "./components/MenuBar";
import { APP_ICON, APP_LABEL, MoonIcon } from "./components/Icons";
import { Window } from "./components/Window";
import { Screensaver } from "./components/Screensaver";
import { Boundary } from "./components/Boundary";
import { Closet } from "./views/Closet";
import { ItemFile } from "./views/ItemFile";
import { DressMe } from "./views/DressMe";
import { AskCher } from "./views/AskCher";
import { Lookbook } from "./views/Lookbook";

const IDLE_MS = 3 * 60_000;

function loadWallpaper(): Wallpaper {
  try {
    const w = localStorage.getItem("wallpaper") as Wallpaper | null;
    if (w && WALLPAPERS.some(([k]) => k === w)) return w;
  } catch { /* private mode */ }
  return "plaid";
}

export default function App() {
  const route = useRoute();
  const [wallpaper, setWallpaperState] = useState<Wallpaper>(loadWallpaper);
  const [saver, setSaver] = useState(false);

  const setWallpaper = (w: Wallpaper) => {
    setWallpaperState(w);
    try { localStorage.setItem("wallpaper", w); } catch { /* fine */ }
  };

  // Idle for a few minutes and the leopard comes out, as it should.
  useEffect(() => {
    let timer = window.setTimeout(() => setSaver(true), IDLE_MS);
    const poke = () => { clearTimeout(timer); timer = window.setTimeout(() => setSaver(true), IDLE_MS); };
    const hotkey = (e: KeyboardEvent) => { if (e.altKey && e.code === "KeyZ") setSaver(true); };
    const evs = ["pointermove", "pointerdown", "keydown", "wheel", "touchstart"] as const;
    evs.forEach((e) => window.addEventListener(e, poke, { passive: true }));
    window.addEventListener("keydown", hotkey);
    return () => { clearTimeout(timer); evs.forEach((e) => window.removeEventListener(e, poke)); window.removeEventListener("keydown", hotkey); };
  }, []);
  const wake = useCallback(() => setSaver(false), []);

  return (
    <div className="desktop">
      <MenuBar app={route.app} wallpaper={wallpaper} setWallpaper={setWallpaper} onSaver={() => setSaver(true)} />
      <main className={`surface wall-${wallpaper}`}>
        <Boundary>
          <MainWindow app={route.app} id={route.id} />
        </Boundary>
        <DesktopIcons app={route.app} onSaver={() => setSaver(true)} />
      </main>
      <TabBar app={route.app} />
      {route.app === "closet" && route.id && <Boundary><ItemFile id={route.id} /></Boundary>}
      {saver && <Screensaver onWake={wake} />}
    </div>
  );
}

function MainWindow({ app, id }: { app: AppName; id?: string }) {
  const { items, looks, stylist, mode } = useData();
  const tagged = (items ?? []).filter(isTagged).length;
  const pending = (items ?? []).length - tagged;
  const look = app === "lookbook" && id ? looks?.find((l) => l._id === id) : undefined;

  const title = {
    closet: `Closet — ${tagged} pieces`,
    dress: "Dress Me",
    ask: "Ask Cher",
    lookbook: look?.result?.looks[0]?.title ? `Lookbook — ${look.result.looks[0].title}` : "Lookbook",
  }[app];

  const footer = {
    closet: <><span>{plural(tagged, "PIECE")}{pending ? ` · ${pending} AT THE TAILOR` : ""}</span><span>HUNG BY COLOUR, THE WAY CHER WOULD</span></>,
    dress: <><span>MATCH ENGINE: COLOUR · DRESS CODE · PATTERN · SEASON</span><span>LOCAL · INSTANT</span></>,
    ask: <><span>{mode === "demo" ? "DEMO STYLIST" : `STYLIST ${stylist?.online ? "ONLINE" : "OFFLINE"}`}</span><span>{plural((looks ?? []).length, "ISSUE")} IN THE LOOKBOOK</span></>,
    lookbook: <><span>{plural((looks ?? []).length, "ISSUE")}</span><span>{(looks ?? []).filter((l) => l.favorite).length} SAVED</span></>,
  }[app];

  return (
    <Window
      key={app}
      title={title}
      footer={footer}
      onClose={app !== "closet" ? () => go("closet") : undefined}
      onZoom={() => document.documentElement.requestFullscreen?.().catch(() => {})}
      className={`app-${app}`}
    >
      {app === "closet" && <Closet />}
      {app === "dress" && <DressMe />}
      {app === "ask" && <AskCher />}
      {app === "lookbook" && <Lookbook id={id} />}
    </Window>
  );
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "S"}`;

function DesktopIcons({ app, onSaver }: { app: AppName; onSaver: () => void }) {
  return (
    <nav className="icons" aria-label="Desktop">
      {APPS.map((a) => {
        const Icon = APP_ICON[a];
        return (
          <button key={a} className="icon" aria-current={a === app ? "page" : undefined} onClick={() => go(a)}>
            <Icon /><span>{APP_LABEL[a]}</span>
          </button>
        );
      })}
      <button className="icon" onClick={onSaver}><MoonIcon /><span>Screensaver</span></button>
    </nav>
  );
}

function TabBar({ app }: { app: AppName }) {
  return (
    <nav className="tabbar" aria-label="Apps">
      {APPS.map((a) => {
        const Icon = APP_ICON[a];
        return (
          <button key={a} aria-current={a === app ? "page" : undefined} onClick={() => go(a)}>
            <Icon />{APP_LABEL[a]}
          </button>
        );
      })}
    </nav>
  );
}
