import { sql } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

// NOTE: I'd like to use KSUIDs for ids, but the
// KSUID library's crypto import is not resolvable
// by next:
// > Can't resolve 'crypto'

export const keyPairs = sqliteTable("key_pairs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  privateKey: text("private_key").notNull(),
  publicKey: text("public_key").notNull(),
});

export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  createdAtMs: integer("created_at_ms", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
  updatedAtMs: integer("updated_at_ms", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
});

export const clients = sqliteTable("clients", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  clientId: text("client_id").notNull().unique(),
  clientSecret: text("client_secret"),
  redirectUri: text("redirect_uri"),
  name: text("name"),
  createdAtMs: integer("created_at_ms", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
  updatedAtMs: integer("updated_at_ms", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
});

// POST /oauth2/device/code
// ex. https://accounts.google.com/.well-known/openid-configuration

export const devices = sqliteTable("devices", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  clientId: text("client_id")
    .notNull()
    .references(() => clients.clientId),
  /** A long string used to verify the session between the client and the authorization server. The client uses this parameter to request the access token from the authorization server. */
  deviceCode: text("device_code").notNull().unique(),
  /** A short string shown to the user used to identify the session on a secondary device. */
  userCode: text("user_code").notNull().unique(),
  /** The URI the user should go to with the user_code in order to sign in. */
  verificationUri: text("verification_uri").notNull(),
  /** The number of seconds before the device_code and user_code expire. */
  verificationUriComplete: text("verification_uri_complete"),
  /** The number of seconds before the device_code and user_code expire. */
  expiresIn: integer("expires_in").notNull(),
  interval: integer("interval"),
  status: text("status")
    .notNull()
    .default(sql`'pending'`), // pending, approved, denied
  createdAtMs: integer("created_at_ms", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
  updatedAtMs: integer("updated_at_ms", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
});

export const tokens = sqliteTable("tokens", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  clientId: text("client_id")
    .notNull()
    .references(() => clients.clientId),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  accessToken: text("access_token").notNull().unique(),
  refreshToken: text("refresh_token").notNull().unique(),
  expiresAtMs: integer("expires_at_ms").notNull(),
  createdAtMs: integer("created_at_ms", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
  updatedAtMs: integer("updated_at_ms", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
});
