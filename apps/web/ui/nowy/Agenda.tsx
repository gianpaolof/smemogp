import Link from "next/link";
import { ViewTransition } from "react";
import type { AgendaVM, EventRowVM } from "@/ui/contracts";
import { EmptyState } from "./EmptyState";

function Row({ row }: { row: EventRowVM }) {
  return (
    <ViewTransition key={row.id} enter="row-in" exit="row-out" default="none">
      {/* Due link affiancati, non annidati: riga → pannello dettaglio, ↗ → pagina sulla fonte */}
      <div
        className={`scroll-reveal flex items-stretch border-b border-line last:border-b-0 ${
          row.highlight ? "bg-accent text-accent-fg" : ""
        }`}
      >
        <Link
          href={row.href}
          scroll={false}
          className={`flex min-w-0 flex-1 items-center gap-3 px-3 py-2.5 ${row.highlight ? "" : "hover:bg-line-soft"}`}
        >
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className={`text-xs font-semibold tabular-nums ${row.highlight ? "" : "text-muted"}`}>
              {row.kicker}
            </span>
            <h3 className="display-title line-clamp-2 text-[22px]">{row.title}</h3>
            {row.meta && <span className={`text-xs ${row.highlight ? "" : "text-muted"}`}>{row.meta}</span>}
          </div>
          {row.imageUrl && (
            // Immagini da fonti esterne arbitrarie: niente next/image (domini non noti a priori)
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={row.imageUrl}
              alt=""
              loading="lazy"
              className="size-18 shrink-0 object-cover grayscale contrast-[1.15] dark:brightness-90"
            />
          )}
        </Link>
        {row.external && (
          <a
            href={row.external.href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Apri «${row.title}» su ${row.external.host} (nuova scheda)`}
            title={`Apri su ${row.external.host}`}
            className={`flex w-11 shrink-0 items-center justify-center border-l text-lg font-semibold hover:bg-fg hover:text-bg ${
              row.highlight ? "border-accent-fg/30" : "border-line"
            }`}
          >
            ↗
          </a>
        )}
      </div>
    </ViewTransition>
  );
}

export function Agenda({ vm }: { vm: AgendaVM }) {
  if (vm.empty) return <EmptyState vm={vm.empty} />;
  return (
    <div>
      {vm.days.map((day) => (
        <section
          key={day.key}
          aria-label={`${day.num} ${day.label}`}
          className="grid grid-cols-[88px_minmax(0,1fr)] border-b border-line sm:grid-cols-[112px_minmax(0,1fr)]"
        >
          <div className="border-r border-line">
            {/* Il numero del giorno resta agganciato mentre scorri la sua giornata */}
            <div className="sticky top-[90px] flex flex-col px-3 py-2.5">
              <span className="display-num text-[80px] sm:text-[96px]">{day.num}</span>
              <span className="pt-1.5 text-xs font-semibold text-muted">{day.label}</span>
            </div>
          </div>
          <div className="flex flex-col">
            {day.rows.map((row) => (
              <Row key={row.id} row={row} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
