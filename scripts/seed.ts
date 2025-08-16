import "dotenv/config";
import { Repo } from "../src/repo";
import { query } from "../src/db";

/**
 * Seed the database with a demo user and public client for the OAuth2 flow.
 */
async function main() {
  // create demo user (password = password)
  await query(`INSERT INTO users (username, password_hash)
               VALUES ('alice', 'password') ON CONFLICT (username) DO NOTHING`);

  // create demo public client (PKCE only)
  await query(`INSERT INTO oauth_clients (client_id, client_secret_hash, name, redirect_uris)
               VALUES ('demo-client', NULL, 'Demo Client', ARRAY['http://localhost:5173/callback'])
               ON CONFLICT (client_id) DO NOTHING`);

  console.log("Seed complete.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
