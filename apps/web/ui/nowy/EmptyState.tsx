import Link from "next/link";
import type { EmptyVM } from "@/ui/contracts";
import { Icon } from "./icons";

export function EmptyState({ vm }: { vm: EmptyVM }) {
  return (
    <section className="flex flex-col gap-4 px-3 py-10" role="status">
      <h2 className="display-title text-5xl">{vm.title}</h2>
      <p className="text-sm text-muted">{vm.message}</p>
      <div className="flex flex-col border-t border-line">
        {vm.actions.map((a) => (
          <Link
            key={a.href}
            href={a.href}
            replace
            scroll={false}
            className="press flex h-12 items-center justify-between border-b border-line text-sm font-semibold hover:bg-line-soft"
          >
            {a.label}
            <Icon name="right" />
          </Link>
        ))}
      </div>
    </section>
  );
}
