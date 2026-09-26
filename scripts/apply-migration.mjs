// Applies a SQL migration file to the Supabase Postgres database.
//
// Usage: SUPABASE_DB_URL="postgresql://..." node scripts/apply-migration.mjs supabase/migrations/0002_....sql
//
// The whole file runs inside one transaction, so a failure part-way through
// leaves the schema untouched.
import { readFile } from "node:fs/promises";
import pg from "pg";

const [file] = process.argv.slice(2);
const url = process.env.SUPABASE_DB_URL;

if (!file || !url) {
  console.error("Need SUPABASE_DB_URL and a migration file path.");
  process.exit(1);
}

const sql = await readFile(file, "utf8");
const client = new pg.Client({
  connectionString: url,
  ssl: { rejectUnauthorized: false },
  // This machine has no IPv6 route; Supabase's AAAA record otherwise wins.
  family: 4,
});

await client.connect();
try {
  await client.query("begin");
  await client.query(sql);
  await client.query("commit");
  console.log(`Applied ${file}`);
} catch (error) {
  await client.query("rollback");
  console.error(`Failed, rolled back: ${error.message}`);
  process.exitCode = 1;
} finally {
  await client.end();
}
