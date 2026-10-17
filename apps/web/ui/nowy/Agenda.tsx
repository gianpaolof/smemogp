import Link from "next/link";
import { ViewTransition, type ReactNode } from "react";
import type { AgendaVM, EventRowVM, RowGroupVM } from "@/ui/contracts";
import { heroDay, heroTitle } from "@/ui/heroNames";
import { EmptyState } from "./EmptyState";
import { EventImage } from "./EventImage";
import { CategoryGlyph } from "./glyphs";
import { Icon } from "./icons";
import { NewBadge } from "./NewBadge";
import { RowPending } from "./RowPending";
import { SaveToggle } from "./SaveToggle";
import { SharedHero } from "./SharedHero";

const sideCell = "flex min-h-11 flex-1 items-center justify-center hover:bg-fg hover:text-bg";

/** `past`: righe di eventi conclusi (in «Passati»), titolo attenuato e niente comparsa allo scroll */
function Row({ row, past = false }: { row: EventRowVM; past?: boolean }) {
  return (
    <ViewTransition key={row.id} enter="row-in" exit="row-out" default="none">
      {/* Controlli affiancati, non annidati: riga → pannello dettaglio, ★ → salva, ↗ → pagina sulla fonte */}
      <div
        className={`row flex items-stretch border-b border-line last:border-b-0 ${past ? "" : "scroll-reveal"} ${
          row.highlight ? "is-next bg-accent text-accent-fg" : ""
        }`}
      >
        <Link
          href={row.href}
          scroll={false}
          transitionTypes={["hero"]}
          className={`press relative flex min-w-0 flex-1 items-center gap-3 px-3 py-2.5 ${row.highlight ? "" : "hover:bg-line-soft"}`}
        >
          <RowPending />
          {/* Glifo di categoria in colonna, all'altezza del kicker: si scorre a colpo d'occhio */}
          <CategoryGlyph category={row.category} className={`shrink-0 self-start text-base ${past ? "text-muted" : ""}`} />
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className={`text-xs font-semibold tabular-nums ${row.highlight ? "" : "text-muted"}`}>
              {row.highlight && (
                <span className="mr-1.5 bg-accent-fg px-1 py-px text-[10px] font-bold tracking-wide text-accent uppercase">
                  Prossimo
                </span>
              )}
              {row.kicker}
              <NewBadge addedAt={row.addedAt} />
            </span>
            <SharedHero name={heroTitle(row.id)} ids={[row.id]}>
              <h3
                data-hero={heroTitle(row.id)}
                className={`display-title line-clamp-3 text-[20px] sm:text-[24px] ${past ? "text-muted" : ""}`}
              >
                {row.title}
              </h3>
            </SharedHero>
            {row.meta && <span className={`truncate text-xs ${row.highlight ? "" : "text-muted"}`}>{row.meta}</span>}
          </div>
          {row.imageUrl && <EventImage src={row.imageUrl} sizes="72px" className="size-16 shrink-0 sm:size-18" />}
        </Link>
        {/* Colonna destra impilata: ★ sopra, ↗ sotto (≥44 px ciascuna); senza ↗ la ★ è a tutta altezza */}
        <div className={`flex w-11 shrink-0 flex-col border-l ${row.highlight ? "border-accent-fg/30" : "border-line"}`}>
          <SaveToggle entry={row.savedEntry} onAccent={row.highlight} className={sideCell} />
          {row.external && (
            <a
              href={row.external.href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Apri «${row.title}» su ${row.external.host} (nuova scheda)`}
              title={`Apri su ${row.external.host}`}
              className={`press ${sideCell} border-t text-base ${row.highlight ? "border-accent-fg/30" : "border-line"}`}
            >
              <Icon name="external" />
            </a>
          )}
        </div>
      </div>
    </ViewTransition>
  );
}

function Group({ group, past = false }: { group: RowGroupVM; past?: boolean }) {
  return (
    <>
      {group.label && (
        <p className="border-b border-line px-3 pt-3 pb-1 text-[11px] font-bold tracking-[0.12em] text-muted uppercase">
          {group.label}
        </p>
      )}
      {group.rows.map((row) => (
        <Row key={row.id} row={row} past={past} />
      ))}
    </>
  );
}

/** Riquadro richiudibile, chiuso di partenza: «In corso» dentro un giorno, «Passati» in /salvati */
function Collapsible({ label, className = "", children }: { label: string; className?: string; children: ReactNode }) {
  return (
    <details className={`group ${className}`}>
      <summary className="press flex min-h-11 cursor-pointer list-none items-center justify-between px-3 text-[11px] font-bold tracking-[0.12em] text-muted uppercase hover:bg-line-soft [&::-webkit-details-marker]:hidden">
        {label}
        <Icon name="right" className="transition-transform group-open:rotate-90" />
      </summary>
      <div className="border-t border-line">{children}</div>
    </details>
  );
}

/**
 * Salvati già conclusi, i più recenti prima: dopo l'agenda, chiusi. null → nulla.
 * Solo in /salvati: le righe tolte si attenuano come nell'agenda (`dim-unsaved`).
 */
export function PastGroup({ group }: { group: RowGroupVM | null }) {
  if (!group) return null;
  return (
    <Collapsible label={`Passati (${group.rows.length})`} className="dim-unsaved border-t-2 border-fg">
      <Group group={{ ...group, label: null }} past />
    </Collapsible>
  );
}

/** `dimUnsaved`: in /salvati le righe tolte restano, attenuate, finché non si ricarica (vedi globals.css) */
export function Agenda({ vm, dimUnsaved = false }: { vm: AgendaVM; dimUnsaved?: boolean }) {
  if (vm.empty) return <EmptyState vm={vm.empty} />;
  return (
    <div className={dimUnsaved ? "dim-unsaved" : undefined}>
      {vm.days.map((day) => (
        <section
          key={day.key}
          aria-labelledby={`giorno-${day.key}`}
          className="grid grid-cols-[88px_minmax(0,1fr)] border-b-2 border-fg sm:grid-cols-[112px_minmax(0,1fr)]"
        >
          <div className="border-r border-line">
            {/* Il numero del giorno resta agganciato mentre scorri la sua giornata */}
            <h2 id={`giorno-${day.key}`} className="sticky top-[var(--header-h)] flex flex-col px-3 py-2.5">
              <SharedHero
                name={heroDay(day.key)}
                ids={[...(day.ongoing?.rows ?? []), ...day.groups.flatMap((g) => g.rows)].map((r) => r.id)}
              >
                <span data-hero={heroDay(day.key)} className="display-num text-[80px] sm:text-[96px]">
                  {day.num}
                </span>
              </SharedHero>
              <span className="pt-1.5 text-xs font-semibold text-muted">{day.label}</span>
            </h2>
          </div>
          <div className="flex min-w-0 flex-col">
            {day.ongoing && (
              // Mostre e rassegne: chiuse, così le serate restano in vista
              <Collapsible label={day.ongoing.label ?? ""} className="border-b border-line">
                <Group group={{ ...day.ongoing, label: null }} />
              </Collapsible>
            )}
            {day.groups.map((g) => (
              <Group key={g.key} group={g} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
