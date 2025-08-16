export type OAuthClient = {
  id: string;
  client_id: string;
  client_secret_hash: string | null; // null for public (PKCE-only) clients
  name: string;
  redirect_uris: string[];
  created_at: string;
};

export type User = {
  id: string;
  username: string;
  password_hash: string;
  created_at: string;
};

export type AuthorizationCode = {
  code: string;
  client_id: string;
  user_id: string;
  redirect_uri: string;
  scope: string | null;
  code_challenge: string | null;
  code_challenge_method: "S256" | "plain" | null;
  expires_at: string;
  consumed: boolean;
  created_at: string;
};

export type TokenResponse = {
  access_token: string;
  token_type: "Bearer";
  expires_in: number;
  refresh_token?: string;
  scope?: string;
};
