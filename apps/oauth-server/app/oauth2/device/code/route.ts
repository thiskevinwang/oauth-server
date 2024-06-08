// https://datatracker.ietf.org/doc/html/rfc8628#section-3.1
// POST /device_authorization

// https://auth0.com/docs/get-started/authentication-and-authorization-flow/device-authorization-flow
// UNSPECIFIED  /oauth/device/code

// https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-device-code
// POST /{tenant}/oauth2/v2.0/devicecode

import { NextRequest, NextResponse } from "next/server";

import { getRequestContext } from "@cloudflare/next-on-pages";
import { drizzle } from "drizzle-orm/d1";
import { eq, and } from "drizzle-orm";
import * as schema from "@/db/schema";
const d1 = getRequestContext().env.DB;
const db = drizzle(d1, { schema });

export const runtime = "edge";

interface DeviceCodeResponseBody {
  /** A long string used to verify the session between the client and the authorization server. The client uses this parameter to request the access token from the authorization server. */
  device_code: string;
  /** A short string shown to the user used to identify the session on a secondary device. */
  user_code: string;
  /** The URI the user should go to with the user_code in order to sign in. */
  verification_uri: string;
  /** optional */
  verification_uri_complete?: string | null;
  /** The number of seconds before the device_code and user_code expire. */
  expires_in: number;
  /** A human-readable string with instructions for the user. This can be localized by including a query parameter in the request of the form ?mkt=xx-XX, filling in the appropriate language culture code. */
  message?: string;
}

// {
//   "device_code": "GmRhmzG93oWmDrlF3aSjw4:device_code",
//   "user_code": "WDJB-MJHT: user_code",
//   "verification_uri": "https://example.com/device",
//   "verification_uri_complete": "https://example.com/device?user_code=WDJB-MJHT",
//   "expires_in": 1800,
//   "interval": 5
// }
// device_code: A long-lived code used by the device to poll the authorization server.
// user_code: A short, user-friendly code that the user will input on another device with a better user interface (like a smartphone or computer).
// verification_uri: The URI where the user should navigate to enter the user_code.
// verification_uri_complete: A pre-filled URI that includes the user_code.
// expires_in: The time in seconds until the device_code and user_code expire.
// interval: The minimum amount of time in seconds that the device should wait between polling requests.

function randomString(length: number) {
  return crypto
    .getRandomValues(new Uint8Array(length))
    .reduce(
      (acc, val) => acc + "abcdefghijklmnopqrstuvwxyz0123456789"[val % 36],
      ""
    );
}

export async function POST(request: NextRequest) {
  console.log("POST /oauth2/device/code");
  // <<< incoming request
  //     content type: "application/x-www-form-urlencoded"
  const body = await request.formData();
  const client_id = body.get("client_id") as string;

  console.log("client_id", client_id);

  // <<< validate request
  if (!client_id) {
    return NextResponse.json(
      { error: "invalid_request", error_description: "client_id is required" },
      { status: 400 }
    );
  }

  // >>> BOOTSTRAP database with client
  if (client_id === "local_2hbrqu5MwiG5fjEk0HGfMG4KpEh") {
    const [client] = await db
      .insert(schema.clients)
      .values({
        clientId: client_id,
        name: "Local Client",
      })
      .returning()
      .onConflictDoNothing()
      .execute();
  }

  // if (!client) {
  //   return NextResponse.json(
  //     { error: "invalid_client", error_description: "client_id is invalid" },
  //     { status: 400 }
  //   );
  // }

  // >>> to database
  //     device_code, user_code, verification_uri, client_id
  const deviceCode = randomString(22);
  const userCode = randomString(6);
  const verificationUri = new URL("/oauth/consent-form", request.url);
  const verificationUriComplete = new URL(verificationUri);
  verificationUriComplete.searchParams.set("user_code", userCode);
  const expiresIn = 3600;

  const [result] = await db
    .insert(schema.devices)
    .values({
      clientId: client_id,
      deviceCode,
      userCode,
      verificationUri: verificationUri.toString(),
      verificationUriComplete: verificationUriComplete.toString(),
      expiresIn,
    })
    .returning()
    .execute();

  // >>> outgoing response
  return NextResponse.json({
    device_code: result.deviceCode,
    user_code: result.userCode,
    verification_uri: result.verificationUri,
    verification_uri_complete: result.verificationUriComplete,
    expires_in: result.expiresIn,
  } satisfies DeviceCodeResponseBody);
}

// note: npx wrangler login
//
// 54d11594-84e4-41aa-b438-e81b8fa78ee7 is a hardcoded client_id used to identify Wrangler
// to Cloudflare Production
//
// Protocol: https
// Host: dash.cloudflare.com
// Port:
// Path: /oauth2/auth
// Query Parameters:
//   response_type:  code
//   client_id:  54d11594-84e4-41aa-b438-e81b8fa78ee7
//   redirect_uri:  http%3A%2F%2Flocalhost%3A8976%2Foauth%2Fcallback
//   scope:  account%3Aread%20user%3Aread%20workers%3Awrite%20workers_kv%3Awrite%20workers_routes%3Awrite%20workers_scripts%3Awrite%20workers_tail%3Aread%20d1%3Awrite%20pages%3Awrite%20zone%3Aread%20ssl_certs%3Awrite%20constellation%3Awrite%20ai%3Awrite%20queues%3Awrite%20offline_access
//   state:  RCXrb66j33SRJdYoB_e8mmdf-Due_.I4
//   code_challenge:  yEm2DpB9Q1McXZsS_zZEfoYA5Bj3T8nQll4snBTO0-k
//   code_challenge_method:  S256
