import { Hono } from "hono";
import { getCookie } from "hono/cookie";
import { unsafeDecodeToken } from "./lib/auth";
import { renderToReadableStream, Suspense } from "hono/jsx/streaming";

import "./style.css";

const app = new Hono();

app.get("/", (c) => {
  const token = getCookie(c, "__token");
  const payload = token ? unsafeDecodeToken(token) : "";

  const stream = renderToReadableStream(
    <html>
      <head>
        <link rel="stylesheet" href="/style.css" />
      </head>

      <body class="max-w-96">
        <Suspense fallback={<div class={"bg-yellow-300"}>loading...</div>}>
          <h1 class="mb-4 text-2xl">OAuth2</h1>

          <form action="/oauth2/token" method="POST">
            <div class="space-y-4 flex flex-col max-w-96 p-8">
              <input
                type="text"
                name="username"
                placeholder="username"
                class="border rounded-md"
              />
              <input
                type="password"
                name="password"
                placeholder="password"
                class="border rounded-md"
              />
              <button type="submit" class="border rounded-md">
                Submit
              </button>
            </div>
          </form>
        </Suspense>

        <div>
          Current token payload (from __token cookie)
          <pre class="rounded border">
            <code class="text-sm">{JSON.stringify(payload, null, 2)}</code>
          </pre>
        </div>
      </body>
    </html>
  );

  return c.body(stream, {
    headers: {
      "Content-Type": "text/html; charset=UTF-8",
      "Transfer-Encoding": "chunked",
    },
  });
});

export default app;
