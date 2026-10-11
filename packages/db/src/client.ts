import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";

export function createDb(
  url = process.env.TURSO_DATABASE_URL,
  authToken = process.env.TURSO_AUTH_TOKEN,
) {
  if (!url) throw new Error("TURSO_DATABASE_URL mancante");
  return drizzle(createClient({ url, authToken }), { schema });
}

export type Db = ReturnType<typeof createDb>;
