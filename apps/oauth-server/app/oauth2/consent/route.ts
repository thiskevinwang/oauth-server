import { getRequestContext } from "@cloudflare/next-on-pages";
import { NextFetchEvent, type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { verifyToken } from "@/lib/auth";

export const runtime = "edge";

const getResponse = z.object({
	challenge: z.string(),
	clientName: z.string(),
	logoURI: z.string(),
	scopes: z.array(z.string()),
	scopeInfo: z.record(
		z.object({
			name: z.string(),
			description: z.string()
		})
	),
	subject: z.string(),
	email: z.string(),
	kendoType: z.string(),
	accounts: z.array(z.string()),
	totalAccounts: z.number(),
	success: z.boolean(),
	errors: z.array(z.unknown()),
	messages: z.array(z.unknown())
});
type GetResponse = z.infer<typeof getResponse>;

// GET /oauth2/consent?consent_challenge
export async function GET(request: NextRequest) {
	console.log("GET /oauth2/consent");
	// protected by middleware, so token SHOULD be present

	let userId;

	// verify
	try {
		const tok = await verifyToken(request);
		if (!tok.payload.sub) {
			return NextResponse.json({ message: "Invalid token" }, { status: 401 });
		}
		userId = tok.payload.sub;
	} catch (err) {
		console.error(err);
		return NextResponse.json({ message: "Invalid token" }, { status: 401 });
	}

	const consentChallenge = request.nextUrl.searchParams.get("consent_challenge");

	if (consentChallenge === "todo_consent_challenge") {
		return NextResponse.json({ message: "OK for now." });
	}

	return NextResponse.json({ message: "TODO: invalid consent_challenge" });
}

const requestSchema = z.object({
	decision: z.literal("accept"),
	challenge: z.string(),
	scopes: z.array(z.string())
});
export async function POST(request: NextRequest) {
	console.log("POST /oauth2/consent");

	const formData = await request.formData();
	const otp = formData.get("otp") as string;
	console.log("  >>> otp:", otp);

	return NextResponse.json({
		code: "random_code",
		scope: "read write",
		state: "random_state"
	} satisfies { code: string; scope: string; state: string });
}
