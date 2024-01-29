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

async function ServerComp({ path, payload }: { path: string; payload: any }) {
  // await sleep(1000);
  return (
    <>
      <header class="border-b h-11 flex flex-row items-center px-8">
        <nav>{path}</nav>
      </header>

      <div class="mb-4" />

      <div class="max-w-96 mx-auto">
        <h1 class="mb-4 text-2xl">OAuth2</h1>

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
          Current token payload (from __token cookie)
          <pre class="rounded border">
            <code class="text-sm">{JSON.stringify(payload, null, 2)}</code>
          </pre>
        </div>
      </div>
    </>
  );
}

app.get("/", (c) => {
  const token = getCookie(c, "__token");
  const payload = token ? unsafeDecodeToken(token) : "";

  const stream = renderToReadableStream(
    <RootLayout>
      <Suspense fallback={<div>loading...</div>}>
        <ServerComp path={c.req.routePath} payload={payload} />
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
