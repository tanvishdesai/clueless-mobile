import { useEffect } from "react";
import { Logo } from "./Logo";
import hanger from "../assets/hanger.svg";

// "[The art department] came up with the computer's screensaver with the moving
// little hangers and leopard-print background." - Amy Heckerling

const FLOCK = Array.from({ length: 14 }, (_, i) => ({
  top: (i * 37) % 100,
  delay: -((i * 2.3) % 14),
  dur: 9 + ((i * 7) % 8),
  scale: 0.6 + ((i * 13) % 10) / 14,
}));

export function Screensaver({ onWake }: { onWake: () => void }) {
  useEffect(() => {
    const armed = Date.now() + 700; // ignore the click/move that started it
    const wake = () => Date.now() > armed && onWake();
    const evs = ["pointermove", "pointerdown", "keydown", "wheel", "touchstart"] as const;
    evs.forEach((e) => window.addEventListener(e, wake));
    return () => evs.forEach((e) => window.removeEventListener(e, wake));
  }, [onWake]);

  return (
    <div className="screensaver wall-leopard" role="dialog" aria-label="Screensaver. Move the mouse or press a key to wake.">
      {FLOCK.map((f, i) => (
        <img
          key={i}
          src={hanger}
          alt=""
          className="flyer"
          style={{ top: `${f.top}%`, animationDelay: `${f.delay}s`, animationDuration: `${f.dur}s`, ["--s" as string]: f.scale }}
        />
      ))}
      <div className="saver-logo"><Logo size={88} sub="closet computer" /></div>
    </div>
  );
}
