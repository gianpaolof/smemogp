import { sql } from "drizzle-orm";
import { index, integer, primaryKey, real, sqliteTable, text } from "drizzle-orm/sqlite-core";
import type { Category } from "./constants";

export const events = sqliteTable(
  "events",
  {
    // Hash di titolo normalizzato + giorno + luogo: chiave di dedup tra fonti
    id: text("id").primaryKey(),
    title: text("title").notNull(),
    description: text("description"),
    startsAt: integer("starts_at", { mode: "timestamp" }).notNull(),
    endsAt: integer("ends_at", { mode: "timestamp" }),
    allDay: integer("all_day", { mode: "boolean" }).notNull().default(false),
    venueName: text("venue_name"),
    address: text("address"),
    city: text("city"),
    lat: real("lat"),
    lng: real("lng"),
    category: text("category").$type<Category>().notNull().default("altro"),
    priceText: text("price_text"),
    imageUrl: text("image_url"),
    url: text("url").notNull(),
    sourceId: text("source_id").notNull(),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
  },
  (t) => [
    index("events_starts_at_idx").on(t.startsAt),
    index("events_lat_lng_idx").on(t.lat, t.lng),
    index("events_source_idx").on(t.sourceId),
  ],
);

// Provenienza: lo stesso evento può arrivare da più fonti (dedup cross-fonte)
export const eventSources = sqliteTable(
  "event_sources",
  {
    eventId: text("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    sourceId: text("source_id").notNull(),
    url: text("url").notNull(),
    firstSeenAt: integer("first_seen_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
    lastSeenAt: integer("last_seen_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
  },
  (t) => [primaryKey({ columns: [t.eventId, t.sourceId] }), index("event_sources_source_idx").on(t.sourceId)],
);

export const sourceRuns = sqliteTable("source_runs", {
  sourceId: text("source_id").primaryKey(),
  lastRunAt: integer("last_run_at", { mode: "timestamp" }),
  lastStatus: text("last_status").$type<"ok" | "error" | "unchanged">(),
  lastError: text("last_error"),
  contentHash: text("content_hash"),
  eventsFound: integer("events_found"),
});

export const geocache = sqliteTable("geocache", {
  query: text("query").primaryKey(),
  lat: real("lat"),
  lng: real("lng"),
  displayName: text("display_name"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
});

export type Event = typeof events.$inferSelect;
export type NewEvent = typeof events.$inferInsert;
