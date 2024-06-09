import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { verifyToken } from "@/lib/auth";

// export const runtime = "edge";

// This function can be marked `async` if using `await` inside
export async function middleware(request: NextRequest) {
	const originalUrl = request.nextUrl.toString();
	try {
		await verifyToken(request);
	} catch (e: any) {
		if ("error" in e) {
			console.log("middleware error", e);

			const loggedOut = new URL("/sign-in", request.url);
			loggedOut.searchParams.set("redirect", originalUrl);
			return NextResponse.redirect(loggedOut.toString());
		}
	}
	return NextResponse.next();
}

// https://nextjs.org/docs/app/building-your-application/routing/middleware
// See "Matching Paths" below to learn more
export const config = {
	matcher: [
		// Match any path
		"/oauth2/userInfo",
		"/oauth/consent-form"
	]
};
