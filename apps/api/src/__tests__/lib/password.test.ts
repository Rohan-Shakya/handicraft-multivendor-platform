import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword } from "../../lib/password.js";

describe("password hashing", () => {
  it("hashes a password into a salt:hash string", async () => {
    const hash = await hashPassword("mypassword");
    expect(hash).toMatch(/^[a-f0-9]+:[a-f0-9]+$/);
  });

  it("two hashes of the same password are different (different salts)", async () => {
    const a = await hashPassword("same");
    const b = await hashPassword("same");
    expect(a).not.toBe(b);
  });

  it("verifies a correct password", async () => {
    const hash = await hashPassword("correct-horse");
    expect(await verifyPassword("correct-horse", hash)).toBe(true);
  });

  it("rejects an incorrect password", async () => {
    const hash = await hashPassword("correct-horse");
    expect(await verifyPassword("wrong-horse", hash)).toBe(false);
  });

  it("rejects an empty string against a real hash", async () => {
    const hash = await hashPassword("nonempty");
    expect(await verifyPassword("", hash)).toBe(false);
  });

  it("rejects a malformed hash string", async () => {
    expect(await verifyPassword("anything", "notahash")).toBe(false);
    expect(await verifyPassword("anything", "")).toBe(false);
    expect(await verifyPassword("anything", ":onlyhalf")).toBe(false);
  });

  it("does NOT produce the old insecure 'hashed:' prefix format", async () => {
    const hash = await hashPassword("test");
    expect(hash.startsWith("hashed:")).toBe(false);
  });
});
