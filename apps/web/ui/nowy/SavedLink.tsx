"use client";

import Link from "next/link";
import { useSaved } from "@/hooks/useSaved";
import { Icon } from "./icons";

export function SavedLink({ className = "" }: { className?: string }) {
  const saved = useSaved();
  return (
    <Link href="/salvati" transitionTypes={["nav-forward"]} className={className}>
      <Icon name="star" filled={saved.length > 0} />
      Salvati
      {saved.length > 0 && (
        <span className="bg-accent px-1 text-[10px] font-bold text-accent-fg tabular-nums">{saved.length}</span>
      )}
    </Link>
  );
}
