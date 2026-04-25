import { loadEnvConfig } from "@next/env";
import { defineConfig } from "drizzle-kit";

loadEnvConfig(process.cwd());

const url = process.env.DATABASE_URL ?? process.env.POSTGRES_URL;
if (!url) {
  throw new Error("DATABASE_URL (or POSTGRES_URL) is not set. Add it to .env.local.");
}

export default defineConfig({
  schema: "./src/db/schema.js",
  out: "./src/db/migrations",
  dialect: "postgresql",
  dbCredentials: { url },
});
