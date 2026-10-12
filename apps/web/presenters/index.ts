import { CATEGORIES } from "@smemogp/db/constants";
import { groupByDay, isOngoing } from "@/domain/agenda";
import {
  hrefWith,
  PERIODS,
  RADIUS_MAX_KM,
  RADIUS_MIN_KM,
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
  PERIOD_LABELS,
  safeExternalUrl,
} from "@/domain/format";
import { dayKey } from "@/domain/time";
import type { Category, EventItem, Filters } from "@/domain/types";
import type {
  AgendaVM,
  BottomBarVM,
  EmptyVM,
  EventDetailVM,
  EventRowVM,
  HeaderVM,
  MapVM,
} from "@/ui/contracts";

export type View = "lista" | "mappa";

const PATHS: Record<View, string> = { lista: "/", mappa: "/mappa" };

/** Categorie mostrate come scorciatoie nella barra in basso. */
const QUICK_CATEGORIES: Category[] = ["musica", "mostre"];

const originLabel = (f: Filters) => (f.origin ? "La tua posizione" : "Torino");

export function presentHeader(f: Filters, view: View): HeaderVM {
  const path = PATHS[view];
  return {
    periods: PERIODS.slice(0, 3).map((p) => ({
      label: PERIOD_LABELS[p],
      href: hrefWith(path, { ...f, period: p }),
      active: f.period === p,
    })),
    viewSwitch:
      view === "lista"
        ? { label: "Mappa ↗", href: hrefWith(PATHS.mappa, f), direction: "nav-forward" }
        : { label: "Lista ↙", href: hrefWith(PATHS.lista, f), direction: "nav-back" },
    scopeLabel: `${originLabel(f)} — raggio ${f.radiusKm} km`,
  };
}

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
  };
}

function presentEmpty(f: Filters, view: View): EmptyVM {
  const path = PATHS[view];
  const actions: EmptyVM["actions"] = [];
  if (f.radiusKm < 25) actions.push({ label: "Allarga a 25 km", href: hrefWith(path, { ...f, radiusKm: 25 }) });
  if (f.categories.length) actions.push({ label: "Tutte le categorie", href: hrefWith(path, { ...f, categories: [] }) });
  if (f.period !== "mese") actions.push({ label: "Prossimi 30 giorni", href: hrefWith(path, { ...f, period: "mese" }) });
  return {
    title: "Niente in programma",
    message: `Nessun evento entro ${f.radiusKm} km per ${PERIOD_LABELS[f.period].toLowerCase()}.`,
    actions,
  };
}

const countLabel = (n: number) => (n === 1 ? "1 evento" : `${n} eventi`);

export function presentAgenda(events: EventItem[], f: Filters, firstDay: Date, now: Date): AgendaVM {
  const grouped = groupByDay(events, dayKey(firstDay.toISOString()), now);
  const next = grouped
    .flatMap((d) => d.events.filter((e) => !e.allDay && !isOngoing(e, d.key)))
    .find((e) => new Date(e.startsAt) >= now);
  const days = grouped.map((d) => {
    const { num, label } = formatDayHeading(`${d.key}T12:00:00Z`);
    return { key: d.key, num, label, rows: d.events.map((e) => presentRow(e, f, d.key, e.id === next?.id)) };
  });
  const total = days.reduce((n, d) => n + d.rows.length, 0);
  return { countLabel: countLabel(total), days, empty: total ? null : presentEmpty(f, "lista") };
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
  return {
    origin,
    selectedId,
    radiusKm: f.radiusKm,
    countLabel: agenda.countLabel,
    rows: agenda.days.flatMap((d) => d.rows.map((r) => ({ ...r, dayNum: d.num, dayLabel: d.label }))),
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
      categories: CATEGORIES.map(catItem),
      radiusKm: f.radiusKm,
      radiusMin: RADIUS_MIN_KM,
      radiusMax: RADIUS_MAX_KM,
      originLabel: f.origin ? "La tua posizione" : "Torino centro",
      usingCustomOrigin: f.origin !== null,
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

export function presentDetail(e: EventItem, f: Filters): EventDetailVM {
  const { num, label } = formatDayHeading(e.startsAt);
  const multiDay = e.endsAt && dayKey(e.endsAt) !== dayKey(e.startsAt);
  return {
    id: e.id,
    title: e.title,
    categoryLabel: CATEGORY_LABELS[e.category],
    dayNum: num,
    dayLabel: label,
    dateLabel: multiDay
      ? `Dal ${formatShortDate(e.startsAt)} al ${formatShortDate(e.endsAt!)}`
      : formatLongDate(e.startsAt),
    timeLabel: e.allDay
      ? "Tutto il giorno"
      : e.endsAt && !multiDay
        ? `${formatTime(e.startsAt)} – ${formatTime(e.endsAt)}`
        : formatTime(e.startsAt),
    venue: e.venueName,
    address: [e.address, e.city].filter(Boolean).join(", ") || null,
    distanceLabel: e.distanceKm != null
      ? `${formatKm(e.distanceKm)} da ${f.origin ? "te" : "Torino centro"}, in linea d'aria`
      : null,
    priceLabel: e.priceText,
    description: e.description,
    imageUrl: e.imageUrl,
    external: safeExternalUrl(e.url),
    sourceLabel: e.sourceId,
    updatedLabel: `Aggiornato ${updatedFmt.format(new Date(e.updatedAt))}`,
    mapHref: hrefWith(PATHS.mappa, f) + `${serializeFilters(f) ? "&" : "?"}evento=${encodeURIComponent(e.id)}`,
    backHref: hrefWith(PATHS.lista, f),
  };
}
