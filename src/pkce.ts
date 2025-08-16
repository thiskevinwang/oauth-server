import { createHash } from "crypto";

/**
 * Convert input to a base64url string (RFC 4648 §5).
 *
 * OAuth2 relevance: Used when verifying PKCE where the code_challenge is the
 * base64url-encoded SHA-256 digest of the code_verifier (S256 method) during the
 * token exchange phase (authorization_code + PKCE).
 */
export function base64url(input: ArrayBuffer | Uint8Array | string) {
  let buf: Buffer;
  if (typeof input === "string") buf = Buffer.from(input);
  else if (input instanceof Uint8Array) buf = Buffer.from(input);
  else buf = Buffer.from(new Uint8Array(input));
  return buf
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

/**
 * Compute a SHA-256 digest of a string and return raw bytes.
 *
 * OAuth2 relevance: Part of PKCE (S256) calculation where the server derives
 * a digest from the provided code_verifier to compare against code_challenge
 * on the token endpoint.
 */
export function sha256(input: string) {
  return createHash("sha256").update(input).digest();
}

/**
 * Verify a PKCE code_verifier against the original code_challenge.
 *
 * OAuth2 relevance: Called by the token endpoint during the authorization code
 * exchange to validate public clients using PKCE. For method "S256", the
 * server computes base64url(sha256(code_verifier)) and compares to the stored
 * code_challenge; for "plain", compares strings directly.
 */
export function verifyCodeChallenge(
  code_verifier: string,
  code_challenge: string,
  method: "S256" | "plain" = "S256"
) {
  if (method === "plain") {
    return code_verifier === code_challenge;
  }
  const digest = sha256(code_verifier);
  const derived = base64url(digest);
  return derived === code_challenge;
}
