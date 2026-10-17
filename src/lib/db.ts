import Database from "@tauri-apps/plugin-sql";
import type { CustomShade, Item, ItemDraft, Outfit, OutfitDraft, OutfitPiece } from "./types";

let dbPromise: Promise<Database> | null = null;

/**
 * In sviluppo (`npm run app:dev`) si usa un database separato: così le prove e le nuove migrazioni
 * non toccano i dati veri dell'app installata, che condivide la stessa cartella dati.
 */
const DB_URL = import.meta.env.DEV ? "sqlite:guardaroba-dev.db" : "sqlite:guardaroba.db";

function db() {
  dbPromise ??= Database.load(DB_URL);
  return dbPromise;
}

const now = () => new Date().toISOString();
const json = (v: unknown) => JSON.stringify(v ?? []);
const parse = <T>(v: string | null): T => (v ? JSON.parse(v) : []) as T;

// ---------------------------------------------------------------- Capi

interface ItemRow {
  id: string;
  name: string;
  category: string;
  subcategory: string | null;
  colors: string;
  color_names: string;
  brand: string | null;
  size: string | null;
  material: string | null;
  seasons: string;
  occasions: string;
  tags: string;
  price: number | null;
  purchase_date: string | null;
  notes: string | null;
  favorite: number;
  image: string | null;
  created_at: string;
  updated_at: string;
}

function toItem(r: ItemRow): Item {
  return {
    id: r.id,
    name: r.name,
    category: r.category,
    subcategory: r.subcategory,
    colors: parse(r.colors),
    colorNames: r.color_names ? JSON.parse(r.color_names) : {},
    brand: r.brand,
    size: r.size,
    material: r.material,
    seasons: parse(r.seasons),
    occasions: parse(r.occasions),
    tags: parse(r.tags),
    price: r.price,
    purchaseDate: r.purchase_date,
    notes: r.notes,
    favorite: !!r.favorite,
    image: r.image,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

function itemValues(d: ItemDraft) {
  return [
    d.name, d.category, d.subcategory, json(d.colors), d.brand, d.size, d.material,
    json(d.seasons), json(d.occasions), json(d.tags), d.price, d.purchaseDate, d.notes,
    d.favorite ? 1 : 0, d.image, JSON.stringify(d.colorNames ?? {}),
  ];
}

export async function listItems(): Promise<Item[]> {
  const rows = await (await db()).select<ItemRow[]>("SELECT * FROM items ORDER BY created_at DESC");
  return rows.map(toItem);
}

export async function createItem(d: ItemDraft): Promise<Item> {
  const id = crypto.randomUUID();
  const t = now();
  await (await db()).execute(
    `INSERT INTO items (name, category, subcategory, colors, brand, size, material, seasons,
       occasions, tags, price, purchase_date, notes, favorite, image, color_names, id, created_at, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)`,
    [...itemValues(d), id, t, t],
  );
  return { ...d, id, createdAt: t, updatedAt: t };
}

export async function updateItem(id: string, d: ItemDraft): Promise<void> {
  await (await db()).execute(
    `UPDATE items SET name=$1, category=$2, subcategory=$3, colors=$4, brand=$5, size=$6,
       material=$7, seasons=$8, occasions=$9, tags=$10, price=$11, purchase_date=$12, notes=$13,
       favorite=$14, image=$15, color_names=$16, updated_at=$17 WHERE id=$18`,
    [...itemValues(d), now(), id],
  );
}

export async function setItemFavorite(id: string, favorite: boolean): Promise<void> {
  await (await db()).execute("UPDATE items SET favorite=$1 WHERE id=$2", [favorite ? 1 : 0, id]);
}

export async function deleteItem(id: string): Promise<void> {
  const conn = await db();
  // Il pool di connessioni non garantisce PRAGMA foreign_keys: cancelliamo a mano.
  await conn.execute("DELETE FROM outfit_items WHERE item_id=$1", [id]);
  await conn.execute("DELETE FROM items WHERE id=$1", [id]);
}

export async function setItemColorNames(id: string, colorNames: Record<string, string>): Promise<void> {
  await (await db()).execute("UPDATE items SET color_names=$1 WHERE id=$2", [JSON.stringify(colorNames), id]);
}

// ---------------------------------------------------------------- Sfumature personalizzate

export async function listCustomShades(): Promise<CustomShade[]> {
  return (await db()).select<CustomShade[]>("SELECT id, name, hex, family FROM custom_colors ORDER BY created_at");
}

export async function createCustomShade(s: Omit<CustomShade, "id">): Promise<CustomShade> {
  const id = crypto.randomUUID();
  await (await db()).execute(
    "INSERT INTO custom_colors (id, name, hex, family, created_at) VALUES ($1,$2,$3,$4,$5)",
    [id, s.name, s.hex, s.family, now()],
  );
  return { ...s, id };
}

export async function updateCustomShade(s: CustomShade): Promise<void> {
  await (await db()).execute("UPDATE custom_colors SET name=$1, hex=$2, family=$3 WHERE id=$4", [s.name, s.hex, s.family, s.id]);
}

export async function deleteCustomShade(id: string): Promise<void> {
  await (await db()).execute("DELETE FROM custom_colors WHERE id=$1", [id]);
}

// ---------------------------------------------------------------- Outfit

interface OutfitRow {
  id: string;
  name: string;
  occasions: string;
  seasons: string;
  notes: string | null;
  favorite: number;
  image: string | null;
  created_at: string;
  updated_at: string;
}

interface PieceRow {
  outfit_id: string;
  item_id: string;
  x: number;
  y: number;
  w: number;
  z: number;
}

export async function listOutfits(): Promise<Outfit[]> {
  const conn = await db();
  const rows = await conn.select<OutfitRow[]>("SELECT * FROM outfits ORDER BY updated_at DESC");
  const pieces = await conn.select<PieceRow[]>("SELECT * FROM outfit_items ORDER BY z");
  const byOutfit = new Map<string, OutfitPiece[]>();
  for (const p of pieces) {
    const list = byOutfit.get(p.outfit_id) ?? [];
    list.push({ itemId: p.item_id, x: p.x, y: p.y, w: p.w, z: p.z });
    byOutfit.set(p.outfit_id, list);
  }
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    occasions: parse(r.occasions),
    seasons: parse(r.seasons),
    notes: r.notes,
    favorite: !!r.favorite,
    pieces: byOutfit.get(r.id) ?? [],
    image: r.image ?? null,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }));
}

async function writePieces(outfitId: string, pieces: OutfitPiece[]) {
  const conn = await db();
  await conn.execute("DELETE FROM outfit_items WHERE outfit_id=$1", [outfitId]);
  for (const p of pieces) {
    await conn.execute(
      "INSERT INTO outfit_items (outfit_id, item_id, x, y, w, z) VALUES ($1,$2,$3,$4,$5,$6)",
      [outfitId, p.itemId, p.x, p.y, p.w, p.z],
    );
  }
}

export async function saveOutfit(d: OutfitDraft, id?: string): Promise<string> {
  const conn = await db();
  const t = now();
  const values = [d.name, json(d.occasions), json(d.seasons), d.notes, d.favorite ? 1 : 0, d.image, t];
  if (id) {
    await conn.execute(
      "UPDATE outfits SET name=$1, occasions=$2, seasons=$3, notes=$4, favorite=$5, image=$6, updated_at=$7 WHERE id=$8",
      [...values, id],
    );
  } else {
    id = crypto.randomUUID();
    await conn.execute(
      `INSERT INTO outfits (name, occasions, seasons, notes, favorite, image, updated_at, id, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [...values, id, t],
    );
  }
  await writePieces(id, d.pieces);
  return id;
}

export async function setOutfitFavorite(id: string, favorite: boolean): Promise<void> {
  await (await db()).execute("UPDATE outfits SET favorite=$1 WHERE id=$2", [favorite ? 1 : 0, id]);
}

export async function deleteOutfit(id: string): Promise<void> {
  const conn = await db();
  await conn.execute("DELETE FROM outfit_items WHERE outfit_id=$1", [id]);
  await conn.execute("DELETE FROM outfits WHERE id=$1", [id]);
}
