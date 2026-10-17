import { appDataDir, join } from "@tauri-apps/api/path";
import { convertFileSrc } from "@tauri-apps/api/core";
import { BaseDirectory, exists, mkdir, readFile, remove, writeFile } from "@tauri-apps/plugin-fs";

// In sviluppo le foto vanno in una cartella separata, come il database (vedi db.ts).
const DIR = import.meta.env.DEV ? "images-dev" : "images";
const MAX_SIZE = 1400;

let imagesDir: string | null = null;

/** Da chiamare all'avvio: crea la cartella delle immagini e memorizza il percorso. */
export async function initImages() {
  if (!(await exists(DIR, { baseDir: BaseDirectory.AppData }))) {
    await mkdir(DIR, { baseDir: BaseDirectory.AppData, recursive: true });
  }
  imagesDir = await join(await appDataDir(), DIR);
}

export function imageUrl(file: string | null): string | null {
  if (!file || !imagesDir) return null;
  return convertFileSrc(`${imagesDir}\\${file}`);
}

/** Salva un'immagine (ridimensionata e in WebP, mantenendo la trasparenza). Restituisce il nome file. */
export async function saveImage(canvas: HTMLCanvasElement): Promise<string> {
  const scaled = downscale(canvas, MAX_SIZE);
  const blob = await new Promise<Blob>((resolve, reject) =>
    scaled.toBlob((b) => (b ? resolve(b) : reject(new Error("Conversione immagine fallita"))), "image/webp", 0.9),
  );
  const name = `${crypto.randomUUID()}.webp`;
  await writeFile(`${DIR}/${name}`, new Uint8Array(await blob.arrayBuffer()), { baseDir: BaseDirectory.AppData });
  return name;
}

/** Copia un'immagine salvata con un nuovo nome (es. duplicando un outfit, ognuno ha il suo file). */
export async function copyImage(file: string): Promise<string> {
  const bytes = await readFile(`${DIR}/${file}`, { baseDir: BaseDirectory.AppData });
  const name = `${crypto.randomUUID()}.webp`;
  await writeFile(`${DIR}/${name}`, bytes, { baseDir: BaseDirectory.AppData });
  return name;
}

export async function deleteImage(file: string | null) {
  if (!file) return;
  try {
    await remove(`${DIR}/${file}`, { baseDir: BaseDirectory.AppData });
  } catch {
    // il file potrebbe essere già stato rimosso
  }
}

/** Legge un'immagine salvata come Blob URL (utile per modificarla su canvas senza problemi di CORS). */
export async function loadImageBlobUrl(file: string): Promise<string> {
  const bytes = await readFile(`${DIR}/${file}`, { baseDir: BaseDirectory.AppData });
  return URL.createObjectURL(new Blob([bytes], { type: "image/webp" }));
}

export function loadHtmlImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Impossibile caricare l'immagine"));
    img.src = src;
  });
}

function downscale(canvas: HTMLCanvasElement, max: number): HTMLCanvasElement {
  const ratio = Math.min(1, max / Math.max(canvas.width, canvas.height));
  if (ratio === 1) return canvas;
  const out = document.createElement("canvas");
  out.width = Math.round(canvas.width * ratio);
  out.height = Math.round(canvas.height * ratio);
  const ctx = out.getContext("2d")!;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(canvas, 0, 0, out.width, out.height);
  return out;
}

/** Ritaglia il canvas al rettangolo dei pixel non trasparenti (dopo la rimozione sfondo). */
export function trimTransparent(canvas: HTMLCanvasElement, padding = 12): HTMLCanvasElement {
  const ctx = canvas.getContext("2d")!;
  const { width, height } = canvas;
  const data = ctx.getImageData(0, 0, width, height).data;
  let minX = width, minY = height, maxX = -1, maxY = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * 4 + 3] > 10) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0) return canvas;
  minX = Math.max(0, minX - padding);
  minY = Math.max(0, minY - padding);
  maxX = Math.min(width - 1, maxX + padding);
  maxY = Math.min(height - 1, maxY + padding);
  const out = document.createElement("canvas");
  out.width = maxX - minX + 1;
  out.height = maxY - minY + 1;
  out.getContext("2d")!.drawImage(canvas, minX, minY, out.width, out.height, 0, 0, out.width, out.height);
  return out;
}
