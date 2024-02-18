import { Hono } from "hono";
import { getCookie, setCookie } from "hono/cookie";
import { getRuntimeKey } from "hono/adapter";
import { showRoutes } from "hono/dev";
import { logger } from "hono/logger";

import encodeQR from "@paulmillr/qr";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";

import {
  verifyToken,
  signToken,
  generateJwk,
  unsafeDecodeToken,
} from "@/lib/auth";

import ui from "@/ui";

import type { Env } from "@/types";
import { CloudflareKV } from "@/storage/kv";

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
app.route("/device", ui);

// /oauth2 routes
// GET /oauth2/authorize
// POST /oauth2/token
// GET /oauth2/userInfo
// POST /oauth2/revoke
//
// https://datatracker.ietf.org/doc/html/rfc8628#section-3
// Device Authorization Request POST /device_authorization
// - "application/x-www-form-urlencoded"
// - "client_id" REQUIRED
// - "scope" OPTIONAL
//
// fetch("/device_authorization", {
//   method: "POST",
//   headers: {
//     "Content-Type": "application/x-www-form-urlencoded",
//   },
//   body: new URLSearchParams({
//     client_id: "s6BhdRkqt3",
//     scope: "read write",
//   }),
// });

interface DeviceAuthorizationResponse {
  /** "GmRhmhcxhwAzkoEqiMEg_DnyEysNkuNhszIySk9eS" */
  device_code: string;
  /** //"GmRhmhcxhwAzkoEqiMEg_DnyEysNkuNhszIySk9eS" */
  user_code: string;
  /** "https://example.com/device" */
  verification_uri: string;
  /** "https://example.com/device?user_code=WDJB-MJHT" */
  verification_uri_complete: string;
  /** 1800 (seconds) */
  expires_in: number;
  /** 5 (seconds) */
  interval: number;
}

/**
 * Authorization Code Grant
 * https://datatracker.ietf.org/doc/html/rfc6749#section-4.1.1
 */
const AuthorizationRequestCodeGrant = z.object({
  response_type: z.literal("code"),
  client_id: z.string(),
  redirect_uri: z.string().optional(),
  scope: z.string().optional(),
  state: z.string().optional(),
});
/**
 * Implicit Grant
 * https://datatracker.ietf.org/doc/html/rfc6749#section-4.2.1
 */
const AuthorizationRequestImplicitGrant = z.object({
  response_type: z.literal("token"),
  client_id: z.string(),
  redirect_uri: z.string().optional(),
  scope: z.string().optional(),
  state: z.string().optional(),
});

/**
 * Resource Owner Password Credentials Grant
 * https://datatracker.ietf.org/doc/html/rfc6749#section-4.3.1
 */
const AuthorizationRequestPasswordCredentialsGrant = z.object({
  // not in the spec
});
const AccessTokenRequestPasswordCredentialsGrant = z.object({
  grant_type: z.literal("password"),
  username: z.string(),
  password: z.string(),
  scope: z.string().optional(),
});
type AccessTokenRequestPasswordCredentialsGrant = z.infer<
  typeof AccessTokenRequestPasswordCredentialsGrant
>;

/**
 * Client Credentials Grant
 * https://datatracker.ietf.org/doc/html/rfc6749#section-4.4.1
 */
// Since the client authentication is used as the authorization grant,
// no additional authorization request is needed.

const DeviceAuthorizationRequest = z
  .object({
    client_id: z.string(),
    scope: z.string().optional(),
  })
  .strict();

/**
 * https://datatracker.ietf.org/doc/html/rfc6749#section-4.1.3
 */
const AccessTokenRequestAuthorizationCode = z.object({
  grant_type: z.literal("authorization_code"),
  code: z.string(),
  redirect_uri: z.string(),
  client_id: z.string(),
});

/**
 * https://datatracker.ietf.org/doc/html/rfc8628#section-3.4
 */
const DeviceAccessTokenRequest = z.object({
  grant_type: z.literal("urn:ietf:params:oauth:grant-type:device_code"),
  device_code: z.string(),
  client_id: z.string(),
});

app
  .route("/oauth2")
  .on(["GET"], "/authorize", (c) => {
    return c.text("TODO " + c.req.routePath);
  })
  .on(
    ["POST"],
    "/token",
    zValidator(
      "form",
      AccessTokenRequestPasswordCredentialsGrant.or(DeviceAccessTokenRequest)
    ),
    async (c) => {
      // check form data
      // todo check username and password against a stored value
      const body =
        await c.req.parseBody<AccessTokenRequestPasswordCredentialsGrant>();

      const tok = await signToken(c, {
        sub: body.username,
      });

      setCookie(c, "__token", tok, {
        sameSite: "Strict",
        secure: true,
      });
      return c.redirect("/oauth2/userInfo");
    }
  )
  .use("/userInfo/*", verifyToken)
  .on(["GET"], "/userInfo", (c) => {
    const token = getCookie(c, "__token")!;
    return c.json(unsafeDecodeToken(token));
  })
  .on(["POST"], "/revoke", (c) => {
    return c.text("TODO " + c.req.routePath);
  })
  .on(
    ["POST"],
    "/device_authorization",
    zValidator("form", DeviceAuthorizationRequest),
    async (c) => {
      const ct = c.req.header("Content-Type");
      // if (ct?.toLowerCase() !== "application/x-www-form-urlencoded") {
      //   return c.json(
      //     {
      //       error: "invalid_request",
      //       error_description: "Invalid Content-Type",
      //     },
      //     400
      //   );
      // }
      const reqBody = await c.req.parseBody();

      // ####-####
      const userCode =
        Math.random().toString(36).slice(2, 6) +
        "-" +
        Math.random().toString(36).slice(2, 6);

      // ex "GmRhmhcxhwAzkoEqiMEg_DnyEysNkuNhszIySk9eS"
      const deviceCode = Math.random().toString(36).slice(2, 32);

      const verificationUri = new URL(c.req.url).origin + "/device";
      const verificationUriComplete =
        new URL(c.req.url).origin + "/device?user_code=" + userCode;
      const expiresIn = 1800;
      const interval = 5;

      const storage = new CloudflareKV(c.env);
      // store a request
      await storage.put(
        deviceCode,
        {
          userCode,
          client_id: reqBody.client_id,
          scope: reqBody.scope,
          expires_in: expiresIn,
          interval,
        },
        { expirationTtl: expiresIn }
      );

      console.log(
        "Scan this QR code with your phone, or visit %s to sign in",
        verificationUri
      );
      console.log(encodeQR(verificationUri, "ascii", { scale: 1 }));
      console.log("And enter this code when prompted: %s", userCode);

      return c.html(encodeQR(verificationUri, "svg", {}));
    }
  );

// https://hono.dev/helpers/dev
showRoutes(app);

export default app;
