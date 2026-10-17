import { useState } from "react";
import { isShadeNameTaken, nearestPaletteColor } from "../lib/colors";
import { COLOR_FAMILIES } from "../lib/constants";
import { useStore } from "../lib/store";
import type { CustomShade } from "../lib/types";
import { Field, Swatch } from "./Inputs";
import { Modal } from "./Modal";
import { useToast } from "./Toast";

/**
 * Crea o modifica una sfumatura personalizzata (es. "Dark navy" nella famiglia Blu).
 * `initialHex` precompila il colore di riferimento (es. il colore del capo da cui si parte).
 */
export function ShadeDialog({
  shade,
  initialHex,
  onClose,
}: {
  shade?: CustomShade;
  initialHex?: string;
  onClose(saved?: CustomShade): void;
}) {
  const store = useStore();
  const toast = useToast();
  const startHex = shade?.hex ?? initialHex ?? "#1b2a4a";
  const [name, setName] = useState(shade?.name ?? "");
  const [hex, setHex] = useState(startHex);
  const [family, setFamily] = useState<string>(shade?.family ?? nearestPaletteColor(startHex).families[0]);
  const [saving, setSaving] = useState(false);

  const trimmed = name.trim();
  const taken = trimmed !== "" && isShadeNameTaken(trimmed, shade?.id);

  const save = async () => {
    if (!trimmed || taken) return;
    setSaving(true);
    try {
      const data = { name: trimmed, hex, family };
      const saved = shade ? { ...shade, ...data } : await store.addShade(data);
      if (shade) await store.updateShade(saved);
      toast(shade ? "Sfumatura aggiornata" : `Sfumatura "${trimmed}" creata`);
      onClose(saved);
    } catch (e) {
      toast(`Salvataggio non riuscito: ${e}`, "error");
      setSaving(false);
    }
  };

  return (
    <Modal
      open
      onClose={() => onClose()}
      dismissable={!saving}
      size="sm"
      title={shade ? "Modifica sfumatura" : "Nuova sfumatura"}
      footer={
        <>
          <button className="btn-secondary" onClick={() => onClose()} disabled={saving}>
            Annulla
          </button>
          <button className="btn-primary" onClick={save} disabled={saving || !trimmed || taken}>
            {shade ? "Salva" : "Crea sfumatura"}
          </button>
        </>
      }
    >
      <div className="space-y-4 px-6 py-5">
        <Field label="Nome">
          <input
            className="input"
            value={name}
            autoFocus
            placeholder="Es. Dark navy"
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && save()}
          />
          {taken && <span className="mt-1 block text-xs text-red-600 dark:text-red-400">Esiste già una sfumatura con questo nome.</span>}
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Colore di riferimento">
            <span className="input flex items-center gap-2 py-1.5">
              <input type="color" value={hex} onChange={(e) => setHex(e.target.value)} className="size-6 cursor-pointer border-0 bg-transparent p-0" />
              <span className="font-mono text-xs text-zinc-500 uppercase">{hex}</span>
            </span>
          </Field>
          <Field label="Famiglia">
            <select className="input" value={family} onChange={(e) => setFamily(e.target.value)}>
              {COLOR_FAMILIES.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.label}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <p className="flex items-start gap-2 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
          <Swatch hex={hex} size="size-4 mt-0.5" title={hex} />
          I colori dei capi simili a questo verranno chiamati in automatico "{trimmed || "…"}". Nei filtri compare dentro la famiglia
          scelta.
        </p>
      </div>
    </Modal>
  );
}
