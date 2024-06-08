import { NextRequest, NextResponse, NextFetchEvent } from "next/server";
import { getRequestContext } from "@cloudflare/next-on-pages";
import { z } from "zod";

export const runtime = "edge";

const getResponse = z.object({
  challenge: z.string(),
  clientName: z.string(),
  logoURI: z.string(),
  scopes: z.array(z.string()),
  scopeInfo: z.record(
    z.object({
      name: z.string(),
      description: z.string(),
    })
  ),
  subject: z.string(),
  email: z.string(),
  kendoType: z.string(),
  accounts: z.array(z.string()),
  totalAccounts: z.number(),
  success: z.boolean(),
  errors: z.array(z.unknown()),
  messages: z.array(z.unknown()),
});
type GetResponse = z.infer<typeof getResponse>;

// GET /oauth2/consent?consent_challenge
export async function GET(request: NextRequest) {
  const consentChallenge =
    request.nextUrl.searchParams.get("consent_challenge");

  return NextResponse.json({ message: GET.name });
}

export async function POST(request: NextRequest) {
  console.log("POST /oauth2/consent");

  const formData = await request.formData();
  const otp = formData.get("otp") as string;
  console.log("  >>> otp:", otp);

  return NextResponse.json({
    code: "random_code",
    scope: "read write",
    state: "random_state",
  } satisfies { code: string; scope: string; state: string });
}
