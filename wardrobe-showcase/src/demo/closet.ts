import { garmentSvg, type Fill, type Shape } from "./art";
import type { Attrs, Item, LookRequest } from "../lib/types";

/**
 * Bronson Alcott High, fall 1995. The wardrobe from Clueless, tagged the way
 * the ingest worker would tag it, so the whole site can be tried without a
 * Convex deployment or a token: `npm run demo`.
 */

const CHER_PLAID: Fill = {
  kind: "plaid", base: "#f2c12e",
  bands: [["#1f1b18", 7, 10, 0.75], ["#1f1b18", 2, 22, 0.6], ["#fbf6ec", 3, 34, 0.7], ["#3e5f93", 2, 46, 0.55], ["#1f1b18", 7, 54, 0.75]],
};
const RED_PLAID: Fill = {
  kind: "plaid", base: "#b3122a",
  bands: [["#141414", 9, 8, 0.7], ["#1d4d2f", 4, 26, 0.55], ["#f2c12e", 2, 38, 0.6], ["#141414", 9, 48, 0.7]],
};
const DIONNE_PLAID: Fill = {
  kind: "plaid", base: "#f5f1ea",
  bands: [["#141414", 10, 6, 0.85], ["#141414", 3, 24, 0.7], ["#c8102e", 2, 36, 0.7], ["#141414", 10, 46, 0.85]],
};
const FLANNEL: Fill = {
  kind: "plaid", base: "#9e1b22",
  bands: [["#111", 14, 4, 0.75], ["#111", 3, 30, 0.6], ["#e9d9b0", 2, 40, 0.4], ["#111", 14, 46, 0.75]],
};

type Spec = {
  id: string;
  shape: Shape;
  fill: Fill;
  surface?: "linen" | "blush" | "oak" | "carpet";
  attrs: Attrs;
};

const a = (o: Partial<Attrs> & Pick<Attrs, "name" | "category" | "subtype" | "primaryColor" | "primaryHex">): Attrs => ({
  secondaryColors: [], secondaryHexes: [], pattern: "solid", material: "cotton", fit: "regular",
  formality: "casual", seasons: ["spring", "summer", "autumn", "winter"], tags: [], notes: "", ...o,
});

const SPECS: Spec[] = [
  // ── Cher ──────────────────────────────────────────────────────────────────
  { id: "d_yblazer", shape: "blazer", fill: CHER_PLAID, attrs: a({
    name: "yellow plaid blazer", category: "outerwear", subtype: "blazer", brand: "Jean Paul Gaultier",
    primaryColor: "mustard yellow", primaryHex: "#f2c12e",
    secondaryColors: ["black", "white", "slate blue"], secondaryHexes: ["#1f1b18", "#fbf6ec", "#3e5f93"],
    pattern: "plaid", material: "wool", fit: "slim", formality: "smart-casual", seasons: ["spring", "autumn"],
    tags: ["co-ord", "preppy", "statement", "first day of school"],
    notes: "Cropped, nipped-waist plaid blazer from the junior line; half of the most famous suit in teen cinema." }) },
  { id: "d_yskirt", shape: "skirt", fill: CHER_PLAID, surface: "blush", attrs: a({
    name: "yellow plaid mini skirt", category: "bottom", subtype: "pleated mini skirt", brand: "Jean Paul Gaultier",
    primaryColor: "mustard yellow", primaryHex: "#f2c12e",
    secondaryColors: ["black", "white", "slate blue"], secondaryHexes: ["#1f1b18", "#fbf6ec", "#3e5f93"],
    pattern: "plaid", material: "wool", fit: "slim", formality: "smart-casual", seasons: ["spring", "autumn"],
    tags: ["co-ord", "preppy", "mini"], notes: "Knife-pleated mini that matches the blazer; wears alone with a tee too." }) },
  { id: "d_tee", shape: "tee", fill: { kind: "solid", color: "#f6f3ec" }, attrs: a({
    name: "white baby tee", category: "top", subtype: "t-shirt", primaryColor: "white", primaryHex: "#f6f3ec",
    fit: "slim", tags: ["basic", "layering", "cropped"], notes: "Shrunken white tee - 'the base of life', per the costume designer." }) },
  { id: "d_socks", shape: "socks", fill: { kind: "solid", color: "#f7f5f0" }, surface: "carpet", attrs: a({
    name: "white over-the-knee socks", category: "accessory", subtype: "over-the-knee socks", primaryColor: "white", primaryHex: "#f7f5f0",
    material: "cotton knit", fit: "n/a", seasons: ["spring", "autumn", "winter"], tags: ["schoolgirl", "layering", "preppy"],
    notes: "Ribbed thigh-high socks; the line between the mini and the Mary Janes." }) },
  { id: "d_mj", shape: "maryjanes", fill: { kind: "patent", color: "#151312" }, surface: "oak", attrs: a({
    name: "black patent mary janes", category: "footwear", subtype: "mary janes", primaryColor: "black", primaryHex: "#151312",
    material: "patent leather", fit: "n/a", formality: "smart-casual", tags: ["block heel", "strap", "polished"],
    notes: "Block-heeled patent Mary Janes - no stilettos at Bronson Alcott." }) },
  { id: "d_fluff", shape: "fluffbag", fill: { kind: "fluff", color: "#f3eee6" }, surface: "blush", attrs: a({
    name: "white marabou mini bag", category: "accessory", subtype: "handbag", primaryColor: "white", primaryHex: "#f3eee6",
    secondaryColors: ["gold"], secondaryHexes: ["#c9a24a"], pattern: "textured", material: "marabou feather", fit: "n/a",
    formality: "smart-casual", tags: ["fluffy", "playful", "statement"], notes: "Fluffy feather mini bag on a gold chain." }) },
  { id: "d_alaia", shape: "bodycon", fill: { kind: "solid", color: "#c8102e" }, surface: "carpet", attrs: a({
    name: "red alaïa mini dress", category: "dress", subtype: "bodycon mini dress", brand: "Azzedine Alaïa",
    primaryColor: "red", primaryHex: "#c8102e", material: "stretch knit", fit: "slim", formality: "formal",
    seasons: ["spring", "summer", "autumn"], tags: ["evening", "party", "scoop neck", "sculpted"],
    notes: "Sculpted red knit mini with a low scoop. 'You don't understand, this is an Alaïa.'" }) },
  { id: "d_ck", shape: "slip", fill: { kind: "solid", color: "#f4f1ea" }, surface: "blush", attrs: a({
    name: "white calvin klein slip dress", category: "dress", subtype: "slip dress", brand: "Calvin Klein",
    primaryColor: "white", primaryHex: "#f4f1ea", material: "satin", fit: "slim", formality: "smart-casual",
    seasons: ["spring", "summer"], tags: ["minimal", "date night", "90s"],
    notes: "Bias-cut white slip. Her father thinks it looks like underwear; it's a Calvin Klein." }) },
  { id: "d_sheer", shape: "shirt", fill: { kind: "sheer", color: "#fbfaf6" }, surface: "oak", attrs: a({
    name: "sheer white chiffon shirt", category: "top", subtype: "sheer overshirt", primaryColor: "white", primaryHex: "#fbfaf6",
    material: "chiffon", fit: "relaxed", formality: "smart-casual", seasons: ["spring", "summer"],
    tags: ["layering", "cover-up", "romantic"], notes: "Transparent button-down worn open over the slip dress." }) },
  { id: "d_rblazer", shape: "blazer", fill: RED_PLAID, attrs: a({
    name: "red plaid blazer", category: "outerwear", subtype: "blazer", primaryColor: "cherry red", primaryHex: "#b3122a",
    secondaryColors: ["black", "forest green", "yellow"], secondaryHexes: ["#141414", "#1d4d2f", "#f2c12e"],
    pattern: "plaid", material: "wool", fit: "slim", formality: "smart-casual", seasons: ["autumn", "winter"],
    tags: ["co-ord", "preppy", "holiday"], notes: "The set first rejected as 'too Christmas' - it made the movie anyway." }) },
  { id: "d_rskirt", shape: "skirt", fill: RED_PLAID, surface: "carpet", attrs: a({
    name: "red plaid mini skirt", category: "bottom", subtype: "pleated mini skirt", primaryColor: "cherry red", primaryHex: "#b3122a",
    secondaryColors: ["black", "forest green"], secondaryHexes: ["#141414", "#1d4d2f"], pattern: "plaid", material: "wool",
    fit: "slim", formality: "smart-casual", seasons: ["autumn", "winter"], tags: ["co-ord", "mini", "preppy"],
    notes: "Matches the red blazer; anchors a black knit just as well." }) },
  { id: "d_pinkcard", shape: "cardigan", fill: { kind: "fluff", color: "#f5b9cc" }, surface: "linen", attrs: a({
    name: "baby pink mohair cardigan", category: "top", subtype: "cardigan", primaryColor: "baby pink", primaryHex: "#f5b9cc",
    pattern: "textured", material: "mohair", fit: "slim", seasons: ["spring", "autumn", "winter"],
    tags: ["fuzzy", "cropped", "sweet"], notes: "Cropped fuzzy cardigan with pearl buttons." }) },
  { id: "d_cuff", shape: "cufftop", fill: { kind: "solid", color: "#22201e" }, surface: "blush", attrs: a({
    name: "black marabou-cuff top", category: "top", subtype: "fitted knit top", primaryColor: "black", primaryHex: "#22201e",
    material: "fine knit", fit: "slim", formality: "smart-casual", seasons: ["autumn", "winter"],
    tags: ["fluffy cuffs", "evening", "fitted"], notes: "Long-sleeve fitted knit finished with feather cuffs." }) },
  { id: "d_vest", shape: "vest", fill: { kind: "solid", color: "#a9c6e6" }, surface: "oak", attrs: a({
    name: "powder blue knit vest", category: "top", subtype: "sweater vest", primaryColor: "powder blue", primaryHex: "#a9c6e6",
    pattern: "textured", material: "cotton knit", fit: "slim", seasons: ["spring", "autumn"],
    tags: ["preppy", "layering", "v-neck"], notes: "Cropped V-neck vest; goes over the baby tee." }) },
  { id: "d_tennis", shape: "skirt", fill: { kind: "solid", color: "#f2efe8" }, surface: "oak", attrs: a({
    name: "white pleated tennis skirt", category: "bottom", subtype: "pleated mini skirt", primaryColor: "white", primaryHex: "#f2efe8",
    material: "cotton twill", fit: "regular", seasons: ["spring", "summer"], tags: ["sporty", "mini", "preppy"],
    notes: "Crisp white pleats - the neutral that makes every top a co-ord." }) },
  { id: "d_trousers", shape: "trousers", fill: { kind: "solid", color: "#9a958e" }, surface: "linen", attrs: a({
    name: "dove grey tailored trousers", category: "bottom", subtype: "trousers", primaryColor: "dove grey", primaryHex: "#9a958e",
    material: "wool crepe", fit: "slim", formality: "business", seasons: ["autumn", "winter", "spring"],
    tags: ["tailored", "debate class", "polished"], notes: "Flat-front grey trousers for the days she means business." }) },
  { id: "d_headband", shape: "headband", fill: { kind: "solid", color: "#f4f0e8" }, surface: "blush", attrs: a({
    name: "white padded headband", category: "accessory", subtype: "headband", primaryColor: "white", primaryHex: "#f4f0e8",
    material: "satin", fit: "n/a", formality: "smart-casual", tags: ["60s", "polished", "hair"], notes: "Padded satin Alice band." }) },
  { id: "d_backpack", shape: "backpack", fill: { kind: "patent", color: "#c4c8ce" }, surface: "carpet", attrs: a({
    name: "silver mini backpack", category: "accessory", subtype: "mini backpack", primaryColor: "silver", primaryHex: "#c4c8ce",
    material: "metallic vinyl", fit: "n/a", tags: ["90s", "metallic", "school"], notes: "Metallic mini backpack; holds a cell phone and a fuzzy pen." }) },

  // ── Dionne ────────────────────────────────────────────────────────────────
  { id: "d_dblazer", shape: "blazer", fill: DIONNE_PLAID, surface: "blush", attrs: a({
    name: "black & white plaid blazer", category: "outerwear", subtype: "blazer", primaryColor: "white", primaryHex: "#f5f1ea",
    secondaryColors: ["black", "red"], secondaryHexes: ["#141414", "#c8102e"], pattern: "plaid", material: "wool",
    fit: "slim", formality: "smart-casual", seasons: ["spring", "autumn"], tags: ["co-ord", "graphic", "statement"],
    notes: "Dionne's monochrome answer to the yellow suit, with a red vinyl collar." }) },
  { id: "d_dskirt", shape: "skirt", fill: DIONNE_PLAID, surface: "oak", attrs: a({
    name: "black & white plaid mini skirt", category: "bottom", subtype: "pleated mini skirt", primaryColor: "white", primaryHex: "#f5f1ea",
    secondaryColors: ["black", "red"], secondaryHexes: ["#141414", "#c8102e"], pattern: "plaid", material: "wool",
    fit: "slim", formality: "smart-casual", seasons: ["spring", "autumn"], tags: ["co-ord", "graphic", "mini"],
    notes: "Graphic black-and-white plaid with a thread of red." }) },
  { id: "d_hat", shape: "tophat", fill: { kind: "stripe", a: "#f5f1ea", b: "#141414", w: 12, angle: 90 }, surface: "linen", attrs: a({
    name: "striped top hat", category: "accessory", subtype: "top hat", primaryColor: "black", primaryHex: "#141414",
    secondaryColors: ["white", "red"], secondaryHexes: ["#f5f1ea", "#c8102e"], pattern: "stripe", material: "felt", fit: "n/a",
    formality: "smart-casual", seasons: ["autumn", "winter"], tags: ["statement", "milliner", "whimsical"],
    notes: "Tall striped milliner's hat with a red band - the Dr. Seuss one." }) },
  { id: "d_vinyl", shape: "handbag", fill: { kind: "patent", color: "#c8102e" }, surface: "carpet", attrs: a({
    name: "red vinyl handbag", category: "accessory", subtype: "handbag", primaryColor: "red", primaryHex: "#c8102e",
    material: "vinyl", fit: "n/a", formality: "smart-casual", tags: ["vintage", "glossy", "top handle"],
    notes: "Vintage top-handle bag in glossy red vinyl." }) },

  // ── Tai, Josh ─────────────────────────────────────────────────────────────
  { id: "d_flannel", shape: "shirt", fill: FLANNEL, surface: "carpet", attrs: a({
    name: "oversized red flannel shirt", category: "top", subtype: "flannel shirt", primaryColor: "brick red", primaryHex: "#9e1b22",
    secondaryColors: ["black"], secondaryHexes: ["#111111"], pattern: "plaid", material: "brushed cotton", fit: "oversized",
    seasons: ["autumn", "winter"], tags: ["grunge", "layering", "pre-makeover"], notes: "Tai's first-day flannel, two sizes up." }) },
  { id: "d_jeans", shape: "jeans", fill: { kind: "denim", color: "#7f9cc4" }, surface: "oak", attrs: a({
    name: "baggy light-wash jeans", category: "bottom", subtype: "jeans", primaryColor: "light wash blue", primaryHex: "#7f9cc4",
    material: "denim", fit: "relaxed", tags: ["90s", "baggy", "skater"], notes: "Wide, slouchy light-wash jeans." }) },
  { id: "d_sneakers", shape: "sneakers", fill: { kind: "solid", color: "#f3f0ea" }, surface: "linen", attrs: a({
    name: "white platform sneakers", category: "footwear", subtype: "platform sneakers", primaryColor: "white", primaryHex: "#f3f0ea",
    secondaryColors: ["black"], secondaryHexes: ["#1b1816"], material: "canvas", fit: "n/a", tags: ["platform", "90s", "comfortable"],
    notes: "Chunky platform sneakers - rollin' with the homies footwear." }) },
  { id: "d_sweat", shape: "sweatshirt", fill: { kind: "solid", color: "#4b4f55" }, surface: "oak", attrs: a({
    name: "charcoal college sweatshirt", category: "top", subtype: "crewneck sweatshirt", primaryColor: "charcoal", primaryHex: "#4b4f55",
    material: "cotton fleece", fit: "relaxed", formality: "loungewear", seasons: ["autumn", "winter"],
    tags: ["collegiate", "cosy", "borrowed"], notes: "Josh's college crewneck. Cher's now." }) },

  // ── Fragrance ─────────────────────────────────────────────────────────────
  { id: "d_ckone", shape: "flask", fill: { kind: "solid", color: "#d6dbdf" }, surface: "linen", attrs: a({
    name: "ck one", category: "fragrance", subtype: "eau de toilette", brand: "Calvin Klein",
    primaryColor: "frosted clear", primaryHex: "#d6dbdf", material: "glass", fit: "n/a", formality: "casual",
    seasons: ["spring", "summer"], tags: ["unisex", "fresh", "1994"], scentFamily: "fresh citrus",
    topNotes: ["bergamot", "lemon", "pineapple", "cardamom"], heartNotes: ["jasmine", "violet", "rose"],
    baseNotes: ["musk", "green tea", "amber"], sizeMl: 100,
    notes: "The frosted flask everyone shared in 1995; clean citrus over musk." }) },
];

const T0 = Date.UTC(1995, 6, 19, 8, 0, 0); // Clueless opened July 19, 1995.

export const DEMO_ITEMS: Item[] = SPECS.map((s, i) => ({
  _id: s.id,
  _creationTime: T0 + i * 60_000,
  status: "done",
  attrs: s.attrs,
  frontUrl: garmentSvg(s.shape, s.fill, { surface: s.surface }),
  backUrl: garmentSvg(s.shape, s.fill, { surface: s.surface, back: true }),
}));

export const DEMO_LOOKS: LookRequest[] = [
  {
    _id: "demo_first_day",
    _creationTime: T0 + 3_600_000,
    occasion: "First day back at Bronson Alcott. Debate class first period, then lunch on the quad.",
    constraints: "Block heels only - no stilettos. It's warm by noon.",
    status: "done",
    favorite: true,
    model: "claude-opus-5-5",
    startedAt: T0 + 3_600_000,
    finishedAt: T0 + 3_640_000,
    result: {
      read: "A first impression that has to survive a debate podium and a sunny quad: polished enough to argue in, light enough by lunch.",
      gaps: "A lightweight neutral cardigan would let any of these drop a layer at noon without losing the polish.",
      looks: [
        {
          title: "Ray of Sunshine",
          tagline: "The matched set does the talking, so you can do the arguing.",
          direction: "the full co-ord",
          pieces: [
            { id: "d_yblazer", role: "outerwear", note: "shoulders sharp, sleeves pushed by noon" },
            { id: "d_tee", role: "top", note: "plain white keeps the plaid the headline" },
            { id: "d_yskirt", role: "bottom", note: "same plaid = one long line" },
            { id: "d_socks", role: "accessory", note: "white bridges the mini to the shoe" },
            { id: "d_mj", role: "footwear", note: "black patent repeats the plaid's darkest stripe" },
            { id: "d_fluff", role: "accessory", note: "one soft thing against all that structure" },
          ],
          why: "The yellow plaid blazer and mini read as one piece, which is what makes a co-ord look expensive. The baby tee is the quiet in the middle, and the over-the-knee socks carry the white from the tee down to the Mary Janes, whose black patent picks up the plaid's heaviest line. The marabou bag is the only texture that isn't tailored, which keeps it from looking like a uniform.",
          tips: ["Tuck the tee fully so the blazer nips at the waist.", "Blazer off and over the shoulders for lunch.", "Keep jewellery gold and small - the plaid is busy enough."],
          swaps: [{ id: "d_vest", replaces: "d_yblazer", note: "powder blue vest if it's already hot at 8am" }],
        },
        {
          title: "Two Snaps Up for Grey",
          tagline: "Debate-team serious, quad-ready cute.",
          direction: "soft tailoring",
          pieces: [
            { id: "d_vest", role: "top", note: "the one colour, kept pale" },
            { id: "d_tee", role: "underlayer", note: "tee peeking at the V and hem" },
            { id: "d_trousers", role: "bottom", note: "grey makes the blue look intentional" },
            { id: "d_mj", role: "footwear", note: "patent polish for the podium" },
            { id: "d_headband", role: "accessory", note: "a little sixties, very put-together" },
          ],
          why: "Powder blue over white is the gentlest possible colour story, and the dove grey trousers sit between them in value so nothing jumps. The tailoring says you prepared; the knit vest says you're still sixteen. Black Mary Janes give the grey a hard edge at the bottom.",
          tips: ["Let a sliver of the tee show under the vest hem.", "Half-tuck nothing - this look wants clean lines."],
          swaps: [{ id: "d_tennis", replaces: "d_trousers", note: "white pleats if the quad wins over debate" }],
        },
        {
          title: "Totally Buggin' (In a Good Way)",
          tagline: "The red set, minus the Christmas.",
          direction: "darker, bolder plaid",
          pieces: [
            { id: "d_cuff", role: "top", note: "black knit stops the red from going festive" },
            { id: "d_rskirt", role: "bottom", note: "the plaid without its blazer" },
            { id: "d_socks", role: "accessory", note: "white socks lighten it up" },
            { id: "d_mj", role: "footwear", note: "black on black, all business" },
          ],
          why: "Dropping the red blazer and putting the black marabou-cuff knit on top turns the red plaid from holiday to deliberate. The black top and black Mary Janes bracket the skirt, so it reads as the one bold thing, and the feather cuffs give it the movie's sense of humour.",
          tips: ["Push the cuffs up slightly so the feathers sit at the wrist bone.", "Skip the bag; this one is about the skirt."],
          swaps: [],
        },
      ],
    },
  },
];
