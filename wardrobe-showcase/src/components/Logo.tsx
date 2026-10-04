// The film's title card: a chunky display face on a bouncing baseline, some
// letters stretched, the whole thing in an ellipse. Ours says "clueless" too.

const BOUNCE = [
  { y: 0.02, s: 1.08, r: -4 },
  { y: -0.1, s: 1.25, r: 3 },
  { y: 0.08, s: 0.95, r: -2 },
  { y: -0.05, s: 1.12, r: 4 },
  { y: 0.1, s: 1.0, r: -3 },
  { y: -0.08, s: 1.28, r: 2 },
  { y: 0.04, s: 1.02, r: -5 },
  { y: -0.06, s: 1.15, r: 3 },
];

export function Logo({ size = 64, word = "clueless", sub }: { size?: number; word?: string; sub?: string }) {
  return (
    <div className="logo" style={{ fontSize: size }} aria-label={word}>
      <span className="logo-ring" aria-hidden />
      <span className="logo-word" aria-hidden>
        {[...word].map((ch, i) => {
          const b = BOUNCE[i % BOUNCE.length];
          return (
            <span key={i} style={{ transform: `translateY(${b.y}em) scaleY(${b.s}) rotate(${b.r}deg)` }}>
              {ch}
            </span>
          );
        })}
      </span>
      {sub && <span className="logo-sub stretch">{sub}</span>}
    </div>
  );
}

/** Tiny ellipse-and-c for the menu bar. */
export function LogoMark() {
  return (
    <svg className="brand-mark" viewBox="0 0 20 20" aria-hidden>
      <ellipse cx="10" cy="10" rx="9" ry="7" fill="#f2c12e" stroke="#1b1816" strokeWidth="1.4" />
      <text x="10" y="14" textAnchor="middle" fontFamily="Kavoon, serif" fontSize="12" fill="#1b1816">c</text>
    </svg>
  );
}
