import Link from "next/link";
import { Icon } from "./icons";

/** Riga «Info e colophon →» (fondo lista, foglio Filtri). */
export function InfoLink({ className = "", onClick }: { className?: string; onClick?: () => void }) {
  return (
    <Link
      href="/info"
      transitionTypes={["nav-forward"]}
      onClick={onClick}
      className={`press flex h-12 items-center justify-between border-y border-line text-xs font-semibold hover:bg-line-soft ${className}`}
    >
      Info e colophon
      <Icon name="right" />
    </Link>
  );
}
