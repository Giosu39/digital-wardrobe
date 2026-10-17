import { imageUrl } from "../lib/images";
import type { Item, OutfitPiece } from "../lib/types";
import { ItemThumb } from "./ItemCard";

/** Rendering in sola lettura di un outfit (pezzi posizionati in percentuale). */
export function OutfitPreview({ pieces, items, className = "" }: { pieces: OutfitPiece[]; items: Map<string, Item>; className?: string }) {
  return (
    <div className={`relative aspect-[3/4] overflow-hidden ${className}`}>
      {[...pieces]
        .sort((a, b) => a.z - b.z)
        .map((p) => {
          const item = items.get(p.itemId);
          if (!item) return null;
          const url = imageUrl(item.image);
          return (
            <div key={p.itemId} className="absolute" style={{ left: `${p.x}%`, top: `${p.y}%`, width: `${p.w}%` }}>
              {url ? (
                <img src={url} alt={item.name} draggable={false} className="block h-auto w-full drop-shadow-md" />
              ) : (
                <ItemThumb item={item} className="aspect-square w-full" />
              )}
            </div>
          );
        })}
    </div>
  );
}
