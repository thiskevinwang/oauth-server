import { MiddlewareHandler } from "hono";
import * as jose from "jose";
import { getCookie } from "hono/cookie";

import { CloudflareKV } from "@/storage/kv";

import type { Context } from "hono";
import type { Env } from "@/types";

type Ctx = Context<{ Bindings: Env }>;

const ALG = "RS256";
const KEY_ID = "test key id";
const COOKIENAME = "__token";

const generateKeyPair = async () => {
  const { privateKey, publicKey } = await jose.generateKeyPair(ALG, {
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
  const token = getCookie(c, COOKIENAME);

  if (!token) {
    return c.json({
      error: "invalid_token",
      error_description: "Missing access token",
    });
  }

  const storage = new CloudflareKV(c.env);

  const item = await storage.get(KEY_ID);
  if (!item) {
    c.status(500);
    return c.json({
      error: "invalid_token",
      error_description: "No public key found",
    });
  }
  const { publicKey: spki } = item;
  const publicKey = await jose.importSPKI(spki, ALG, { extractable: true });

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
  const storage = new CloudflareKV(c.env);
  const item = await storage.get(KEY_ID);
  if (!item) {
    throw new Error("No private key found");
  }
  const { privateKey: pkcs8 } = item;

  // convert -----BEGIN PRIVATE KEY----- to keylike
  const privateKey = await jose.importPKCS8(pkcs8, ALG);

  const jwt = await new jose.SignJWT({ sub })
    .setProtectedHeader({
      alg: ALG,
      typ: "JWT",
      kid: KEY_ID,
    })
    .setIssuedAt()
    .setIssuer(new URL(c.req.url).host)
    .setAudience(new URL(c.req.url).host)
    .setExpirationTime("2m")
    .sign(privateKey);

  return jwt;
};

export const generateJwk = async (c: Ctx) => {
  const storage = new CloudflareKV(c.env);
  const item =
    (await storage.get(KEY_ID)) ||
    // bootstrap token for dev purposes
    (await generateKeyPair().then((item) => {
      storage.put(KEY_ID, {
        privateKey: item.pkcs8,
        publicKey: item.spki,
      });
      return item;
    }));

  const { publicKey: spki } = item;

  // convert -----BEGIN PUBLIC KEY----- to keylike
  const publicKey = await jose.importSPKI(spki, ALG, { extractable: true });

  const jwk = await jose.exportJWK(publicKey);

  jwk.alg = ALG;
  jwk.use = "sig";
  jwk.kid = KEY_ID;

  return jwk;
};

export const unsafeDecodeToken = (token: string) => {
  const protectedHeader = jose.decodeProtectedHeader(token);
  const payload = jose.decodeJwt(token);

  return { protectedHeader, payload };
};
