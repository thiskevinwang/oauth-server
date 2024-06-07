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
      console.log("[SERVER] Request", req.url, req.method);
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
      // `isReturningFromAuthServer(query)` - mutates LocalState
      // - authorizationCode = ?code
      // - hasAuthCodeBeenExchangedForAccessToken = false
      //
      // HACK: assume oauth-server has redirected to localhost:8976 with a request like:
      //
      // Protocol: http
      // Host: localhost
      // Port: 8976
      // Path: /oauth/callback
      // Query Parameters:
      //   code:  DUY_LKfwsC-adsWRosDIutCU73AzrnwwFM8ZrzWsLE0.fxJcTYn0PDWufjGiUtPlnhj_rtqMjfUIkA4awtkhWYc
      //   scope:  account%3Aread%20user%3Aread%20workers%3Awrite%20workers_kv%3Awrite%20workers_routes%3Awrite%20workers_scripts%3Awrite%20workers_tail%3Aread%20d1%3Awrite%20pages%3Awrite%20zone%3Aread%20ssl_certs%3Awrite%20constellation%3Awrite%20ai%3Awrite%20queues%3Awrite%20offline_access
      //   state:  bp4IFvXGb-CvW0grF8FXH5xBOQLABfD0

      // `exchangeAuthCodeForAccessToken()`
      // - reads LocalState.authorizationCode
      // - POST /oauth2/token?code=...&client_id=...&code_verifier(optional)=...&redirect_uri=...&grant_type=authorization_code

      const code = query.code as string;
      const params = new URLSearchParams({
        grant_type: "authorization_code",
        code,
        client_id: "my_test_app",
        redirect_uri: "http://localhost:8976/oauth/callback",
        code_verifier: "",
      });
      const request = new Request("http://localhost:8787/oauth2/token", {
        method: "POST",
        body: params.toString(),
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      });
      const response = await fetch(request);
    });

    server.listen(serverPort, "localhost");
  });

  // generate URL To open
  const res = await fetch("http://localhost:8787/oauth2/device_authorization", {
    method: "POST",
    body: new URLSearchParams({
      client_id: "my_test_app",
      scope: "read write",
    }),
  });
  const data = await res.json();
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

  return Promise.race([timerPromise, loginPromise]);

  let error = null;
  let token = null;
  let interval = data.interval * 1000;
  let expires = data.expires_in * 1000;
  let start = Date.now();

  let iterations = 0;
  do {
    try {
      const res = await fetch("http://localhost:8787/oauth2/token", {
        method: "POST",
        body: new URLSearchParams({
          client_id: "my_test_app",
          device_code: data.device_code,
          grant_type: "urn:ietf:params:oauth:grant-type:device_code",
        }),
      });
      const response = await res.json();
      if (response.error == "authorization_pending") {
        return;
      }
    } catch (e) {
      error = e;
    }

    await setTimeout(interval);
  } while (Date.now() - start < expires && token === null && error === null);

  if (error) {
    spinner.stop(`Error fetching token: ${error}`, 1);
    return;
  }
  if (!token) {
    spinner.stop(`No token received`, 1);
    return;
  }
  spinner.stop(`Token received: ${JSON.stringify(token)}`, 0);

  p.outro("Done.");
}

main();

async function openInBrowser(url: string): Promise<void> {
  const childProcess = await open(url);
  childProcess.on("error", () => {
    console.warn("Failed to open");
  });
}
