# OAuth2 Authorization Server (Bun + Hono + Postgres)

Implements OAuth2 Authorization Code flow with PKCE.

- Runtime: Bun
- Web framework: Hono
- DB: Postgres

## Quick start

1. Copy env

```sh
cp .env.example .env
```

2. Start Postgres (Docker Compose)

```sh
docker compose up -d db
```

3. Install deps

```sh
bun install
```

4. Run migrations and seed

```sh
bun run migrate
bun run seed
```

5. Start server

```sh
bun run dev
```

## Endpoints

- GET /authorize
- POST /token
- GET/POST /login (demo)

## Notes

- For production, replace the demo password handling with a proper hasher (bcrypt/argon2).
- Provide RSA/EC keys in env to sign JWTs.

## Testing

Visit http://localhost:8787/authorize?client_id=demo-client&redirect_uri=http://localhost:5173/callback&response_type=code&scope=openid

And use the demo user credentials:
- Username: alice
- Password: password