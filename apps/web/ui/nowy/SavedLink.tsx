"use client";

import Link from "next/link";
import { useUpcomingCount } from "@/hooks/useSaved";
import { Icon } from "./icons";

/** Badge: solo i salvati ancora da venire (null sul server → nascosto, niente mismatch) */
export function SavedLink({ className = "" }: { className?: string }) {
  const count = useUpcomingCount();
  const n = count ?? 0;
  return (
    <Link href="/salvati" transitionTypes={["nav-forward"]} aria-label={n > 0 ? `Salvati, ${n}` : "Salvati"} className={className}>
      <Icon name="star" filled={n > 0} />
      Salvati
      {n > 0 && (
        <span aria-hidden className="bg-accent px-1 text-[10px] font-bold text-accent-fg tabular-nums">
          {n}
        </span>
      )}
    </Link>
  );
}
