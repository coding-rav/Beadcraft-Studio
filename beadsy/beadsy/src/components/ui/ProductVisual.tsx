import Image from "next/image";
import type { VisualDTO } from "@/lib/types";
import { BeadArt } from "@/components/art/BeadArt";

/** Renders a real photo when the product has one, otherwise the generated bead artwork. */
export function ProductVisual({
  visual,
  sizes = "(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw",
  priority = false,
  className = "",
}: {
  visual: VisualDTO;
  sizes?: string;
  priority?: boolean;
  className?: string;
}) {
  if (visual.url) {
    return <Image src={visual.url} alt={visual.alt} fill sizes={sizes} priority={priority} className={`object-cover ${className}`} />;
  }
  return <BeadArt kind={visual.kind} palette={visual.palette} seed={visual.seed} label={visual.alt} className={className} />;
}
