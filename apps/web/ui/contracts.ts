/**
 * Contratto tra logica e interfaccia. Ogni tema (`ui/<nome>/`) riceve questi view model:
 * stringhe già formattate e href già calcolati, nessuna logica di dominio.
 * I componenti client di un tema possono usare `hooks/`, mai `data/`.
 */

export type NavItem = { label: string; href: string; active: boolean };

export type ViewSwitch = { label: string; href: string; direction: "nav-forward" | "nav-back" };

export type HeaderVM = {
  periods: NavItem[];
  viewSwitch: ViewSwitch;
  /** "Torino — raggio 10 km" */
  scopeLabel: string;
};

export type EventRowVM = {
  id: string;
  href: string;
  title: string;
  /** "21:00 — Musica" */
  kicker: string;
  /** "Spazio A, 2,4 km · da €15" */
  meta: string;
  imageUrl: string | null;
  /** Pagina dell'evento sulla fonte; null se l'URL non è http(s) */
  external: ExternalLinkVM | null;
  lat: number;
  lng: number;
  /** Il prossimo evento che inizia: evidenziato */
  highlight: boolean;
};

/** Link verso un sito esterno già validato: `host` senza "www." ("eventbrite.it") */
export type ExternalLinkVM = { href: string; host: string };

export type AgendaDayVM = { key: string; num: string; label: string; rows: EventRowVM[] };

export type EmptyVM = { title: string; message: string; actions: { label: string; href: string }[] };

export type AgendaVM = { countLabel: string; days: AgendaDayVM[]; empty: EmptyVM | null };

export type FilterPanelVM = {
  /** Query string corrente, letta dai hook client per navigare */
  path: string;
  query: string;
  categories: NavItem[];
  radiusKm: number;
  radiusMin: number;
  radiusMax: number;
  originLabel: string;
  usingCustomOrigin: boolean;
};

export type BottomBarVM = { quickCategories: NavItem[]; panel: FilterPanelVM };

export type MapVM = {
  origin: { lat: number; lng: number };
  selectedId: string | null;
  radiusKm: number;
  rows: (EventRowVM & { dayNum: string; dayLabel: string })[];
  countLabel: string;
};

export type EventDetailVM = {
  id: string;
  title: string;
  categoryLabel: string;
  dayNum: string;
  dayLabel: string;
  dateLabel: string;
  timeLabel: string;
  venue: string | null;
  address: string | null;
  distanceLabel: string | null;
  priceLabel: string | null;
  description: string | null;
  imageUrl: string | null;
  external: ExternalLinkVM | null;
  sourceLabel: string;
  updatedLabel: string;
  mapHref: string;
  backHref: string;
};
