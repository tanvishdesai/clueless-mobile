/**
 * Flat-lay garment illustrations for the demo closet, as SVG data URIs at the
 * same 3:4 the camera app shoots. They stand in for real photos: a surface, a
 * soft shadow, fabric with a pattern and a little shading.
 */

export type Fill =
  | { kind: "solid"; color: string }
  | { kind: "plaid"; base: string; bands: [color: string, width: number, offset: number, opacity?: number][] }
  | { kind: "stripe"; a: string; b: string; w: number; angle?: number }
  | { kind: "denim"; color: string }
  | { kind: "fluff"; color: string }
  | { kind: "sheer"; color: string }
  | { kind: "patent"; color: string };

export type Shape =
  | "tee" | "blazer" | "skirt" | "bodycon" | "slip" | "cardigan" | "socks" | "maryjanes"
  | "fluffbag" | "tophat" | "jeans" | "shirt" | "sneakers" | "backpack" | "headband"
  | "flask" | "vest" | "sweatshirt" | "handbag" | "cufftop" | "trousers";

const SURFACES: Record<string, [string, string]> = {
  linen: ["#efe9df", "#ddd4c6"],
  blush: ["#f3e6e2", "#e2cfca"],
  oak: ["#e2cdb0", "#c9ae8b"],
  carpet: ["#d9d6d1", "#bfbab3"],
};

function fillDefs(id: string, f: Fill): string {
  switch (f.kind) {
    case "solid":
    case "sheer":
    case "patent":
      return "";
    case "plaid": {
      const s = 64;
      const bands = f.bands
        .map(([c, w, o, op = 0.5]) =>
          `<rect x="${o}" y="0" width="${w}" height="${s}" fill="${c}" opacity="${op}"/><rect x="0" y="${o}" width="${s}" height="${w}" fill="${c}" opacity="${op}"/>`)
        .join("");
      return `<pattern id="${id}" width="${s}" height="${s}" patternUnits="userSpaceOnUse" patternTransform="scale(.62)"><rect width="${s}" height="${s}" fill="${f.base}"/>${bands}<path d="M0 ${s}L${s} 0M-8 8L8 -8M${s - 8} ${s + 8}L${s + 8} ${s - 8}" stroke="#000" stroke-opacity=".05" stroke-width="3"/></pattern>`;
    }
    case "stripe":
      return `<pattern id="${id}" width="${f.w * 2}" height="${f.w * 2}" patternUnits="userSpaceOnUse" patternTransform="rotate(${f.angle ?? 0})"><rect width="${f.w * 2}" height="${f.w * 2}" fill="${f.a}"/><rect width="${f.w}" height="${f.w * 2}" fill="${f.b}"/></pattern>`;
    case "denim":
      return `<pattern id="${id}" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(35)"><rect width="6" height="6" fill="${f.color}"/><rect width="2" height="6" fill="#fff" opacity=".13"/><rect x="3" width="1" height="6" fill="#000" opacity=".07"/></pattern>`;
    case "fluff":
      return `<pattern id="${id}" width="10" height="10" patternUnits="userSpaceOnUse"><rect width="10" height="10" fill="${f.color}"/><circle cx="3" cy="3" r="2" fill="#fff" opacity=".35"/><circle cx="8" cy="7" r="2.4" fill="#000" opacity=".05"/></pattern>`;
  }
}

const paint = (id: string, f: Fill) =>
  f.kind === "solid" || f.kind === "sheer" || f.kind === "patent" ? f.color : `url(#${id})`;

type Drawn = { body: string; extra?: string };

// 300 x 400 canvas. Each shape returns the main silhouette path plus details.
const SHAPES: Record<Shape, (back: boolean, fill: string) => Drawn> = {
  tee: (back) => ({
    body: `M92 78 L128 62 Q150 ${back ? 70 : 84} 172 62 L208 78 L252 116 L228 146 L208 132 L210 330 L90 330 L92 132 L72 146 L48 116 Z`,
    extra: back ? "" : `<path d="M128 62 Q150 84 172 62" fill="none" stroke="#000" stroke-opacity=".18" stroke-width="3"/>`,
  }),
  sweatshirt: (back) => ({
    body: `M88 82 L126 64 Q150 ${back ? 72 : 86} 174 64 L212 82 L250 140 L262 300 L236 306 L216 170 L216 320 L84 320 L84 170 L64 306 L38 300 L50 140 Z`,
    extra: `<rect x="84" y="306" width="132" height="16" fill="#000" opacity=".12"/><rect x="36" y="292" width="28" height="14" transform="rotate(4 50 299)" fill="#000" opacity=".12"/><rect x="236" y="292" width="28" height="14" transform="rotate(-4 250 299)" fill="#000" opacity=".12"/>${back ? "" : `<text x="150" y="170" text-anchor="middle" font-family="Georgia,serif" font-weight="700" font-size="30" fill="#fbf6ec" opacity=".85" letter-spacing="3">COLLEGE</text>`}`,
  }),
  cufftop: () => ({
    body: `M100 70 L132 60 Q150 74 168 60 L200 70 L236 120 L250 290 L226 294 L212 160 L210 320 L90 320 L88 160 L74 294 L50 290 L64 120 Z`,
    extra: `<g filter="url(#fluffy)"><ellipse cx="238" cy="296" rx="20" ry="12" fill="#2a2725"/><ellipse cx="62" cy="292" rx="20" ry="12" fill="#2a2725"/></g>`,
  }),
  blazer: (back) => ({
    body: `M96 62 L136 52 L150 ${back ? 60 : 112} L164 52 L204 62 L240 92 L262 302 L232 307 L220 154 L216 342 L84 342 L80 154 L68 307 L38 302 L60 92 Z`,
    extra: back
      ? `<path d="M150 70 L150 342" stroke="#000" stroke-opacity=".15" stroke-width="2"/>`
      : `<path d="M136 52 L118 120 L150 200 M164 52 L182 120 L150 200" fill="none" stroke="#000" stroke-opacity=".28" stroke-width="3"/><path d="M150 200 L150 342" stroke="#000" stroke-opacity=".2" stroke-width="2"/><circle cx="157" cy="236" r="5" fill="#1b1816"/><circle cx="157" cy="276" r="5" fill="#1b1816"/><path d="M98 262 h36 M166 262 h36" stroke="#000" stroke-opacity=".25" stroke-width="3"/>`,
  }),
  cardigan: (back) => ({
    body: `M100 66 L134 56 L150 ${back ? 64 : 120} L166 56 L200 66 L238 104 L254 300 L228 304 L214 160 L212 330 L88 330 L86 160 L72 304 L46 300 L62 104 Z`,
    extra: back ? "" : `<path d="M150 120 L150 330" stroke="#000" stroke-opacity=".22" stroke-width="2"/>${[160, 200, 240, 280].map((y) => `<circle cx="156" cy="${y}" r="4.5" fill="#fff" opacity=".8"/>`).join("")}`,
  }),
  vest: (back) => ({
    body: `M106 70 L132 62 L150 ${back ? 72 : 150} L168 62 L194 70 Q196 110 222 128 L218 320 L82 320 L78 128 Q104 110 106 70 Z`,
    extra: `<rect x="82" y="304" width="136" height="16" fill="#000" opacity=".1"/>`,
  }),
  shirt: (back) => ({
    body: `M92 74 L128 60 L150 ${back ? 66 : 92} L172 60 L208 74 L248 130 L264 304 L236 310 L220 170 L220 340 L80 340 L80 170 L64 310 L36 304 L52 130 Z`,
    extra: back
      ? `<path d="M100 110 Q150 124 200 110" fill="none" stroke="#000" stroke-opacity=".2" stroke-width="2"/>`
      : `<path d="M128 60 L138 98 L150 92 L162 98 L172 60" fill="none" stroke="#000" stroke-opacity=".3" stroke-width="3"/><path d="M150 92 L150 340" stroke="#000" stroke-opacity=".22" stroke-width="2"/><rect x="170" y="136" width="30" height="34" fill="none" stroke="#000" stroke-opacity=".22" stroke-width="2"/>`,
  }),
  skirt: () => ({
    body: `M104 112 L196 112 L236 300 L64 300 Z`,
    extra: `<rect x="102" y="104" width="96" height="16" fill="#000" opacity=".18"/>${[0, 1, 2, 3, 4, 5, 6].map((i) => { const x0 = 112 + i * 12.6; const x1 = 78 + i * 24; return `<path d="M${x0} 122 L${x1} 300" stroke="#000" stroke-opacity=".16" stroke-width="2"/>`; }).join("")}`,
  }),
  trousers: () => ({
    body: `M100 70 L200 70 L214 350 L160 350 L150 150 L140 350 L86 350 Z`,
    extra: `<rect x="100" y="62" width="100" height="14" fill="#000" opacity=".18"/><path d="M122 80 L118 350 M178 80 L182 350" stroke="#000" stroke-opacity=".14" stroke-width="2"/>`,
  }),
  jeans: (back) => ({
    body: `M96 64 L204 64 L226 352 L164 352 L150 150 L136 352 L74 352 Z`,
    extra: `<rect x="96" y="56" width="108" height="14" fill="#000" opacity=".16"/>${back ? `<rect x="110" y="96" width="30" height="34" rx="3" fill="none" stroke="#c98b3b" stroke-width="2"/><rect x="160" y="96" width="30" height="34" rx="3" fill="none" stroke="#c98b3b" stroke-width="2"/>` : `<path d="M108 74 Q120 110 140 100 M192 74 Q180 110 160 100" fill="none" stroke="#c98b3b" stroke-width="2"/><path d="M150 70 L150 140" stroke="#c98b3b" stroke-width="2"/>`}`,
  }),
  bodycon: (back) => ({
    body: `M112 ${back ? 58 : 62} Q150 ${back ? 74 : 118} 188 ${back ? 58 : 62} L204 72 Q198 130 208 170 Q214 250 204 338 L96 338 Q86 250 92 170 Q102 130 96 72 Z`,
    extra: `<path d="M100 200 Q150 214 200 200" fill="none" stroke="#000" stroke-opacity=".12" stroke-width="3"/><path d="M110 240 Q150 250 190 240" fill="none" stroke="#fff" stroke-opacity=".12" stroke-width="6"/>`,
  }),
  slip: () => ({
    body: `M114 104 Q150 120 186 104 L198 336 L102 336 Z`,
    extra: `<path d="M118 104 L124 52 M182 104 L176 52" stroke="#d8d2c6" stroke-width="3"/><path d="M114 104 Q150 120 186 104" fill="none" stroke="#000" stroke-opacity=".12" stroke-width="3"/><path d="M130 160 Q126 260 120 336 M168 170 Q176 260 182 336" stroke="#000" stroke-opacity=".07" stroke-width="5" fill="none"/>`,
  }),
  socks: () => ({
    body: `M100 40 L140 40 L142 300 Q142 336 110 342 L76 344 Q60 330 82 318 L100 306 Z M160 40 L200 40 L200 306 L218 318 Q240 330 224 344 L190 342 Q158 336 158 300 Z`,
    extra: `<path d="M100 40 h40 M160 40 h40" stroke="#000" stroke-opacity=".1" stroke-width="10"/>`,
  }),
  maryjanes: () => ({
    body: `M70 220 Q60 190 92 180 L128 178 Q144 180 146 210 L146 262 Q146 290 112 292 L92 292 Q66 290 66 262 Z M154 210 Q156 180 172 178 L208 180 Q240 190 230 220 L234 262 Q234 290 208 292 L188 292 Q154 290 154 262 Z`,
    extra: `<path d="M72 214 Q106 206 144 214 M156 214 Q194 206 228 214" stroke="#2b2826" stroke-width="8" fill="none"/><path d="M74 211 Q106 204 142 211 M158 211 Q194 204 226 211" stroke="#fff" stroke-opacity=".25" stroke-width="2" fill="none"/><circle cx="138" cy="213" r="4.5" fill="#d9d2c4"/><circle cx="162" cy="213" r="4.5" fill="#d9d2c4"/><path d="M86 232 Q86 206 106 204 Q126 206 126 232 L126 262 Q126 280 106 280 Q86 280 86 262 Z M174 232 Q174 206 194 204 Q214 206 214 232 L214 262 Q214 280 194 280 Q174 280 174 262 Z" fill="#7a6553"/><path d="M90 236 Q106 226 122 236 M178 236 Q194 226 210 236" stroke="#a48b73" stroke-width="3" fill="none"/><path d="M84 196 Q100 186 120 190 M180 190 Q200 186 216 196" stroke="#fff" stroke-opacity=".5" stroke-width="4" fill="none"/>`,
  }),
  sneakers: () => ({
    body: `M50 250 Q52 210 90 206 L120 186 Q140 184 146 210 L148 262 L50 270 Z M154 210 Q160 184 180 186 L210 206 Q248 210 250 250 L250 270 L152 262 Z`,
    extra: `<rect x="46" y="262" width="104" height="22" rx="6" fill="#f4f1ea" stroke="#1b1816" stroke-opacity=".3"/><rect x="150" y="262" width="104" height="22" rx="6" fill="#f4f1ea" stroke="#1b1816" stroke-opacity=".3"/><path d="M98 212 L130 232 M106 206 L136 224 M202 212 L170 232 M194 206 L164 224" stroke="#1b1816" stroke-opacity=".5" stroke-width="3"/>`,
  }),
  fluffbag: () => ({
    body: `M80 170 Q80 140 112 140 L188 140 Q220 140 220 170 L220 280 Q220 300 196 300 L104 300 Q80 300 80 280 Z`,
    extra: `<path d="M110 146 Q150 60 190 146" fill="none" stroke="#c9a24a" stroke-width="6"/>`,
  }),
  handbag: () => ({
    body: `M78 180 L222 180 L234 300 L66 300 Z`,
    extra: `<path d="M112 182 Q150 108 188 182" fill="none" stroke="#1b1816" stroke-width="7"/><rect x="138" y="196" width="24" height="12" rx="2" fill="#d9c27a"/><path d="M90 196 Q150 206 210 196" stroke="#fff" stroke-opacity=".35" stroke-width="5" fill="none"/>`,
  }),
  backpack: () => ({
    body: `M96 130 Q96 90 150 90 Q204 90 204 130 L210 300 Q210 316 194 316 L106 316 Q90 316 90 300 Z`,
    extra: `<path d="M126 92 Q150 54 174 92" fill="none" stroke="#8d929a" stroke-width="7"/><rect x="112" y="210" width="76" height="70" rx="12" fill="#000" opacity=".1"/><path d="M112 222 h76" stroke="#6d727a" stroke-width="3"/>`,
  }),
  headband: () => ({
    body: `M78 250 Q76 120 150 112 Q224 120 222 250 L206 250 Q206 140 150 134 Q94 140 94 250 Z`,
    extra: `<path d="M92 200 Q150 112 208 200" fill="none" stroke="#000" stroke-opacity=".08" stroke-width="10"/>`,
  }),
  tophat: () => ({
    body: `M104 290 Q96 170 92 70 Q150 50 208 70 Q204 170 196 290 Z`,
    extra: `<ellipse cx="150" cy="296" rx="96" ry="22" fill="#1b1816"/><rect x="100" y="246" width="100" height="22" fill="#c8102e"/><ellipse cx="150" cy="70" rx="58" ry="12" fill="#000" opacity=".2"/>`,
  }),
  flask: () => ({
    body: `M100 130 Q100 110 120 110 L180 110 Q200 110 200 130 L206 300 Q206 322 184 322 L116 322 Q94 322 94 300 Z`,
    extra: `<rect x="128" y="74" width="44" height="38" rx="4" fill="#bfc4c8" stroke="#8d939a"/><text x="150" y="232" text-anchor="middle" font-family="Helvetica,Arial,sans-serif" font-size="24" font-weight="300" fill="#1b1816" opacity=".7">ck one</text><path d="M108 132 L108 300" stroke="#fff" stroke-opacity=".6" stroke-width="6"/>`,
  }),
};

export function garmentSvg(shape: Shape, fill: Fill, opts: { back?: boolean; surface?: keyof typeof SURFACES } = {}): string {
  const { back = false, surface = "linen" } = opts;
  const [s1, s2] = SURFACES[surface];
  const id = "f";
  const draw = SHAPES[shape](back, paint(id, fill));
  const flip = back ? `transform="translate(300 0) scale(-1 1)"` : "";
  const sheer = fill.kind === "sheer";
  const fluff = fill.kind === "fluff";
  const patent = fill.kind === "patent";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 400" width="600" height="800">
<defs>
<radialGradient id="bg" cx="45%" cy="38%" r="80%"><stop offset="0" stop-color="${s1}"/><stop offset="1" stop-color="${s2}"/></radialGradient>
<linearGradient id="shade" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".22"/><stop offset=".55" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".22"/></linearGradient>
<linearGradient id="gloss" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".35"/><stop offset=".3" stop-color="#fff" stop-opacity="0"/></linearGradient>
<filter id="shadow" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="5" stdDeviation="6" flood-color="#3b2f22" flood-opacity=".28"/></filter>
<filter id="fluffy"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="9"/></filter>
<filter id="grain"><feTurbulence type="fractalNoise" baseFrequency="1.4" numOctaves="2" stitchTiles="stitch"/><feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 .07 0"/></filter>
${fillDefs(id, fill)}
</defs>
<rect width="300" height="400" fill="url(#bg)"/>
<g ${flip}>
<g filter="url(#shadow)"><g ${fluff ? `filter="url(#fluffy)"` : ""}><path d="${draw.body}" fill="${paint(id, fill)}" fill-rule="evenodd" ${sheer ? `fill-opacity=".55" stroke="#fff" stroke-opacity=".9" stroke-width="2"` : ""}/></g></g>
<path d="${draw.body}" fill="url(#${patent ? "gloss" : "shade"})" fill-rule="evenodd"/>
${draw.extra ?? ""}
</g>
<rect width="300" height="400" filter="url(#grain)"/>
</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
