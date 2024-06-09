import { defineConfig } from "drizzle-kit";

export default defineConfig({
	dialect: "sqlite",
	driver: "d1-http",
	verbose: true,
	schema: "./db/schema.ts",
	out: "./db/migrations",
	migrations: {
		table: "migrations"
	}
});
