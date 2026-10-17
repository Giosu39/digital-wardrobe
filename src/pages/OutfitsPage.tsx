import { Copy, Heart, Layers, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { ConfirmDialog } from "../components/Modal";
import { OutfitPreview } from "../components/OutfitPreview";
import { useToast } from "../components/Toast";
import { OCCASIONS, SEASONS } from "../lib/constants";
import { copyImage, imageUrl } from "../lib/images";
import { useStore } from "../lib/store";
import type { Outfit, Season } from "../lib/types";
import { OutfitEditor } from "./OutfitEditor";

export function OutfitsPage() {
  const store = useStore();
  const toast = useToast();
  const [editing, setEditing] = useState<Outfit | "new" | null>(null);
  const [toDelete, setToDelete] = useState<Outfit | null>(null);
  const [occasion, setOccasion] = useState<string | null>(null);
  const [season, setSeason] = useState<Season | null>(null);
  const [favorites, setFavorites] = useState(false);

  const visible = useMemo(
    () =>
      store.outfits.filter(
        (o) =>
          (!favorites || o.favorite) &&
          (!occasion || o.occasions.includes(occasion)) &&
          (!season || o.seasons.includes(season)),
      ),
    [store.outfits, favorites, occasion, season],
  );

  if (editing) return <OutfitEditor outfit={editing === "new" ? undefined : editing} onClose={() => setEditing(null)} />;

  const duplicate = async (o: Outfit) => {
    // La copia ha un suo file della foto: eliminare un outfit non deve togliere la foto all'altro.
    const image = o.image ? await copyImage(o.image) : null;
    await store.saveOutfit({ ...o, name: `${o.name} (copia)`, favorite: false, image });
    toast("Outfit duplicato");
  };

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center gap-3 px-8 pt-7 pb-5">
        <div className="mr-auto">
          <h1 className="font-display text-2xl font-semibold tracking-tight">Outfit</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">{store.outfits.length} outfit salvati</p>
        </div>
        <button className="btn-primary" onClick={() => setEditing("new")}>
          <Plus className="size-4" /> Nuovo outfit
        </button>
      </header>

      {store.outfits.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 px-8 pb-5">
          <button className={favorites ? "chip-on" : "chip-off"} onClick={() => setFavorites(!favorites)}>
            <Heart className={`size-3.5 ${favorites ? "fill-current" : ""}`} /> Preferiti
          </button>
          <span className="mx-2 h-5 w-px bg-zinc-200 dark:bg-zinc-800" />
          {SEASONS.map((s) => (
            <button key={s.value} className={season === s.value ? "chip-on" : "chip-off"} onClick={() => setSeason(season === s.value ? null : s.value)}>
              {s.emoji} {s.label}
            </button>
          ))}
          <span className="mx-2 h-5 w-px bg-zinc-200 dark:bg-zinc-800" />
          {OCCASIONS.map((o) => (
            <button key={o} className={occasion === o ? "chip-on" : "chip-off"} onClick={() => setOccasion(occasion === o ? null : o)}>
              {o}
            </button>
          ))}
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-8 pb-8">
        {store.outfits.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <div className="mb-5 flex size-20 items-center justify-center rounded-3xl bg-accent-50 text-accent-600 dark:bg-accent-500/15 dark:text-accent-300">
              <Layers className="size-9" strokeWidth={1.5} />
            </div>
            <h2 className="font-display text-xl font-semibold">Nessun outfit ancora</h2>
            <p className="mt-1 mb-5 max-w-sm text-sm text-zinc-500 dark:text-zinc-400">
              Combina i capi del guardaroba su una tela, disponili come preferisci e salva i tuoi look.
            </p>
            <button className="btn-primary" onClick={() => setEditing("new")}>
              <Plus className="size-4" /> Crea il primo outfit
            </button>
          </div>
        ) : visible.length === 0 ? (
          <div className="py-24 text-center text-sm text-zinc-500">Nessun outfit corrisponde ai filtri.</div>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(230px,1fr))] gap-5">
            {visible.map((o) => (
              <div key={o.id} className="group card cursor-pointer overflow-hidden transition hover:-translate-y-0.5 hover:shadow-lg" onClick={() => setEditing(o)}>
                <div className="relative bg-gradient-to-b from-zinc-50 to-zinc-100 dark:from-zinc-800/60 dark:to-zinc-900">
                  {o.image ? (
                    // Se c'è la foto dell'outfit la mostriamo al posto della composizione.
                    <img src={imageUrl(o.image) ?? undefined} alt={o.name} draggable={false} className="aspect-[3/4] w-full object-contain" />
                  ) : (
                    <OutfitPreview pieces={o.pieces} items={store.itemsById} />
                  )}
                  <div className="absolute top-2.5 right-2.5 flex gap-1 opacity-0 transition group-hover:opacity-100" onClick={(e) => e.stopPropagation()}>
                    <button className="flex size-8 items-center justify-center rounded-full bg-white/85 text-zinc-500 backdrop-blur hover:text-zinc-900 dark:bg-zinc-900/85 dark:hover:text-white" onClick={() => duplicate(o)} title="Duplica">
                      <Copy className="size-4" />
                    </button>
                    <button className="flex size-8 items-center justify-center rounded-full bg-white/85 text-zinc-500 backdrop-blur hover:text-red-600 dark:bg-zinc-900/85" onClick={() => setToDelete(o)} title="Elimina">
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                  <button
                    className={`absolute top-2.5 left-2.5 flex size-8 items-center justify-center rounded-full bg-white/85 backdrop-blur transition dark:bg-zinc-900/85 ${
                      o.favorite ? "text-rose-500" : "text-zinc-400 opacity-0 group-hover:opacity-100 hover:text-rose-500"
                    }`}
                    onClick={(e) => {
                      e.stopPropagation();
                      store.toggleOutfitFavorite(o);
                    }}
                    title="Preferito"
                  >
                    <Heart className={`size-4 ${o.favorite ? "fill-current" : ""}`} />
                  </button>
                </div>
                <div className="px-4 py-3">
                  <p className="truncate font-medium">{o.name}</p>
                  <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
                    {[`${o.pieces.length} capi`, ...o.occasions].join(" · ")}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        title="Eliminare l'outfit?"
        message={<>L'outfit <strong>{toDelete?.name}</strong> verrà eliminato. I capi resteranno nel guardaroba.</>}
        onConfirm={async () => {
          if (toDelete) await store.removeOutfit(toDelete.id);
          toast("Outfit eliminato");
        }}
      />
    </div>
  );
}
