import type { Category } from "@/domain/types";

/**
 * Glifi di categoria: sagome piene su griglia 16, angoli vivi, colore dal testo. Pensati per 12 px
 * (dentro i marker) e 16 px (lista). evenodd: i fori (occhi della maschera, cornice) sono sottotracciati.
 */
const GLYPHS: Record<Category, string> = {
  musica: "M7.4 1.5h1.8v1.2L14 5.6v2.8L9.2 5.6V12c0 1.9-1.6 3-3.4 3S2 14.1 2 12.6s1.6-2.7 3.4-2.7c.8 0 1.5.2 2 .5z",
  teatro:
    "M2 1.5h12v6.5c0 3.9-2.7 6.5-6 6.5S2 11.9 2 8zM4.3 5h2.6v1.9H4.3zm4.8 0h2.6v1.9H9.1zM4.9 9.3h6.2c0 1.8-1.3 3-3.1 3s-3.1-1.2-3.1-3z",
  mostre: "M1 1.5h14v13H1zm2.2 2.2v8.6h9.6V3.7zM5.2 5.8h5.6v4.4H5.2z",
  cinema: "M1.5 7.2h13v7.3h-13zM1.5 3.2h13v2.8h-13zM4.2 3.2h2.1L4.6 6H2.5zm4 0h2.1L8.6 6H6.5zm4 0h2.1L12.6 6h-2.1z",
  food: "M2 1.5h1.3v4.6h.9V1.5h1.4v4.6h.9V1.5h1.3v5.6c0 1.2-.8 2-1.9 2.2v5.2H3.9V9.3C2.8 9.1 2 8.3 2 7.1zM10.2 1.5c2.4 0 3.6 2.6 3.6 6.3v1.1h-1.5v5.6h-2.1z",
  outdoor: "M.5 14.5 5.6 3.5l2.9 6 2.2-3.5 4.8 8.5z",
  famiglie:
    "M8 .8c2.9 0 4.9 2.3 4.9 5.1 0 3-2.3 5.3-4.9 5.8-2.6-.5-4.9-2.8-4.9-5.8C3.1 3.1 5.1.8 8 .8zM6.9 11.7h2.2l.5 1.2H6.4zM7.6 12.9h.8v2.6h-.8z",
  altro: "M1 6.5h3.2v3.2H1zm5.4 0h3.2v3.2H6.4zm5.4 0H15v3.2h-3.2z",
};

export function CategoryGlyph({ category, className }: { category: Category; className?: string }) {
  return (
    <svg viewBox="0 0 16 16" width="1em" height="1em" className={className} aria-hidden="true" focusable="false">
      <path d={GLYPHS[category]} fill="currentColor" fillRule="evenodd" />
    </svg>
  );
}

/** Stesso glifo come markup, per i divIcon di Leaflet (HTML, non React). */
export const glyphMarkup = (category: Category) =>
  `<svg class="nowy-glyph" viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path d="${GLYPHS[category]}" fill="currentColor" fill-rule="evenodd"/></svg>`;
