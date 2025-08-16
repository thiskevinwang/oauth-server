import {
  SignJWT,
  jwtVerify,
  type JWTPayload,
  importPKCS8,
  importSPKI,
} from "jose";

const ISSUER = process.env.JWT_ISSUER || "http://localhost:8787";
const AUDIENCE = process.env.JWT_AUDIENCE || "oauth-clients";
const ALG = (process.env.JWT_ALG || "RS256") as "RS256" | "ES256";

let privateKeyPromise: Promise<CryptoKey> | null = null;
let publicKeyPromise: Promise<CryptoKey> | null = null;

/**
 * Lazily import and cache the private key for signing JWT access tokens.
 *
 * OAuth2 relevance: Used by the authorization server when issuing signed
 * access tokens at the token endpoint.
 */
export async function getPrivateKey() {
  if (!privateKeyPromise) {
    const pem = process.env.JWT_PRIVATE_KEY_PEM;
    if (!pem) throw new Error("Missing JWT_PRIVATE_KEY_PEM");
    privateKeyPromise =
      ALG === "RS256" ? importPKCS8(pem, "RS256") : importPKCS8(pem, "ES256");
  }
  return privateKeyPromise;
}

/**
 * Lazily import and cache the public key for verifying JWT access tokens.
 *
 * OAuth2 relevance: Used by resource servers or introspection-like flows to
 * validate tokens presented by clients after the token issuance step.
 */
export async function getPublicKey() {
  if (!publicKeyPromise) {
    const pem = process.env.JWT_PUBLIC_KEY_PEM;
    if (!pem) throw new Error("Missing JWT_PUBLIC_KEY_PEM for verification");
    publicKeyPromise =
      ALG === "RS256" ? importSPKI(pem, "RS256") : importSPKI(pem, "ES256");
  }
  return publicKeyPromise;
}

/**
 * Sign and return a JWT access token for a subject and client.
 *
 * OAuth2 relevance: Executed by the token endpoint after validating an
 * authorization code (and PKCE if applicable). Produces the Bearer token
 * clients use to access protected resources.
 */
export async function signAccessToken(
  subject: string,
  client_id: string,
  scope?: string
) {
  const pk = await getPrivateKey();
  const now = Math.floor(Date.now() / 1000);
  const exp = now + 3600;
  const jwt = await new SignJWT({ scope, client_id })
    .setProtectedHeader({ alg: ALG })
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setSubject(subject)
    .setIssuedAt(now)
    .setExpirationTime(exp)
    .sign(pk);
  return { token: jwt, exp };
}

/**
 * Verify a JWT access token and return its payload.
 *
 * OAuth2 relevance: Used by resource servers (or by this server in tests) to
 * authenticate API requests bearing the access token, after the token issuance
 * step in the OAuth2 flow.
 */
export async function verifyToken(token: string) {
  const pub = await getPublicKey();
  const { payload } = await jwtVerify(token, pub, {
    issuer: ISSUER,
    audience: AUDIENCE,
  });
  return payload as JWTPayload & { scope?: string; client_id: string };
}
