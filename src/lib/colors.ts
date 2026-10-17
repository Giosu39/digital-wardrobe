import { COLOR_FAMILIES, COLOR_PALETTE, type ColorFamily } from "./constants";
import type { CustomShade } from "./types";

type RGB = [number, number, number];

export function hexToRgb(hex: string): RGB {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function rgbToHex([r, g, b]: RGB): string {
  return "#" + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, "0")).join("");
}

// Conversione in spazio Lab per misurare distanze "percettive" tra colori.
function rgbToLab([r, g, b]: RGB): RGB {
  const lin = (c: number) => {
    c /= 255;
    return c > 0.04045 ? ((c + 0.055) / 1.055) ** 2.4 : c / 12.92;
  };
  const [R, G, B] = [lin(r), lin(g), lin(b)];
  const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  const x = f((R * 0.4124 + G * 0.3576 + B * 0.1805) / 0.95047);
  const y = f(R * 0.2126 + G * 0.7152 + B * 0.0722);
  const z = f((R * 0.0193 + G * 0.1192 + B * 0.9505) / 1.08883);
  return [116 * y - 16, 500 * (x - y), 200 * (y - z)];
}

function labDistance(a: RGB, b: RGB) {
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}

/**
 * Sopra questa croma (quanto un colore è "colorato", in unità Lab) un colore non può essere
 * chiamato con un nome acromatico (Nero, Grigi, Bianco). Esempio: un dark navy ha luminosità
 * quasi da nero ma croma ~12, ed è chiaramente blu. Un nero fotografato con una leggera dominante
 * fredda resta invece sotto 5.
 */
export const NEUTRAL_MAX_CHROMA = 8;

function chroma(lab: RGB) {
  return Math.hypot(lab[1], lab[2]);
}

export interface PaletteColor {
  name: string;
  hex: string;
  families: ColorFamily[];
  anchors?: string[];
  /** Presente solo per le sfumature create dall'utente. */
  customId?: string;
}

// Ogni sfumatura può avere più riferimenti (hex principale + anchors), es. un navy medio e uno scuro.
// `achromatic` vale per le sfumature senza tinta (Nero, Grigi, Bianco), non per la Panna, che è un
// neutro caldo con una sua croma.
function prepare(list: PaletteColor[]) {
  return list.map((c) => {
    const labs = [c.hex, ...(c.anchors ?? [])].map((h) => rgbToLab(hexToRgb(h)));
    return { ...c, labs, achromatic: chroma(labs[0]) < NEUTRAL_MAX_CHROMA };
  });
}

// Palette attiva = predefinita + sfumature dell'utente (impostate dallo store all'avvio e a ogni modifica).
let palette: PaletteColor[] = COLOR_PALETTE;
let paletteLab = prepare(palette);
let paletteByName = new Map(paletteLab.map((c) => [c.name, c]));

const FAMILY_IDS = new Set<string>(COLOR_FAMILIES.map((f) => f.id));

export function setCustomShades(shades: CustomShade[]) {
  palette = [
    ...COLOR_PALETTE,
    ...shades
      .filter((s) => FAMILY_IDS.has(s.family))
      .map((s) => ({ name: s.name, hex: s.hex, families: [s.family as ColorFamily], customId: s.id })),
  ];
  paletteLab = prepare(palette);
  paletteByName = new Map(paletteLab.map((c) => [c.name, c]));
}

/** Tutte le sfumature disponibili (predefinite + personalizzate). */
export function getPalette(): PaletteColor[] {
  return palette;
}

/** True se il nome è già usato da un'altra sfumatura (confronto senza maiuscole/spazi). */
export function isShadeNameTaken(name: string, exceptCustomId?: string) {
  const n = name.trim().toLowerCase();
  return palette.some((c) => c.name.toLowerCase() === n && (!exceptCustomId || c.customId !== exceptCustomId));
}

/**
 * Raggio (distanza Lab) entro cui una sfumatura creata dall'utente ha la precedenza sulle predefinite.
 * Chi crea "Dark navy" vuole che i navy scuri simili si chiamino così, anche se un riferimento
 * predefinito (es. quello scuro di Blu navy) è leggermente più vicino. ~10 = colori ancora simili a occhio.
 */
export const CUSTOM_SHADE_RADIUS = 10;

/** Restituisce il colore della palette più vicino (nome, hex di riferimento, famiglie). */
export function nearestPaletteColor(hex: string) {
  const lab = rgbToLab(hexToRgb(hex));
  const chromatic = chroma(lab) >= NEUTRAL_MAX_CHROMA;
  let best = paletteLab[0];
  let bestD = Infinity;
  let bestCustom: (typeof paletteLab)[number] | null = null;
  let bestCustomD = Infinity;
  for (const c of paletteLab) {
    if (chromatic && c.achromatic) continue;
    for (const ref of c.labs) {
      const d = labDistance(lab, ref);
      if (d < bestD) {
        bestD = d;
        best = c;
      }
      if (c.customId && d < bestCustomD) {
        bestCustomD = d;
        bestCustom = c;
      }
    }
  }
  return bestCustom && bestCustomD <= CUSTOM_SHADE_RADIUS ? bestCustom : best;
}

/**
 * Sfumatura della palette associata a un colore: quella scelta a mano dall'utente (se presente),
 * altrimenti quella calcolata automaticamente.
 */
export function resolvePaletteColor(hex: string, overrides?: Record<string, string>) {
  const manual = overrides?.[hex];
  return (manual && paletteByName.get(manual)) || nearestPaletteColor(hex);
}

export function colorName(hex: string, overrides?: Record<string, string>) {
  return resolvePaletteColor(hex, overrides).name;
}

/**
 * Estrae i colori dominanti di un'immagine con un k-means semplice.
 * Ignora i pixel trasparenti e, se l'immagine non ha trasparenza,
 * scarta il colore del bordo (probabile sfondo).
 */
export function extractColors(source: CanvasImageSource, width: number, height: number, k = 4): string[] {
  const size = 96;
  const scale = Math.min(1, size / Math.max(width, height));
  const w = Math.max(1, Math.round(width * scale));
  const h = Math.max(1, Math.round(height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(source, 0, 0, w, h);
  const data = ctx.getImageData(0, 0, w, h).data;

  const pixels: RGB[] = [];
  let transparent = 0;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 128) {
      transparent++;
      continue;
    }
    pixels.push([data[i], data[i + 1], data[i + 2]]);
  }
  if (pixels.length === 0) return [];

  // Se non c'è trasparenza, stimiamo il colore di sfondo dal bordo.
  let background: RGB | null = null;
  if (transparent < data.length / 4 / 20) {
    const border: RGB[] = [];
    for (let x = 0; x < w; x++) {
      for (const y of [0, h - 1]) {
        const i = (y * w + x) * 4;
        border.push([data[i], data[i + 1], data[i + 2]]);
      }
    }
    background = border
      .reduce<RGB>((acc, p) => [acc[0] + p[0], acc[1] + p[1], acc[2] + p[2]], [0, 0, 0])
      .map((v) => v / border.length) as RGB;
  }

  const clusters = kmeans(pixels, k);
  const total = pixels.length;
  const result = clusters
    .filter((c) => c.count / total > 0.06)
    .filter((c) => !background || labDistance(rgbToLab(c.center), rgbToLab(background)) > 12)
    .sort((a, b) => b.count - a.count)
    .map((c) => rgbToHex(c.center));

  // Rimuoviamo i colori troppo simili tra loro.
  const unique: string[] = [];
  for (const hex of result) {
    const lab = rgbToLab(hexToRgb(hex));
    if (unique.every((u) => labDistance(lab, rgbToLab(hexToRgb(u))) > 15)) unique.push(hex);
  }
  return unique.slice(0, 3);
}

function kmeans(pixels: RGB[], k: number) {
  // Inizializzazione deterministica: campioni equidistanti ordinati per luminosità.
  const sorted = [...pixels].sort((a, b) => a[0] + a[1] + a[2] - (b[0] + b[1] + b[2]));
  let centers: RGB[] = Array.from({ length: k }, (_, i) => sorted[Math.floor(((i + 0.5) / k) * sorted.length)]);
  let assign = new Array<number>(pixels.length).fill(0);

  for (let iter = 0; iter < 12; iter++) {
    assign = pixels.map((p) => {
      let best = 0;
      let bestD = Infinity;
      centers.forEach((c, i) => {
        const d = (p[0] - c[0]) ** 2 + (p[1] - c[1]) ** 2 + (p[2] - c[2]) ** 2;
        if (d < bestD) {
          bestD = d;
          best = i;
        }
      });
      return best;
    });
    const sums = centers.map(() => [0, 0, 0, 0]);
    pixels.forEach((p, i) => {
      const s = sums[assign[i]];
      s[0] += p[0];
      s[1] += p[1];
      s[2] += p[2];
      s[3]++;
    });
    centers = sums.map((s, i) => (s[3] ? [s[0] / s[3], s[1] / s[3], s[2] / s[3]] : centers[i]));
  }

  const counts = new Array(k).fill(0);
  assign.forEach((a) => counts[a]++);
  return centers.map((center, i) => ({ center, count: counts[i] }));
}
