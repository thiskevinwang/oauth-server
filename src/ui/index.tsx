import { Hono } from "hono";
import { getCookie } from "hono/cookie";
import { renderToReadableStream, Suspense } from "hono/jsx/streaming";

import { unsafeDecodeToken } from "@/lib/auth";

const app = new Hono();

const sleep = (delay: number) =>
  new Promise((resolve) => setTimeout(resolve, delay));

function RootLayout({ children }: { children: any }) {
  return (
    <html>
      <head>
        <link rel="stylesheet" href="/style.css" />
      </head>
      <body>{children}</body>
    </html>
  );
}

async function ServerComp({ path, data }: { path: string; data: any }) {
  // await sleep(1000);
  return (
    <>
      <header class="border-b h-11 flex flex-row items-center px-8">
        <nav>{path}</nav>
      </header>

      <div class="mb-4" />

      <div class="max-w-96 mx-auto">
        <h1 class="mb-4 text-2xl">OAuth2 Server</h1>

        <aside class="mb-4 text-sm">
          This is a proof of concept for implementing an OAuth server (as
          specified in{" "}
          <a
            class="underline text-blue-500"
            href="https://www.rfc-editor.org/rfc/rfc6749.html"
          >
            RFC6749
          </a>
          ).{" "}
          <span class="text-rose-800 bg-rose-200 rounded-lg px-2">
            This is incomplete and for demonstration purposes only!
          </span>
        </aside>

        <aside class="mb-4 text-sm space-y-2">
          <p>
            The form below will create a signed RS256 JWT that is valid for 2
            minutes.
          </p>
          <p>
            The private key used for signing is stored in, and retrieved from
            HCP Vault:{" "}
            <a
              class="underline text-blue-500"
              href="https://vault.thekevinwang.com"
            >
              vault.thekevinwang.com
            </a>
            .{" "}
            <span class="text-amber-800 bg-amber-200 rounded-lg px-2">
              As long as this Vault instance is live, this POC will{" "}
              <i>just work</i>.
            </span>
          </p>
          <p>
            The public key is publicly available at{" "}
            <a class="underline text-blue-500" href="/.well-known/jwks.json">
              /.well-known/jwks.json
            </a>
            , in JSON Web Key (JWK) format (as specified in{" "}
            <a
              class="underline text-blue-500"
              href="https://datatracker.ietf.org/doc/html/rfc7517"
            >
              RFC 7517
            </a>
            ) .
          </p>
        </aside>

        <form action="/oauth2/token" method="POST">
          <div class="space-y-4 flex flex-col">
            <input
              type="text"
              name="username"
              placeholder="username"
              class="border rounded-md p-1"
              data-1p-ignore
            />
            <input
              type="password"
              name="password"
              placeholder="password (optional)"
              class="border rounded-md p-1"
              data-1p-ignore
            />

            <button type="submit" class="border rounded-md p-1">
              Submit
            </button>
          </div>
        </form>

        <div class="border-t mb-8 border-dashed"></div>

        <div>
          <p class="text-sm">
            Current token, decoded from the <code>__token</code> cookie.
          </p>
          <pre class="rounded border">
            <code class="text-sm">{JSON.stringify(data, null, 2)}</code>
          </pre>
        </div>
      </div>

      <footer class="border-t mt-8 flex flex-row items-center justify-end px-8 py-2">
        <p class="text-xs">
          Source code:&nbsp;
          <a
            class="underline text-blue-500"
            href="https://github.com/thiskevinwang/oauth-server"
          >
            https://github.com/thiskevinwang/oauth-server
          </a>
        </p>
      </footer>
    </>
  );
}

app.get("/", (c) => {
  const cookie = getCookie(c, "__token");
  const token = cookie ? unsafeDecodeToken(cookie) : "";

  const stream = renderToReadableStream(
    <RootLayout>
      <Suspense fallback={<div>loading...</div>}>
        <ServerComp path={c.req.routePath} data={token} />
      </Suspense>
    </RootLayout>
  );

  return c.body(stream, {
    headers: {
      "Content-Type": "text/html; charset=UTF-8",
      "Transfer-Encoding": "chunked",
    },
  });
});

export default app;
