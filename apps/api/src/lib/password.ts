import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);

const SALT_BYTES = 16;
const KEY_BYTES = 64;

/**
 * Hash a plaintext password using scrypt.
 * Returns a `salt:derivedKey` string, both hex-encoded.
 * No external dependency — uses Node built-in crypto.
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_BYTES).toString("hex");
  const derived = (await scryptAsync(password, salt, KEY_BYTES)) as Buffer;
  return `${salt}:${derived.toString("hex")}`;
}

/**
 * Verify a password against a stored hash.
 * Uses timing-safe comparison to prevent timing attacks.
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const separatorIndex = hash.indexOf(":");
  if (separatorIndex === -1) return false;

  const salt = hash.slice(0, separatorIndex);
  const storedHex = hash.slice(separatorIndex + 1);

  if (!salt || !storedHex) return false;

  try {
    const derived = (await scryptAsync(password, salt, KEY_BYTES)) as Buffer;
    const stored = Buffer.from(storedHex, "hex");
    if (derived.length !== stored.length) return false;
    return timingSafeEqual(derived, stored);
  } catch {
    return false;
  }
}
