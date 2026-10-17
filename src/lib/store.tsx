import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import * as db from "./db";
import { setCustomShades } from "./colors";
import { deleteImage, initImages } from "./images";
import type { CustomShade, Item, ItemDraft, Outfit, OutfitDraft } from "./types";

interface Store {
  ready: boolean;
  error: string | null;
  items: Item[];
  itemsById: Map<string, Item>;
  outfits: Outfit[];
  addItem(d: ItemDraft): Promise<Item>;
  updateItem(id: string, d: ItemDraft): Promise<void>;
  toggleItemFavorite(item: Item): Promise<void>;
  removeItem(item: Item): Promise<void>;
  saveOutfit(d: OutfitDraft, id?: string): Promise<string>;
  toggleOutfitFavorite(outfit: Outfit): Promise<void>;
  removeOutfit(id: string): Promise<void>;
  customShades: CustomShade[];
  addShade(s: Omit<CustomShade, "id">): Promise<CustomShade>;
  updateShade(s: CustomShade): Promise<void>;
  removeShade(s: CustomShade): Promise<void>;
}

const StoreContext = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [outfits, setOutfits] = useState<Outfit[]>([]);
  const [customShades, setShades] = useState<CustomShade[]>([]);

  const reloadOutfits = useCallback(async () => setOutfits(await db.listOutfits()), []);

  // La palette dei colori (modulo colors.ts) va aggiornata prima del render che usa le nuove sfumature.
  const applyShades = (list: CustomShade[]) => {
    setCustomShades(list);
    setShades(list);
  };

  /** Riscrive le correzioni manuali dei colori nei capi (usato quando una sfumatura viene rinominata o eliminata). */
  const rewriteColorNames = async (fn: (name: string) => string | null) => {
    const changed: Item[] = [];
    for (const item of items) {
      const next: Record<string, string> = {};
      let dirty = false;
      for (const [hex, name] of Object.entries(item.colorNames)) {
        const n = fn(name);
        if (n !== name) dirty = true;
        if (n) next[hex] = n;
      }
      if (dirty) {
        await db.setItemColorNames(item.id, next);
        changed.push({ ...item, colorNames: next });
      }
    }
    if (changed.length) {
      const byId = new Map(changed.map((i) => [i.id, i]));
      setItems((prev) => prev.map((i) => byId.get(i.id) ?? i));
    }
  };

  useEffect(() => {
    (async () => {
      try {
        await initImages();
        const [i, o, s] = await Promise.all([db.listItems(), db.listOutfits(), db.listCustomShades()]);
        applyShades(s);
        setItems(i);
        setOutfits(o);
        setReady(true);
      } catch (e) {
        console.error(e);
        setError(String(e));
      }
    })();
  }, []);

  const itemsById = useMemo(() => new Map(items.map((i) => [i.id, i])), [items]);

  const store: Store = {
    ready,
    error,
    items,
    itemsById,
    outfits,

    async addItem(d) {
      const item = await db.createItem(d);
      setItems((prev) => [item, ...prev]);
      return item;
    },

    async updateItem(id, d) {
      const old = itemsById.get(id);
      await db.updateItem(id, d);
      if (old?.image && old.image !== d.image) await deleteImage(old.image);
      setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...d, updatedAt: new Date().toISOString() } : i)));
    },

    async toggleItemFavorite(item) {
      await db.setItemFavorite(item.id, !item.favorite);
      setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, favorite: !item.favorite } : i)));
    },

    async removeItem(item) {
      await db.deleteItem(item.id);
      await deleteImage(item.image);
      setItems((prev) => prev.filter((i) => i.id !== item.id));
      await reloadOutfits();
    },

    async saveOutfit(d, id) {
      const old = id ? outfits.find((o) => o.id === id) : undefined;
      const newId = await db.saveOutfit(d, id);
      // Foto sostituita o rimossa: il file precedente non serve più.
      if (old?.image && old.image !== d.image) await deleteImage(old.image);
      await reloadOutfits();
      return newId;
    },

    async toggleOutfitFavorite(outfit) {
      await db.setOutfitFavorite(outfit.id, !outfit.favorite);
      setOutfits((prev) => prev.map((o) => (o.id === outfit.id ? { ...o, favorite: !outfit.favorite } : o)));
    },

    async removeOutfit(id) {
      const outfit = outfits.find((o) => o.id === id);
      await db.deleteOutfit(id);
      await deleteImage(outfit?.image ?? null);
      setOutfits((prev) => prev.filter((o) => o.id !== id));
    },

    customShades,

    async addShade(s) {
      const created = await db.createCustomShade(s);
      applyShades([...customShades, created]);
      return created;
    },

    async updateShade(s) {
      const old = customShades.find((x) => x.id === s.id);
      await db.updateCustomShade(s);
      applyShades(customShades.map((x) => (x.id === s.id ? s : x)));
      if (old && old.name !== s.name) await rewriteColorNames((n) => (n === old.name ? s.name : n));
    },

    async removeShade(s) {
      await db.deleteCustomShade(s.id);
      applyShades(customShades.filter((x) => x.id !== s.id));
      // I colori corretti a mano con questa sfumatura tornano al nome automatico.
      await rewriteColorNames((n) => (n === s.name ? null : n));
    },
  };

  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const s = useContext(StoreContext);
  if (!s) throw new Error("useStore fuori da StoreProvider");
  return s;
}
