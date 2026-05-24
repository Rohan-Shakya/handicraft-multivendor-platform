/**
 * Form validation helpers used across the storefront (register, checkout,
 * reset-password). Centralized so every form enforces the same rules.
 */

export type ValidationError = { field: string; message: string };

/**
 * Score a password 0-4 based on length + character-class variety.
 * 0 = very weak, 4 = strong. UI uses this to render a strength meter.
 */
export function passwordStrength(password: string): {
  score: 0 | 1 | 2 | 3 | 4;
  label: string;
  reasons: string[];
} {
  const reasons: string[] = [];
  let score = 0;

  if (password.length >= 8) score++;
  else reasons.push("At least 8 characters");

  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  else reasons.push("Mix of upper and lowercase");

  if (/\d/.test(password)) score++;
  else reasons.push("At least one digit");

  if (/[^\w\s]/.test(password)) score++;
  else reasons.push("At least one symbol");

  // Penalize the most common passwords.
  const blacklist = new Set([
    "password",
    "password1",
    "12345678",
    "qwerty123",
    "letmein",
    "welcome1",
  ]);
  if (blacklist.has(password.toLowerCase())) {
    score = 0;
    reasons.unshift("Too common — choose a different password");
  }

  const labels = ["Very weak", "Weak", "Fair", "Good", "Strong"] as const;
  return {
    score: Math.min(4, score) as 0 | 1 | 2 | 3 | 4,
    label: labels[Math.min(4, score)],
    reasons,
  };
}

/**
 * Enforce the storefront's minimum password policy. Returns the first reason
 * the password is unacceptable, or null when it passes.
 */
export function validatePassword(password: string): string | null {
  if (!password) return "Password is required";
  if (password.length < 8) return "Password must be at least 8 characters";
  const { score } = passwordStrength(password);
  if (score < 2) return "Password is too weak — add numbers, symbols, or mixed case";
  return null;
}

// ── Email ──────────────────────────────────────────────────────────────────
// RFC 5322 is overly strict for typical UIs; this regex covers the
// overwhelming majority of real-world addresses without false rejections.
const EMAIL_RE =
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateEmail(email: string): string | null {
  if (!email) return "Email is required";
  if (!EMAIL_RE.test(email)) return "Enter a valid email address";
  if (email.length > 320) return "Email is too long";
  return null;
}

// ── Address ────────────────────────────────────────────────────────────────

export interface ShippingAddressInput {
  firstName?: string;
  lastName?: string;
  address1?: string;
  address2?: string;
  city?: string;
  province?: string;
  provinceCode?: string;
  country?: string;
  countryCode?: string;
  zip?: string;
  phone?: string;
  email?: string;
}

/**
 * Validate a shipping address form. Required fields follow the backend's
 * `addressSchema` in apps/api/src/modules/checkout/routes.ts.
 */
export function validateShippingAddress(
  input: ShippingAddressInput
): ValidationError[] {
  const errors: ValidationError[] = [];

  const require = (field: keyof ShippingAddressInput, label: string) => {
    if (!input[field] || String(input[field]).trim() === "") {
      errors.push({ field, message: `${label} is required` });
    }
  };

  require("address1", "Street address");
  require("city", "City");
  require("country", "Country");
  require("countryCode", "Country code");
  require("zip", "Postal/ZIP code");

  if (input.countryCode && !/^[A-Z]{2}$/.test(input.countryCode)) {
    errors.push({
      field: "countryCode",
      message: "Country code must be a 2-letter ISO code",
    });
  }

  // Reasonable length caps so users don't paste a novel into address1.
  const maxLen: Partial<Record<keyof ShippingAddressInput, number>> = {
    firstName: 100,
    lastName: 100,
    address1: 200,
    address2: 200,
    city: 100,
    province: 100,
    zip: 20,
    phone: 30,
  };
  for (const [field, limit] of Object.entries(maxLen) as Array<
    [keyof ShippingAddressInput, number]
  >) {
    const v = input[field];
    if (typeof v === "string" && v.length > limit) {
      errors.push({ field, message: `Too long (max ${limit} characters)` });
    }
  }

  // Light heuristic: US/CA zip codes should contain at least one digit.
  if (input.zip && input.countryCode && ["US", "CA"].includes(input.countryCode)) {
    if (!/\d/.test(input.zip)) {
      errors.push({ field: "zip", message: "Postal code must contain digits" });
    }
  }

  if (input.email) {
    const err = validateEmail(input.email);
    if (err) errors.push({ field: "email", message: err });
  }

  return errors;
}
