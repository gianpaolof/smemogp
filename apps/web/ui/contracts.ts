/**
 * Contratto tra logica e interfaccia. Ogni tema (`ui/<nome>/`) riceve questi view model:
 * stringhe già formattate e href già calcolati, nessuna logica di dominio.
 * I componenti client di un tema possono usare `hooks/`, mai `data/`.
 */

import type { Category } from "@/domain/types";

export type NavItem = { label: string; href: string; active: boolean };

/** Chip di categoria: `category` sceglie il glifo, non è testo da mostrare */
export type CategoryNavItem = NavItem & { category: Category };

/**
 * Dati per salvare un evento con un tocco (★). Eccezione documentata alla regola «stringhe già
 * formattate»: è un payload opaco che la UI passa così com'è allo store dei salvati, e `until`
 * è la data ISO grezza di fine (fine dichiarata o inizio + 3 h), non un testo da mostrare.
 */
export type SaveVM = { id: string; title: string; until: string };

export type ViewSwitch = { label: string; href: string; direction: "nav-forward" | "nav-back"; icon: "map" | "list" };

export type HeaderVM = {
  periods: NavItem[];
  viewSwitch: ViewSwitch;
  /** "Torino — raggio 10 km" */
  scopeLabel: string;
  /** Campo di ricerca: `path` e `query` servono a `useFilterNavigation` */
  search: { path: string; query: string; q: string };
};

export type EventRowVM = {
  id: string;
  href: string;
  title: string;
  /** "21:00 — Musica" */
  kicker: string;
  /** Sceglie il glifo della riga e del marker */
  category: Category;
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
  /** Per la ★ della riga */
  savedEntry: SaveVM;
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
  categories: CategoryNavItem[];
  radiusKm: number;
  radiusSteps: readonly number[];
  originLabel: string;
  usingCustomOrigin: boolean;
  resetHref: string;
  hasFilters: boolean;
  /** Date range: ISO YYYY-MM-DD, null se preset attivo */
  dal: string | null;
  al: string | null;
  weekendOnly: boolean;
  /** min date (today ISO), max date (today + 60gg ISO) */
  min: string;
  max: string;
  /** href per cancellare le date (ritorna al preset) */
  clearRangeHref: string;
  /** href per toggle weekend; disabilitato se periodo non supporta modificatore */
  weekendToggleHref: string;
  weekendToggleDisabled: boolean;
  weekendToggleDisabledReason?: string;
};

export type BottomBarVM = { quickCategories: CategoryNavItem[]; panel: FilterPanelVM };

export type MapRowVM = EventRowVM & {
  dayNum: string;
  dayLabel: string;
  /** Per il callout sul marker selezionato: indirizzo senza il nome del luogo ripetuto */
  venue: string | null;
  address: string | null;
};

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
  category: Category;
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
  /** Per «Salva» */
  savedEntry: SaveVM;
};

/** Eventi salvati: stesse righe della lista, senza filtri. */
export type SavedVM = {
  /** Prossimi e in corso, senza «Prossimo» evidenziato; countLabel "12 salvati" / "1 salvato" */
  upcoming: AgendaVM;
  /** Già conclusi, i più recenti prima; null se nessuno */
  past: RowGroupVM | null;
  /** Id salvati che il catalogo non ha più */
  missingIds: readonly string[];
};
