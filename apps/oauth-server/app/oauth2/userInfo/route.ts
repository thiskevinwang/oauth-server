import { NextRequest, NextResponse } from "next/server";
import { getRequestContext } from "@cloudflare/next-on-pages";

import { verifyToken } from "@/lib/auth";

export const runtime = "edge";

export async function GET(request: NextRequest) {
  console.log("GET /oauth2/userInfo");
  try {
    const res = await verifyToken(request);

    return NextResponse.json({ res });
  } catch (e: any) {
    return NextResponse.json({ error: e });
  }
}

export async function POST(request: NextRequest) {
  console.log("POST /oauth2/userInfo");
  try {
    const res = await verifyToken(request);

    return NextResponse.json({ res });
  } catch (e: any) {
    return NextResponse.json({ error: e });
  }
}
