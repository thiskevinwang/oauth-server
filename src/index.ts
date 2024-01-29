import { Hono } from "hono";
import { getCookie, setCookie } from "hono/cookie";
import { getRuntimeKey } from "hono/adapter";
import { showRoutes } from "hono/dev";
import { logger } from "hono/logger";

import {
  verifyToken,
  signToken,
  generateJwk,
  unsafeDecodeToken,
} from "@/lib/auth";

import ui from "@/ui";

import type { Env } from "@/types";

const app = new Hono<{ Bindings: Env }>();
app.use("*", logger());

app.get("/", async (c) => {
  return c.json({
    runtimeKey: getRuntimeKey(),
    routes: app.routes.filter((r) => r.method !== "ALL"),
  });
});

// /.well-known routes
app
  .route("/.well-known")
  .on(["GET"], "/jwks.json", async (c) => {
    const jwk = await generateJwk(c);
    return c.json({
      keys: [jwk],
    });
  })
  .on(["GET"], "/openid-configuration", (c) => {
    return c.text("TODO " + c.req.routePath);
  });

// /UI routes
// GET /login
// GET /logout
app.route("/login", ui);
app.route("/logout", ui);

// /oauth2 routes
// GET /oauth2/authorize
// POST /oauth2/token
// GET /oauth2/userInfo
// POST /oauth2/revoke
app
  .route("/oauth2")
  .on(["GET"], "/authorize", (c) => {
    return c.text("TODO " + c.req.routePath);
  })
  .on(["POST"], "/token", async (c) => {
    // check form data
    // todo check username and password against a stored value
    const body = await c.req.parseBody<{
      username: string;
      password: string;
    }>();

    const tok = await signToken(c, {
      sub: body.username,
    });

    setCookie(c, "__token", tok, {
      sameSite: "Strict",
      secure: true,
    });
    return c.redirect("/oauth2/userInfo");
  })
  .use("/userInfo", verifyToken)
  .on(["GET"], "/userInfo", (c) => {
    const token = getCookie(c, "__token")!;
    return c.json(unsafeDecodeToken(token));
  })
  .on(["POST"], "/revoke", (c) => {
    return c.text("TODO " + c.req.routePath);
  });

// https://hono.dev/helpers/dev
// showRoutes(app);

export default app;
