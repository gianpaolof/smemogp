import { CATEGORIES } from "@smemogp/db/constants";
import { endOf, groupByDay, isOngoing, isOver, slotOf, type Slot } from "@/domain/agenda";
import {
  DEFAULT_FILTERS,
  hrefWith,
  PERIODS,
  RADIUS_STEPS,
  serializeFilters,
  toggleCategory,
} from "@/domain/filters";
import {
  CATEGORY_LABELS,
  formatDayHeading,
  formatKm,
  formatLongDate,
  formatShortDate,
  formatTime,
  joinAddress,
  PERIOD_LABELS,
  safeExternalUrl,
  sourceLabel,
} from "@/domain/format";
import { dayKey, periodBounds } from "@/domain/time";
import type { Category, EventItem, Filters } from "@/domain/types";
import type {
  AgendaDayVM,
  AgendaVM,
  BottomBarVM,
  EmptyVM,
  EventDetailVM,
  EventRowVM,
  HeaderVM,
  MapRowVM,
  MapVM,
  RowGroupVM,
  SavedVM,
  SaveVM,
} from "@/ui/contracts";

export type View = "lista" | "mappa";

const PATHS: Record<View, string> = { lista: "/", mappa: "/mappa" };

/** Categorie mostrate come scorciatoie nella barra in basso. */
const QUICK_CATEGORIES: Category[] = ["musica", "mostre"];

/** Periodi nell'header; "30 giorni" sta nei filtri. */
const HEADER_PERIODS = PERIODS.slice(0, 4);

const SLOT_LABELS: Record<Slot, string> = { mattina: "Mattina", pomeriggio: "Pomeriggio", sera: "Sera" };

const originLabel = (f: Filters) => (f.origin ? "La tua posizione" : "Torino");

export function presentHeader(f: Filters, view: View): HeaderVM {
  const path = PATHS[view];
  return {
    periods: HEADER_PERIODS.map((p) => ({
      label: PERIOD_LABELS[p],
      href: hrefWith(path, { ...f, period: p }),
      active: f.period === p,
    })),
    viewSwitch:
      view === "lista"
        ? { label: "Mappa", href: hrefWith(PATHS.mappa, f), direction: "nav-forward", icon: "map" }
        : { label: "Lista", href: hrefWith(PATHS.lista, f), direction: "nav-back", icon: "list" },
    scopeLabel: `${originLabel(f)} — raggio ${f.radiusKm} km`,
  };
}

/** Payload della ★: `until` è la fine (dichiarata o inizio + 3 h), per potare e contare i passati. */
const saveEntry = (e: EventItem): SaveVM => ({ id: e.id, title: e.title, until: endOf(e).toISOString() });

function presentRow(e: EventItem, f: Filters, day: string, highlight: boolean): EventRowVM {
  const when = isOngoing(e, day)
    ? `fino al ${formatShortDate(e.endsAt ?? e.startsAt)}`
    : e.allDay
      ? "Tutto il giorno"
      : formatTime(e.startsAt);
  const place = [e.venueName ?? e.city, e.distanceKm != null ? formatKm(e.distanceKm) : null]
    .filter(Boolean)
    .join(", ");
  const external = safeExternalUrl(e.url);
  return {
    id: e.id,
    href: hrefWith(`/evento/${encodeURIComponent(e.id)}`, f),
    title: e.title,
    kicker: `${when} — ${CATEGORY_LABELS[e.category]}`,
    // Il dominio dice dove porta il link ↗ prima di aprirlo
    meta: [place, e.priceText, external?.host].filter(Boolean).join(" · "),
    imageUrl: e.imageUrl,
    external,
    lat: e.lat,
    lng: e.lng,
    highlight,
    addedAt: new Date(e.createdAt).getTime(),
    savedEntry: saveEntry(e),
  };
}

function presentEmpty(f: Filters, view: View): EmptyVM {
  const path = PATHS[view];
  const actions: EmptyVM["actions"] = [];
  if (f.period === "stasera") actions.push({ label: "Tutta la settimana", href: hrefWith(path, { ...f, period: "settimana" }) });
  if (f.radiusKm < 25) actions.push({ label: "Allarga a 25 km", href: hrefWith(path, { ...f, radiusKm: 25 }) });
  if (f.categories.length) actions.push({ label: "Tutte le categorie", href: hrefWith(path, { ...f, categories: [] }) });
  if (f.period !== "mese") actions.push({ label: "Prossimi 30 giorni", href: hrefWith(path, { ...f, period: "mese" }) });
  const what = f.categories.length
    ? `di ${f.categories.map((c) => CATEGORY_LABELS[c].toLowerCase()).join(" o ")}`
    : "";
  return {
    title: "Niente in programma",
    message: `Nessun evento ${what} entro ${f.radiusKm} km per ${PERIOD_LABELS[f.period].toLowerCase()}.`.replace("  ", " "),
    actions,
  };
}

const countLabel = (n: number) => (n === 1 ? "1 evento" : `${n} eventi`);

/** Righe di un giorno divise per fascia oraria; un solo gruppo = niente titoletto. */
function slotGroups(rows: { e: EventItem; row: EventRowVM }[]): RowGroupVM[] {
  const groups: RowGroupVM[] = [];
  for (const { e, row } of rows) {
    const key = e.allDay ? "giorno" : slotOf(e);
    const label = e.allDay ? "Tutto il giorno" : SLOT_LABELS[key as Slot];
    const last = groups.at(-1);
    if (last?.key === key) last.rows.push(row);
    else groups.push({ key, label, rows: [row] });
  }
  if (groups.length === 1) groups[0].label = null;
  return groups;
}

export function presentAgenda(
  events: EventItem[],
  f: Filters,
  firstDay: Date,
  now: Date,
  { highlightNext = true }: { highlightNext?: boolean } = {},
): AgendaVM {
  // Stasera: solo eventi con orario che iniziano dalle 17 (quelli già finiti escono da soli)
  const onlyFrom = f.period === "stasera" ? periodBounds("stasera", now).from : undefined;
  const grouped = groupByDay(events, dayKey(firstDay.toISOString()), now, onlyFrom);
  const next = highlightNext
    ? grouped.flatMap((d) => d.events.filter((e) => !e.allDay)).find((e) => new Date(e.startsAt) >= now)
    : undefined;
  const days: AgendaDayVM[] = grouped.map((d) => {
    const { num, label } = formatDayHeading(`${d.key}T12:00:00Z`);
    const present = (e: EventItem) => ({ e, row: presentRow(e, f, d.key, e.id === next?.id) });
    return {
      key: d.key,
      num,
      label,
      ongoing: d.ongoing.length
        ? { key: "in-corso", label: `In corso (${d.ongoing.length})`, rows: d.ongoing.map((e) => present(e).row) }
        : null,
      groups: slotGroups(d.events.map(present)),
    };
  });
  const total = days.reduce((n, d) => n + (d.ongoing?.rows.length ?? 0) + d.groups.reduce((m, g) => m + g.rows.length, 0), 0);
  return { countLabel: countLabel(total), days, empty: total ? null : presentEmpty(f, "lista") };
}

const savedCountLabel = (n: number) => (n === 1 ? "1 salvato" : `${n} salvati`);

/**
 * Eventi salvati: tutti i giorni, nessun filtro, nessun evidenziato. I conclusi vanno in
 * «Passati» (i più recenti prima); gli id che il catalogo non ha più restano a parte.
 */
export function presentSaved(events: EventItem[], missingIds: readonly string[], now: Date): SavedVM {
  const f: Filters = { ...DEFAULT_FILTERS, period: "mese" };
  const ended = events.filter((e) => isOver(e, now));
  const vm = presentAgenda(
    events.filter((e) => !isOver(e, now)),
    f,
    now,
    now,
    { highlightNext: false },
  );
  const days = vm.days.map((d) => ({
    ...d,
    // Nei salvati le mostre non vanno chiuse in "In corso": sono ciò che l'utente ha scelto
    ongoing: null,
    groups: [...(d.ongoing ? [{ ...d.ongoing, label: "In corso" }] : []), ...d.groups],
  }));
  const total = days.reduce((n, d) => n + d.groups.reduce((m, g) => m + g.rows.length, 0), 0);
  const past: RowGroupVM | null = ended.length
    ? {
        key: "passati",
        label: "Passati",
        rows: ended
          .sort((a, b) => endOf(b).getTime() - endOf(a).getTime())
          .map((e) => ({
            ...presentRow(e, f, dayKey(e.startsAt), false),
            // Fuori dall'agenda manca l'intestazione del giorno: la data va nella riga
            kicker: `${formatShortDate(e.startsAt)} — ${CATEGORY_LABELS[e.category]}`,
          })),
      }
    : null;
  return {
    upcoming: {
      // "12 salvati" / "1 salvato" (prossimi + in corso): anche l'intestazione di /salvati
      countLabel: savedCountLabel(total),
      days,
      empty:
        total || past || missingIds.length
          ? null
          : {
              title: "Nessun salvato",
              message: "Tocca ★ su un evento, in lista, sulla mappa o nel dettaglio. Restano in questo browser.",
              actions: [{ label: "Tutti gli eventi", href: "/" }],
            },
    },
    past,
    missingIds,
  };
}

/** Luogo e indirizzo: il nome del luogo spesso è ripetuto all'inizio dell'indirizzo. */
function placeLines(e: EventItem): Pick<MapRowVM, "venue" | "address"> {
  const venue = e.venueName || null;
  const address = joinAddress(e.address, e.city);
  return {
    venue,
    address:
      venue && address?.toLowerCase().startsWith(venue.toLowerCase()) ? joinAddress(address.slice(venue.length)) : address,
  };
}

export function presentMap(
  events: EventItem[],
  f: Filters,
  firstDay: Date,
  now: Date,
  origin: { lat: number; lng: number },
  selectedId: string | null,
): MapVM {
  const agenda = presentAgenda(events, f, firstDay, now);
  const byId = new Map(events.map((e) => [e.id, e]));
  return {
    origin,
    selectedId,
    radiusKm: f.radiusKm,
    countLabel: agenda.countLabel,
    empty: agenda.empty ? presentEmpty(f, "mappa") : null,
    rows: agenda.days.flatMap((d) =>
      [...(d.ongoing?.rows ?? []), ...d.groups.flatMap((g) => g.rows)].map((r) => {
        const e = byId.get(r.id);
        return { ...r, ...(e ? placeLines(e) : { venue: null, address: null }), dayNum: d.num, dayLabel: d.label };
      }),
    ),
  };
}

export function presentBottomBar(f: Filters, view: View): BottomBarVM {
  const path = PATHS[view];
  const catItem = (c: Category) => ({
    label: CATEGORY_LABELS[c],
    href: hrefWith(path, toggleCategory(f, c)),
    active: f.categories.includes(c),
  });
  return {
    quickCategories: QUICK_CATEGORIES.map(catItem),
    panel: {
      path,
      query: serializeFilters(f),
      periods: PERIODS.map((p) => ({ label: PERIOD_LABELS[p], href: hrefWith(path, { ...f, period: p }), active: f.period === p })),
      categories: CATEGORIES.map(catItem),
      radiusKm: f.radiusKm,
      radiusSteps: RADIUS_STEPS,
      originLabel: f.origin ? "La tua posizione" : "Torino centro",
      usingCustomOrigin: f.origin !== null,
      resetHref: path,
      hasFilters: serializeFilters(f) !== "",
    },
  };
}

const updatedFmt = new Intl.DateTimeFormat("it-IT", {
  timeZone: "Europe/Rome",
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

export function presentDetail(e: EventItem, f: Filters, now: Date): EventDetailVM {
  const multiDay = e.endsAt && dayKey(e.endsAt) !== dayKey(e.startsAt);
  // Come nella lista: una mostra già iniziata sta sotto oggi, non sotto il giorno di apertura
  const ongoing = multiDay && new Date(e.startsAt) < now;
  // Già iniziata: in lista sta sotto il primo giorno del periodo (oggi, o sabato per il weekend)
  const periodStart = periodBounds(f.period, now).from;
  const shownDay = ongoing ? new Date(Math.max(now.getTime(), periodStart.getTime())).toISOString() : e.startsAt;
  const { num, label } = formatDayHeading(shownDay);
  const external = safeExternalUrl(e.url);
  const { venue, address } = placeLines(e);
  return {
    id: e.id,
    title: e.title,
    longTitle: e.title.length > 60,
    categoryLabel: CATEGORY_LABELS[e.category],
    dayKey: dayKey(shownDay),
    dayNum: num,
    dayLabel: label,
    statusLabel: ongoing ? "In corso" : null,
    dateLabel: multiDay
      ? `Dal ${formatShortDate(e.startsAt)} al ${formatShortDate(e.endsAt!)}`
      : formatLongDate(e.startsAt),
    timeLabel: e.allDay
      ? "Tutto il giorno"
      : e.endsAt && !multiDay
        ? `${formatTime(e.startsAt)} – ${formatTime(e.endsAt)}`
        : formatTime(e.startsAt),
    venue,
    address,
    distanceLabel: e.distanceKm != null
      ? `${formatKm(e.distanceKm)} da ${f.origin ? "te" : "Torino centro"}, in linea d'aria`
      : null,
    priceLabel: e.priceText,
    description: e.description,
    imageUrl: e.imageUrl,
    external,
    sourceLabel: sourceLabel(e.sourceId, e.url),
    updatedLabel: `Aggiornato ${updatedFmt.format(new Date(e.updatedAt))}`,
    mapHref: hrefWith(PATHS.mappa, f) + `${serializeFilters(f) ? "&" : "?"}evento=${encodeURIComponent(e.id)}`,
    backHref: hrefWith(PATHS.lista, f),
    icsHref: `/evento/${encodeURIComponent(e.id)}/ics`,
    savedEntry: saveEntry(e),
    shareText: [e.title, ongoing ? `fino al ${formatShortDate(e.endsAt!)}` : `${formatLongDate(e.startsAt)}${e.allDay ? "" : `, ${formatTime(e.startsAt)}`}`, venue]
      .filter(Boolean)
      .join(" · "),
  };
}

