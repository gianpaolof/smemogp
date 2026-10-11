import type { Category } from "@smemogp/db";

export type SourceFormat = "api" | "rss" | "ical" | "jsonld" | "html" | "js" | "none";

/**
 * active: gira nello scout online · skill: solo via /scout-eventi (nessuna estrazione deterministica)
 * unverified/blocked/dead: da `scout:verify` · excluded: scartata per gusti utente
 */
export type SourceStatus = "active" | "skill" | "unverified" | "blocked" | "dead" | "excluded";

export type Source = {
  id: string;
  name: string;
  /** Pagina lista/calendario */
  url: string;
  format: SourceFormat;
  feedUrl?: string | null;
  /** Adapter dedicato in src/adapters/custom; altrimenti dispatch per format */
  adapter?: string;
  enabled?: boolean;
  /** Default "active" */
  status?: SourceStatus;
  phase?: 1 | 2 | 3;
  /** Pagine lista da leggere (`?page=N`), default 1 */
  pages?: number;
  /** Segue le pagine dettaglio e ne legge il JSON-LD (orari completi, campi mancanti in lista) */
  detail?: DetailSpec;
  /** Fallback LLM se la pagina non ha JSON-LD. Off di default: costa a ogni run */
  llm?: boolean;
  category?: string;
  area?: string;
  notes?: string;
};

export type DetailSpec = {
  /** Regex sugli href della lista; senza, usa gli `url` degli eventi JSON-LD della lista */
  linkPattern?: string;
  /** Default 30 */
  max?: number;
};

export type RawEvent = {
  title: string;
  startsAt: Date;
  endsAt?: Date | null;
  allDay?: boolean;
  description?: string | null;
  venueName?: string | null;
  address?: string | null;
  city?: string | null;
  lat?: number | null;
  lng?: number | null;
  category?: Category;
  priceText?: string | null;
  imageUrl?: string | null;
  url: string;
};

export type FetchedContent = {
  url: string;
  body: string;
};

export type Adapter = {
  /** Override del fetch di default (es. API JSON) */
  fetch?: (source: Source) => Promise<FetchedContent>;
  extract: (source: Source, content: FetchedContent) => Promise<RawEvent[]>;
};
