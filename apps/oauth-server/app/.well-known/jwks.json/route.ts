import { NextRequest, NextResponse } from "next/server";
// import { getRequestContext } from "@cloudflare/next-on-pages";

export const runtime = "edge";

import { generateJwk } from "@/lib/auth";

// GET /.well-known/jwks.json
export async function GET(request: NextRequest) {
  const jwk = await generateJwk(request);
  return NextResponse.json({ keys: [jwk] });
}
