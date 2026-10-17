import Link from "next/link";
import type { ReactNode } from "react";
import type { BottomBarVM } from "@/ui/contracts";
import { FiltersSheet } from "./FiltersSheet";
import { CategoryGlyph } from "./glyphs";
import { Icon } from "./icons";
import { PendingBar } from "./PendingBar";
import { SavedLink } from "./SavedLink";

const cell =
  "press relative flex h-14 items-center justify-center gap-1.5 border-r border-line text-xs font-semibold last:border-r-0";

export function BottomBar({ vm, count }: { vm: BottomBarVM; count?: ReactNode }) {
  return (
    <nav
      aria-label="Filtri rapidi"
      className="sticky bottom-0 z-20 grid grid-cols-4 border-t border-line bg-bg pb-[env(safe-area-inset-bottom)] [view-transition-name:app-tabbar]"
    >
      {vm.quickCategories.map((c) => (
        <Link
          key={c.label}
          href={c.href}
          replace
          scroll={false}
          aria-current={c.active ? "true" : undefined}
          className={`${cell} ${c.active ? "bg-fg text-bg" : "hover:bg-line-soft"}`}
        >
          {c.active ? <Icon name="check" /> : <CategoryGlyph category={c.category} />}
          {c.label}
          <PendingBar />
        </Link>
      ))}
      <FiltersSheet vm={vm.panel} count={count} className={`${cell} hover:bg-line-soft`} />
      <SavedLink className={`${cell} hover:bg-line-soft`} />
    </nav>
  );
}
