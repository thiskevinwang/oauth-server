import { z } from "zod";

/**
 * GET /oauth2/auth
 *
 * Authorization Code Grant (response_type=code)  https://datatracker.ietf.org/doc/html/rfc6749#section-4.1.1
 * Implicit Grant (response_type=token) https://datatracker.ietf.org/doc/html/rfc6749#section-4.2.1
 * */
export const BaseAuthorizationRequest = z
	.object({
		response_type: z.enum(["code", "token"]),
		client_id: z.string(),
		redirect_uri: z.string().optional(), // 302 redirect to this upon success
		scope: z.string().optional(),
		state: z.string().optional()
	})
	.strict();

// https://datatracker.ietf.org/doc/html/rfc6749#section-4.1.2.1
export const CodeAuthorizationError = z.object({
	error: z.enum([
		"invalid_request",
		"unauthorized_client",
		"access_denied",
		"unsupported_response_type",
		"invalid_scope",
		"server_error",
		"temporarily_unavailable"
	]),
	error_description: z.string().optional(),
	error_uri: z.string().optional()
});

/**
 * @see {@link BaseAuthorizationRequest}
 *
 * @see [Proof Key for Code Exchange by OAuth Public Clients - Section 4.3](https://datatracker.ietf.org/doc/html/rfc7636#section-4.3)
 */
export const CodeAuthorizationRequest = BaseAuthorizationRequest.extend({
	response_type: z.literal("code")
}).extend({
	code_challenge: z.string().optional(),
	code_challenge_method: z.enum(["plain", "S256"]).optional()
});
export type CodeAuthorizationRequest = z.infer<typeof CodeAuthorizationRequest>;

/**
 * @see {@link BaseAuthorizationRequest}
 */
export const TokenAuthorizationRequest = BaseAuthorizationRequest.extend({
	response_type: z.literal("token")
});
export type TokenAuthorizationRequest = z.infer<typeof TokenAuthorizationRequest>;

/**
 * a convenience discriminated union type for {@link BaseAuthorizationRequest}
 */
export const AuthorizationRequest = z.discriminatedUnion("response_type", [
	CodeAuthorizationRequest,
	TokenAuthorizationRequest
]);

// to be appended to the redirect_uri + 302
export const CodeAuthorizationResponse = z.object({
	code: z.string(),
	state: z.string(),
	scope: z.string().optional()
});
export type CodeAuthorizationResponse = z.infer<typeof CodeAuthorizationResponse>;
