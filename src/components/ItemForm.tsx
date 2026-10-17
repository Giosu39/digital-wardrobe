import { Heart, ImagePlus, Pencil, Trash2, Upload } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { colorName, extractColors } from "../lib/colors";
import { CATEGORIES, CATEGORY_NAMES, MATERIALS, OCCASIONS, SEASONS } from "../lib/constants";
import { deleteImage, imageUrl, loadImageBlobUrl, saveImage } from "../lib/images";
import { useStore } from "../lib/store";
import type { Item, ItemDraft } from "../lib/types";
import { ChipGroup, ColorPicker, Field, TagInput } from "./Inputs";
import { ImageEditor } from "./ImageEditor";
import { Modal } from "./Modal";
import { useToast } from "./Toast";

const EMPTY: ItemDraft = {
  name: "",
  category: "",
  subcategory: null,
  colors: [],
  colorNames: {},
  brand: null,
  size: null,
  material: null,
  seasons: [],
  occasions: [],
  tags: [],
  price: null,
  purchaseDate: null,
  notes: null,
  favorite: false,
  image: null,
};

function toDraft(item: Item): ItemDraft {
  const { id: _id, createdAt: _c, updatedAt: _u, ...draft } = item;
  return draft;
}

// Durante la digitazione il testo resta com'è (spazi compresi): la pulizia avviene solo al salvataggio.
const orNull = (s: string) => (s === "" ? null : s);
const clean = (s: string | null) => (s?.trim() ? s.trim() : null);

export function ItemForm({ item, onClose }: { item?: Item; onClose(saved?: Item): void }) {
  const store = useStore();
  const toast = useToast();
  const [d, setD] = useState<ItemDraft>(item ? toDraft(item) : EMPTY);
  const [pending, setPending] = useState<HTMLCanvasElement | null>(null);
  const [editorSrc, setEditorSrc] = useState<string | null>(null);
  const [detected, setDetected] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const set = <K extends keyof ItemDraft>(key: K, value: ItemDraft[K]) => setD((prev) => ({ ...prev, [key]: value }));

  const preview = useMemo(() => (pending ? pending.toDataURL() : imageUrl(d.image)), [pending, d.image]);

  const brands = useMemo(() => [...new Set(store.items.map((i) => i.brand).filter(Boolean))] as string[], [store.items]);
  const allTags = useMemo(() => [...new Set(store.items.flatMap((i) => i.tags))], [store.items]);

  const openFile = (file: File | undefined | null) => {
    if (!file || !file.type.startsWith("image/")) return;
    setEditorSrc(URL.createObjectURL(file));
  };

  // Incolla un'immagine dagli appunti (Ctrl+V).
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      if (editorSrc) return;
      const file = [...(e.clipboardData?.files ?? [])].find((f) => f.type.startsWith("image/"));
      if (file) {
        e.preventDefault();
        openFile(file);
      }
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [editorSrc]);

  const editCurrent = async () => {
    if (pending) setEditorSrc(pending.toDataURL());
    else if (d.image) setEditorSrc(await loadImageBlobUrl(d.image));
  };

  const onEditorDone = (canvas: HTMLCanvasElement) => {
    setPending(canvas);
    setEditorSrc(null);
    const colors = extractColors(canvas, canvas.width, canvas.height);
    setDetected(colors);
    if (d.colors.length === 0) set("colors", colors.slice(0, 2));
  };

  const suggestedName = [d.subcategory?.trim() || d.category, d.colors[0] && colorName(d.colors[0], d.colorNames).toLowerCase()]
    .filter(Boolean)
    .join(" ");

  const save = async () => {
    if (!d.category) {
      toast("Scegli almeno la categoria", "error");
      return;
    }
    setSaving(true);
    let newImage: string | null = null;
    try {
      if (pending) newImage = await saveImage(pending);
      const draft: ItemDraft = {
        ...d,
        name: d.name.trim() || suggestedName,
        subcategory: clean(d.subcategory),
        brand: clean(d.brand),
        size: clean(d.size),
        material: clean(d.material),
        notes: clean(d.notes),
        // Teniamo solo le correzioni dei colori ancora presenti nel capo.
        colorNames: Object.fromEntries(Object.entries(d.colorNames).filter(([hex]) => d.colors.includes(hex))),
        image: newImage ?? d.image,
      };
      if (item) {
        await store.updateItem(item.id, draft);
        toast("Capo aggiornato");
        onClose({ ...item, ...draft });
      } else {
        const created = await store.addItem(draft);
        toast("Capo aggiunto al guardaroba");
        onClose(created);
      }
    } catch (e) {
      console.error(e);
      if (newImage) await deleteImage(newImage);
      toast(`Salvataggio non riuscito: ${e}`, "error");
      setSaving(false);
    }
  };

  const subcategories = CATEGORIES[d.category] ?? [];

  return (
    <>
      <Modal
        open
        onClose={() => onClose()}
        dismissable={!saving && !editorSrc}
        size="xl"
        title={item ? "Modifica capo" : "Nuovo capo"}
        footer={
          <>
            <button
              type="button"
              className={`btn-ghost mr-auto ${d.favorite ? "text-rose-500" : ""}`}
              onClick={() => set("favorite", !d.favorite)}
            >
              <Heart className={`size-4 ${d.favorite ? "fill-current" : ""}`} />
              {d.favorite ? "Nei preferiti" : "Aggiungi ai preferiti"}
            </button>
            <button className="btn-secondary" onClick={() => onClose()} disabled={saving}>
              Annulla
            </button>
            <button className="btn-primary" onClick={save} disabled={saving}>
              {saving ? "Salvataggio…" : "Salva"}
            </button>
          </>
        }
      >
        <div className="grid grid-cols-[340px_1fr] gap-8 p-6">
          {/* Foto */}
          <div className="space-y-3">
            <div
              className={`checker relative flex aspect-[3/4] items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed transition ${
                dragOver ? "border-accent-500" : preview ? "border-transparent" : "border-zinc-300 dark:border-zinc-700"
              }`}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                openFile(e.dataTransfer.files[0]);
              }}
            >
              {preview ? (
                <img src={preview} alt="" className="max-h-full max-w-full object-contain p-3" />
              ) : (
                <button
                  type="button"
                  onClick={() => fileInput.current?.click()}
                  className="flex flex-col items-center gap-3 p-6 text-center text-sm text-zinc-500 dark:text-zinc-400"
                >
                  <span className="flex size-14 items-center justify-center rounded-2xl bg-accent-50 text-accent-600 dark:bg-accent-500/15 dark:text-accent-300">
                    <ImagePlus className="size-6" />
                  </span>
                  <span>
                    <strong className="font-medium text-zinc-800 dark:text-zinc-200">Carica una foto</strong>
                    <br />
                    trascinala qui o incollala con Ctrl+V
                  </span>
                </button>
              )}
            </div>
            <input ref={fileInput} type="file" accept="image/*" hidden onChange={(e) => openFile(e.target.files?.[0])} />
            {preview && (
              <div className="grid grid-cols-3 gap-2">
                <button type="button" className="btn-secondary" onClick={editCurrent}>
                  <Pencil className="size-4" /> Modifica
                </button>
                <button type="button" className="btn-secondary" onClick={() => fileInput.current?.click()}>
                  <Upload className="size-4" /> Cambia
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => {
                    setPending(null);
                    set("image", null);
                  }}
                >
                  <Trash2 className="size-4" /> Rimuovi
                </button>
              </div>
            )}
          </div>

          {/* Dati */}
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Nome" className="col-span-2">
                <input className="input" value={d.name} placeholder={suggestedName || "Es. Camicia oxford azzurra"} onChange={(e) => set("name", e.target.value)} autoFocus />
              </Field>
              <Field label="Categoria *">
                <select className="input" value={d.category} onChange={(e) => setD((p) => ({ ...p, category: e.target.value, subcategory: null }))}>
                  <option value="">Seleziona…</option>
                  {CATEGORY_NAMES.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </Field>
              <Field label="Tipo">
                <input
                  className="input"
                  list="subcategories"
                  value={d.subcategory ?? ""}
                  placeholder={subcategories[0] ? `Es. ${subcategories[0]}` : ""}
                  onChange={(e) => set("subcategory", orNull(e.target.value))}
                />
                <datalist id="subcategories">
                  {subcategories.map((s) => (
                    <option key={s} value={s} />
                  ))}
                </datalist>
              </Field>
              <Field label="Marca">
                <input className="input" list="brands" value={d.brand ?? ""} onChange={(e) => set("brand", orNull(e.target.value))} />
                <datalist id="brands">
                  {brands.map((b) => (
                    <option key={b} value={b} />
                  ))}
                </datalist>
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Taglia">
                  <input className="input" value={d.size ?? ""} placeholder="M, 42, 9½…" onChange={(e) => set("size", orNull(e.target.value))} />
                </Field>
                <Field label="Materiale">
                  <input className="input" list="materials" value={d.material ?? ""} onChange={(e) => set("material", orNull(e.target.value))} />
                  <datalist id="materials">
                    {MATERIALS.map((m) => (
                      <option key={m} value={m} />
                    ))}
                  </datalist>
                </Field>
              </div>
            </div>

            <div>
              <span className="label">Colori</span>
              <ColorPicker
                value={d.colors}
                onChange={(v) => set("colors", v)}
                names={d.colorNames}
                onNamesChange={(n) => set("colorNames", n)}
                detected={detected}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="label">Stagioni</span>
                <ChipGroup
                  options={SEASONS.map((s) => ({ value: s.value, label: `${s.emoji} ${s.label}` }))}
                  value={d.seasons}
                  onChange={(v) => set("seasons", v)}
                />
              </div>
              <div>
                <span className="label">Occasioni</span>
                <ChipGroup options={OCCASIONS.map((o) => ({ value: o, label: o }))} value={d.occasions} onChange={(v) => set("occasions", v)} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Prezzo (€)">
                <input
                  className="input"
                  type="number"
                  min={0}
                  step="0.01"
                  value={d.price ?? ""}
                  onChange={(e) => set("price", e.target.value === "" ? null : Number(e.target.value))}
                />
              </Field>
              <Field label="Data di acquisto">
                <input className="input" type="date" value={d.purchaseDate ?? ""} onChange={(e) => set("purchaseDate", orNull(e.target.value))} />
              </Field>
            </div>

            <div>
              <span className="label">Tag</span>
              <TagInput value={d.tags} onChange={(v) => set("tags", v)} suggestions={allTags} />
            </div>

            <Field label="Note">
              <textarea className="input min-h-20 resize-y" value={d.notes ?? ""} onChange={(e) => set("notes", orNull(e.target.value))} />
            </Field>
          </div>
        </div>
      </Modal>

      {editorSrc && <ImageEditor src={editorSrc} onDone={onEditorDone} onCancel={() => setEditorSrc(null)} />}
    </>
  );
}
