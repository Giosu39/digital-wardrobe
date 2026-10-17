export type Season = "primavera" | "estate" | "autunno" | "inverno";

export interface Item {
  id: string;
  name: string;
  category: string;
  subcategory: string | null;
  /** Colori in formato esadecimale (#rrggbb), il primo è il principale. */
  colors: string[];
  /** Correzioni manuali del nome di un colore: { "#hex": "Blu navy" }. Senza voce il nome è automatico. */
  colorNames: Record<string, string>;
  brand: string | null;
  size: string | null;
  material: string | null;
  seasons: Season[];
  occasions: string[];
  tags: string[];
  price: number | null;
  purchaseDate: string | null;
  notes: string | null;
  favorite: boolean;
  /** Nome del file immagine dentro la cartella images dell'app. */
  image: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Sfumatura di colore creata dall'utente (si aggiunge a quelle predefinite della palette). */
export interface CustomShade {
  id: string;
  name: string;
  /** Colore di riferimento: serve sia per il pallino sia per il riconoscimento automatico. */
  hex: string;
  family: string;
}

export type ItemDraft = Omit<Item, "id" | "createdAt" | "updatedAt">;

export interface OutfitPiece {
  itemId: string;
  /** Posizione e larghezza in percentuale della tela (0-100). */
  x: number;
  y: number;
  w: number;
  z: number;
}

export interface Outfit {
  id: string;
  name: string;
  occasions: string[];
  seasons: Season[];
  notes: string | null;
  favorite: boolean;
  pieces: OutfitPiece[];
  /** Foto facoltativa dell'intero outfit (nome file nella cartella images). La composizione resta obbligatoria. */
  image: string | null;
  createdAt: string;
  updatedAt: string;
}

export type OutfitDraft = Omit<Outfit, "id" | "createdAt" | "updatedAt">;
