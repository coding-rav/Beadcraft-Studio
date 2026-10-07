"use client";

import { useState } from "react";
import type { VisualDTO } from "@/lib/types";
import { Icon } from "@/components/ui/Icon";
import { ProductVisual } from "@/components/ui/ProductVisual";

/** Image gallery with thumbnails and hover/tap zoom. Falls back to bead artwork when there are no photos. */
export function Gallery({ images, name }: { images: VisualDTO[]; name: string }) {
  const [index, setIndex] = useState(0);
  const [zoom, setZoom] = useState(false);
  const [origin, setOrigin] = useState("50% 50%");
  const current = images[index] ?? images[0]!;

  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    setOrigin(`${((e.clientX - r.left) / r.width) * 100}% ${((e.clientY - r.top) / r.height) * 100}%`);
  };

  const step = (d: number) => setIndex((i) => (i + d + images.length) % images.length);

  return (
    <div className="flex flex-col gap-3 lg:flex-row-reverse" onKeyDown={(e) => { if (e.key === "ArrowRight") step(1); if (e.key === "ArrowLeft") step(-1); }}>
      <div className="relative min-w-0 flex-1">
        <div
          className={`relative aspect-square overflow-hidden rounded-3xl border border-plum-100 bg-plum-50 ${zoom ? "cursor-zoom-out" : "cursor-zoom-in"}`}
          onMouseMove={zoom ? onMove : undefined}
          onMouseLeave={() => setZoom(false)}
          onClick={() => setZoom((z) => !z)}
        >
          <div className="absolute inset-0 transition-transform duration-300 ease-out" style={{ transform: zoom ? "scale(2)" : "scale(1)", transformOrigin: origin }}>
            <ProductVisual visual={current} sizes="(max-width: 1024px) 100vw, 600px" priority />
          </div>
          <span className="pointer-events-none absolute right-3 bottom-3 inline-flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1.5 text-xs font-bold text-plum-800 shadow-soft">
            <Icon name="zoom" size={14} /> {zoom ? "Click to zoom out" : "Click to zoom"}
          </span>
        </div>

        {images.length > 1 && (
          <>
            <button type="button" aria-label="Previous image" onClick={() => step(-1)} className="icon-btn absolute top-1/2 left-2 -translate-y-1/2 bg-white/90 shadow-soft">
              <Icon name="chevronLeft" size={22} />
            </button>
            <button type="button" aria-label="Next image" onClick={() => step(1)} className="icon-btn absolute top-1/2 right-2 -translate-y-1/2 bg-white/90 shadow-soft">
              <Icon name="chevronRight" size={22} />
            </button>
          </>
        )}
      </div>

      {images.length > 1 && (
        <ul className="flex gap-2.5 overflow-x-auto pb-1 lg:w-20 lg:flex-col lg:overflow-visible" aria-label="Product images">
          {images.map((img, i) => (
            <li key={i} className="shrink-0">
              <button
                type="button"
                onClick={() => setIndex(i)}
                aria-label={`Show image ${i + 1} of ${images.length}`}
                aria-current={i === index}
                className={`relative block size-16 overflow-hidden rounded-xl border-2 transition lg:size-20 ${i === index ? "border-plum-700" : "border-plum-100 opacity-80 hover:opacity-100"}`}
              >
                <ProductVisual visual={img} sizes="80px" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <p className="sr-only">{name}: image {index + 1} of {images.length}</p>
    </div>
  );
}
