import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";

export function createDb(
  url = process.env.TURSO_DATABASE_URL,
  authToken = process.env.TURSO_AUTH_TOKEN,
) {
  // Spazi incollati nelle env del pannello Vercel rendono l'URL invalido (URL_INVALID)
  url = url?.trim();
  if (!url) throw new Error("TURSO_DATABASE_URL mancante");
  return drizzle(createClient({ url, authToken: authToken?.trim() }), { schema });
}

export type Db = ReturnType<typeof createDb>;
