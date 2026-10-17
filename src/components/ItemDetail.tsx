import { Heart, Layers, Pencil, Trash2, X } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { colorName } from "../lib/colors";
import { SEASONS } from "../lib/constants";
import { useStore } from "../lib/store";
import type { Item } from "../lib/types";
import { ItemThumb } from "./ItemCard";
import { Swatch } from "./Inputs";
import { ConfirmDialog } from "./Modal";
import { useToast } from "./Toast";

function Row({ label, children }: { label: string; children: ReactNode }) {
  if (children == null || children === false || children === "" ||(Array.isArray(children) && children.length === 0)) return null;
  return (
    <div className="grid grid-cols-[110px_1fr] gap-3 py-2 text-sm">
      <dt className="text-zinc-500 dark:text-zinc-400">{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

const money = new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" });
const date = new Intl.DateTimeFormat("it-IT", { dateStyle: "long" });

/** Pannello laterale con il dettaglio di un capo. */
export function ItemDetail({ item, onClose, onEdit }: { item: Item; onClose(): void; onEdit(): void }) {
  const store = useStore();
  const toast = useToast();
  const [confirm, setConfirm] = useState(false);
  const usedIn = store.outfits.filter((o) => o.pieces.some((p) => p.itemId === item.id));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && !confirm && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [confirm, onClose]);

  return (
    <>
      <div className="animate-fade-in fixed inset-0 z-40 bg-zinc-950/20" onClick={onClose} />
      <aside className="animate-pop-in fixed top-3 right-3 bottom-3 z-40 flex w-[420px] flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-900">
        <div className="relative aspect-[4/3] shrink-0 bg-gradient-to-b from-zinc-50 to-zinc-100 p-6 dark:from-zinc-800/60 dark:to-zinc-900">
          <ItemThumb item={item} className="size-full" />
          <button className="icon-btn absolute top-3 right-3 bg-white/80 dark:bg-zinc-900/80" onClick={onClose} aria-label="Chiudi">
            <X className="size-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5">
          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1">
              <h2 className="font-display text-xl font-semibold">{item.name}</h2>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                {[item.category, item.subcategory].filter(Boolean).join(" › ")}
              </p>
            </div>
            <button
              className={`icon-btn ${item.favorite ? "text-rose-500" : ""}`}
              onClick={() => store.toggleItemFavorite(item)}
              aria-label="Preferito"
            >
              <Heart className={`size-5 ${item.favorite ? "fill-current" : ""}`} />
            </button>
          </div>

          <dl className="mt-4 divide-y divide-zinc-100 dark:divide-zinc-800">
            <Row label="Colori">
              {item.colors.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {item.colors.map((c) => (
                    <span key={c} className="inline-flex items-center gap-1.5">
                      <Swatch hex={c} size="size-4" title={c} /> {colorName(c, item.colorNames)}
                    </span>
                  ))}
                </div>
              )}
            </Row>
            <Row label="Marca">{item.brand}</Row>
            <Row label="Taglia">{item.size}</Row>
            <Row label="Materiale">{item.material}</Row>
            <Row label="Stagioni">
              {item.seasons.length > 0 &&
                SEASONS.filter((s) => item.seasons.includes(s.value))
                  .map((s) => `${s.emoji} ${s.label}`)
                  .join("  ")}
            </Row>
            <Row label="Occasioni">{item.occasions.join(", ")}</Row>
            <Row label="Prezzo">{item.price != null ? money.format(item.price) : null}</Row>
            <Row label="Acquistato">{item.purchaseDate ? date.format(new Date(item.purchaseDate)) : null}</Row>
            <Row label="Tag">
              {item.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {item.tags.map((t) => (
                    <span key={t} className="chip-off py-0.5">
                      #{t}
                    </span>
                  ))}
                </div>
              )}
            </Row>
            <Row label="Note">{item.notes && <p className="whitespace-pre-wrap">{item.notes}</p>}</Row>
          </dl>

          {usedIn.length > 0 && (
            <div className="mt-5">
              <p className="label flex items-center gap-1.5">
                <Layers className="size-3.5" /> In {usedIn.length} outfit
              </p>
              <div className="flex flex-wrap gap-1.5">
                {usedIn.map((o) => (
                  <span key={o.id} className="chip-off">
                    {o.name}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="flex gap-2 border-t border-zinc-200 px-6 py-4 dark:border-zinc-800">
          <button className="btn-primary flex-1" onClick={onEdit}>
            <Pencil className="size-4" /> Modifica
          </button>
          <button className="btn-secondary text-red-600 dark:text-red-400" onClick={() => setConfirm(true)}>
            <Trash2 className="size-4" /> Elimina
          </button>
        </div>
      </aside>

      <ConfirmDialog
        open={confirm}
        onClose={() => setConfirm(false)}
        title="Eliminare il capo?"
        message={
          <>
            <strong>{item.name}</strong> verrà eliminato definitivamente
            {usedIn.length > 0 && <> e rimosso da {usedIn.length} outfit</>}.
          </>
        }
        onConfirm={async () => {
          await store.removeItem(item);
          toast("Capo eliminato");
          onClose();
        }}
      />
    </>
  );
}
