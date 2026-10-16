import Image from "next/image";
import { isOptimizableImage } from "@/domain/images";

/**
 * Immagine evento, a colori originali. Con `tone="duo"` in bicromia (nero + accento): resa
 * coerente fra poster eterogenei, ma poster pieni di testo diventano illeggibili.
 * Host noti → next/image ridimensionata.
 */
export function EventImage({
  src,
  sizes,
  className = "",
  priority = false,
  tone = "color",
}: {
  src: string;
  sizes: string;
  className?: string;
  priority?: boolean;
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
