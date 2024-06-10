import { type NextRequest, NextResponse } from "next/server";

import * as $ from "@/req-res-schemas";

import { unsafeDecodeToken, verifyToken } from "@/lib/auth";

import * as schema from "@/db/schema";
import { getRequestContext } from "@cloudflare/next-on-pages";
import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
const d1 = getRequestContext().env.DB;
const db = drizzle(d1, { schema });

export const runtime = "edge";

/**
 * [Authorization Endpoint](https://datatracker.ietf.org/doc/html/rfc6749#section-3.1)
 */
export async function GET(request: NextRequest) {
	console.log("GET /oauth2/auth");

	const decoded = await verifyToken(request);
	// should not happen; middleware should catch this
	if ("error" in decoded) {
		return NextResponse.json(decoded, { status: 401 });
	}

	// biome-ignore lint/style/noNonNullAssertion: sub is guaranteed to be present
	const userId = decoded.payload.sub!;

	const searchParams = Object.fromEntries(request.nextUrl.searchParams.entries());
	const params = $.AuthorizationRequest.parse(searchParams);

	// validate client_it
	const [client] = await db
		.select()
		.from(schema.clients)
		.where(and(eq(schema.clients.clientId, searchParams.client_id)))
		.execute();
	if (!client) {
		const redirectUri = new URL("/oauth/error", request.url);
		redirectUri.searchParams.set("error", "invalid_client");
		redirectUri.searchParams.set("error_description", "Client authentication failed.");
		redirectUri.searchParams.set("error_hint", "client not found");
		return NextResponse.redirect(redirectUri, { status: 302 });
	}

	switch (params.response_type) {
		case "code": {
			// TODO 🤔 if Client ID is CLI, redirect to /oauth/consent-form, but does this infinitely stop the CLI client from proceeding??
			if (params.client_id === CLIENT_ID) {
				const redirectUri = new URL("/oauth/consent-form", "http://localhost:3000");
				redirectUri.searchParams.set("consent_challenge", "todo_consent_challenge");
				return NextResponse.redirect(redirectUri, { status: 302 });
			}

			const response = await handleCodeRequest(params, { userId });
			const search = new URLSearchParams(response);

			// biome-ignore lint/style/noNonNullAssertion: redirect_uri _should be_ present
			const redirectUri = new URL(params.redirect_uri!);
			redirectUri.search = search.toString();
			return NextResponse.redirect(redirectUri, { status: 302 });
		}
		case "token": {
			const response = await handleTokenRequest(params);
			return NextResponse.json(response);
		}
	}
}

const CLIENT_ID = "local_2hbrqu5MwiG5fjEk0HGfMG4KpEh";

// https://datatracker.ietf.org/doc/html/rfc6749#section-4.1.1
async function handleCodeRequest(
	{ client_id, redirect_uri, scope, state, code_challenge, code_challenge_method }: $.CodeAuthorizationRequest,
	{ userId }: { userId: string }
) {
	// generate code and store it in the database ("authorization_codes")

	const code = `super_secret_code_just_for_testing:${Date.now()}`;

	const [record] = await db
		.insert(schema.authorizationCodes)
		.values({
			code,
			clientId: client_id,
			codeChallenge: code_challenge,
			codeChallengeMethod: code_challenge_method,
			expiresAtMs: Date.now() + 60 * 60 * 1_000, // 1 hour
			userId,
			scopes: null
		})
		.returning()
		.execute();

	const response = {
		code: record.code,
		state: state as string,
		scope: scope as string
	};
	// to be appended to the redirect_uri
	return response;
}

// https://datatracker.ietf.org/doc/html/rfc6749#section-4.2.1
async function handleTokenRequest({ client_id, redirect_uri, scope, state }: $.TokenAuthorizationRequest) {
	return {};
}
