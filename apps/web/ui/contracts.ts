/**
 * Contratto tra logica e interfaccia. Ogni tema (`ui/<nome>/`) riceve questi view model:
 * stringhe già formattate e href già calcolati, nessuna logica di dominio.
 * I componenti client di un tema possono usare `hooks/`, mai `data/`.
 */

export type NavItem = { label: string; href: string; active: boolean };

export type ViewSwitch = { label: string; href: string; direction: "nav-forward" | "nav-back"; icon: "map" | "list" };

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
  /** Inserimento nel catalogo (ms): il client lo confronta con l'ultima visita per «Nuovo» */
  addedAt: number;
};

/** Link verso un sito esterno già validato: `host` senza "www." ("eventbrite.it") */
export type ExternalLinkVM = { href: string; host: string };

/** Gruppo di righe dentro un giorno: fascia oraria o "In corso". `label` null = nessun titoletto */
export type RowGroupVM = { key: string; label: string | null; rows: EventRowVM[] };

export type AgendaDayVM = {
  key: string;
  num: string;
  label: string;
  /** Mostre e rassegne già iniziate: chiuse in un riquadro richiudibile */
  ongoing: RowGroupVM | null;
  groups: RowGroupVM[];
};

export type EmptyVM = { title: string; message: string; actions: { label: string; href: string }[] };

export type AgendaVM = { countLabel: string; days: AgendaDayVM[]; empty: EmptyVM | null };

export type FilterPanelVM = {
  /** Query string corrente, letta dai hook client per navigare */
  path: string;
  query: string;
  periods: NavItem[];
  categories: NavItem[];
  radiusKm: number;
  radiusSteps: readonly number[];
  originLabel: string;
  usingCustomOrigin: boolean;
  resetHref: string;
  hasFilters: boolean;
};

export type BottomBarVM = { quickCategories: NavItem[]; panel: FilterPanelVM };

export type MapRowVM = EventRowVM & { dayNum: string; dayLabel: string };

export type MapVM = {
  origin: { lat: number; lng: number };
  selectedId: string | null;
  radiusKm: number;
  rows: MapRowVM[];
  countLabel: string;
  empty: EmptyVM | null;
};

export type EventDetailVM = {
  id: string;
  title: string;
  /** Titoli lunghi: un gradino di corpo in meno */
  longTitle: boolean;
  categoryLabel: string;
  /** Giorno mostrato (aaaa-mm-gg), lo stesso della sezione in lista: aggancia il numero del giorno */
  dayKey: string;
  dayNum: string;
  dayLabel: string;
  /** "In corso" per mostre già iniziate: il giorno mostrato è oggi, come nella lista */
  statusLabel: string | null;
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
  icsHref: string;
  /** Testo per Condividi */
  shareText: string;
};

/** Eventi salvati: stesse righe della lista, senza filtri. */
export type SavedVM = AgendaVM;
