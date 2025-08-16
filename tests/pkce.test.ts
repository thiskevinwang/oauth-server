import { describe, it, expect } from "bun:test";
import { verifyCodeChallenge, base64url, sha256 } from "../src/pkce";

describe("PKCE", () => {
  it("verifies S256", () => {
    const verifier = "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk";
    const challenge = "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM";
    expect(verifyCodeChallenge(verifier, challenge, "S256")).toBe(true);
  });

  it("verifies plain", () => {
    expect(verifyCodeChallenge("abc", "abc", "plain")).toBe(true);
  });
});
