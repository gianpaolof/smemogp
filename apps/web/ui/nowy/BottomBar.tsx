import Link from "next/link";
import type { BottomBarVM } from "@/ui/contracts";
import { FiltersSheet } from "./FiltersSheet";
import { PendingBar } from "./PendingBar";
import { ThemeToggle } from "./ThemeToggle";

const cell = "relative flex h-14 items-center justify-center border-r border-line text-xs font-semibold last:border-r-0";

export function BottomBar({ vm }: { vm: BottomBarVM }) {
  return (
    <nav
      aria-label="Filtri rapidi"
      className="sticky bottom-0 z-20 grid grid-cols-4 border-t border-line bg-bg pb-[env(safe-area-inset-bottom)]"
    >
      {vm.quickCategories.map((c) => (
        <Link
          key={c.label}
          href={c.href}
          replace
          scroll={false}
          aria-pressed={c.active}
          className={`${cell} ${c.active ? "bg-fg text-bg" : "hover:bg-line-soft"}`}
        >
          {c.active && <span aria-hidden="true">✓&nbsp;</span>}
          {c.label}
          <PendingBar />
        </Link>
      ))}
      <FiltersSheet vm={vm.panel} className={`${cell} hover:bg-line-soft`} />
      <ThemeToggle className={`${cell} hover:bg-line-soft`} />
    </nav>
  );
}
