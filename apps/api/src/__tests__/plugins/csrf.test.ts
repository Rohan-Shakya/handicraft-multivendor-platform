import { describe, expect, it } from "vitest";
import { mintCsrfToken } from "../../plugins/csrf.js";
import crypto from "node:crypto";

const SECRET = "csrf-test-secret-key";

function signParts(salt: string, issued: string, secret: string): string {
  return crypto.createHmac("sha256", secret).update(`${salt}.${issued}`).digest("hex");
}

describe("CSRF token minting", () => {
  it("produces a three-part token: salt.issued.hmac", () => {
    const t = mintCsrfToken(SECRET);
    expect(t.split(".")).toHaveLength(3);
  });

  it("hmac segment can be re-derived from salt + issued + secret", () => {
    const token = mintCsrfToken(SECRET);
    const [salt, issued, hmac] = token.split(".") as [string, string, string];
    const expected = signParts(salt, issued, SECRET);
    expect(hmac).toBe(expected);
  });

  it("does not sign correctly with a different secret", () => {
    const token = mintCsrfToken(SECRET);
    const [salt, issued, hmac] = token.split(".") as [string, string, string];
    const wrong = signParts(salt, issued, "wrong-secret");
    expect(hmac).not.toBe(wrong);
  });

  it("issues distinct tokens on each call", () => {
    const a = mintCsrfToken(SECRET);
    const b = mintCsrfToken(SECRET);
    expect(a).not.toBe(b);
  });
});
