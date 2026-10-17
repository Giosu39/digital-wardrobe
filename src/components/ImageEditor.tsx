import { Cpu, Crop, Loader2, RotateCcw, RotateCw, Sparkles, Undo2, Zap } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import Cropper, { type Area } from "react-easy-crop";
import { removeBackground, type Device, type LoadProgress } from "../lib/bgRemoval";
import { loadHtmlImage, trimTransparent } from "../lib/images";
import { Modal } from "./Modal";
import { useToast } from "./Toast";

const ASPECTS = [
  { label: "3:4", value: 3 / 4 },
  { label: "1:1", value: 1 },
  { label: "4:3", value: 4 / 3 },
  { label: "Originale", value: 0 },
];

interface Props {
  src: string;
  onDone(canvas: HTMLCanvasElement): void;
  onCancel(): void;
}

/** Ritaglia e ruota l'immagine, restituendo un canvas. */
async function renderCrop(src: string, area: Area, rotation: number): Promise<HTMLCanvasElement> {
  const img = await loadHtmlImage(src);
  const rad = (rotation * Math.PI) / 180;
  const sin = Math.abs(Math.sin(rad));
  const cos = Math.abs(Math.cos(rad));
  const bw = img.width * cos + img.height * sin;
  const bh = img.width * sin + img.height * cos;

  const rotated = document.createElement("canvas");
  rotated.width = bw;
  rotated.height = bh;
  const rctx = rotated.getContext("2d")!;
  rctx.translate(bw / 2, bh / 2);
  rctx.rotate(rad);
  rctx.drawImage(img, -img.width / 2, -img.height / 2);

  const out = document.createElement("canvas");
  out.width = Math.round(area.width);
  out.height = Math.round(area.height);
  out.getContext("2d")!.drawImage(rotated, area.x, area.y, area.width, area.height, 0, 0, area.width, area.height);
  return out;
}

export function ImageEditor({ src, onDone, onCancel }: Props) {
  const toast = useToast();
  const [stage, setStage] = useState<"crop" | "result">("crop");
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [aspect, setAspect] = useState(3 / 4);
  const [naturalAspect, setNaturalAspect] = useState(1);
  const [area, setArea] = useState<Area | null>(null);

  const [cropped, setCropped] = useState<HTMLCanvasElement | null>(null);
  const [processed, setProcessed] = useState<HTMLCanvasElement | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<LoadProgress | null>(null);
  const [device, setDevice] = useState<Device | null>(null);

  const onCropComplete = useCallback((_: Area, px: Area) => setArea(px), []);

  const applyCrop = async () => {
    if (!area) return;
    const canvas = await renderCrop(src, area, rotation);
    setCropped(canvas);
    setProcessed(null);
    setStage("result");
  };

  const runRemoval = async () => {
    if (!cropped) return;
    setBusy(true);
    setProgress(null);
    try {
      const { canvas, device } = await removeBackground(cropped, setProgress);
      setProcessed(trimTransparent(canvas));
      setDevice(device);
    } catch (e) {
      console.error(e);
      toast("Rimozione sfondo non riuscita. Al primo utilizzo serve internet per scaricare il modello.", "error");
    } finally {
      setBusy(false);
      setProgress(null);
    }
  };

  const current = processed ?? cropped;
  const previewUrl = useMemo(() => current?.toDataURL(), [current]);
  const pct = progress ? Math.round((progress.loaded / progress.total) * 100) : null;

  return (
    <Modal
      open
      onClose={onCancel}
      dismissable={!busy}
      size="lg"
      title={stage === "crop" ? "Ritaglia la foto" : "Rifinisci la foto"}
      footer={
        stage === "crop" ? (
          <>
            <button className="btn-secondary" onClick={onCancel}>
              Annulla
            </button>
            <button className="btn-primary" onClick={applyCrop}>
              <Crop className="size-4" /> Applica ritaglio
            </button>
          </>
        ) : (
          <>
            <button className="btn-ghost mr-auto" onClick={() => setStage("crop")} disabled={busy}>
              <Crop className="size-4" /> Ritaglia di nuovo
            </button>
            <button className="btn-secondary" onClick={onCancel} disabled={busy}>
              Annulla
            </button>
            <button className="btn-primary" onClick={() => current && onDone(current)} disabled={busy}>
              Usa questa foto
            </button>
          </>
        )
      }
    >
      {stage === "crop" ? (
        <div>
          <div className="relative h-[52vh] bg-zinc-900">
            <Cropper
              image={src}
              crop={crop}
              zoom={zoom}
              rotation={rotation}
              aspect={aspect || naturalAspect}
              minZoom={0.5}
              restrictPosition={false}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onRotationChange={setRotation}
              onCropComplete={onCropComplete}
              onMediaLoaded={(m) => setNaturalAspect(m.naturalWidth / m.naturalHeight)}
            />
          </div>
          <div className="grid grid-cols-[auto_1fr_1fr] items-center gap-6 px-6 py-4">
            <div className="flex gap-1">
              {ASPECTS.map((a) => (
                <button key={a.label} className={aspect === a.value ? "chip-on" : "chip-off"} onClick={() => setAspect(a.value)}>
                  {a.label}
                </button>
              ))}
            </div>
            <label className="flex items-center gap-3 text-xs text-zinc-500">
              Zoom
              <input type="range" min={0.5} max={4} step={0.01} value={zoom} onChange={(e) => setZoom(+e.target.value)} className="flex-1 accent-accent-600" />
            </label>
            <div className="flex items-center gap-2 text-xs text-zinc-500">
              <button className="icon-btn" onClick={() => setRotation((r) => r - 90)} title="Ruota a sinistra">
                <RotateCcw className="size-4" />
              </button>
              <input type="range" min={-180} max={180} step={1} value={rotation} onChange={(e) => setRotation(+e.target.value)} className="flex-1 accent-accent-600" />
              <button className="icon-btn" onClick={() => setRotation((r) => r + 90)} title="Ruota a destra">
                <RotateCw className="size-4" />
              </button>
              <span className="w-10 text-right tabular-nums">{rotation}°</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-[1fr_280px]">
          <div className="checker relative flex h-[60vh] items-center justify-center p-6">
            {previewUrl && <img src={previewUrl}className="max-h-full max-w-full object-contain drop-shadow-lg" alt="Anteprima" />}
            {busy && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-white/70 backdrop-blur-sm dark:bg-zinc-950/70">
                <Loader2 className="size-8 animate-spin text-accent-500" />
                <p className="text-sm font-medium">
                  {pct !== null && pct < 100 ? `Download modello AI… ${pct}%` : "Rimozione sfondo in corso…"}
                </p>
                {pct !== null && pct < 100 && (
                  <div className="h-1.5 w-56 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
                    <div className="h-full bg-accent-500 transition-all" style={{ width: `${pct}%` }} />
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="space-y-4 border-l border-zinc-200 p-5 dark:border-zinc-800">
            <div>
              <h3 className="font-medium">Rimozione sfondo</h3>
              <p className="mt-1 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
                Un modello AI isola il capo dallo sfondo, tutto in locale sul tuo PC. Al primo utilizzo il modello viene scaricato una sola volta (puoi sceglierlo nelle Impostazioni).
              </p>
            </div>
            {processed ? (
              <button className="btn-secondary w-full" onClick={() => setProcessed(null)} disabled={busy}>
                <Undo2 className="size-4" /> Ripristina sfondo
              </button>
            ) : (
              <button className="btn-primary w-full" onClick={runRemoval} disabled={busy}>
                <Sparkles className="size-4" /> Rimuovi sfondo
              </button>
            )}
            {device && (
              <p className="flex items-center gap-1.5 text-xs text-zinc-500">
                {device === "webgpu" ? <Zap className="size-3.5 text-amber-500" /> : <Cpu className="size-3.5" />}
                Elaborato con {device === "webgpu" ? "GPU (WebGPU)" : "CPU"}
              </p>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}
