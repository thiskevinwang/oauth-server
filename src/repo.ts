import { query } from "./db";
import type { OAuthClient, User, AuthorizationCode } from "./types";

export const Repo = {
  // clients
  /**
   * Lookup an OAuth client application by its public client_id.
   *
   * OAuth2 relevance: Used at the authorization and token endpoints to
   * validate incoming requests and ensure redirect_uri and other parameters
   * belong to a registered client.
   */
  async getClientByClientId(client_id: string): Promise<OAuthClient | null> {
    const { rows } = await query<OAuthClient>(
      `SELECT id, client_id, client_secret_hash, name, redirect_uris, created_at
       FROM oauth_clients WHERE client_id = $1`,
      [client_id]
    );
    return rows[0] || null;
  },

  /**
   * Register a new OAuth client (confidential or public when secret is null).
   *
   * OAuth2 relevance: Admin/registration utility outside the core flow; its
   * results are consumed by /authorize and /token during user consent and
   * code/token issuance.
   */
  async createClient(data: {
    client_id: string;
    client_secret_hash: string | null;
    name: string;
    redirect_uris: string[];
  }) {
    const { rows } = await query<OAuthClient>(
      `INSERT INTO oauth_clients (client_id, client_secret_hash, name, redirect_uris)
       VALUES ($1, $2, $3, $4)
       RETURNING id, client_id, client_secret_hash, name, redirect_uris, created_at`,
      [data.client_id, data.client_secret_hash, data.name, data.redirect_uris]
    );
    return rows[0];
  },

  // users
  /**
   * Fetch a user by username for login.
   *
   * OAuth2 relevance: Precedes the authorization step; used when establishing
   * end-user authentication before issuing an authorization code.
   */
  async getUserByUsername(username: string): Promise<User | null> {
    const { rows } = await query<User>(
      `SELECT id, username, password_hash, created_at FROM users WHERE username = $1`,
      [username]
    );
    return rows[0] || null;
  },

  /**
   * Create a new user account (demo helper).
   *
   * OAuth2 relevance: Not part of OAuth2 spec itself, but required for
   * authenticating resource owners prior to the authorization request.
   */
  async createUser(username: string, password_hash: string) {
    const { rows } = await query<User>(
      `INSERT INTO users (username, password_hash) VALUES ($1, $2)
       RETURNING id, username, password_hash, created_at`,
      [username, password_hash]
    );
    return rows[0];
  },

  // auth codes
  /**
   * Persist a freshly minted authorization code and associated metadata.
   *
   * OAuth2 relevance: Called by the authorization endpoint after user login
   * and consent to issue a short-lived code used later at the token endpoint.
   * Includes PKCE fields when the client used code_challenge.
   */
  async createAuthorizationCode(
    data: Omit<AuthorizationCode, "created_at" | "consumed"> & {
      consumed?: boolean;
    }
  ) {
    const { rows } = await query<AuthorizationCode>(
      `INSERT INTO authorization_codes
       (code, client_id, user_id, redirect_uri, scope, code_challenge, code_challenge_method, expires_at, consumed)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       RETURNING code, client_id, user_id, redirect_uri, scope, code_challenge, code_challenge_method, expires_at, consumed, created_at`,
      [
        data.code,
        data.client_id,
        data.user_id,
        data.redirect_uri,
        data.scope ?? null,
        data.code_challenge ?? null,
        data.code_challenge_method ?? null,
        data.expires_at,
        data.consumed ?? false,
      ]
    );
    return rows[0];
  },

  /**
   * Retrieve an authorization code by its value.
   *
   * OAuth2 relevance: Used by the token endpoint to validate code, client,
   * redirect_uri, and PKCE before exchanging for an access token.
   */
  async getAuthorizationCode(code: string): Promise<AuthorizationCode | null> {
    const { rows } = await query<AuthorizationCode>(
      `SELECT code, client_id, user_id, redirect_uri, scope, code_challenge, code_challenge_method, expires_at, consumed, created_at
       FROM authorization_codes WHERE code = $1`,
      [code]
    );
    return rows[0] || null;
  },

  /**
   * Mark an authorization code as consumed to prevent replay.
   *
   * OAuth2 relevance: Enforces single-use code semantics during the token
   * exchange phase.
   */
  async consumeAuthorizationCode(code: string) {
    await query(
      `UPDATE authorization_codes SET consumed = TRUE WHERE code = $1`,
      [code]
    );
  },
};
