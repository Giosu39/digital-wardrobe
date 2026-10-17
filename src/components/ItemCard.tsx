import { Heart, Shirt } from "lucide-react";
import { colorName } from "../lib/colors";
import { imageUrl } from "../lib/images";
import type { Item } from "../lib/types";
import { Swatch } from "./Inputs";

export function ItemThumb({ item, className = "" }: { item: Item; className?: string }) {
  const url = imageUrl(item.image);
  return url ? (
    <img src={url} alt={item.name} draggable={false} className={`object-contain ${className}`} loading="lazy" />
  ) : (
    <div className={`flex items-center justify-center text-zinc-300 dark:text-zinc-700 ${className}`}>
      <Shirt className="size-1/3" strokeWidth={1.25} />
    </div>
  );
}

export function ItemCard({ item, onOpen, onToggleFavorite }: { item: Item; onOpen(): void; onToggleFavorite(): void }) {
  return (
    <div className="group card relative cursor-pointer overflow-hidden transition hover:-translate-y-0.5 hover:shadow-lg" onClick={onOpen}>
      <div className="aspect-[3/4] bg-gradient-to-b from-zinc-50 to-zinc-100 p-4 dark:from-zinc-800/60 dark:to-zinc-900">
        <ItemThumb item={item} className="size-full transition duration-300 group-hover:scale-[1.03]" />
      </div>
      <button
        className={`absolute top-2.5 right-2.5 flex size-8 items-center justify-center rounded-full bg-white/80 backdrop-blur transition dark:bg-zinc-900/80 ${
          item.favorite ? "text-rose-500" : "text-zinc-400 opacity-0 group-hover:opacity-100 hover:text-rose-500"
        }`}
        onClick={(e) => {
          e.stopPropagation();
          onToggleFavorite();
        }}
        aria-label="Preferito"
      >
        <Heart className={`size-4 ${item.favorite ? "fill-current" : ""}`} />
      </button>
      <div className="flex items-center gap-2 px-3.5 py-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{item.name}</p>
          <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
            {[item.subcategory || item.category, item.brand].filter(Boolean).join(" · ")}
          </p>
        </div>
        <div className="flex -space-x-1.5">
          {item.colors.slice(0, 3).map((c) => (
            <Swatch key={c} hex={c} size="size-4" title={colorName(c, item.colorNames)} />
          ))}
        </div>
      </div>
    </div>
  );
}
