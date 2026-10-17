// Rimozione dello sfondo con un modello AI eseguito in locale.
// Usa la GPU tramite WebGPU quando disponibile, altrimenti la CPU (WebAssembly).
// Il modello viene scaricato da Hugging Face solo al primo utilizzo e poi resta in cache:
// dalle volte successive funziona offline.

// File WebAssembly di ONNX Runtime inclusi nell'app (altrimenti verrebbero scaricati da CDN).
// La versione di onnxruntime-web in package.json deve coincidere con quella richiesta da transformers.
import ortWasmUrl from "onnxruntime-web/ort-wasm-simd-threaded.asyncify.wasm?url";
import ortMjsUrl from "onnxruntime-web/ort-wasm-simd-threaded.asyncify.mjs?url";

// gpuDtype/cpuDtype: precisione dei pesi usata su GPU e su CPU.
// modelType: forza il tipo di architettura quando il config.json del modello non è riconosciuto.
// Testati su WebView2 + RTX 4070 Super (ottobre 2026). BiRefNet e BEN2 NON funzionano:
// superano il limite WebGPU di 16 storage buffer per shader o la memoria WASM.
export const BG_MODELS: { id: string; label: string; gpuDtype: "fp16" | "fp32"; cpuDtype: "fp32"; modelType?: string }[] = [
  { id: "briaai/RMBG-1.4", label: "RMBG 1.4 — consigliato, bordi puliti (~90 MB)", gpuDtype: "fp16", cpuDtype: "fp32", modelType: "isnet" },
  { id: "onnx-community/ISNet-ONNX", label: "ISNet — alternativa generica (~90 MB)", gpuDtype: "fp16", cpuDtype: "fp32" },
  { id: "Xenova/modnet", label: "MODNet — leggerissimo, pensato per persone (~13 MB)", gpuDtype: "fp16", cpuDtype: "fp32" },
];

export type Device = "webgpu" | "wasm";

export interface LoadProgress {
  file: string;
  loaded: number;
  total: number;
}

type Segmenter = (input: string) => Promise<{ toCanvas(): HTMLCanvasElement | OffscreenCanvas }>;

let cache: { model: string; device: Device; segmenter: Segmenter } | null = null;
let loading: Promise<{ device: Device; segmenter: Segmenter }> | null = null;

export function getBgModel(): string {
  let id: string | null = null;
  try {
    id = localStorage.getItem("bgModel");
  } catch {
    // ignorato
  }
  return BG_MODELS.some((m) => m.id === id) ? id! : BG_MODELS[0].id;
}

export function setBgModel(id: string) {
  try {
    localStorage.setItem("bgModel", id);
  } catch {
    // ignorato
  }
  cache = null;
}

async function load(model: string, devices: Device[], onProgress?: (p: LoadProgress) => void) {
  const { pipeline, env } = await import("@huggingface/transformers");
  env.allowLocalModels = false;
  env.useBrowserCache = true;
  if (env.backends.onnx.wasm) env.backends.onnx.wasm.wasmPaths = { wasm: ortWasmUrl, mjs: ortMjsUrl };

  const progress_callback = (p: { status: string; file?: string; loaded?: number; total?: number }) => {
    if (p.status === "progress" && p.file && p.total) {
      onProgress?.({ file: p.file, loaded: p.loaded ?? 0, total: p.total });
    }
  };

  const info = BG_MODELS.find((m) => m.id === model) ?? BG_MODELS[0];
  let lastError: unknown;
  for (const device of devices) {
    try {
      const segmenter = (await pipeline("background-removal", model, {
        device,
        dtype: device === "webgpu" ? info.gpuDtype : info.cpuDtype,
        ...(info.modelType ? { config: { model_type: info.modelType } as never } : {}),
        progress_callback,
      })) as unknown as Segmenter;
      return { device, segmenter };
    } catch (e) {
      console.warn(`Rimozione sfondo: dispositivo ${device} non disponibile`, e);
      lastError = e;
    }
  }
  throw lastError;
}

/**
 * Rimuove lo sfondo dall'immagine passata e restituisce un nuovo canvas con trasparenza.
 */
export async function removeBackground(
  source: HTMLCanvasElement,
  onProgress?: (p: LoadProgress) => void,
): Promise<{ canvas: HTMLCanvasElement; device: Device }> {
  const model = getBgModel();
  const url = source.toDataURL("image/png");

  const ensure = async (devices: Device[]) => {
    if (cache && cache.model === model && devices.includes(cache.device)) return cache;
    loading ??= load(model, devices, onProgress);
    try {
      const { device, segmenter } = await loading;
      return (cache = { model, device, segmenter });
    } finally {
      loading = null;
    }
  };

  let current = await ensure("gpu" in navigator ? ["webgpu", "wasm"] : ["wasm"]);
  let result;
  try {
    result = await current.segmenter(url);
  } catch (e) {
    // Alcuni modelli si caricano su GPU ma falliscono in esecuzione: riproviamo su CPU.
    if (current.device !== "webgpu") throw e;
    console.warn("Esecuzione su GPU fallita, riprovo su CPU", e);
    cache = null;
    current = await ensure(["wasm"]);
    result = await current.segmenter(url);
  }
  const out = result.toCanvas();

  const canvas = document.createElement("canvas");
  canvas.width = source.width;
  canvas.height = source.height;
  canvas.getContext("2d")!.drawImage(out as CanvasImageSource, 0, 0, canvas.width, canvas.height);
  return { canvas, device: current.device };
}
