import {
  ArrowDownToLine,
  ArrowLeft,
  ArrowUpToLine,
  Check,
  Heart,
  ImagePlus,
  LayoutDashboard,
  Pencil,
  Search,
  Trash2,
  Upload,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ImageEditor } from "../components/ImageEditor";
import { ChipGroup, Field } from "../components/Inputs";
import { ItemThumb } from "../components/ItemCard";
import { ConfirmDialog } from "../components/Modal";
import { useToast } from "../components/Toast";
import { CATEGORY_NAMES, OCCASIONS, SEASONS } from "../lib/constants";
import { applyFilters, EMPTY_FILTERS } from "../lib/filters";
import { deleteImage, imageUrl, loadImageBlobUrl, saveImage } from "../lib/images";
import { autoArrange, CANVAS_RATIO, defaultWidth } from "../lib/outfitLayout";
import { useStore } from "../lib/store";
import type { Item, Outfit, OutfitDraft, OutfitPiece } from "../lib/types";

type Drag =
  | { kind: "move"; id: string; startX: number; startY: number; origX: number; origY: number }
  | { kind: "resize"; id: string; startX: number; origW: number };

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

export function OutfitEditor({ outfit, onClose }: { outfit?: Outfit; onClose(): void }) {
  const store = useStore();
  const toast = useToast();
  const [meta, setMeta] = useState<Omit<OutfitDraft, "pieces">>({
    name: outfit?.name ?? "",
    occasions: outfit?.occasions ?? [],
    seasons: outfit?.seasons ?? [],
    notes: outfit?.notes ?? null,
    favorite: outfit?.favorite ?? false,
    image: outfit?.image ?? null,
  });
  // Foto dell'outfit appena caricata/modificata, salvata su disco solo quando si salva l'outfit.
  const [pendingPhoto, setPendingPhoto] = useState<HTMLCanvasElement | null>(null);
  const [photoEditorSrc, setPhotoEditorSrc] = useState<string | null>(null);
  const photoInput = useRef<HTMLInputElement>(null);
  const photoPreview = useMemo(() => (pendingPhoto ? pendingPhoto.toDataURL() : imageUrl(meta.image)), [pendingPhoto, meta.image]);
  const [pieces, setPieces] = useState<OutfitPiece[]>(outfit?.pieces ?? []);
  const [selected, setSelected] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string | null>(null);

  const canvasRef = useRef<HTMLDivElement>(null);
  const drag = useRef<Drag | null>(null);
  const aspects = useRef(new Map<string, number>());

  const pickerItems = useMemo(
    () => applyFilters(store.items, { ...EMPTY_FILTERS, search, categories: category ? [category] : [], sort: "category" }),
    [store.items, store.customShades, search, category],
  );
  const used = useMemo(() => new Set(pieces.map((p) => p.itemId)), [pieces]);
  const presentCategories = useMemo(() => CATEGORY_NAMES.filter((c) => store.items.some((i) => i.category === c)), [store.items]);

  const updatePieces = (fn: (prev: OutfitPiece[]) => OutfitPiece[]) => {
    setPieces(fn);
    setDirty(true);
  };
  const updateMeta = (patch: Partial<typeof meta>) => {
    setMeta((m) => ({ ...m, ...patch }));
    setDirty(true);
  };

  const addItem = (item: Item, at?: { x: number; y: number }) => {
    if (used.has(item.id)) {
      setSelected(item.id);
      return;
    }
    const w = defaultWidth(item);
    const h = w / ((aspects.current.get(item.id) ?? 1) * CANVAS_RATIO);
    const x = at ? at.x - w / 2 : 50 - w / 2 + (pieces.length % 4) * 4;
    const y = at ? at.y - h / 2 : 30 - h / 2 + (pieces.length % 4) * 4;
    updatePieces((prev) => [...prev, { itemId: item.id, w, x: clamp(x, -w / 2, 100 - w / 2), y: clamp(y, -h / 2, 100 - h / 2), z: prev.length }]);
    setSelected(item.id);
  };

  const removePiece = useCallback((id: string) => {
    setPieces((prev) => prev.filter((p) => p.itemId !== id));
    setDirty(true);
    setSelected(null);
  }, []);

  const reorder = (id: string, dir: "front" | "back") => {
    updatePieces((prev) => {
      const sorted = [...prev].sort((a, b) => a.z - b.z).filter((p) => p.itemId !== id);
      const target = prev.find((p) => p.itemId === id)!;
      const next = dir === "front" ? [...sorted, target] : [target, ...sorted];
      return next.map((p, i) => ({ ...p, z: i }));
    });
  };

  // Carica in anticipo i rapporti d'aspetto delle immagini (servono per disposizione automatica).
  useEffect(() => {
    for (const item of store.items) {
      const url = imageUrl(item.image);
      if (!url || aspects.current.has(item.id)) continue;
      const img = new Image();
      img.onload = () => aspects.current.set(item.id, img.naturalWidth / img.naturalHeight);
      img.src = url;
    }
  }, [store.items]);

  // Trascinamento e ridimensionamento con il puntatore.
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const d = drag.current;
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!d || !rect) return;
      const dx = ((e.clientX - d.startX) / rect.width) * 100;
      if (d.kind === "move") {
        const dy = ((e.clientY - d.startY) / rect.height) * 100;
        setPieces((prev) =>
          prev.map((p) => (p.itemId === d.id ? { ...p, x: clamp(d.origX + dx, -p.w / 2, 100 - p.w / 2), y: clamp(d.origY + dy, -10, 95) } : p)),
        );
      } else {
        setPieces((prev) => prev.map((p) => (p.itemId === d.id ? { ...p, w: clamp(d.origW + dx, 6, 100) } : p)));
      }
    };
    const onUp = () => {
      if (drag.current) setDirty(true);
      drag.current = null;
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = (e.target as HTMLElement).closest("input, textarea, select");
      if (typing || photoEditorSrc || confirmLeave) return;
      if ((e.key === "Delete" || e.key === "Backspace") && selected) removePiece(selected);
      if (e.key === "Escape") setSelected(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected, removePiece, photoEditorSrc, confirmLeave]);

  // Ctrl+V con un'immagine negli appunti: diventa la foto dell'outfit.
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      if (photoEditorSrc) return;
      const file = [...(e.clipboardData?.files ?? [])].find((f) => f.type.startsWith("image/"));
      if (file) {
        e.preventDefault();
        setPhotoEditorSrc(URL.createObjectURL(file));
      }
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [photoEditorSrc]);

  const startDrag = (e: React.PointerEvent, piece: OutfitPiece, kind: "move" | "resize") => {
    e.stopPropagation();
    e.preventDefault();
    setSelected(piece.itemId);
    drag.current =
      kind === "move"
        ? { kind, id: piece.itemId, startX: e.clientX, startY: e.clientY, origX: piece.x, origY: piece.y }
        : { kind, id: piece.itemId, startX: e.clientX, origW: piece.w };
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const id = e.dataTransfer.getData("text/item-id");
    const item = store.itemsById.get(id);
    const rect = canvasRef.current!.getBoundingClientRect();
    if (item) addItem(item, { x: ((e.clientX - rect.left) / rect.width) * 100, y: ((e.clientY - rect.top) / rect.height) * 100 });
  };

  const save = async () => {
    if (pieces.length === 0) {
      toast("Aggiungi almeno un capo all'outfit", "error");
      return;
    }
    setSaving(true);
    let newPhoto: string | null = null;
    try {
      if (pendingPhoto) newPhoto = await saveImage(pendingPhoto);
      const name = meta.name.trim() || `Outfit del ${new Date().toLocaleDateString("it-IT")}`;
      await store.saveOutfit(
        { ...meta, name, notes: meta.notes?.trim() || null, image: newPhoto ?? meta.image, pieces },
        outfit?.id,
      );
      toast(outfit ? "Outfit aggiornato" : "Outfit salvato");
      onClose();
    } catch (e) {
      if (newPhoto) await deleteImage(newPhoto);
      toast(`Salvataggio non riuscito: ${e}`, "error");
      setSaving(false);
    }
  };

  const openPhotoFile = (file: File | undefined | null) => {
    if (file?.type.startsWith("image/")) setPhotoEditorSrc(URL.createObjectURL(file));
  };

  const editPhoto = async () => {
    if (pendingPhoto) setPhotoEditorSrc(pendingPhoto.toDataURL());
    else if (meta.image) setPhotoEditorSrc(await loadImageBlobUrl(meta.image));
  };

  const removePhoto = () => {
    setPendingPhoto(null);
    updateMeta({ image: null });
  };

  const back = () => (dirty ? setConfirmLeave(true) : onClose());
  const sel = pieces.find((p) => p.itemId === selected);

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center gap-3 border-b border-zinc-200 px-6 py-3.5 dark:border-zinc-800">
        <button className="icon-btn" onClick={back} title="Torna agli outfit">
          <ArrowLeft className="size-5" />
        </button>
        <h1 className="font-display mr-auto text-lg font-semibold">{outfit ? "Modifica outfit" : "Nuovo outfit"}</h1>
        <button className="btn-secondary" onClick={() => updatePieces((p) => autoArrange(p, store.itemsById, aspects.current))} disabled={pieces.length === 0}>
          <LayoutDashboard className="size-4" /> Disponi automaticamente
        </button>
        <button className="btn-primary" onClick={save} disabled={saving}>
          <Check className="size-4" /> {saving ? "Salvataggio…" : "Salva outfit"}
        </button>
      </header>

      <div className="flex min-h-0 flex-1">
        {/* Selettore capi */}
        <aside className="flex w-72 shrink-0 flex-col border-r border-zinc-200 dark:border-zinc-800">
          <div className="space-y-3 p-4">
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-zinc-400" />
              <input className="input pl-9" placeholder="Cerca capi…" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <div className="flex flex-wrap gap-1">
              <button className={category === null ? "chip-on" : "chip-off"} onClick={() => setCategory(null)}>
                Tutti
              </button>
              {presentCategories.map((c) => (
                <button key={c} className={category === c ? "chip-on" : "chip-off"} onClick={() => setCategory(c)}>
                  {c}
                </button>
              ))}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto px-4 pb-4">
            {store.items.length === 0 ? (
              <p className="py-8 text-center text-sm text-zinc-500">Aggiungi prima qualche capo al guardaroba.</p>
            ) : (
              <div className="grid grid-cols-2 gap-2.5">
                {pickerItems.map((item) => (
                  <button
                    key={item.id}
                    draggable
                    onDragStart={(e) => e.dataTransfer.setData("text/item-id", item.id)}
                    onClick={() => addItem(item)}
                    title={item.name}
                    className={`group relative aspect-square rounded-xl border p-2 transition ${
                      used.has(item.id)
                        ? "border-accent-400 bg-accent-50 dark:border-accent-500 dark:bg-accent-500/10"
                        : "border-zinc-200 bg-white hover:border-zinc-300 hover:shadow-sm dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700"
                    }`}
                  >
                    <ItemThumb item={item} className="pointer-events-none size-full" />
                    {used.has(item.id) && (
                      <span className="absolute top-1.5 right-1.5 flex size-5 items-center justify-center rounded-full bg-accent-600 text-white">
                        <Check className="size-3" />
                      </span>
                    )}
                    <span className="absolute inset-x-1 bottom-1 truncate rounded-md bg-white/85 px-1.5 py-0.5 text-[11px] opacity-0 backdrop-blur transition group-hover:opacity-100 dark:bg-zinc-900/85">
                      {item.name}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </aside>

        {/* Tela */}
        <div className="relative flex min-w-0 flex-1 flex-col items-center justify-center bg-zinc-100/70 p-6 dark:bg-zinc-950" onPointerDown={() => setSelected(null)}>
          <div
            ref={canvasRef}
            onDragOver={(e) => e.preventDefault()}
            onDrop={onDrop}
            className="relative aspect-[3/4] h-full max-h-full max-w-full rounded-2xl bg-white shadow-xl ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800"
          >
            {pieces.length === 0 && (
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center p-8 text-center text-sm text-zinc-400">
                Trascina qui i capi dalla colonna a sinistra
                <br />o cliccaci sopra per aggiungerli.
              </div>
            )}
            {[...pieces]
              .sort((a, b) => a.z - b.z)
              .map((p) => {
                const item = store.itemsById.get(p.itemId);
                if (!item) return null;
                const url = imageUrl(item.image);
                const isSel = p.itemId === selected;
                return (
                  <div
                    key={p.itemId}
                    className={`absolute cursor-grab touch-none active:cursor-grabbing ${isSel ? "outline-2 outline-offset-2 outline-accent-500 outline-dashed" : ""}`}
                    style={{ left: `${p.x}%`, top: `${p.y}%`, width: `${p.w}%`, zIndex: p.z + 1 }}
                    onPointerDown={(e) => startDrag(e, p, "move")}
                  >
                    {url ? (
                      <img
                        src={url}
                        alt={item.name}
                        draggable={false}
                        className="block h-auto w-full drop-shadow-md"
                        onLoad={(e) => aspects.current.set(item.id, e.currentTarget.naturalWidth / e.currentTarget.naturalHeight)}
                      />
                    ) : (
                      <ItemThumb item={item} className="aspect-square w-full rounded-lg bg-zinc-100 dark:bg-zinc-800" />
                    )}
                    {isSel && (
                      <span
                        className="absolute -right-2 -bottom-2 size-4 cursor-nwse-resize rounded-full border-2 border-white bg-accent-500 shadow"
                        onPointerDown={(e) => startDrag(e, p, "resize")}
                      />
                    )}
                  </div>
                );
              })}
          </div>

          {sel && (
            <div
              className="card animate-pop-in absolute bottom-6 left-1/2 flex -translate-x-1/2 items-center gap-1 p-1.5 shadow-lg"
              onPointerDown={(e) => e.stopPropagation()}
            >
              <span className="max-w-48 truncate px-2 text-sm font-medium">{store.itemsById.get(sel.itemId)?.name}</span>
              <button className="icon-btn" onClick={() => reorder(sel.itemId, "front")} title="Porta in primo piano">
                <ArrowUpToLine className="size-4" />
              </button>
              <button className="icon-btn" onClick={() => reorder(sel.itemId, "back")} title="Porta sullo sfondo">
                <ArrowDownToLine className="size-4" />
              </button>
              <button className="icon-btn hover:text-red-600" onClick={() => removePiece(sel.itemId)} title="Rimuovi (Canc)">
                <Trash2 className="size-4" />
              </button>
            </div>
          )}
        </div>

        {/* Dettagli */}
        <aside className="w-80 shrink-0 space-y-5 overflow-y-auto border-l border-zinc-200 p-5 dark:border-zinc-800">
          <Field label="Nome">
            <input className="input" value={meta.name} placeholder="Es. Ufficio smart casual" onChange={(e) => updateMeta({ name: e.target.value })} />
          </Field>
          <div>
            <span className="label">Foto dell'outfit (facoltativa)</span>
            <input ref={photoInput} type="file" accept="image/*" hidden onChange={(e) => openPhotoFile(e.target.files?.[0])} />
            {photoPreview ? (
              <div className="space-y-2">
                <div className="checker flex h-64 items-center justify-center overflow-hidden rounded-xl">
                  <img src={photoPreview} alt="Foto dell'outfit" className="max-h-full max-w-full object-contain" />
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  <button className="btn-secondary gap-1 px-1.5 text-xs" onClick={editPhoto} title="Ritaglia, ruota o rimuovi lo sfondo">
                    <Pencil className="size-4" /> Modifica
                  </button>
                  <button className="btn-secondary gap-1 px-1.5 text-xs" onClick={() => photoInput.current?.click()}>
                    <Upload className="size-4" /> Cambia
                  </button>
                  <button className="btn-secondary gap-1 px-1.5 text-xs" onClick={removePhoto}>
                    <Trash2 className="size-4" /> Togli
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => photoInput.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  openPhotoFile(e.dataTransfer.files[0]);
                }}
                className="flex w-full flex-col items-center gap-1.5 rounded-xl border-2 border-dashed border-zinc-300 px-4 py-5 text-center text-xs text-zinc-500 transition hover:border-accent-400 hover:text-accent-600 dark:border-zinc-700 dark:text-zinc-400"
              >
                <ImagePlus className="size-5" />
                <span>
                  Aggiungi una foto dell'intero outfit
                  <br />
                  (es. allo specchio), anche trascinandola qui
                </span>
              </button>
            )}
          </div>
          <div>
            <span className="label">Occasioni</span>
            <ChipGroup options={OCCASIONS.map((o) => ({ value: o, label: o }))} value={meta.occasions} onChange={(v) => updateMeta({ occasions: v })} />
          </div>
          <div>
            <span className="label">Stagioni</span>
            <ChipGroup
              options={SEASONS.map((s) => ({ value: s.value, label: `${s.emoji} ${s.label}` }))}
              value={meta.seasons}
              onChange={(v) => updateMeta({ seasons: v })}
            />
          </div>
          <Field label="Note">
            <textarea className="input min-h-24 resize-y" value={meta.notes ?? ""} onChange={(e) => updateMeta({ notes: e.target.value || null })} />
          </Field>
          <button className={meta.favorite ? "chip-on" : "chip-off"} onClick={() => updateMeta({ favorite: !meta.favorite })}>
            <Heart className={`size-3.5 ${meta.favorite ? "fill-current" : ""}`} /> Preferito
          </button>
          {pieces.length > 0 && (
            <div>
              <span className="label">Capi nell'outfit ({pieces.length})</span>
              <ul className="space-y-1">
                {pieces.map((p) => {
                  const item = store.itemsById.get(p.itemId);
                  return (
                    item && (
                      <li
                        key={p.itemId}
                        onClick={() => setSelected(p.itemId)}
                        className={`flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm ${
                          p.itemId === selected ? "bg-accent-50 dark:bg-accent-500/15" : "hover:bg-zinc-100 dark:hover:bg-zinc-800"
                        }`}
                      >
                        <ItemThumb item={item} className="size-8 shrink-0" />
                        <span className="truncate">{item.name}</span>
                      </li>
                    )
                  );
                })}
              </ul>
            </div>
          )}
        </aside>
      </div>

      <ConfirmDialog
        open={confirmLeave}
        onClose={() => setConfirmLeave(false)}
        title="Uscire senza salvare?"
        message="Le modifiche a questo outfit andranno perse."
        confirmLabel="Esci senza salvare"
        onConfirm={onClose}
      />

      {photoEditorSrc && (
        <ImageEditor
          src={photoEditorSrc}
          onDone={(canvas) => {
            setPendingPhoto(canvas);
            setDirty(true);
            setPhotoEditorSrc(null);
          }}
          onCancel={() => setPhotoEditorSrc(null)}
        />
      )}
    </div>
  );
}
