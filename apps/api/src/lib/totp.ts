/**
 * TOTP 2FA utilities — setup, verification, backup codes.
 */
import * as OTPAuth from "otpauth";
import crypto from "crypto";
import { hashPassword, verifyPassword } from "./password.js";

const ISSUER = "MultiVendor Store";

/**
 * Generate a new TOTP secret and provisioning URI.
 */
export function generateTotpSecret(accountName: string): {
  secret: string;
  uri: string;
} {
  const totp = new OTPAuth.TOTP({
    issuer: ISSUER,
    label: accountName,
    algorithm: "SHA1",
    digits: 6,
    period: 30,
  });

  return {
    secret: totp.secret.base32,
    uri: totp.toString(),
  };
}

/**
 * Verify a TOTP code against a secret.
 * Allows 1 period of drift (30 seconds window).
 */
export function verifyTotpCode(secret: string, code: string): boolean {
  const totp = new OTPAuth.TOTP({
    issuer: ISSUER,
    algorithm: "SHA1",
    digits: 6,
    period: 30,
    secret: OTPAuth.Secret.fromBase32(secret),
  });

  // delta = null means invalid, number means valid with that time offset
  const delta = totp.validate({ token: code, window: 1 });
  return delta !== null;
}

/**
 * Generate backup codes for 2FA recovery.
 * Returns raw codes (show to user) and hashed codes (store in DB).
 */
export async function generateBackupCodes(count = 8): Promise<{
  rawCodes: string[];
  hashedCodes: string[];
}> {
  const rawCodes: string[] = [];
  const hashedCodes: string[] = [];

  for (let i = 0; i < count; i++) {
    const code = crypto.randomBytes(4).toString("hex").toUpperCase();
    const formatted = `${code.slice(0, 4)}-${code.slice(4)}`;
    rawCodes.push(formatted);
    hashedCodes.push(await hashPassword(formatted));
  }

  return { rawCodes, hashedCodes };
}

/**
 * Verify a backup code against stored hashed codes.
 * Returns the index of the matched code, or -1 if not found.
 */
export async function verifyBackupCode(
  code: string,
  hashedCodes: string[],
  usedCodes: string[]
): Promise<number> {
  for (let i = 0; i < hashedCodes.length; i++) {
    if (usedCodes.includes(hashedCodes[i]!)) continue;
    const matches = await verifyPassword(code, hashedCodes[i]!);
    if (matches) return i;
  }
  return -1;
}
