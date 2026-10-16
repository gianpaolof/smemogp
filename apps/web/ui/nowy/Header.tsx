import Link from "next/link";
import type { ReactNode } from "react";
import type { HeaderVM } from "@/ui/contracts";
import { Icon } from "./icons";
import { PendingBar } from "./PendingBar";

const cell = "press relative flex h-12 items-center justify-center px-1 text-xs font-semibold";

export function Header({ vm, count }: { vm: HeaderVM; count?: ReactNode }) {
  return (
    // Nome fisso: resta fermo durante lo slide lista ↔ mappa (vedi globals.css)
    <header className="sticky top-0 z-20 bg-bg pt-[env(safe-area-inset-top)] [view-transition-name:app-header]">
      <h1 className="sr-only">Eventi Torino</h1>
      <nav aria-label="Periodo" className="grid grid-cols-5 border-b border-line">
        {vm.periods.map((p) => (
          <Link
            key={p.label}
            href={p.href}
            replace
            scroll={false}
            aria-current={p.active ? "true" : undefined}
            className={`${cell} border-r border-line ${p.active ? "bg-fg text-bg" : "hover:bg-line-soft"}`}
          >
            {p.label}
            <PendingBar />
          </Link>
        ))}
        <Link
          href={vm.viewSwitch.href}
          transitionTypes={[vm.viewSwitch.direction]}
          className={`${cell} gap-1.5 hover:bg-line-soft`}
        >
          <Icon name={vm.viewSwitch.icon} className="text-sm" />
          {vm.viewSwitch.label}
          <PendingBar />
        </Link>
      </nav>
      <div className="flex h-[38px] items-center justify-between border-b border-line px-3 text-xs font-semibold">
        <span>{vm.scopeLabel}</span>
        <span className="flex items-center gap-2">
          <span className="tabular-nums" aria-live="polite">
            {count}
          </span>
          <Link
            href="/info"
            transitionTypes={["nav-forward"]}
            aria-label="Info e colophon"
            // Area di tocco 38px (altezza della riga), cerchio visibile più piccolo
            className="press -mr-3 flex h-[38px] w-[38px] items-center justify-center"
          >
            <span className="flex size-[18px] items-center justify-center rounded-full border border-current font-serif text-[11px] leading-none italic">
              i
            </span>
          </Link>
        </span>
      </div>
    </header>
  );
}
