import { describe, it, expect } from "vitest";
import {
  generateTotpSecret,
  verifyTotpCode,
  generateBackupCodes,
  verifyBackupCode,
} from "../../lib/totp.js";

describe("TOTP 2FA utilities", () => {
  describe("generateTotpSecret", () => {
    it("generates a secret and URI", () => {
      const result = generateTotpSecret("admin@store.com");
      expect(result.secret).toBeTruthy();
      expect(result.secret.length).toBeGreaterThan(10);
      expect(result.uri).toContain("otpauth://totp/");
      expect(result.uri).toContain("admin%40store.com");
    });

    it("generates different secrets each time", () => {
      const a = generateTotpSecret("test@test.com");
      const b = generateTotpSecret("test@test.com");
      expect(a.secret).not.toBe(b.secret);
    });
  });

  describe("verifyTotpCode", () => {
    it("returns false for invalid code", () => {
      const { secret } = generateTotpSecret("test@test.com");
      expect(verifyTotpCode(secret, "000000")).toBe(false);
      expect(verifyTotpCode(secret, "123456")).toBe(false);
    });

    it("returns false for empty code", () => {
      const { secret } = generateTotpSecret("test@test.com");
      expect(verifyTotpCode(secret, "")).toBe(false);
    });
  });

  describe("generateBackupCodes", () => {
    it("generates 8 codes by default", async () => {
      const { rawCodes, hashedCodes } = await generateBackupCodes();
      expect(rawCodes).toHaveLength(8);
      expect(hashedCodes).toHaveLength(8);
    });

    it("generates specified number of codes", async () => {
      const { rawCodes, hashedCodes } = await generateBackupCodes(4);
      expect(rawCodes).toHaveLength(4);
      expect(hashedCodes).toHaveLength(4);
    });

    it("raw codes are formatted as XXXX-XXXX", async () => {
      const { rawCodes } = await generateBackupCodes(1);
      expect(rawCodes[0]).toMatch(/^[A-F0-9]{4}-[A-F0-9]{4}$/);
    });

    it("hashed codes differ from raw codes", async () => {
      const { rawCodes, hashedCodes } = await generateBackupCodes(1);
      expect(hashedCodes[0]).not.toBe(rawCodes[0]);
      expect(hashedCodes[0]!.length).toBeGreaterThan(rawCodes[0]!.length);
    });
  });

  describe("verifyBackupCode", () => {
    it("verifies a valid backup code", async () => {
      const { rawCodes, hashedCodes } = await generateBackupCodes(3);
      const index = await verifyBackupCode(rawCodes[1]!, hashedCodes, []);
      expect(index).toBe(1);
    });

    it("rejects an invalid code", async () => {
      const { hashedCodes } = await generateBackupCodes(3);
      const index = await verifyBackupCode("XXXX-XXXX", hashedCodes, []);
      expect(index).toBe(-1);
    });

    it("rejects a used code", async () => {
      const { rawCodes, hashedCodes } = await generateBackupCodes(3);
      const usedCodes = [hashedCodes[1]!];
      const index = await verifyBackupCode(rawCodes[1]!, hashedCodes, usedCodes);
      expect(index).toBe(-1);
    });

    it("accepts unused codes when others are used", async () => {
      const { rawCodes, hashedCodes } = await generateBackupCodes(3);
      const usedCodes = [hashedCodes[0]!];
      const index = await verifyBackupCode(rawCodes[2]!, hashedCodes, usedCodes);
      expect(index).toBe(2);
    });
  });
});
