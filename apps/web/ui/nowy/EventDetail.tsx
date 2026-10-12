import Link from "next/link";
import type { EventDetailVM } from "@/ui/contracts";

export function EventDetail({ vm }: { vm: EventDetailVM }) {
  return (
    <article className="flex flex-col">
      {vm.imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={vm.imageUrl} alt="" className="aspect-video w-full border-b border-line object-cover" />
      )}

      <div className="grid grid-cols-[88px_minmax(0,1fr)] border-b border-line sm:grid-cols-[112px_minmax(0,1fr)]">
        <div className="flex flex-col border-r border-line px-3 py-3">
          <span className="display-num text-[80px] sm:text-[96px]">{vm.dayNum}</span>
          <span className="pt-1.5 text-xs font-semibold text-muted">{vm.dayLabel}</span>
        </div>
        <div className="flex flex-col gap-2 px-3 py-3">
          <span className="text-xs font-semibold">{vm.categoryLabel}</span>
          <h1 id="event-title" className="display-title text-4xl sm:text-5xl">
            {vm.title}
          </h1>
        </div>
      </div>

      <dl className="grid grid-cols-[88px_minmax(0,1fr)] text-sm sm:grid-cols-[112px_minmax(0,1fr)] [&>dd]:border-b [&>dd]:border-line [&>dd]:px-3 [&>dd]:py-2.5 [&>dt]:border-r [&>dt]:border-b [&>dt]:border-line [&>dt]:px-3 [&>dt]:py-2.5 [&>dt]:text-xs [&>dt]:font-semibold [&>dt]:text-muted">
        <dt>Quando</dt>
        <dd>
          <span className="first-letter:uppercase">{vm.dateLabel}</span>
          <br />
          <span className="font-semibold tabular-nums">{vm.timeLabel}</span>
        </dd>
        {(vm.venue || vm.address) && (
          <>
            <dt>Dove</dt>
            <dd>
              {vm.venue && <span className="font-semibold">{vm.venue}</span>}
              {vm.venue && vm.address && <br />}
              {vm.address}
              {vm.distanceLabel && <span className="block text-xs text-muted">{vm.distanceLabel}</span>}
            </dd>
          </>
        )}
        {vm.priceLabel && (
          <>
            <dt>Prezzo</dt>
            <dd>{vm.priceLabel}</dd>
          </>
        )}
      </dl>

      {vm.description && (
        <p className="border-b border-line px-3 py-4 text-[15px] leading-relaxed whitespace-pre-line">{vm.description}</p>
      )}

      <p className="px-3 py-3 text-xs text-muted">
        Fonte: {vm.sourceLabel} · {vm.updatedLabel}
      </p>

      <div
        className={`sticky bottom-0 mt-auto grid border-t border-line bg-bg pb-[env(safe-area-inset-bottom)] ${
          vm.external ? "grid-cols-2" : "grid-cols-1"
        }`}
      >
        <Link
          href={vm.mapHref}
          transitionTypes={["nav-forward"]}
          className="flex h-14 items-center justify-center border-r border-line text-sm font-semibold last:border-r-0 hover:bg-line-soft"
        >
          Mostra sulla mappa
        </Link>
        {vm.external && (
          <a
            href={vm.external.href}
            target="_blank"
            rel="noopener noreferrer"
            title={`Apri su ${vm.external.host} (nuova scheda)`}
            className="flex h-14 items-center justify-center bg-fg text-sm font-semibold text-bg"
          >
            Sito evento ↗
          </a>
        )}
      </div>
    </article>
  );
}
