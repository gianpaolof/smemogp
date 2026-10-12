import Link from "next/link";
import type { EventDetailVM } from "@/ui/contracts";
import { EventActions } from "./EventActions";
import { EventImage } from "./EventImage";
import { Icon } from "./icons";

export function EventDetail({ vm }: { vm: EventDetailVM }) {
  return (
    <article className="@container flex flex-1 flex-col">
      {vm.imageUrl && (
        <EventImage
          src={vm.imageUrl}
          sizes="(min-width: 640px) 448px, 100vw"
          priority
          tone="color"
          className="aspect-video w-full border-b border-line"
        />
      )}

      {/* Titolo a tutta larghezza, data in una fascia sotto: niente colonna che stringe i titoli lunghi */}
      <div className="flex flex-col gap-2 border-b border-line px-3 py-3">
        <span className="text-xs font-semibold">
          {vm.statusLabel && (
            <span className="mr-1.5 bg-fg px-1 py-px text-[10px] font-bold tracking-wide text-bg uppercase">{vm.statusLabel}</span>
          )}
          {vm.categoryLabel}
        </span>
        <h1
          id="event-title"
          className={`display-title break-words hyphens-auto ${
            vm.longTitle ? "text-[clamp(1.5rem,7cqi,2.25rem)]" : "text-[clamp(2rem,10cqi,3rem)]"
          }`}
        >
          {vm.title}
        </h1>
      </div>

      <div className="grid grid-cols-[88px_minmax(0,1fr)] border-b border-line">
        <div className="flex flex-col border-r border-line px-3 py-2.5">
          <span className="display-num text-[64px]">{vm.dayNum}</span>
          <span className="pt-1 text-[11px] font-semibold text-muted">{vm.dayLabel}</span>
        </div>
        <div className="flex flex-col justify-center gap-0.5 px-3 py-2.5 text-sm">
          <span className="first-letter:uppercase">{vm.dateLabel}</span>
          <span className="font-semibold tabular-nums">{vm.timeLabel}</span>
        </div>
      </div>

      <EventActions id={vm.id} title={vm.title} shareText={vm.shareText} icsHref={vm.icsHref} />

      <dl className="grid grid-cols-[88px_minmax(0,1fr)] text-sm [&>dd]:border-b [&>dd]:border-line [&>dd]:px-3 [&>dd]:py-2.5 [&>dt]:border-r [&>dt]:border-b [&>dt]:border-line [&>dt]:px-3 [&>dt]:py-2.5 [&>dt]:text-xs [&>dt]:font-semibold [&>dt]:text-muted">
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

      {/* mt-auto + article flex-1: la barra sta in fondo anche nella pagina intera */}
      <div
        className={`sticky bottom-0 mt-auto grid border-t border-line bg-bg pb-[env(safe-area-inset-bottom)] ${
          vm.external ? "grid-cols-2" : "grid-cols-1"
        }`}
      >
        <Link
          href={vm.mapHref}
          transitionTypes={["nav-forward"]}
          className="press flex h-14 items-center justify-center gap-2 border-r border-line text-sm font-semibold last:border-r-0 hover:bg-line-soft"
        >
          <Icon name="map" />
          Sulla mappa
        </Link>
        {vm.external && (
          <a
            href={vm.external.href}
            target="_blank"
            rel="noopener noreferrer"
            title={`Apri su ${vm.external.host} (nuova scheda)`}
            className="press flex h-14 items-center justify-center gap-2 bg-fg text-sm font-semibold text-bg"
          >
            Sito evento
            <Icon name="external" />
          </a>
        )}
      </div>
    </article>
  );
}
