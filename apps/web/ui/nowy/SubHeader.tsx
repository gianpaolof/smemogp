import Link from "next/link";
import type { ReactNode } from "react";
import { Icon } from "./icons";

/** Testata delle pagine secondarie (Salvati, Colophon): titolo e ritorno all'agenda. */
export function SubHeader({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <header className="sticky top-0 z-20 flex items-center justify-between border-b border-line bg-bg pt-[env(safe-area-inset-top)] [view-transition-name:app-header]">
      <div>
        <h1 className="display-title px-3 py-2 text-3xl">{title}</h1>
        {children}
      </div>
      <Link
        href="/"
        transitionTypes={["nav-back"]}
        className="press flex h-12 items-center gap-1.5 border-l border-line px-4 text-xs font-semibold hover:bg-line-soft"
      >
        <Icon name="left" />
        Eventi
      </Link>
    </header>
  );
}
