import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { getRequestContext } from "@cloudflare/next-on-pages";
import { z } from "zod";

import { signToken } from "@/lib/auth";

/**
 * Resource Owner Password Credentials Grant
 * https://datatracker.ietf.org/doc/html/rfc6749#section-4.3.1
 */
const AccessTokenRequest_PasswordCredentialsGrant = z.object({
  grant_type: z.literal("password"),
  username: z.string(),
  password: z.string(),
  scope: z.string().nullable().optional(),
});

/**
 * https://datatracker.ietf.org/doc/html/rfc6749#section-4.1.3
 */
const AccessTokenRequest_AuthorizationCodeGrant = z.object({
  grant_type: z.literal("authorization_code"),
  code: z.string(),
  redirect_uri: z.string(),
  client_id: z.string(),
});

/**
 * https://datatracker.ietf.org/doc/html/rfc8628#section-3.4
 */
const AccessTokenRequest_DeviceCodeGrant = z.object({
  grant_type: z.literal("urn:ietf:params:oauth:grant-type:device_code"),
  device_code: z.string(),
  client_id: z.string(),
});

export const runtime = "edge";

// https://datatracker.ietf.org/doc/html/rfc6749#section-2.3.1
// POST /token HTTP/1.1
// Host: server.example.com
// Content-Type: application/x-www-form-urlencoded
//
// grant_type=refresh_token&refresh_token=tGzv3JOkF0XG5Qx2TlKWIA
// &client_id=s6BhdRkqt3&client_secret=7Fjfp0ZBr1KtDRbnfVdmIw
export async function POST(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;

  const payload = AccessTokenRequest_PasswordCredentialsGrant.parse({
    grant_type: searchParams.get("grant_type"),
    username: searchParams.get("username"),
    password: searchParams.get("password"),
    scope: searchParams.get("scope"),
  });

  // TODO: Validate the user's credentials

  const tok = await signToken(request, { sub: payload.username });
  cookies().set("__token", tok, { sameSite: true, secure: true });

  // not part of spec. Just redirect to smoke test cookie setting & parsing
  return NextResponse.redirect(new URL("/oauth2/userInfo", request.url), {
    status: 307,
  });
}
