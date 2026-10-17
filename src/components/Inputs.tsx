import { Check, Plus, X } from "lucide-react";
import { useState, type ReactNode } from "react";
import { COLOR_FAMILIES } from "../lib/constants";
import { colorName, getPalette, nearestPaletteColor } from "../lib/colors";
import { ShadeDialog } from "./ShadeDialog";

/** Valore speciale del menu dei nomi colore: apre la creazione di una nuova sfumatura. */
const NEW_SHADE = "__nuova_sfumatura__";

export function Field({ label, children, className = "" }: { label: string; children: ReactNode; className?: string }) {
  return (
    <label className={`block ${className}`}>
      <span className="label">{label}</span>
      {children}
    </label>
  );
}

/** Gruppo di chip a selezione multipla. */
export function ChipGroup<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: ReactNode }[];
  value: T[];
  onChange(v: T[]): void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => {
        const on = value.includes(o.value);
        return (
          <button
            type="button"
            key={o.value}
            className={on ? "chip-on" : "chip-off"}
            onClick={() => onChange(on ? value.filter((v) => v !== o.value) : [...value, o.value])}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export function TagInput({ value, onChange, suggestions = [] }: { value: string[]; onChange(v: string[]): void; suggestions?: string[] }) {
  const [text, setText] = useState("");
  const add = (t: string) => {
    const tag = t.trim().toLowerCase();
    if (tag && !value.includes(tag)) onChange([...value, tag]);
    setText("");
  };
  const listId = "tag-suggestions";
  return (
    <div className="input flex flex-wrap items-center gap-1.5 py-1.5">
      {value.map((t) => (
        <span key={t} className="chip-on py-0.5 pr-1.5">
          #{t}
          <button type="button" onClick={() => onChange(value.filter((x) => x !== t))} aria-label={`Rimuovi ${t}`}>
            <X className="size-3" />
          </button>
        </span>
      ))}
      <input
        list={listId}
        className="min-w-24 flex-1 bg-transparent py-0.5 text-sm outline-none"
        placeholder={value.length ? "" : "Aggiungi tag e premi Invio"}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            add(text);
          } else if (e.key === "Backspace" && !text && value.length) {
            onChange(value.slice(0, -1));
          }
        }}
        onBlur={() => text && add(text)}
      />
      <datalist id={listId}>
        {suggestions.filter((s) => !value.includes(s)).map((s) => (
          <option key={s} value={s} />
        ))}
      </datalist>
    </div>
  );
}

export function Swatch({ hex, size = "size-5", title }: { hex: string; size?: string; title?: string }) {
  return (
    <span
      title={title ?? colorName(hex)}
      className={`${size} inline-block shrink-0 rounded-full ring-1 ring-black/10 ring-inset dark:ring-white/15`}
      style={{ backgroundColor: hex }}
    />
  );
}

/**
 * Selettore colori: colori rilevati + palette + colore personalizzato.
 * Ogni colore scelto mostra il suo nome in un menu: il nome è calcolato in automatico,
 * ma l'utente può correggerlo (la correzione finisce in `names`, l'hex resta quello esatto).
 */
export function ColorPicker({
  value,
  onChange,
  names,
  onNamesChange,
  detected,
}: {
  value: string[];
  onChange(v: string[]): void;
  names: Record<string, string>;
  onNamesChange(n: Record<string, string>): void;
  detected: string[];
}) {
  const [custom, setCustom] = useState("#888888");
  const toggle = (hex: string) => {
    if (value.includes(hex)) {
      onChange(value.filter((v) => v !== hex));
      if (hex in names) {
        const { [hex]: _removed, ...rest } = names;
        onNamesChange(rest);
      }
    } else {
      onChange([...value, hex].slice(0, 4));
    }
  };

  const rename = (hex: string, name: string) => {
    const { [hex]: _old, ...rest } = names;
    // Se si sceglie il nome automatico, la correzione manuale viene tolta.
    onNamesChange(name === nearestPaletteColor(hex).name ? rest : { ...rest, [hex]: name });
  };

  // Colore da cui si sta creando una nuova sfumatura (menu "＋ Nuova sfumatura…").
  const [newShadeFor, setNewShadeFor] = useState<string | null>(null);
  const palette = getPalette();

  const SwatchButton = ({ hex }: { hex: string }) => {
    const on = value.includes(hex);
    return (
      <button
        type="button"
        onClick={() => toggle(hex)}
        title={colorName(hex)}
        className={`relative flex size-7 items-center justify-center rounded-full ring-1 ring-black/10 transition ring-inset hover:scale-110 dark:ring-white/15 ${
          on ? "outline-2 outline-offset-2 outline-accent-500" : ""
        }`}
        style={{ backgroundColor: hex }}
      >
        {on && <Check className="size-3.5 text-white mix-blend-difference" />}
      </button>
    );
  };

  return (
    <div className="space-y-3">
      {value.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {value.map((hex, i) => {
            const auto = nearestPaletteColor(hex).name;
            const manual = names[hex];
            return (
              <span key={hex} className="chip-off gap-2 py-1 pl-1.5">
                <Swatch hex={hex} size="size-4" title={hex} />
                <select
                  value={manual ?? auto}
                  onChange={(e) => (e.target.value === NEW_SHADE ? setNewShadeFor(hex) : rename(hex, e.target.value))}
                  title={manual ? `Nome scelto a mano (automatico: ${auto})` : "Nome automatico: clicca per correggerlo"}
                  className={`cursor-pointer bg-transparent outline-none ${manual ? "text-accent-600 dark:text-accent-300" : ""}`}
                >
                  {COLOR_FAMILIES.map((fam) => (
                    <optgroup key={fam.id} label={fam.label}>
                      {palette.filter((c) => c.families[0] === fam.id).map((c) => (
                        <option key={c.name} value={c.name}>
                          {c.name}
                          {c.name === auto ? " (automatico)" : ""}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                  <option value={NEW_SHADE}>＋ Nuova sfumatura…</option>
                </select>
                {i === 0 && <span className="text-[10px] text-zinc-400 uppercase">principale</span>}
                <button type="button" onClick={() => toggle(hex)} aria-label="Rimuovi colore">
                  <X className="size-3" />
                </button>
              </span>
            );
          })}
        </div>
      )}
      {detected.length > 0 && (
        <div>
          <p className="mb-1.5 text-xs text-zinc-500 dark:text-zinc-400">Rilevati dalla foto</p>
          <div className="flex flex-wrap gap-2">
            {detected.map((hex) => (
              <SwatchButton key={hex} hex={hex} />
            ))}
          </div>
        </div>
      )}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        {COLOR_FAMILIES.map((fam) => (
          <div key={fam.id} className="flex gap-1.5" title={fam.label}>
            {/* Ogni sfumatura compare una volta sola, nella sua famiglia principale. */}
            {palette.filter((c) => c.families[0] === fam.id).map((c) => (
              <SwatchButton key={c.name} hex={c.hex} />
            ))}
          </div>
        ))}
        <span className="relative flex items-center gap-1">
          <input
            type="color"
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            className="size-7 cursor-pointer rounded-full border-0 bg-transparent p-0"
            title="Colore personalizzato"
          />
          <button type="button" className="icon-btn size-7" onClick={() => toggle(custom)} title="Aggiungi colore personalizzato">
            <Plus className="size-3.5" />
          </button>
        </span>
      </div>

      {newShadeFor && (
        <ShadeDialog
          initialHex={newShadeFor}
          onClose={(saved) => {
            // La nuova sfumatura viene subito assegnata al colore da cui è stata creata.
            if (saved) rename(newShadeFor, saved.name);
            setNewShadeFor(null);
          }}
        />
      )}
    </div>
  );
}
