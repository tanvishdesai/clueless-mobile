export type HSL = { h: number; s: number; l: number };

export function hexToRgb(hex: string): [number, number, number] {
  let h = hex.trim().replace("#", "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const n = parseInt(h.slice(0, 6), 16);
  if (Number.isNaN(n)) return [128, 128, 128];
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function hexToHsl(hex: string): HSL {
  const [r, g, b] = hexToRgb(hex).map((v) => v / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  if (d === 0) return { h: 0, s: 0, l };
  const s = d / (1 - Math.abs(2 * l - 1));
  let h: number;
  if (max === r) h = ((g - b) / d) % 6;
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  return { h: (h * 60 + 360) % 360, s, l };
}

/** Greys, creams, navies, black, denim-ish: the colours that go with anything. */
export function isNeutral(hex: string): boolean {
  const { h, s, l } = hexToHsl(hex);
  if (l > 0.9 || l < 0.13) return true;
  if (s < 0.16) return true;
  // Navy and denim: dark, desaturated blues behave as neutrals.
  if (h > 200 && h < 245 && l < 0.35 && s < 0.6) return true;
  // Camel, tan, khaki, cream.
  if (h > 25 && h < 55 && s < 0.45 && l > 0.45) return true;
  return false;
}

/** Perceived lightness, for picking ink on a swatch. */
export function luminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export const inkOn = (hex: string) => (luminance(hex) > 0.36 ? "#1b1816" : "#fbf6ec");

export const hueGap = (a: number, b: number) => {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
};

/**
 * The order Cher's closet hangs in: neutrals light-to-dark first, then the
 * colours round the wheel starting from red.
 */
export function colorSortKey(hex: string): number {
  const { h, l } = hexToHsl(hex);
  if (isNeutral(hex)) return 1 - l; // 0..1
  return 2 + ((h + 345) % 360) / 360 + (1 - l) * 0.05;
}

/** Two colours a human would call "the same" on a palette strip. */
export function close(a: string, b: string): boolean {
  const [r1, g1, b1] = hexToRgb(a);
  const [r2, g2, b2] = hexToRgb(b);
  return Math.hypot(r1 - r2, g1 - g2, b1 - b2) < 38;
}
