import "dotenv/config";
import { Repo } from "../src/repo";

/**
 * Register a public OAuth client for local testing.
 */
async function main() {
  const client_id = Bun.argv[2] || crypto.randomUUID();
  const name = Bun.argv[3] || "Unnamed Client";
  const redirect_uris = (Bun.argv[4] || "http://localhost:5173/callback").split(
    ","
  );
  const client = await Repo.createClient({
    client_id,
    client_secret_hash: null,
    name,
    redirect_uris,
  });
  console.log({ client });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
