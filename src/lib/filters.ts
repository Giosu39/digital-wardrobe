import { resolvePaletteColor } from "./colors";
import { COLOR_FAMILIES, type ColorFamily } from "./constants";
import type { Item, Season } from "./types";

export type SortKey = "recent" | "name" | "price" | "category";

export interface ItemFilters {
  search: string;
  categories: string[];
  /** Famiglie di colore (es. tutti i verdi). */
  colorFamilies: ColorFamily[];
  /** Singole sfumature della palette (es. solo "Verde oliva"). */
  colors: string[];
  seasons: Season[];
  occasions: string[];
  tags: string[];
  favoritesOnly: boolean;
  sort: SortKey;
}

export const EMPTY_FILTERS: ItemFilters = {
  search: "",
  categories: [],
  colorFamilies: [],
  colors: [],
  seasons: [],
  occasions: [],
  tags: [],
  favoritesOnly: false,
  sort: "recent",
};

export function activeFilterCount(f: ItemFilters) {
  return f.categories.length + f.colorFamilies.length + f.colors.length + f.seasons.length + f.occasions.length + f.tags.length + (f.favoritesOnly ? 1 : 0);
}

const normalize = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

/** Nomi dei colori della palette associati a un capo. */
export function itemColorNames(item: Item): string[] {
  return item.colors.map((c) => resolvePaletteColor(c, item.colorNames).name);
}

/** Famiglie di colore a cui appartiene un capo (unione delle famiglie dei suoi colori). */
export function itemColorFamilies(item: Item): ColorFamily[] {
  return [...new Set(item.colors.flatMap((c) => resolvePaletteColor(c, item.colorNames).families))];
}

/** Un capo passa il filtro colore se ha almeno una sfumatura scelta o un colore di una famiglia scelta. */
function matchesColor(item: Item, f: ItemFilters) {
  if (f.colorFamilies.length === 0 && f.colors.length === 0) return true;
  return (
    itemColorNames(item).some((n) => f.colors.includes(n)) ||
    itemColorFamilies(item).some((fam) => f.colorFamilies.includes(fam))
  );
}

export function applyFilters(items: Item[], f: ItemFilters): Item[] {
  const terms = normalize(f.search).split(/\s+/).filter(Boolean);
  const anyOf = <T>(selected: T[], values: T[]) => selected.length === 0 || selected.some((s) => values.includes(s));

  const result = items.filter((item) => {
    if (f.favoritesOnly && !item.favorite) return false;
    if (f.categories.length && !f.categories.includes(item.category)) return false;
    if (!matchesColor(item, f)) return false;
    if (!anyOf(f.seasons, item.seasons)) return false;
    if (!anyOf(f.occasions, item.occasions)) return false;
    if (f.tags.length && !f.tags.every((t) => item.tags.includes(t))) return false;
    if (terms.length) {
      const haystack = normalize(
        [item.name, item.category, item.subcategory, item.brand, item.material, item.size, item.notes, ...item.tags, ...itemColorNames(item),
         ...itemColorFamilies(item).map((fam) => COLOR_FAMILIES.find((x) => x.id === fam)!.term)]
          .filter(Boolean)
          .join(" "),
      );
      if (!terms.every((t) => haystack.includes(t))) return false;
    }
    return true;
  });

  const collator = new Intl.Collator("it");
  switch (f.sort) {
    case "name":
      return result.sort((a, b) => collator.compare(a.name, b.name));
    case "price":
      return result.sort((a, b) => (b.price ?? -1) - (a.price ?? -1));
    case "category":
      return result.sort((a, b) => collator.compare(a.category, b.category) || collator.compare(a.name, b.name));
    default:
      return result;
  }
}
