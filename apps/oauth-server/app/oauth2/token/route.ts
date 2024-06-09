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

/**
 * Resource Owner Password Credentials Grant
 * https://datatracker.ietf.org/doc/html/rfc6749#section-4.3.1
 */
const AccessTokenRequest_PasswordCredentialsGrant = z.object({
	grant_type: z.literal("password"),
	username: z.string(),
	password: z.string(),
	scope: z.string().nullable().optional()
});
type AccessTokenRequest_PasswordCredentialsGrant = z.infer<
	typeof AccessTokenRequest_PasswordCredentialsGrant
>;

/**
 * https://datatracker.ietf.org/doc/html/rfc6749#section-4.3.3
 */
const AccessTokenResponse_PasswordCredentialsGrant = z.object({
	access_token: z.string(),
	token_type: z.string(),
	expires_in: z.number(),
	refresh_token: z.string()
	// example_parameter: z.string(),
});
type AccessTokenResponse_PasswordCredentialsGrant = z.infer<
	typeof AccessTokenResponse_PasswordCredentialsGrant
>;

/**
 * https://datatracker.ietf.org/doc/html/rfc6749#section-4.1.3
 */
const AccessTokenRequest_AuthorizationCodeGrant = z.object({
	grant_type: z.literal("authorization_code"),
	code: z.string(),
	redirect_uri: z.string(),
	client_id: z.string()
});
type AccessTokenRequest_AuthorizationCodeGrant = z.infer<
	typeof AccessTokenRequest_AuthorizationCodeGrant
>;

/**
 * https://datatracker.ietf.org/doc/html/rfc6749#section-4.1.4
 */
const AccessTokenResponse_AuthorizationCodeGrant = z.object({
	access_token: z.string(),
	token_type: z.string(),
	expires_in: z.number(),
	refresh_token: z.string()
	// example_parameter: z.string(),
});
type AccessTokenResponse_AuthorizationCodeGrant = z.infer<
	typeof AccessTokenResponse_AuthorizationCodeGrant
>;

/**
 * https://datatracker.ietf.org/doc/html/rfc8628#section-3.4
 */
const AccessTokenRequest_DeviceCodeGrant = z.object({
	grant_type: z.literal("urn:ietf:params:oauth:grant-type:device_code"),
	device_code: z.string(),
	client_id: z.string()
});
type AccessTokenRequest_DeviceCodeGrant = z.infer<
	typeof AccessTokenRequest_DeviceCodeGrant
>;

export const runtime = "edge";

// https://datatracker.ietf.org/doc/html/rfc6749#section-2.3.1
// POST /token HTTP/1.1
// Host: server.example.com
// Content-Type: application/x-www-form-urlencoded
//
// grant_type=refresh_token&refresh_token=tGzv3JOkF0XG5Qx2TlKWIA
// &client_id=s6BhdRkqt3&client_secret=7Fjfp0ZBr1KtDRbnfVdmIw
export async function POST(request: NextRequest) {
	console.log("POST /oauth2/token");

	const formData = await request.formData();
	const grantType = formData.get("grant_type") as string;
	const payload = Object.fromEntries(formData.entries());
	console.log(payload);

	if (!grantType) {
		return NextResponse.json(
			{ error: "invalid_request", error_description: "Missing grant_type" },
			{ status: 400 }
		);
	}

	if (grantType === "password") {
		const payload = AccessTokenRequest_PasswordCredentialsGrant.parse({
			grant_type: formData.get("grant_type"),
			username: formData.get("username"),
			password: formData.get("password"),
			scope: formData.get("scope")
		});

		const { username, password } = payload;

		const [user] = await db
			.select()
			.from(schema.users)
			.where(
				and(
					eq(schema.users.username, username),
					eq(schema.users.password, password)
				)
			)
			.execute();

		const tok = await signToken(request, {
			sub: user.id,
			username: user.username
		});
		// cookies().set("__token", tok, { sameSite: true, secure: true });

		return NextResponse.json({
			access_token: tok,
			token_type: "Bearer",
			expires_in: 120, // 2m is hardcoded in signToken
			refresh_token: "refresh"
		} satisfies AccessTokenResponse_PasswordCredentialsGrant);
	}

	// https://datatracker.ietf.org/doc/html/rfc6749#section-4.1
	if (grantType === "authorization_code") {
		const payload = AccessTokenRequest_AuthorizationCodeGrant.parse({
			grant_type: formData.get("grant_type"),
			code: formData.get("code"),
			redirect_uri: formData.get("redirect_uri"),
			client_id: formData.get("client_id")
		});

		// TODO: Validate the authorization code
		// https://auth0.com/docs/get-started/authentication-and-authorization-flow/authorization-code-flow

		const tok = await signToken(request, { sub: payload.client_id });

		// TODO: persist the token in the database

		return NextResponse.json({
			access_token: tok,
			expires_in: 120, // 2m is hardcoded in signToken
			refresh_token: "test",
			token_type: "example"
		} satisfies AccessTokenResponse_AuthorizationCodeGrant);
	}
}
