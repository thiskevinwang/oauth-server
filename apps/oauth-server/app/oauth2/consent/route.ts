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
  // In the edge runtime you can use Bindings that are available in your application
  // (for more details see:
  //    - https://developers.cloudflare.com/pages/framework-guides/deploy-a-nextjs-site/#use-bindings-in-your-nextjs-application
  //    - https://developers.cloudflare.com/pages/functions/bindings/
  // )
  //
  // KV Example:
  // const myKv = getRequestContext().env.MY_KV_NAMESPACE
  // await myKv.put('suffix', ' from a KV store!')
  // const suffix = await myKv.get('suffix')
  // responseText += suffix

  return NextResponse.json({ message: POST.name });
}
