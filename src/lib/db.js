import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "@/db/schema";

let _db = null;

export function getDb() {
  if (_db) return _db;
  const url = process.env.DATABASE_URL ?? process.env.POSTGRES_URL;
  if (!url) return null;
  const sql = neon(url);
  _db = drizzle(sql, { schema });
  return _db;
}

export { schema };
