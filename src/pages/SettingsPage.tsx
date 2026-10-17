import { appDataDir } from "@tauri-apps/api/path";
import { openPath } from "@tauri-apps/plugin-opener";
import { FolderOpen, Monitor, Moon, Pencil, Plus, Sun, Trash2 } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { Swatch } from "../components/Inputs";
import { ConfirmDialog } from "../components/Modal";
import { ShadeDialog } from "../components/ShadeDialog";
import { useToast } from "../components/Toast";
import { BG_MODELS, getBgModel, setBgModel } from "../lib/bgRemoval";
import { COLOR_FAMILIES } from "../lib/constants";
import { useStore } from "../lib/store";
import type { ThemePref } from "../lib/theme";
import type { CustomShade } from "../lib/types";

function Section({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <section className="card p-6">
      <h2 className="font-display font-semibold">{title}</h2>
      {description && <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{description}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

const THEMES: { value: ThemePref; label: string; icon: ReactNode }[] = [
  { value: "light", label: "Chiaro", icon: <Sun className="size-5" /> },
  { value: "dark", label: "Scuro", icon: <Moon className="size-5" /> },
  { value: "system", label: "Sistema", icon: <Monitor className="size-5" /> },
];

const money = new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" });

/** Elenco delle sfumature personalizzate, raggruppate per famiglia, con modifica ed eliminazione. */
function ShadeManager() {
  const store = useStore();
  const toast = useToast();
  const [editing, setEditing] = useState<CustomShade | "new" | null>(null);
  const [toDelete, setToDelete] = useState<CustomShade | null>(null);

  // Quanti capi usano la sfumatura come nome scelto a mano (tornerebbero al nome automatico).
  const usage = (s: CustomShade) => store.items.filter((i) => Object.values(i.colorNames).includes(s.name)).length;

  return (
    <div className="space-y-3">
      {store.customShades.length === 0 ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">Nessuna sfumatura personalizzata.</p>
      ) : (
        <ul className="divide-y divide-zinc-100 rounded-xl border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
          {COLOR_FAMILIES.flatMap((fam) =>
            store.customShades
              .filter((s) => s.family === fam.id)
              .map((s) => (
                <li key={s.id} className="flex items-center gap-3 px-3 py-2">
                  <Swatch hex={s.hex} size="size-6" title={s.hex} />
                  <span className="flex-1 text-sm font-medium">{s.name}</span>
                  <span className="text-xs text-zinc-500 dark:text-zinc-400">{fam.label}</span>
                  <button className="icon-btn size-8" onClick={() => setEditing(s)} title="Modifica">
                    <Pencil className="size-4" />
                  </button>
                  <button className="icon-btn size-8 hover:text-red-600" onClick={() => setToDelete(s)} title="Elimina">
                    <Trash2 className="size-4" />
                  </button>
                </li>
              )),
          )}
        </ul>
      )}
      <button className="btn-secondary" onClick={() => setEditing("new")}>
        <Plus className="size-4" /> Aggiungi sfumatura
      </button>

      {editing && <ShadeDialog shade={editing === "new" ? undefined : editing} onClose={() => setEditing(null)} />}
      <ConfirmDialog
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        title="Eliminare la sfumatura?"
        message={
          toDelete && (
            <>
              <strong>{toDelete.name}</strong> verrà eliminata.
              {usage(toDelete) === 1 && <> Il capo che la usa come nome scelto a mano tornerà al nome automatico.</>}
              {usage(toDelete) > 1 && <> I {usage(toDelete)} capi che la usano come nome scelto a mano torneranno al nome automatico.</>}
            </>
          )
        }
        onConfirm={async () => {
          if (!toDelete) return;
          await store.removeShade(toDelete);
          toast("Sfumatura eliminata");
        }}
      />
    </div>
  );
}

export function SettingsPage({ theme, setTheme }: { theme: ThemePref; setTheme(t: ThemePref): void }) {
  const store = useStore();
  const toast = useToast();
  const [model, setModel] = useState(getBgModel);
  const [dataDir, setDataDir] = useState("");

  useEffect(() => {
    appDataDir().then(setDataDir);
  }, []);

  const total = store.items.reduce((s, i) => s + (i.price ?? 0), 0);

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-3xl space-y-5 px-8 py-7">
        <h1 className="font-display text-2xl font-semibold tracking-tight">Impostazioni</h1>

        <Section title="Aspetto" description="Scegli il tema dell'interfaccia.">
          <div className="grid grid-cols-3 gap-3">
            {THEMES.map((t) => (
              <button
                key={t.value}
                onClick={() => setTheme(t.value)}
                className={`flex flex-col items-center gap-2 rounded-xl border-2 px-4 py-4 text-sm font-medium transition ${
                  theme === t.value
                    ? "border-accent-500 bg-accent-50 text-accent-700 dark:bg-accent-500/10 dark:text-accent-200"
                    : "border-zinc-200 hover:border-zinc-300 dark:border-zinc-800 dark:hover:border-zinc-700"
                }`}
              >
                {t.icon}
                {t.label}
              </button>
            ))}
          </div>
        </Section>

        <Section
          title="Sfumature di colore"
          description="Aggiungi i tuoi nomi di colore (es. Dark navy) dentro le famiglie esistenti. L'app li userà anche per riconoscere in automatico i colori simili."
        >
          <ShadeManager />
        </Section>

        <Section
          title="Rimozione sfondo"
          description="Modello AI usato in locale per scontornare le foto. Usa la GPU (WebGPU) se disponibile. Il modello si scarica al primo utilizzo e poi funziona offline."
        >
          <select
            className="input"
            value={model}
            onChange={(e) => {
              setModel(e.target.value);
              setBgModel(e.target.value);
              toast("Modello aggiornato");
            }}
          >
            {BG_MODELS.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </select>
        </Section>

        <Section title="Dati e backup" description="Database e foto sono salvati in questa cartella. Per un backup basta copiarla.">
          <div className="flex items-center gap-3">
            <code className="min-w-0 flex-1 truncate rounded-lg bg-zinc-100 px-3 py-2 text-xs dark:bg-zinc-800">{dataDir}</code>
            <button className="btn-secondary" onClick={() => openPath(dataDir).catch((e) => toast(String(e), "error"))}>
              <FolderOpen className="size-4" /> Apri cartella
            </button>
          </div>
        </Section>

        <Section title="Riepilogo">
          <dl className="grid grid-cols-3 gap-4 text-center">
            {[
              ["Capi", store.items.length],
              ["Outfit", store.outfits.length],
              ["Valore stimato", money.format(total)],
            ].map(([label, value]) => (
              <div key={label} className="rounded-xl bg-zinc-50 py-4 dark:bg-zinc-800/50">
                <dd className="font-display text-2xl font-semibold">{value}</dd>
                <dt className="text-xs text-zinc-500">{label}</dt>
              </div>
            ))}
          </dl>
        </Section>
      </div>
    </div>
  );
}
