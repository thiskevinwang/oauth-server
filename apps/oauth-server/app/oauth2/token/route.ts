import { cookies } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { signToken } from "@/lib/auth";

import * as schema from "@/db/schema";
import { getRequestContext } from "@cloudflare/next-on-pages";
import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
const d1 = getRequestContext().env.DB;
const db = drizzle(d1, { schema });

export const runtime = "edge";

/**
 * [Token Endpoint](https://datatracker.ietf.org/doc/html/rfc6749#section-3.2)
 *
 * [PKCE extention](https://datatracker.ietf.org/doc/html/rfc7636#section-4.5)
 */
export async function POST(request: NextRequest) {
	console.log("POST /oauth2/token");

	const formData = await request.formData();
	const data = Object.fromEntries(formData.entries());

	const params = TokenRequest.parse(data);
	switch (params.grant_type) {
		case "authorization_code": {
			const { code, redirect_uri, client_id, code_verifier } = params;
			await handleAuthorizationCodeGrant(params);
			break;
		}
		case "password": {
			const result = await handlePasswordGrant(params, request);
			return NextResponse.json(result);
		}
		case "refresh_token": {
			const { refresh_token } = params;
			await handleRefreshTokenGrant(params);
			break;
		}
		case "urn:ietf:params:oauth:grant-type:device_code": {
			const { device_code, client_id } = params;
			await handleDeviceCodeGrant(params);
			break;
		}
	}
}

const BaseTokenRequest = z.object({
	grant_type: z.enum([
		"password",
		"authorization_code",
		"refresh_token",
		"client_credentials",
		"urn:ietf:params:oauth:grant-type:device_code"
	])
});

export const PasswordTokenRequest = BaseTokenRequest.extend({
	grant_type: z.literal("password"),
	username: z.string(),
	password: z.string(),
	scope: z.string().optional()
});
export type PasswordTokenRequest = z.infer<typeof PasswordTokenRequest>;

/**
 * @see [Proof Key for Code Exchange by OAuth Public Clients - Section 4.3](https://datatracker.ietf.org/doc/html/rfc7636#section-4.3) for extentions
 */
export const AuthorizationCodeTokenRequest = BaseTokenRequest.extend({
	grant_type: z.literal("authorization_code"),
	code: z.string(),
	redirect_uri: z.string(),
	client_id: z.string()
}).extend({
	code_verifier: z.string().optional()
});
export type AuthorizationCodeTokenRequest = z.infer<typeof AuthorizationCodeTokenRequest>;

/**
 * https://datatracker.ietf.org/doc/html/rfc6749#section-4.4
 */
export const ClientCredentialsTokenRequest = BaseTokenRequest.extend({
	grant_type: z.literal("client_credentials"),
	scope: z.string().optional()
});
export type ClientCredentialsTokenRequest = z.infer<typeof ClientCredentialsTokenRequest>;

/**
 * https://datatracker.ietf.org/doc/html/rfc6749#section-6
 */
export const RefreshTokenRequest = BaseTokenRequest.extend({
	grant_type: z.literal("refresh_token"),
	refresh_token: z.string()
});
export type RefreshTokenRequest = z.infer<typeof RefreshTokenRequest>;

/**
 * https://datatracker.ietf.org/doc/html/rfc8628#section-3.4
 */
export const DeviceCodeTokenRequest = BaseTokenRequest.extend({
	grant_type: z.literal("urn:ietf:params:oauth:grant-type:device_code"),
	device_code: z.string(),
	client_id: z.string()
});
export type DeviceCodeTokenRequest = z.infer<typeof DeviceCodeTokenRequest>;

/** a convenience discriminated union type for {@link BaseTokenRequest} */
export const TokenRequest = z.discriminatedUnion("grant_type", [
	PasswordTokenRequest,
	ClientCredentialsTokenRequest,
	AuthorizationCodeTokenRequest,
	RefreshTokenRequest,
	DeviceCodeTokenRequest
]);
export type TokenRequest = z.infer<typeof TokenRequest>;

export const BaseTokenResponse = z.object({
	access_token: z.string(),
	expires_in: z.number(), // seconds
	token_type: z.string()
});

/**
 * The response to {@link PasswordTokenRequest}
 *
 * @see https://datatracker.ietf.org/doc/html/rfc6749#section-4.3.3
 */
export const ResourceOwnerTokenResponse = BaseTokenResponse.extend({
	refresh_token: z.string().optional()
});
export type ResourceOwnerTokenResponse = z.infer<typeof ResourceOwnerTokenResponse>;

async function handlePasswordGrant(input: PasswordTokenRequest, request: NextRequest) {
	const { username, password } = input;

	const [user] = await db
		.select()
		.from(schema.users)
		.where(and(eq(schema.users.username, username), eq(schema.users.password, password)))
		.execute();
	if (!user) {
		throw new Error("Invalid username or password");
	}

	const accessToken = await signToken({
		issuer: new URL(request.url).host,
		audience: new URL(request.url).host,
		sub: user.id,
		username: user.username,
		expirationTime: "15m"
	});

	const response = {
		access_token: accessToken,
		expires_in: 15 * 60,
		token_type: "Bearer"
	} satisfies ResourceOwnerTokenResponse;

	return response;
}

async function handleAuthorizationCodeGrant(input: AuthorizationCodeTokenRequest) {}

async function handleRefreshTokenGrant(input: RefreshTokenRequest) {}

async function handleDeviceCodeGrant(input: DeviceCodeTokenRequest) {}
