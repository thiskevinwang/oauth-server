import { type NextRequest, NextResponse } from "next/server";
// import { getRequestContext } from "@cloudflare/next-on-pages";

export const runtime = "edge";

// GET /.well-known/openid-configuration.json
// ex. https://accounts.google.com/.well-known/openid-configuration
export async function GET(request: NextRequest) {
	return NextResponse.json({
		issuer: "http://localhost:3000",
		authorization_endpoint: "http://localhost:3000/oauth2/auth",
		device_authorization_endpoint: "http://localhost:3000/oauth2/device/code",
		token_endpoint: "http://localhost:3000/oauth2/token",
		userinfo_endpoint: "http://localhost:3000/oauth2/userInfo",
		revocation_endpoint: "http://localhost:3000/oauth2/revoke",
		jwks_uri: "http://localhost:3000/.well-known/jwks.json"
	});
}
