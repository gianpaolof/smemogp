import { eq } from "drizzle-orm";
import { geocache, type Db } from "@smemogp/db";

const MIN_INTERVAL_MS = 1100; // policy Nominatim: max 1 req/s
let lastCall = 0;

/** Geocoding con cache su DB. Ritorna null se non trovato. */
export async function geocode(db: Db, query: string) {
  const key = query.toLowerCase().replace(/\s+/g, " ").trim();
  if (!key) return null;

  const cached = await db.select().from(geocache).where(eq(geocache.query, key)).get();
  if (cached) return cached.lat != null ? { lat: cached.lat, lng: cached.lng! } : null;

  const wait = lastCall + MIN_INTERVAL_MS - Date.now();
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastCall = Date.now();

  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.search = new URLSearchParams({ q: key, format: "jsonv2", limit: "1", countrycodes: "it" }).toString();
  const res = await fetch(url, {
    headers: { "user-agent": process.env.NOMINATIM_USER_AGENT || "smemogp-scout/0.1" },
  });
  if (!res.ok) throw new Error(`Nominatim HTTP ${res.status}`);
  const [hit] = (await res.json()) as { lat: string; lon: string; display_name: string }[];

  const row = hit
    ? { query: key, lat: Number(hit.lat), lng: Number(hit.lon), displayName: hit.display_name }
    : { query: key, lat: null, lng: null, displayName: null };
  await db.insert(geocache).values(row).onConflictDoNothing();
  return hit ? { lat: row.lat!, lng: row.lng! } : null;
}
