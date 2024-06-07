import http from "node:http";
import { setTimeout as sleep } from "node:timers/promises";
import { setTimeout } from "node:timers";
import url from "node:url";

import open from "open";
import * as p from "@clack/prompts";
import encodeQR from "@paulmillr/qr";

// See workers-sdk
// https://github.com/cloudflare/workers-sdk/blob/65902d5453f5e499d08bf29723f7ce96e0c8a96a/packages/wrangler/src/user/user.ts#L946
async function main() {
  console.clear();
  p.intro("OAuth2 Device Flow!");

  await sleep(1000);

  let server: http.Server;
  let serverPort = 8976;
  let loginTimeoutHandle: NodeJS.Timeout;

  let oauthServerPort = 8787;
  let urlToOpen = `http://localhost:${oauthServerPort}/oauth2/consent-for,`;

  const timerPromise = new Promise<boolean>((resolve) => {
    loginTimeoutHandle = setTimeout(() => {
      server.close();
      clearTimeout(loginTimeoutHandle);
      resolve(false);
    }, 120_000);
  });

  // start local server to facilitate OAuth2 Device Flow
  const loginPromise = new Promise<boolean>((resolve, reject) => {
    server = http.createServer(async (req, res) => {
      console.log("[SERVER] Request", req.method, req.url);
      // helper to close the server and resolve/reject the promise
      function finish(status: boolean, error?: Error) {
        clearTimeout(loginTimeoutHandle);
        server.close((closeErr?: Error) => {
          if (error || closeErr) {
            reject(error || closeErr);
          } else {
            resolve(status);
          }
        });
      }

      const { pathname, query } = url.parse(req.url!, true);
      if (req.method !== "GET") {
        return res.end("OK");
      }
      if (pathname !== "/oauth/callback") {
        return res.end("OK");
      }

      const {
        // DUY_LKfwsC-adsWRosDIutCU73AzrnwwFM8ZrzWsLE0.fxJcTYn0PDWufjGiUtPlnhj_rtqMjfUIkA4awtkhWYc
        code,
        // account%3Aread%20user%3Aread%20workers%3Awrite%20workers_kv%3Awrite%20workers_routes%3Awrite%20workers_scripts%3Awrite%20workers_tail%3Aread%20d1%3Awrite%20pages%3Awrite%20zone%3Aread%20ssl_certs%3Awrite%20constellation%3Awrite%20ai%3Awrite%20queues%3Awrite%20offline_access
        scope,
        // bp4IFvXGb-CvW0grF8FXH5xBOQLABfD0
        state,
      } = query as Record<string, string>;

      // `exchangeAuthCodeForAccessToken()`
      // - reads LocalState.authorizationCode
      // - POST /oauth2/token?code=...&client_id=...&code_verifier(optional)=...&redirect_uri=...&grant_type=authorization_code

      const qs = new URLSearchParams({
        grant_type: "authorization_code",
        code,
        client_id: "my_test_app",
        redirect_uri: "http://localhost:8976/oauth/callback",
        code_verifier: "",
      });
      const tokenRequest = new Request(
        `http://localhost:3000/oauth2/token?${qs}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
        }
      );
      const response = await fetch(tokenRequest);
      if (response.status !== 200) {
        console.error(
          "[Server] Oauth server token endpoint responded with:",
          response.status,
          response.statusText
        );
      }

      const data = await response.json();
      console.log("[Server] Oauth server token endpoint responded with:", data);

      res.writeHead(307, {
        Location: "http://localhost:3000/consent-granted",
      });
      res.end(() => {
        finish(true);
      });
    });

    server.listen(serverPort, "localhost");
  });

  // generate URL To open
  const res = await fetch("http://localhost:3000/oauth2/device/code", {
    method: "POST",
    body: new URLSearchParams({
      client_id: "my_test_app",
      scope: "read write",
    }),
  });

  // https://auth0.com/docs/get-started/authentication-and-authorization-flow/device-authorization-flow#device-flow
  // https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-device-code#device-authorization-response
  const data = (await res.json()) as {
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
  };

  p.note(JSON.stringify(data, null, 2));

  // TODO
  // if browser is available, open the URL
  // urlToOpen = data.verification_uri;
  // await openInBrowser(data.verification_uri);

  // else display QR code
  p.log.step(
    `Scan this QR code with your phone, or visit ${data.verification_uri} to sign in.`
  );
  p.log.message(encodeQR(data.verification_uri, "ascii", { scale: 1 }));
  p.log.message(
    `And enter this code when prompted: ${data.user_code.toUpperCase()}`
  );
  const spinner = p.spinner();
  spinner.start(`Waiting for device to be authorized...`);

  const shouldOpenBrowser = await p.confirm({
    message: "Do you want to open the URL in your browser?",
    active: "YES",
    inactive: "no",
    initialValue: true,
  });
  if (p.isCancel(shouldOpenBrowser)) {
    return;
  }
  if (shouldOpenBrowser) {
    await openInBrowser(data.verification_uri);
  }

  const success = await Promise.race([timerPromise, loginPromise]);
  if (!success) {
    spinner.stop(`Timeout waiting for device to be authorized.`, 1);
    return;
  }

  spinner.stop(`Device authorized.`, 0);
}

main();

async function openInBrowser(url: string): Promise<void> {
  const childProcess = await open(url);
  childProcess.on("error", () => {
    console.warn("Failed to open");
  });
}
