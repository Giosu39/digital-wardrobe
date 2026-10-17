import { ChevronDown, Heart, LayoutGrid, List, Plus, Search, Shirt, SlidersHorizontal, X } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { ItemCard, ItemThumb } from "../components/ItemCard";
import { ItemDetail } from "../components/ItemDetail";
import { ItemForm } from "../components/ItemForm";
import { Swatch } from "../components/Inputs";
import { colorName, getPalette } from "../lib/colors";
import { CATEGORY_NAMES, COLOR_FAMILIES, OCCASIONS, SEASONS, type ColorFamily } from "../lib/constants";
import {
  activeFilterCount,
  applyFilters,
  EMPTY_FILTERS,
  itemColorFamilies,
  itemColorNames,
  type ItemFilters,
  type SortKey,
} from "../lib/filters";
import { useStore } from "../lib/store";
import type { Item } from "../lib/types";

function FilterSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h3 className="label mb-2">{title}</h3>
      {children}
    </section>
  );
}

function toggle<T>(list: T[], v: T) {
  return list.includes(v) ? list.filter((x) => x !== v) : [...list, v];
}

/**
 * Filtro colore a due livelli: famiglie (es. "Verdi") espandibili nelle singole sfumature.
 * Scegliere la famiglia intera azzera le sue sfumature; scegliere una sfumatura toglie la famiglia,
 * così è sempre chiaro se si filtra "tutti i verdi" o solo alcune tonalità.
 */
function ColorFamilyFilter({
  familyCounts,
  presentShades,
  families,
  shades,
  onChange,
}: {
  familyCounts: Map<ColorFamily, number>;
  presentShades: Set<string>;
  families: ColorFamily[];
  shades: string[];
  onChange(families: ColorFamily[], shades: string[]): void;
}) {
  const [expanded, setExpanded] = useState<ColorFamily[]>([]);

  return (
    <div className="space-y-0.5">
      {COLOR_FAMILIES.filter((fam) => familyCounts.has(fam.id)).map((fam) => {
        const familyShades = getPalette().filter((c) => c.families.includes(fam.id));
        const visibleShades = familyShades.filter((c) => presentShades.has(c.name));
        const on = families.includes(fam.id);
        const partial = !on && familyShades.some((c) => shades.includes(c.name));
        const open = expanded.includes(fam.id) || partial;
        const familyShadeNames = familyShades.map((c) => c.name);

        return (
          <div key={fam.id}>
            <div
              className={`flex items-center rounded-lg transition ${
                on ? "bg-accent-50 text-accent-700 dark:bg-accent-500/15 dark:text-accent-200" : "hover:bg-zinc-100 dark:hover:bg-zinc-800"
              }`}
            >
              <button
                className={`flex flex-1 items-center gap-2.5 py-1.5 pl-2.5 text-left text-sm ${on || partial ? "font-medium" : ""}`}
                onClick={() =>
                  onChange(
                    toggle(families, fam.id),
                    shades.filter((s) => !familyShadeNames.includes(s)),
                  )
                }
              >
                <span className="flex -space-x-1.5">
                  {familyShades.slice(0, 3).map((c) => (
                    <Swatch key={c.name} hex={c.hex} size="size-4" />
                  ))}
                </span>
                <span className="flex-1">{fam.label}</span>
                <span className="text-xs text-zinc-400">{familyCounts.get(fam.id)}</span>
              </button>
              {visibleShades.length > 1 ? (
                <button
                  className="flex size-7 items-center justify-center text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
                  onClick={() => setExpanded((e) => toggle(e, fam.id))}
                  title="Scegli le sfumature"
                >
                  <ChevronDown className={`size-3.5 transition ${open ? "rotate-180" : ""}`} />
                </button>
              ) : (
                <span className="w-7" />
              )}
            </div>
            {open && visibleShades.length > 1 && (
              <div className="flex flex-wrap gap-1 py-1.5 pl-2.5">
                {visibleShades.map((c) => {
                  const shadeOn = shades.includes(c.name);
                  return (
                    <button
                      key={c.name}
                      onClick={() => onChange(families.filter((f) => f !== fam.id), toggle(shades, c.name))}
                      className={`${shadeOn ? "chip-on" : "chip-off"} py-0.5 pl-1`}
                    >
                      <Swatch hex={c.hex} size="size-3.5" />
                      {c.name}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function WardrobePage() {
  const store = useStore();
  const [filters, setFilters] = useState<ItemFilters>(EMPTY_FILTERS);
  const [view, setView] = useState<"grid" | "list">("grid");
  const [showFilters, setShowFilters] = useState(true);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [editing, setEditing] = useState<Item | "new" | null>(null);

  const set = <K extends keyof ItemFilters>(k: K, v: ItemFilters[K]) => setFilters((f) => ({ ...f, [k]: v }));

  // customShades tra le dipendenze: creare/modificare una sfumatura cambia i nomi dei colori dei capi.
  const visible = useMemo(() => applyFilters(store.items, filters), [store.items, store.customShades, filters]);
  const detail = detailId ? store.itemsById.get(detailId) : undefined;

  // Mostriamo nei filtri solo valori effettivamente presenti nel guardaroba.
  const counts = useMemo(() => {
    const cat = new Map<string, number>();
    const families = new Map<ColorFamily, number>();
    const colors = new Set<string>();
    const tags = new Set<string>();
    for (const i of store.items) {
      cat.set(i.category, (cat.get(i.category) ?? 0) + 1);
      itemColorFamilies(i).forEach((f) => families.set(f, (families.get(f) ?? 0) + 1));
      itemColorNames(i).forEach((c) => colors.add(c));
      i.tags.forEach((t) => tags.add(t));
    }
    return { cat, families, colors, tags: [...tags].sort() };
  }, [store.items, store.customShades]);

  const nActive = activeFilterCount(filters);

  return (
    <div className="flex h-full">
      {/* Filtri */}
      {showFilters && store.items.length > 0 && (
        <aside className="w-64 shrink-0 space-y-6 overflow-y-auto border-r border-zinc-200 px-5 py-6 dark:border-zinc-800">
          <div className="flex items-center justify-between">
            <h2 className="font-display font-semibold">Filtri</h2>
            {nActive > 0 && (
              <button className="text-xs font-medium text-accent-600 hover:underline dark:text-accent-300" onClick={() => setFilters((f) => ({ ...EMPTY_FILTERS, search: f.search, sort: f.sort }))}>
                Azzera ({nActive})
              </button>
            )}
          </div>

          <button className={filters.favoritesOnly ? "chip-on" : "chip-off"} onClick={() => set("favoritesOnly", !filters.favoritesOnly)}>
            <Heart className={`size-3.5 ${filters.favoritesOnly ? "fill-current" : ""}`} /> Solo preferiti
          </button>

          <FilterSection title="Categoria">
            <div className="space-y-0.5">
              {CATEGORY_NAMES.filter((c) => counts.cat.has(c)).map((c) => {
                const on = filters.categories.includes(c);
                return (
                  <button
                    key={c}
                    onClick={() => set("categories", toggle(filters.categories, c))}
                    className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-sm transition ${
                      on ? "bg-accent-50 font-medium text-accent-700 dark:bg-accent-500/15 dark:text-accent-200" : "hover:bg-zinc-100 dark:hover:bg-zinc-800"
                    }`}
                  >
                    {c}
                    <span className="text-xs text-zinc-400">{counts.cat.get(c)}</span>
                  </button>
                );
              })}
            </div>
          </FilterSection>

          {counts.families.size > 0 && (
            <FilterSection title="Colore">
              <ColorFamilyFilter
                familyCounts={counts.families}
                presentShades={counts.colors}
                families={filters.colorFamilies}
                shades={filters.colors}
                onChange={(colorFamilies, colors) => setFilters((f) => ({ ...f, colorFamilies, colors }))}
              />
            </FilterSection>
          )}

          <FilterSection title="Stagione">
            <div className="flex flex-wrap gap-1.5">
              {SEASONS.map((s) => (
                <button key={s.value} className={filters.seasons.includes(s.value) ? "chip-on" : "chip-off"} onClick={() => set("seasons", toggle(filters.seasons, s.value))}>
                  {s.emoji} {s.label}
                </button>
              ))}
            </div>
          </FilterSection>

          <FilterSection title="Occasione">
            <div className="flex flex-wrap gap-1.5">
              {OCCASIONS.map((o) => (
                <button key={o} className={filters.occasions.includes(o) ? "chip-on" : "chip-off"} onClick={() => set("occasions", toggle(filters.occasions, o))}>
                  {o}
                </button>
              ))}
            </div>
          </FilterSection>

          {counts.tags.length > 0 && (
            <FilterSection title="Tag">
              <div className="flex flex-wrap gap-1.5">
                {counts.tags.map((t) => (
                  <button key={t} className={filters.tags.includes(t) ? "chip-on" : "chip-off"} onClick={() => set("tags", toggle(filters.tags, t))}>
                    #{t}
                  </button>
                ))}
              </div>
            </FilterSection>
          )}
        </aside>
      )}

      {/* Contenuto */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-3 px-8 pt-7 pb-5">
          <div className="mr-auto shrink-0">
            <h1 className="font-display text-2xl font-semibold tracking-tight whitespace-nowrap">Il mio guardaroba</h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              {visible.length === store.items.length ? `${store.items.length} capi` : `${visible.length} di ${store.items.length} capi`}
            </p>
          </div>
          {store.items.length > 0 && (
            <>
              <div className="relative w-72 min-w-40 shrink">
                <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-zinc-400" />
                <input className="input pl-9" placeholder="Cerca per nome, marca, colore…" value={filters.search} onChange={(e) => set("search", e.target.value)} />
                {filters.search && (
                  <button className="absolute top-1/2 right-2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600" onClick={() => set("search", "")}>
                    <X className="size-4" />
                  </button>
                )}
              </div>
              <select className="input w-auto" value={filters.sort} onChange={(e) => set("sort", e.target.value as SortKey)}>
                <option value="recent">Più recenti</option>
                <option value="name">Nome</option>
                <option value="category">Categoria</option>
                <option value="price">Prezzo</option>
              </select>
              <div className="flex rounded-xl border border-zinc-200 p-0.5 dark:border-zinc-700">
                <button className={`icon-btn size-8 ${view === "grid" ? "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100" : ""}`} onClick={() => setView("grid")} title="Griglia">
                  <LayoutGrid className="size-4" />
                </button>
                <button className={`icon-btn size-8 ${view === "list" ? "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100" : ""}`} onClick={() => setView("list")} title="Lista">
                  <List className="size-4" />
                </button>
              </div>
              <button className={`icon-btn relative ${showFilters ? "text-accent-600 dark:text-accent-300" : ""}`} onClick={() => setShowFilters((s) => !s)} title="Mostra/nascondi filtri">
                <SlidersHorizontal className="size-4" />
                {nActive > 0 && <span className="absolute top-1 right-1 size-2 rounded-full bg-accent-500" />}
              </button>
            </>
          )}
          <button className="btn-primary" onClick={() => setEditing("new")}>
            <Plus className="size-4" /> Aggiungi capo
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-8 pb-8">
          {store.items.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <div className="mb-5 flex size-20 items-center justify-center rounded-3xl bg-accent-50 text-accent-600 dark:bg-accent-500/15 dark:text-accent-300">
                <Shirt className="size-9" strokeWidth={1.5} />
              </div>
              <h2 className="font-display text-xl font-semibold">Il guardaroba è vuoto</h2>
              <p className="mt-1 mb-5 max-w-sm text-sm text-zinc-500 dark:text-zinc-400">
                Aggiungi il tuo primo capo: scatta una foto, rimuovi lo sfondo e inserisci le caratteristiche.
              </p>
              <button className="btn-primary" onClick={() => setEditing("new")}>
                <Plus className="size-4" /> Aggiungi il primo capo
              </button>
            </div>
          ) : visible.length === 0 ? (
            <div className="py-24 text-center text-sm text-zinc-500">Nessun capo corrisponde ai filtri.</div>
          ) : view === "grid" ? (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(190px,1fr))] gap-5">
              {visible.map((item) => (
                <ItemCard key={item.id} item={item} onOpen={() => setDetailId(item.id)} onToggleFavorite={() => store.toggleItemFavorite(item)} />
              ))}
            </div>
          ) : (
            <div className="card divide-y divide-zinc-100 dark:divide-zinc-800">
              {visible.map((item) => (
                <button key={item.id} onClick={() => setDetailId(item.id)} className="flex w-full items-center gap-4 px-4 py-2.5 text-left transition hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                  <div className="size-12 shrink-0 rounded-lg bg-zinc-100 p-1 dark:bg-zinc-800">
                    <ItemThumb item={item} className="size-full" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{item.name}</p>
                    <p className="truncate text-xs text-zinc-500">{[item.category, item.subcategory].filter(Boolean).join(" › ")}</p>
                  </div>
                  <span className="w-32 truncate text-sm text-zinc-500">{item.brand}</span>
                  <span className="w-16 text-sm text-zinc-500">{item.size}</span>
                  <div className="flex w-20 gap-1">
                    {item.colors.map((c) => (
                      <Swatch key={c} hex={c} size="size-4" title={colorName(c, item.colorNames)} />
                    ))}
                  </div>
                  <Heart className={`size-4 ${item.favorite ? "fill-rose-500 text-rose-500" : "text-transparent"}`} />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {detail && !editing && <ItemDetail item={detail} onClose={() => setDetailId(null)} onEdit={() => setEditing(detail)} />}
      {editing && (
        <ItemForm
          item={editing === "new" ? undefined : editing}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}
