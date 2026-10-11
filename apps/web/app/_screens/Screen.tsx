import { ViewTransition, type ReactNode } from "react";

/** Contenitore pagina: slide direzionale tra lista e mappa (Link con transitionTypes). */
export function Screen({ children }: { children: ReactNode }) {
  return (
    <ViewTransition
      enter={{ "nav-forward": "nav-forward", "nav-back": "nav-back", default: "none" }}
      exit={{ "nav-forward": "nav-forward", "nav-back": "nav-back", default: "none" }}
      default="none"
    >
      {/* Mobile-first: su desktop una colonna centrata, come un programma di sala */}
      <div className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col md:border-x md:border-line">{children}</div>
    </ViewTransition>
  );
}
