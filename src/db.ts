import postgres from "postgres";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  throw new Error("Missing DATABASE_URL");
}

export const sql = postgres(DATABASE_URL, { prepare: true });

/**
 * Execute a SQL query using postgres.js unsafe mode with positional parameters.
 *
 * OAuth2 relevance: All persistence for clients, users, and authorization
 * codes flows through here, backing the authorization and token endpoints.
 */
export async function query<T = any>(text: string, params: any[] = []) {
  // postgres.js uses tagged templates; emulate a simple param binding
  // Use sql.unsafe for dynamic queries with positional parameters
  const rows = (await sql.unsafe(text, params)) as unknown as T[];
  return { rows } as { rows: T[] };
}
