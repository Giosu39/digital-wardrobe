import type { Season } from "./types";

export const CATEGORIES: Record<string, string[]> = {
  Maglieria: ["T-shirt", "Polo", "Camicia", "Maglione", "Felpa", "Cardigan", "Top", "Canotta"],
  Pantaloni: ["Jeans", "Chino", "Eleganti", "Tuta", "Shorts", "Leggings", "Cargo"],
  Gonne: ["Mini", "Midi", "Lunga"],
  Vestiti: ["Casual", "Elegante", "Tuta intera"],
  Capispalla: ["Giacca", "Blazer", "Cappotto", "Piumino", "Giubbotto", "Impermeabile", "Gilet"],
  Scarpe: ["Sneakers", "Eleganti", "Stivali", "Sandali", "Mocassini", "Sportive", "Ciabatte"],
  Accessori: ["Borsa", "Zaino", "Cintura", "Cappello", "Sciarpa", "Guanti", "Occhiali", "Orologio", "Gioielli", "Cravatta"],
  Intimo: ["Calze", "Intimo", "Pigiama"],
  Sport: ["Maglia tecnica", "Pantaloncini", "Costume"],
};

export const CATEGORY_NAMES = Object.keys(CATEGORIES);

export const SEASONS: { value: Season; label: string; emoji: string }[] = [
  { value: "primavera", label: "Primavera", emoji: "🌸" },
  { value: "estate", label: "Estate", emoji: "☀️" },
  { value: "autunno", label: "Autunno", emoji: "🍂" },
  { value: "inverno", label: "Inverno", emoji: "❄️" },
];

export const OCCASIONS = ["Casual", "Lavoro", "Elegante", "Sport", "Casa", "Serata", "Viaggio", "Cerimonia"];

export const MATERIALS = [
  "Cotone", "Lino", "Lana", "Cashmere", "Seta", "Denim", "Pelle", "Ecopelle",
  "Poliestere", "Nylon", "Viscosa", "Velluto", "Pile", "Tecnico", "Misto",
];

/**
 * Famiglie di colore: raggruppano le sfumature della palette (es. Verde oliva e Verde militare → Verdi).
 * `term` è la parola usata dalla ricerca testuale (scrivendo "verde" si trovano tutti i verdi).
 */
export const COLOR_FAMILIES = [
  { id: "neutri", label: "Neutri", term: "neutro" },
  { id: "terra", label: "Beige e marroni", term: "marrone" },
  { id: "rossi", label: "Rossi e rosa", term: "rosso" },
  { id: "gialli", label: "Gialli e arancio", term: "giallo" },
  { id: "verdi", label: "Verdi", term: "verde" },
  { id: "blu", label: "Blu", term: "blu" },
  { id: "viola", label: "Viola", term: "viola" },
] as const;

export type ColorFamily = (typeof COLOR_FAMILIES)[number]["id"];

/**
 * Palette di riferimento per dare un nome ai colori e per i filtri.
 * Una sfumatura può appartenere a più famiglie (es. il Turchese è sia verde sia blu).
 * `anchors`: riferimenti aggiuntivi per sfumature che coprono un intervallo ampio
 * (es. Blu navy va da un navy medio a un navy quasi nero). `hex` resta il colore mostrato nei pallini.
 */
export const COLOR_PALETTE: { name: string; hex: string; families: ColorFamily[]; anchors?: string[] }[] = [
  { name: "Nero", hex: "#111111", families: ["neutri"] },
  { name: "Grigio scuro", hex: "#4b4b4f", families: ["neutri"], anchors: ["#2e2e30"] },
  { name: "Grigio", hex: "#9ca3af", families: ["neutri"] },
  { name: "Bianco", hex: "#f8f8f6", families: ["neutri"] },
  { name: "Panna", hex: "#efe6d2", families: ["neutri"] },
  { name: "Beige", hex: "#d6c3a0", families: ["terra"] },
  { name: "Cammello", hex: "#b08850", families: ["terra"] },
  { name: "Marrone", hex: "#6b4226", families: ["terra"], anchors: ["#3a2a20"] },
  { name: "Rosso", hex: "#c62828", families: ["rossi"] },
  { name: "Bordeaux", hex: "#6d1a2c", families: ["rossi"], anchors: ["#3d1520"] },
  { name: "Rosa", hex: "#f2a6be", families: ["rossi"] },
  { name: "Arancione", hex: "#ef7d22", families: ["gialli"] },
  { name: "Giallo", hex: "#f4d03f", families: ["gialli"] },
  { name: "Senape", hex: "#c9a227", families: ["gialli"] },
  { name: "Verde", hex: "#2e8b57", families: ["verdi"], anchors: ["#1d4a33"] },
  { name: "Verde oliva", hex: "#6b6b2e", families: ["verdi"] },
  { name: "Verde militare", hex: "#4b5320", families: ["verdi"], anchors: ["#2c3320"] },
  { name: "Turchese", hex: "#2bb5b0", families: ["verdi", "blu"] },
  { name: "Azzurro", hex: "#8ec5ea", families: ["blu"] },
  { name: "Blu", hex: "#1f5fbf", families: ["blu"] },
  { name: "Blu navy", hex: "#1b2a4a", families: ["blu"], anchors: ["#121a2e", "#0e1320"] },
  { name: "Denim", hex: "#4a6a8f", families: ["blu"], anchors: ["#2e4460"] },
  { name: "Viola", hex: "#7e57c2", families: ["viola"], anchors: ["#3a2650"] },
  { name: "Lilla", hex: "#c3a6e0", families: ["viola"] },
];
