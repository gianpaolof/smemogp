import { ViewTransition, type ReactNode } from "react";

/**
 * Contenitore pagina: slide direzionale tra lista e mappa (Link con transitionTypes).
 * Mobile: una colonna. Desktop: con `aside` la colonna è affiancata (lista a sinistra, mappa a destra);
 * con `wide` occupa tutta la larghezza (mappa); altrimenti resta una colonna centrata.
 */
export function Screen({ children, aside, wide }: { children: ReactNode; aside?: ReactNode; wide?: boolean }) {
  return (
    <ViewTransition
      enter={{ "nav-forward": "nav-forward", "nav-back": "nav-back", default: "none" }}
      exit={{ "nav-forward": "nav-forward", "nav-back": "nav-back", default: "none" }}
      default="none"
    >
      <div
        className={`mx-auto w-full max-w-3xl md:border-x md:border-line ${
          aside ? "lg:grid lg:max-w-none lg:grid-cols-[480px_minmax(0,1fr)] lg:border-x-0" : wide ? "lg:max-w-none lg:border-x-0" : ""
        }`}
      >
        <div className={`flex min-h-dvh min-w-0 flex-col ${aside ? "lg:border-r lg:border-line" : ""}`}>{children}</div>
        {aside && (
          // isolate: gli z-index di Leaflet restano qui dentro, sotto il pannello dettaglio
          <aside aria-label="Mappa" className="relative isolate sticky top-0 hidden h-dvh lg:block">
            <div className="absolute inset-0">{aside}</div>
          </aside>
        )}
      </div>
    </ViewTransition>
  );
}
