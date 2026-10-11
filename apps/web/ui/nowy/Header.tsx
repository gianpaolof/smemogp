import Link from "next/link";
import type { ReactNode } from "react";
import type { HeaderVM } from "@/ui/contracts";
import { PendingBar } from "./PendingBar";

const cell = "relative flex h-12 items-center px-3 text-xs font-semibold";

export function Header({ vm, count }: { vm: HeaderVM; count?: ReactNode }) {
  return (
    <header className="sticky top-0 z-20 bg-bg">
      <nav aria-label="Periodo" className="grid grid-cols-4 border-b border-line">
        {vm.periods.map((p) => (
          <Link
            key={p.label}
            href={p.href}
            replace
            scroll={false}
            aria-current={p.active ? "page" : undefined}
            className={`${cell} border-r border-line ${p.active ? "bg-fg text-bg" : "hover:bg-line-soft"}`}
          >
            {p.label}
            <PendingBar />
          </Link>
        ))}
        <Link
          href={vm.viewSwitch.href}
          transitionTypes={[vm.viewSwitch.direction]}
          className={`${cell} hover:bg-line-soft`}
        >
          {vm.viewSwitch.label}
          <PendingBar />
        </Link>
      </nav>
      <div className="flex items-baseline justify-between border-b border-line px-3 py-2.5 text-xs font-semibold">
        <span>{vm.scopeLabel}</span>
        <span className="tabular-nums">{count}</span>
      </div>
    </header>
  );
}
