import Image from "next/image";
import { isOptimizableImage } from "@/domain/images";

/**
 * Immagine evento in bicromia (nero + accento): poster eterogenei delle fonti diventano un
 * sistema coerente e la bassa risoluzione si nota meno. Host noti → next/image ridimensionata.
 */
export function EventImage({
  src,
  sizes,
  className = "",
  priority = false,
  tone = "duo",
}: {
  src: string;
  sizes: string;
  className?: string;
  priority?: boolean;
  /** "color" nel dettaglio, dove l'immagine è grande */
  tone?: "duo" | "color";
}) {
  const img = tone === "duo" ? "duotone-img" : "";
  return (
    <div className={`relative overflow-hidden ${tone === "duo" ? "duotone" : "bg-line-soft"} ${className}`}>
      {isOptimizableImage(src) ? (
        <Image src={src} alt="" fill sizes={sizes} priority={priority} className={`object-cover ${img}`} />
      ) : (
        // Host non in allow-list: immagine originale, senza ottimizzazione
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt=""
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          className={`absolute inset-0 size-full object-cover ${img}`}
        />
      )}
    </div>
  );
}
