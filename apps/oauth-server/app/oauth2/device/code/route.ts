// https://datatracker.ietf.org/doc/html/rfc8628#section-3.1
// POST /device_authorization

// https://auth0.com/docs/get-started/authentication-and-authorization-flow/device-authorization-flow
// UNSPECIFIED  /oauth/device/code

// https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-device-code
// POST /{tenant}/oauth2/v2.0/devicecode

import { NextRequest, NextResponse } from "next/server";
import { getRequestContext } from "@cloudflare/next-on-pages";

export const runtime = "edge";

interface DeviceAuthorizationResponse {
  /** A long string used to verify the session between the client and the authorization server. The client uses this parameter to request the access token from the authorization server. */
  device_code: string;
  /** A short string shown to the user used to identify the session on a secondary device. */
  user_code: string;
  /** The URI the user should go to with the user_code in order to sign in. */
  verification_uri: string;
  /** optional */
  verification_uri_complete?: string;
  /** The number of seconds before the device_code and user_code expire. */
  expires_in: number;
  /** A human-readable string with instructions for the user. This can be localized by including a query parameter in the request of the form ?mkt=xx-XX, filling in the appropriate language culture code. */
  message?: string;
}

export async function POST(request: NextRequest) {
  const env = getRequestContext().env as Env;
  const kv = env.DATASTORE;

  // TODO: where do these come from?
  // TODO: where do we persist these?
  // TODO: who reads these?
  const device_code = Math.random().toString(36).substring(7);
  const user_code = Math.random().toString(36).substring(7);
  const verification_uri = new URL(
    "/oauth/consent-form",
    request.url
  ).toString();
  const expires_in = 9999;

  return NextResponse.json({
    device_code,
    user_code,
    verification_uri,
    expires_in,
  } satisfies DeviceAuthorizationResponse);
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
