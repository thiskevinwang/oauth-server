import "dotenv/config";
import { Hono } from "hono";
import { oauth } from "./oauth";

const app = new Hono();

app.route("/", oauth);

const port = Number(process.env.PORT || 8787);

/**
 * Bun-compatible fetch handler entry point.
 *
 * OAuth2 relevance: Hosts the Authorization and Token endpoints that
 * implement the OAuth2 authorization code + PKCE flow.
 */
export default {
  port,
  fetch: app.fetch,
};
