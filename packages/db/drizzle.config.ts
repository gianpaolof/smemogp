import { defineConfig } from "drizzle-kit";

try {
  process.loadEnvFile("../../.env");
} catch {
  // env già presente (CI)
}

export default defineConfig({
  dialect: "turso",
  schema: "./src/schema.ts",
  out: "./migrations",
  dbCredentials: {
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN,
  },
});
