# Development

## Generate migrations

`npx drizzle-kit generate`

```console
user@oauth-server/apps/oauth-server: $ npx drizzle-kit generate

drizzle-kit: v0.22.4
drizzle-orm: v0.31.1

No config path provided, using default 'drizzle.config.ts'
Reading config file '~/oauth-server/apps/oauth-server/drizzle.config.ts'
6 tables
authorization_codes 8 columns 0 indexes 2 fks
clients 7 columns 1 indexes 0 fks
devices 11 columns 2 indexes 1 fks
key_pairs 3 columns 0 indexes 0 fks
tokens 8 columns 2 indexes 2 fks
users 5 columns 1 indexes 0 fks

[✓] Your SQL migration file ➜ db/migrations/0000_yellow_korvac.sql 🚀
```

## Run migrations

`npx wrangler d1 execute`

> [!NOTE]
>
> The database name argument is the name of the D1 binding, as defined in the `wrangler.toml` file.
>
> ```toml
> [[d1_databases]]
> binding = "DB" # i.e. available in your Worker on env.DB
> database_name = "test-db"
> database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
> ```

```console
user@oauth-server/apps/oauth-server: $ npx wrangler d1 execute test-db --local --file db/migrations/0000_yellow_korvac.sql

 ⛅️ wrangler 3.59.0 (update available 3.62.0)
-------------------------------------------------------
🌀 Executing on local database test-db (xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx) from .wrangler/state/v3/d1:
🌀 To execute on your remote database, add a --remote flag to your wrangler command.
```