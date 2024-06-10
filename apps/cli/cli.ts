import * as http from "node:http";
import { setTimeout } from "node:timers";
import { setTimeout as sleep } from "node:timers/promises";
import * as url from "node:url";

import * as p from "@clack/prompts";
import encodeQR from "@paulmillr/qr";
import open from "open";

// fixed client_id
// This is how the OAuth2 server identifies the client
const CLIENT_ID = "blah";

const localStore = {
	state: null,
	codeVerifier: null,
	codeChallenge: null
} satisfies Record<string, string>;

// See workers-sdk
// https://github.com/cloudflare/workers-sdk/blob/65902d5453f5e499d08bf29723f7ce96e0c8a96a/packages/wrangler/src/user/user.ts#L946
async function main() {
	console.clear();
	p.intro("CLI Auth");

	await sleep(1000);

	let server: http.Server;
	const serverPort = 8976;
	let loginTimeoutHandle: NodeJS.Timeout;

	const timerPromise = new Promise<boolean>((resolve) => {
		loginTimeoutHandle = setTimeout(() => {
			server.close();
			clearTimeout(loginTimeoutHandle);
			resolve(false);
		}, 120_000);
	});

	// start local server to facilitate OAuth2 Device Flow
	//
	// This will watch for browser redirects to localhost:8976/oauth/callback
	const loginPromise = new Promise<any>((resolve, reject) => {
		server = http.createServer(async (req, res) => {
			// helper to close the server and resolve/reject the promise
			function finish(result: any, error?: Error) {
				clearTimeout(loginTimeoutHandle);
				server.close((closeErr?: Error) => {
					if (error || closeErr) {
						reject(error || closeErr);
					} else {
						resolve(result);
					}
				});
			}

			// Reject requests
			if (req.method !== "GET") {
				return res.end("OK");
			}
			const { pathname, query } = url.parse(req.url!, true);
			if (pathname !== "/oauth/callback") {
				return res.end("OK");
			}

			//  Steps.

			res.writeHead(307, {
				Location: "http://localhost:3000/consent-granted"
			});
			res.end(() => {
				finish({});
			});
		});

		server.listen(serverPort, "localhost");
	});

	// OAuth server will return a verification URI,
	// Like youtube.com/activate,
	//   (note this redirects to https://accounts.google.com/o/oauth2/device/usercode)
	//   (note this is a public URL, so it can be opened in a browser)

	// wrangler opens :
	// Host: dash.cloudflare.com
	// Port:
	// Path: /oauth2/auth
	// Query Parameters:
	//   response_type:  code
	//   client_id:  54d11594-84e4-41aa-b438-e81b8fa78ee7
	//   redirect_uri:  http%3A%2F%2Flocalhost%3A8976%2Foauth%2Fcallback
	//   scope:  account%3Aread%20user%3Aread%20workers%3Awrite%20workers_kv%3Awrite%20workers_routes%3Awrite%20workers_scripts%3Awrite%20workers_tail%3Aread%20d1%3Awrite%20pages%3Awrite%20zone%3Aread%20ssl_certs%3Awrite%20constellation%3Awrite%20ai%3Awrite%20queues%3Awrite%20offline_access
	//   state:  0NGSFMdjLTmVRH0o4dotmpWT8k52vkuN
	//   code_challenge:  afGMpZUxVrHrJ28FFV3x7Hdl_C133Gin58k-Dzk9P50
	//   code_challenge_method:  S256

	// redirects to "https://dash.cloudflare.com/oauth/consent-form?consent_challenge=76559aa42711417380f53ab6612853f8"

	// Host: localhost
	// Port: 8976
	// Path: /oauth/callback
	// Query Parameters:
	//   code:  fwXIYfaoB9Of76vXEfPX_spakPMAFmjTWvZuNdQQw-k.a2685-o_6kqjmEg5zucGbWhEaZAU6DLWVaCQRgWHKeY
	//   scope:  account%3Aread%20user%3Aread%20workers%3Awrite%20workers_kv%3Awrite%20workers_routes%3Awrite%20workers_scripts%3Awrite%20workers_tail%3Aread%20d1%3Awrite%20pages%3Awrite%20zone%3Aread%20ssl_certs%3Awrite%20constellation%3Awrite%20ai%3Awrite%20queues%3Awrite%20offline_access
	//   state:  heqVN1LWIZvQ_FCcyI-lwsEl.2xcUp1D

	const authUrl = await getOAuth2_AuthURL({
		clientId: CLIENT_ID,
		redirectUri: `http://localhost:${serverPort}/oauth/callback`,
		scope: "do stuff"
	});

	// [CLI] starts server                http://localhost:8976
	//   generates authorization URL
	// <ACTION REQUIRED> - open URL
	//
	// [CLI] opens [Browser] @ [IdP] GET  http://localhost:3000/oauth2/auth    ?response_type=code&client_id=...&redirect_uri=...&scope=...&state=...&code_challenge=...&code_challenge_method=S256
	// [IdP] redirects to consent form    http://localhost:3000/oauth/consent
	// <ACTION REQUIRED> - click "Allow" (or 6 digit code?)
	//
	// [IdP] generates `code`?            (I'm not clear on where this step falls exactly, but seems like a code should only be generated after consent is granted)
	//
	// [Browser] redirected to [CLI] GET  http://localhost:8976/oauth/callback ?code=...&state=...&scope=...
	// [CLI] calls             [IdP] POST http://localhost:3000/oauth2/token   ?grant_type=authorization_code &code=...&redirect_uri=...&code_verifier=...&client_id=...
	// [IdP] processes request
	// [CLI] receives response
	// [CLI] closes server
	// [CLI] persists token to disk

	// wrangler includes `consent_challenge` in the URL - https://dash.cloudflare.com/oauth/consent-form?consent_challenge=76559aa42711417380f53ab6612853f8
	// the /oauth/consent-form page makes authenticated requests to the OAuth2 server to get the consent request
	const urlToVisit = authUrl;

	p.log.step(`Scan this QR code with your phone, or visit ${urlToVisit} to sign in.`);
	p.log.message(encodeQR(urlToVisit, "ascii", { scale: 1 }));
	// p.log.message(`And enter this code when prompted: ${deviceCodeResponseBody.user_code.toUpperCase()}`);

	const spinner = p.spinner();
	spinner.start("Waiting for device to be authorized...");

	const shouldOpenBrowser = await p.confirm({
		message: "Do you want to open the URL in your browser?",
		active: "YES",
		inactive: "no",
		initialValue: true
	});

	if (shouldOpenBrowser) {
		await openInBrowser(urlToVisit);
	}

	const success = await Promise.race([timerPromise, loginPromise]);
	if (!success) {
		spinner.stop("Timeout waiting for device to be authorized.", 1);
		return;
	}

	spinner.stop("Device authorized.", 0);
}

main();

async function openInBrowser(url: string): Promise<void> {
	const childProcess = await open(url);
	childProcess.on("error", () => {
		console.warn("Failed to open");
	});
}

interface PKCECodes {
	codeChallenge: string;
	codeVerifier: string;
}
const RECOMMENDED_STATE_LENGTH = 32;
const RECOMMENDED_CODE_VERIFIER_LENGTH = 96;
const PKCE_CHARSET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";

/**
 * Implements *base64url-encode* (RFC 4648 § 5) without padding, which is NOT
 * the same as regular base64 encoding.
 */
function base64urlEncode(value: string): string {
	let base64 = btoa(value);
	base64 = base64.replace(/\+/g, "-");
	base64 = base64.replace(/\//g, "_");
	base64 = base64.replace(/=/g, "");
	return base64;
}

/**
 * Generates a code_verifier and code_challenge, as specified in rfc7636.
 */
async function generatePKCECodes(): Promise<PKCECodes> {
	const output = new Uint32Array(RECOMMENDED_CODE_VERIFIER_LENGTH);
	crypto.getRandomValues(output);
	const codeVerifier = base64urlEncode(
		Array.from(output)
			.map((num: number) => PKCE_CHARSET[num % PKCE_CHARSET.length])
			.join("")
	);
	const buffer = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(codeVerifier));
	const hash = new Uint8Array(buffer);
	let binary = "";
	const hashLength = hash.byteLength;
	for (let i = 0; i < hashLength; i++) {
		binary += String.fromCharCode(hash[i]);
	}
	const codeChallenge = base64urlEncode(binary);
	return { codeChallenge, codeVerifier };
}

function generateRandomState(lengthOfState: number = RECOMMENDED_STATE_LENGTH): string {
	const output = new Uint32Array(lengthOfState);
	crypto.getRandomValues(output);
	return Array.from(output)
		.map((num: number) => PKCE_CHARSET[num % PKCE_CHARSET.length])
		.join("");
}

/**
 * side-effect: modifies {@link localStore}
 */
async function getOAuth2_AuthURL({ clientId, redirectUri, scope }) {
	const { codeVerifier, codeChallenge } = await generatePKCECodes();
	const state = generateRandomState();

	localStore.codeChallenge = codeChallenge;
	localStore.codeVerifier = codeVerifier;
	localStore.state = state;

	const url = new URL("/oauth2/auth", "http://localhost:3000");
	url.searchParams.set("response_type", "code");
	url.searchParams.set("client_id", clientId);
	url.searchParams.set("redirect_uri", redirectUri);
	url.searchParams.set("scope", scope);
	url.searchParams.set("state", state);
	url.searchParams.set("code_challenge", codeChallenge);
	url.searchParams.set("code_challenge_method", "S256");

	return url.toString();
}
