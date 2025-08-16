import { Hono } from "hono";
import { getCookie, setCookie } from "hono/cookie";
import { Repo } from "./repo";
import { verifyCodeChallenge } from "./pkce";
import { signAccessToken } from "./jwt";
import { ensure, toSpaceDelimited } from "./utils";

// Simple in-memory session for demo login (replace with proper session store for prod)
const sessions = new Map<string, { user_id: string }>();

/**
 * Generate a cryptographically random hex ID.
 *
 * OAuth2 relevance: Used to mint authorization codes and demo session IDs
 * during the authorization phase.
 */
function randomId(len = 32) {
  return Array.from(crypto.getRandomValues(new Uint8Array(len)))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export const oauth = new Hono();

// Minimal login form for demo purposes
/**
 * Render a basic login form for demo authentication.
 *
 * OAuth2 relevance: This precedes the Authorization Endpoint when the user
 * is not authenticated; after login the flow returns to /authorize.
 */
oauth.get("/login", (c) => {
  const redirect = c.req.query("redirect") || "/";
  return c.html(`<!doctype html><html><body>
    <form method="POST" action="/login?redirect=${encodeURIComponent(
      redirect
    )}">
      <label>Username <input name="username"/></label>
      <label>Password <input type="password" name="password"/></label>
      <button type="submit">Login</button>
    </form>
  </body></html>`);
});

/**
 * Handle demo login, set a lightweight session cookie, and redirect.
 *
 * OAuth2 relevance: Establishes the authenticated resource owner before
 * proceeding with the authorization request (Authorization Endpoint).
 */
oauth.post("/login", async (c) => {
  const body = await c.req.parseBody();
  const username = String(body["username"] || "");
  const password = String(body["password"] || "");
  const user = await Repo.getUserByUsername(username);
  if (!user) return c.text("Invalid credentials", 401);
  // Demo only: plain compare; replace with proper hashing (bcrypt/argon2)
  if (user.password_hash !== password)
    return c.text("Invalid credentials", 401);
  const sid = randomId(16);
  sessions.set(sid, { user_id: user.id });
  setCookie(c, "sid", sid, { httpOnly: true, sameSite: "Lax", path: "/" });
  const redirect = c.req.query("redirect") || "/";
  return c.redirect(redirect);
});

// OAuth2 Authorization Endpoint
// GET /authorize
// Required: response_type=code, client_id, redirect_uri, state
// Optional: scope, code_challenge, code_challenge_method

/**
 * OAuth2 Authorization Endpoint (response_type=code).
 *
 * Validates client, redirect_uri, optional scope and PKCE parameters, then
 * issues a short-lived authorization code tied to the user and client.
 */
oauth.get("/authorize", async (c) => {
  const q = c.req.query();
  const client_id = ensure(q["client_id"], "missing client_id");
  const response_type = ensure(q["response_type"], "missing response_type");
  const redirect_uri = ensure(q["redirect_uri"], "missing redirect_uri");
  const state = q["state"];
  const scope = q["scope"];
  const code_challenge = q["code_challenge"];
  const code_challenge_method =
    (q["code_challenge_method"] as "S256" | "plain" | undefined) || undefined;

  if (response_type !== "code") return c.text("unsupported response_type", 400);

  const client = await Repo.getClientByClientId(client_id);
  if (!client) return c.text("invalid client", 400);
  if (!client.redirect_uris.includes(redirect_uri))
    return c.text("invalid redirect_uri", 400);

  // require login
  const sid = getCookie(c, "sid");
  const sess = sid ? sessions.get(sid) : undefined;
  if (!sess) {
    const here = new URL(c.req.url);
    return c.redirect(
      `/login?redirect=${encodeURIComponent(here.pathname + here.search)}`
    );
  }

  // Create authorization code
  const code = randomId(24);
  const expires_at = new Date(Date.now() + 5 * 60_000).toISOString();
  await Repo.createAuthorizationCode({
    code,
    client_id: client.client_id,
    user_id: sess.user_id,
    redirect_uri,
    scope: scope || null,
    code_challenge: code_challenge || null,
    code_challenge_method: code_challenge_method || null,
    expires_at,
  });

  const redirect = new URL(redirect_uri);
  redirect.searchParams.set("code", code);
  if (state) redirect.searchParams.set("state", state);
  return c.redirect(redirect.toString());
});

// Token endpoint: exchange code for access token
// POST /token with grant_type=authorization_code, code, redirect_uri, client_id, code_verifier (for PKCE)
// Basic client auth is optional here since we're focusing on PKCE/public clients

/**
 * OAuth2 Token Endpoint for the authorization_code grant with PKCE support.
 *
 * Validates the authorization code, redirect_uri, client binding, expiry,
 * single-use semantics, and PKCE verifier (when present), then issues a
 * signed Bearer access token.
 */
oauth.post("/token", async (c) => {
  const body = await c.req.parseBody();
  const grant_type = String(body["grant_type"] || "");
  if (grant_type !== "authorization_code")
    return c.json({ error: "unsupported_grant_type" }, 400);

  const code = String(body["code"] || "");
  const redirect_uri = String(body["redirect_uri"] || "");
  const client_id = String(body["client_id"] || "");
  const code_verifier = String(body["code_verifier"] || "");

  const client = await Repo.getClientByClientId(client_id);
  if (!client) return c.json({ error: "invalid_client" }, 400);

  const authCode = await Repo.getAuthorizationCode(code);
  if (!authCode || authCode.client_id !== client_id)
    return c.json({ error: "invalid_grant" }, 400);
  if (authCode.redirect_uri !== redirect_uri)
    return c.json({ error: "invalid_grant" }, 400);
  if (authCode.consumed) return c.json({ error: "invalid_grant" }, 400);
  if (new Date(authCode.expires_at).getTime() < Date.now())
    return c.json({ error: "invalid_grant" }, 400);

  // PKCE
  if (authCode.code_challenge) {
    const method = authCode.code_challenge_method || "S256";
    if (
      !code_verifier ||
      !verifyCodeChallenge(code_verifier, authCode.code_challenge, method)
    ) {
      return c.json(
        {
          error: "invalid_grant",
          error_description: "PKCE verification failed",
        },
        400
      );
    }
  }

  await Repo.consumeAuthorizationCode(code);

  const { token, exp } = await signAccessToken(
    authCode.user_id,
    client_id,
    authCode.scope || undefined
  );
  const response = {
    access_token: token,
    token_type: "Bearer" as const,
    expires_in: exp - Math.floor(Date.now() / 1000),
    scope: authCode.scope || undefined,
  };
  return c.json(response);
});
