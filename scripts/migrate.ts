import "dotenv/config";
import postgres from "postgres";
import { readdirSync, readFileSync } from "fs";
import { join } from "path";

/**
 * Apply SQL migrations in the migrations/ directory in lexical order.
 * Not part of OAuth2 runtime, but prepares persistence for the flow.
 */
async function main() {
  const sql = postgres(process.env.DATABASE_URL!, { prepare: true });
  try {
    await sql`CREATE EXTENSION IF NOT EXISTS pgcrypto`;
    const dir = join(process.cwd(), "migrations");
    const files = readdirSync(dir)
      .filter((f) => f.endsWith(".sql"))
      .sort();
    for (const f of files) {
      const fileSql = readFileSync(join(dir, f), "utf8");
      console.log(`Applying migration: ${f}`);
      await sql.unsafe(fileSql);
    }
  } finally {
    await sql.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
