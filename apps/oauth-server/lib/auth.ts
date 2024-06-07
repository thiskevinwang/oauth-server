import * as jose from "jose";

import { createRemoteJWKSet } from "jose";
import { getRequestContext } from "@cloudflare/next-on-pages";
import { NextRequest, NextResponse } from "next/server";

const ALG = "RS256";
const KEY_ID = "test key id";
const COOKIENAME = "__token";

export const UNSAFE_bootstrapKeyPair = async () => {
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
export const verifyToken = async (request: NextRequest) => {
  const cookie = request.cookies.get(COOKIENAME);
  if (!cookie) {
    throw {
      error: "invalid_token",
      error_description: "Missing access token",
    };
  }
  const token = cookie.value;

  // Verify a signed token.

  // 1. use the public key directly
  // const storage = (getRequestContext().env as Env).DATASTORE;
  // const item = await storage.get<{ publicKey: string }>(KEY_ID, "json");
  // if (!item) {
  //   throw {
  //     error: "invalid_token",
  //     error_description: "No public key found",
  //   };
  // }
  // const { publicKey: spki } = item;
  // const publicKey = await jose.importSPKI(spki, ALG, { extractable: true });

  // 2. use the JWKs endpoint
  const getKey = createRemoteJWKSet(
    new URL("/.well-known/jwks.json", request.url)
  );

  try {
    return await jose.jwtVerify(token, getKey);
  } catch (e: any) {
    if (e instanceof jose.errors.JOSEError) {
      return {
        error: "invalid_token",
        error_description: e.name + ": " + e.message,
      };
    }
    return e;
  }
};

/**
 * util to sign a JWT
 *
 * @see https://github.com/panva/jose/blob/main/docs/classes/jwt_sign.SignJWT.md
 */
export const signToken = async (
  request: NextRequest,
  { sub }: { sub: string }
) => {
  const storage = (getRequestContext().env as Env).DATASTORE;
  const item = await storage.get<{ privateKey: string }>(KEY_ID, "json");
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
    .setIssuer(new URL(request.url).host)
    .setAudience(new URL(request.url).host)
    .setExpirationTime("2m")
    .sign(privateKey);

  return jwt;
};

export const generateJwk = async (request: NextRequest) => {
  const storage = (getRequestContext().env as Env).DATASTORE;
  let item = await storage.get<{ privateKey: string; publicKey: string }>(
    KEY_ID,
    "json"
  );

  if (item === null) {
    const bootsrap = await UNSAFE_bootstrapKeyPair();
    item = {
      privateKey: bootsrap.pkcs8,
      publicKey: bootsrap.spki,
    };
    await storage.put(KEY_ID, JSON.stringify(item));
  }

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
