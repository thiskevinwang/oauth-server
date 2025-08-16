/**
 * Assert a required value is present, otherwise throw.
 *
 * OAuth2 relevance: Used to validate required authorization request
 * parameters (e.g., client_id, response_type, redirect_uri) at /authorize.
 */
export function ensure<T>(v: T | undefined | null, msg: string): T {
  if (v === undefined || v === null) throw new Error(msg);
  return v;
}

/**
 * Parse an OAuth2 space-delimited scope string to an array.
 *
 * OAuth2 relevance: Scopes appear on authorization and token responses.
 */
export function parseSpaceDelimited(input?: string | null): string[] {
  if (!input) return [];
  return input.split(/\s+/).filter(Boolean);
}

/**
 * Convert an array of scopes to a space-delimited string.
 *
 * OAuth2 relevance: Used when serializing scope for tokens and responses.
 */
export function toSpaceDelimited(scopes: string[]): string | undefined {
  if (!scopes.length) return undefined;
  return scopes.join(" ");
}
