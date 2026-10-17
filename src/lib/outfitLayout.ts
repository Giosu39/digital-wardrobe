import type { Item, OutfitPiece } from "./types";

/** Rapporto altezza/larghezza della tela outfit (3:4). */
export const CANVAS_RATIO = 4 / 3;

const DEFAULT_WIDTH: Record<string, number> = {
  Capispalla: 46,
  Maglieria: 42,
  Vestiti: 44,
  Pantaloni: 38,
  Gonne: 38,
  Scarpe: 28,
  Accessori: 22,
};

export function defaultWidth(item: Item) {
  return DEFAULT_WIDTH[item.category] ?? 34;
}

type Zone = "top" | "bottom" | "outer" | "shoes" | "acc";

function zoneOf(item: Item): Zone {
  switch (item.category) {
    case "Capispalla":
      return "outer";
    case "Pantaloni":
    case "Gonne":
      return "bottom";
    case "Scarpe":
      return "shoes";
    case "Accessori":
      return "acc";
    default:
      return "top";
  }
}

interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * Dispone automaticamente i capi sulla tela in stile "flat lay":
 * parte alta a sinistra, parte bassa sotto, capispalla, accessori e scarpe a destra.
 * `aspects` contiene il rapporto larghezza/altezza di ogni immagine.
 */
export function autoArrange(pieces: OutfitPiece[], items: Map<string, Item>, aspects: Map<string, number>): OutfitPiece[] {
  const groups = new Map<Zone, OutfitPiece[]>();
  for (const p of pieces) {
    const item = items.get(p.itemId);
    if (!item) continue;
    const z = zoneOf(item);
    groups.set(z, [...(groups.get(z) ?? []), p]);
  }

  const hasRight = groups.has("outer") || groups.has("acc") || groups.has("shoes");
  const left = hasRight ? { x: 3, w: 54 } : { x: 18, w: 64 };
  const hasBottom = groups.has("bottom");

  const zones: Record<Zone, Box> = {
    top: { x: left.x, y: 3, w: left.w, h: hasBottom ? 45 : 90 },
    bottom: { x: left.x + 4, y: groups.has("top") ? 49 : 5, w: left.w - 8, h: groups.has("top") ? 48 : 90 },
    outer: { x: 58, y: 3, w: 39, h: 44 },
    acc: { x: 60, y: groups.has("outer") ? 49 : 5, w: 36, h: groups.has("outer") ? 24 : 66 },
    shoes: { x: 60, y: 75, w: 36, h: 22 },
  };

  const result: OutfitPiece[] = [];
  let z = 0;
  // Ordine di sovrapposizione: capispalla sotto, poi capi, poi accessori sopra.
  for (const zone of ["outer", "bottom", "top", "shoes", "acc"] as Zone[]) {
    const list = groups.get(zone);
    if (!list) continue;
    const box = zones[zone];
    // Più capi nella stessa zona: li affianchiamo (o impiliamo se la zona è alta).
    const vertical = box.h > box.w * CANVAS_RATIO * 0.9 && list.length > 1;
    list.forEach((p, i) => {
      const n = list.length;
      const cell: Box = vertical
        ? { x: box.x, y: box.y + (box.h / n) * i, w: box.w, h: box.h / n }
        : { x: box.x + (box.w / n) * i, y: box.y, w: box.w / n, h: box.h };
      const aspect = aspects.get(p.itemId) ?? 1;
      // h% = w% * CANVAS_W / aspect / CANVAS_H = w / (aspect * CANVAS_RATIO)
      const w = Math.min(cell.w * 0.94, cell.h * 0.94 * aspect * CANVAS_RATIO);
      const h = w / (aspect * CANVAS_RATIO);
      result.push({ itemId: p.itemId, w, x: cell.x + (cell.w - w) / 2, y: cell.y + (cell.h - h) / 2, z: z++ });
    });
  }
  return result;
}
