"use client";

import { useFilterNavigation } from "@/hooks/useFilterNavigation";
import type { HeaderVM } from "@/ui/contracts";
import { Icon } from "./icons";

/** Ricerca testuale: si applica con Invio (tasto «Cerca» su mobile), si azzera svuotando il campo. */
export function SearchBox({ vm }: { vm: HeaderVM["search"] }) {
  const { pending, setQuery } = useFilterNavigation(vm.path, vm.query);
  return (
    <form
      role="search"
      className="relative flex h-10 items-center gap-2 border-b border-line px-3"
      onSubmit={(e) => {
        e.preventDefault();
        setQuery(String(new FormData(e.currentTarget).get("q") ?? ""));
        e.currentTarget.querySelector("input")?.blur();
      }}
    >
      <Icon name="search" className="shrink-0 text-sm" />
      <input
        // key: se q cambia da fuori (link, reset) il campo riparte dal valore dell'URL
        key={vm.q}
        name="q"
        type="search"
        defaultValue={vm.q}
        placeholder="Cerca: jazz, Regio, Lingotto…"
        aria-label="Cerca eventi"
        enterKeyHint="search"
        autoComplete="off"
        maxLength={80}
        className="h-full min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted"
        onChange={(e) => {
          if (e.target.value === "") setQuery("");
        }}
      />
      <span
        aria-hidden="true"
        className={`absolute inset-x-0 bottom-0 h-0.5 origin-left bg-accent transition-transform duration-500 ${
          pending ? "scale-x-100" : "scale-x-0"
        }`}
      />
    </form>
  );
}
