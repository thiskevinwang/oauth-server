import "dotenv/config";
import { Repo } from "../src/repo";

/**
 * Create a demo user for testing the authorization login step.
 */
async function main() {
  const username = Bun.argv[2] || "user";
  const password = Bun.argv[3] || "password";
  const user = await Repo.createUser(username, password);
  console.log({ user });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
