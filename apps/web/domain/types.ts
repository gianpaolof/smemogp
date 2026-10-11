import type { Category } from "@smemogp/db/constants";

export type { Category };

export type LatLng = { lat: number; lng: number };

export type Period = "oggi" | "weekend" | "settimana" | "mese";

/** Stato della ricerca: unica fonte di verità, serializzato nell'URL. */
export type Filters = {
  period: Period;
  radiusKm: number;
  categories: Category[];
  /** null = Torino centro */
  origin: LatLng | null;
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
  updatedAt: string;
  distanceKm: number | null;
};
