import { MiddlewareHandler } from "hono";
import * as jose from "jose";
import { getCookie } from "hono/cookie";

import { VaultKV } from "@/storage/vault";

import type { Context } from "hono";
import type { Env } from "@/types";

type Ctx = Context<{ Bindings: Env }>;

const alg = "RS256";

// These values will be stored in Vault KV
export const generateKeyPair = async () => {
  const { privateKey, publicKey } = await jose.generateKeyPair(alg, {
    modulusLength: 2048,
    extractable: true,
  });
  // this produces the plaintext value, beginning with
  // -----BEGIN PRIVATE KEY-----
  const pkcs8 = await jose.exportPKCS8(privateKey);
  // this produces the plaintext value, beginning with
  // -----BEGIN PUBLIC KEY-----
  const spki = await jose.exportSPKI(publicKey);

  return { pkcs8, spki };
};

/**
 * middleware to verify an access token.
 *
 * @see https://github.com/panva/jose/blob/main/docs/functions/jwt_verify.jwtVerify.md
 */
export const verifyToken: MiddlewareHandler = async (c: Ctx, next) => {
  const token = getCookie(c, "__token");

  if (!token) {
    return c.json({
      error: "invalid_token",
      error_description: "Missing access token",
    });
  }

  const vault = new VaultKV(c.env);
  await vault.login();
  const { publicKey: spki } = await vault.get("tester");
  const publicKey = await jose.importSPKI(spki, alg, { extractable: true });

  try {
    await jose.jwtVerify(token, publicKey);
    await next();
  } catch (e: any) {
    if (e instanceof jose.errors.JOSEError) {
      c.status(401);
      return c.json({
        error: "invalid_token",
        error_description: e.name + ": " + e.message,
      });
    }
    throw e;
  }
};

/**
 * util to sign a JWT
 *
 * @see https://github.com/panva/jose/blob/main/docs/classes/jwt_sign.SignJWT.md
 */
export const signToken = async (c: Ctx, { sub }: { sub: string }) => {
  const vault = new VaultKV(c.env);
  await vault.login();
  const { privateKey: pkcs8 } = await vault.get("tester");

  // convert -----BEGIN PRIVATE KEY----- to keylike
  const privateKey = await jose.importPKCS8(pkcs8, alg);

  const jwt = await new jose.SignJWT({ sub })
    .setProtectedHeader({
      alg,
      typ: "JWT",
      kid: "test key id",
    })
    .setIssuedAt()
    .setIssuer(new URL(c.req.url).host)
    .setAudience(new URL(c.req.url).host)
    .setExpirationTime("2m")
    .sign(privateKey);

  return jwt;
};

export const generateJwk = async (c: Ctx) => {
  const vault = new VaultKV(c.env);
  await vault.login();
  const { publicKey: spki } = await vault.get("tester");

  // convert -----BEGIN PUBLIC KEY----- to keylike
  const publicKey = await jose.importSPKI(spki, alg, { extractable: true });

  const jwk = await jose.exportJWK(publicKey);

  jwk.alg = alg;
  jwk.use = "sig";
  jwk.kid = "test key id";

  return jwk;
};

export const unsafeDecodeToken = (token: string) => {
  const protectedHeader = jose.decodeProtectedHeader(token);
  const payload = jose.decodeJwt(token);

  return { protectedHeader, payload };
};
