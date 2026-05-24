#!/usr/bin/env node
/**
 * Post-process a consolidated Drizzle migration so all CREATE UNIQUE INDEX
 * statements run BEFORE any ALTER TABLE ... ADD FOREIGN KEY statements.
 *
 * Why: when you regenerate from a clean state, the schema produces a single
 * SQL file. Composite FKs (e.g. products(id, vendor_id)) require a UNIQUE
 * index on the target, but drizzle-kit emits indexes after FK constraints.
 * Postgres rejects the FK because the unique index doesn't exist yet.
 * Run this once per fresh generation.
 */
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const dir = "drizzle";
const sqlFiles = readdirSync(dir)
  .filter((f) => /^0\d{3}_.*\.sql$/.test(f))
  .sort();

if (sqlFiles.length === 0) {
  console.log("hoist-unique-indexes: no migration files found, nothing to do");
  process.exit(0);
}

let totalHoisted = 0;
for (const file of sqlFiles) {
  const path = join(dir, file);
  const text = readFileSync(path, "utf8");
  const lines = text.split(/\r?\n/);

  const hoist = lines.filter((l) => l.startsWith("CREATE UNIQUE INDEX"));
  if (hoist.length === 0) continue;

  const keep = lines.filter((l) => !l.startsWith("CREATE UNIQUE INDEX"));
  const out = [];
  let injected = false;
  for (const line of keep) {
    if (!injected && line.startsWith("ALTER TABLE")) {
      out.push(...hoist);
      injected = true;
    }
    out.push(line);
  }
  if (!injected) out.push(...hoist);

  writeFileSync(path, out.join("\n"));
  totalHoisted += hoist.length;
  console.log(`  ${file}: hoisted ${hoist.length} CREATE UNIQUE INDEX`);
}

console.log(`hoist-unique-indexes: done (${totalHoisted} total)`);
