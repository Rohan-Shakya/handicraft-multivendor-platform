import { config } from "dotenv";
import { resolve } from "path";

// Works whether running from src/db/ (tsx) or dist/db/ (compiled)
config({ path: resolve(__dirname, "../../.env") });

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema/index.js";

const client = postgres(process.env.DATABASE_URL!, {
  max: 20,
  idle_timeout: 20,
  connect_timeout: 10,
});

export const db = drizzle(client, { schema });

export type DB = typeof db;

/**
 * Type that accepts either the root `db` or a transaction handle from
 * `db.transaction((tx) => ...)`. Use this in helpers that may run inside or
 * outside an existing tx (e.g. transactional outbox writes).
 */
export type DbOrTx = DB | Parameters<Parameters<DB["transaction"]>[0]>[0];
