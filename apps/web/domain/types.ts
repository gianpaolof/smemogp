import type { Category } from "@smemogp/db/constants";

export type { Category };

export type LatLng = { lat: number; lng: number };

export type Period = "stasera" | "oggi" | "weekend" | "settimana" | "mese";

/** Stato della ricerca: unica fonte di verità, serializzato nell'URL. */
export type Filters = {
  period: Period | "custom";
  radiusKm: number;
  categories: Category[];
  /** null = Torino centro */
  origin: LatLng | null;
  /** Intervallo date personalizzato: [da, a] inclusi. null = usa period. ISO YYYY-MM-DD. */
  range: { from: string; to: string } | null;
  /** Restringe a sabati e domeniche. Combinabile con period o range. */
  weekendOnly: boolean;
};

/** Evento pronto per la presentazione (date come ISO string, serializzabile). */
export type EventItem = {
  id: string;
  title: string;
  description: string | null;
  startsAt: string;
  endsAt: string | null;
  allDay: boolean;
  venueName: string | null;
  address: string | null;
  city: string | null;
  lat: number;
  lng: number;
  category: Category;
  priceText: string | null;
  imageUrl: string | null;
  url: string;
  sourceId: string;
  createdAt: string;
  updatedAt: string;
  distanceKm: number | null;
};
