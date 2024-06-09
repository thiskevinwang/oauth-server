import * as jose from "jose";

import { createRemoteJWKSet } from "jose";
import { type NextRequest, NextResponse } from "next/server";

import * as schema from "@/db/schema";
import { getRequestContext } from "@cloudflare/next-on-pages";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";

const d1 = getRequestContext().env.DB;
const db = drizzle(d1, { schema });

const ALG = "RS256";
const KEY_ID = "test key id";
const COOKIENAME = "__token";

export const UNSAFE_bootstrapKeyPair = async () => {
	const { privateKey, publicKey } = await jose.generateKeyPair(ALG, {
		modulusLength: 2048,
		extractable: true
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
			error_description: "Missing access token"
		};
	}
	const token = cookie.value;

	// Verify a signed token.

	// 1. retrieve the public key directly from storage
	//   let [item] = await db
	//     .select()
	//     .from(schema.keyPairs)
	//     .where(eq(schema.keyPairs.id, 1))
	//     .execute();
	//   if (!item) {
	//     const bootstrap = await UNSAFE_bootstrapKeyPair();
	//     const [inserted] = await db
	//       .insert(schema.keyPairs)
	//       .values({
	//         privateKey: bootstrap.pkcs8,
	//         publicKey: bootstrap.spki,
	//       })
	//       .returning()
	//       .execute();
	//     item = inserted;
	//   }
	//   const publicKey = await jose.importSPKI(item.publicKey, ALG, {
	//     extractable: true,
	//   });
	//  return  await jose.jwtVerify(token, publicKey);

	// 2. use a JWKs endpoint (see generateJwk below)
	const getKey = createRemoteJWKSet(
		new URL("/.well-known/jwks.json", request.url)
	);

	try {
		return await jose.jwtVerify(token, getKey);
	} catch (e: any) {
		if (e instanceof jose.errors.JOSEError) {
			return {
				error: "invalid_token",
				error_description: e.name + ": " + e.message
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
	{ sub, username }: { sub: string; username: string }
) => {
	let [item] = await db
		.select()
		.from(schema.keyPairs)
		.where(eq(schema.keyPairs.id, 1))
		.execute();
	if (!item) {
		const bootstrap = await UNSAFE_bootstrapKeyPair();
		const [inserted] = await db
			.insert(schema.keyPairs)
			.values({
				privateKey: bootstrap.pkcs8,
				publicKey: bootstrap.spki
			})
			.returning()
			.execute();
		item = inserted;
	}

	if (!item) {
		throw new Error("No private key found");
	}
	const { privateKey: pkcs8 } = item;

	// convert -----BEGIN PRIVATE KEY----- to keylike
	const privateKey = await jose.importPKCS8(pkcs8, ALG);

	const jwt = await new jose.SignJWT({ sub, username })
		.setProtectedHeader({
			alg: ALG,
			typ: "JWT",
			kid: KEY_ID
		})
		.setIssuedAt()
		.setIssuer(new URL(request.url).host)
		.setAudience(new URL(request.url).host)
		.setExpirationTime("2m")
		.sign(privateKey);

	return jwt;
};

export const generateJwk = async (request: NextRequest) => {
	let [item] = await db
		.select()
		.from(schema.keyPairs)
		.where(eq(schema.keyPairs.id, 1))
		.execute();
	if (!item) {
		const bootsrap = await UNSAFE_bootstrapKeyPair();
		const [inserted] = await db
			.insert(schema.keyPairs)
			.values({
				privateKey: bootsrap.pkcs8,
				publicKey: bootsrap.spki
			})
			.returning()
			.execute();
		item = inserted;
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
