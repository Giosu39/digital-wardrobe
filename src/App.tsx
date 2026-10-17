import { Layers, Loader2, Moon, Settings, Shirt, Sun } from "lucide-react";
import { useState, type ReactNode } from "react";
import { useStore } from "./lib/store";
import { useTheme } from "./lib/theme";
import { OutfitsPage } from "./pages/OutfitsPage";
import { SettingsPage } from "./pages/SettingsPage";
import { WardrobePage } from "./pages/WardrobePage";

type Page = "wardrobe" | "outfits" | "settings";

function NavButton({ active, onClick, icon, label, badge }: { active: boolean; onClick(): void; icon: ReactNode; label: string; badge?: number }) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
        active
          ? "bg-white text-zinc-900 shadow-sm ring-1 ring-zinc-200 dark:bg-zinc-800 dark:text-white dark:ring-zinc-700"
          : "text-zinc-500 hover:bg-zinc-200/50 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800/50 dark:hover:text-zinc-100"
      }`}
    >
      <span className={active ? "text-accent-600 dark:text-accent-300" : ""}>{icon}</span>
      <span className="flex-1 text-left">{label}</span>
      {badge !== undefined && <span className="text-xs text-zinc-400 tabular-nums">{badge}</span>}
    </button>
  );
}

export default function App() {
  const store = useStore();
  const [page, setPage] = useState<Page>("wardrobe");
  const { pref: theme, setPref: setTheme, isDark } = useTheme();

  if (store.error) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <div className="card max-w-lg p-6">
          <h1 className="font-display text-lg font-semibold text-red-600">Impossibile avviare l'app</h1>
          <pre className="mt-3 text-xs whitespace-pre-wrap text-zinc-600 dark:text-zinc-400">{store.error}</pre>
        </div>
      </div>
    );
  }

  if (!store.ready) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="size-6 animate-spin text-accent-500" />
      </div>
    );
  }

  return (
    <div className="flex h-full">
      <nav className="flex w-60 shrink-0 flex-col border-r border-zinc-200 bg-zinc-100/60 px-3 py-5 dark:border-zinc-800 dark:bg-zinc-900/40">
        <div className="mb-7 flex items-center gap-2.5 px-2">
          <img src="/icon.svg" alt="" className="size-8" />
          <span className="font-display text-lg font-semibold tracking-tight">Guardaroba</span>
        </div>
        <div className="space-y-1">
          <NavButton active={page === "wardrobe"} onClick={() => setPage("wardrobe")} icon={<Shirt className="size-[18px]" />} label="Capi" badge={store.items.length} />
          <NavButton active={page === "outfits"} onClick={() => setPage("outfits")} icon={<Layers className="size-[18px]" />} label="Outfit" badge={store.outfits.length} />
        </div>
        <div className="mt-auto space-y-1">
          <NavButton
            active={false}
            onClick={() => setTheme(isDark ? "light" : "dark")}
            icon={isDark ? <Sun className="size-[18px]" /> : <Moon className="size-[18px]" />}
            label={isDark ? "Tema chiaro" : "Tema scuro"}
          />
          <NavButton active={page === "settings"} onClick={() => setPage("settings")} icon={<Settings className="size-[18px]" />} label="Impostazioni" />
        </div>
      </nav>
      <main className="min-w-0 flex-1">
        {page === "wardrobe" && <WardrobePage />}
        {page === "outfits" && <OutfitsPage />}
        {page === "settings" && <SettingsPage theme={theme} setTheme={setTheme} />}
      </main>
    </div>
  );
}
