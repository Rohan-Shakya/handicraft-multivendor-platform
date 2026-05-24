/**
 * Payment provider factory — returns the correct provider instance.
 */
import type { PaymentProvider } from "./types.js";
import { EsewaProvider } from "./esewa.js";
import { KhaltiProvider } from "./khalti.js";
import { FonepayProvider } from "./fonepay.js";
import { StripeProvider } from "./stripe-provider.js";
import { CodProvider } from "./cod.js";

export type { PaymentProvider } from "./types.js";
export type {
  InitiatePaymentParams,
  InitiatePaymentResult,
  VerifyWebhookParams,
  VerifyWebhookResult,
  RefundPaymentParams,
  RefundPaymentResult,
  PaymentStatusResult,
} from "./types.js";

const providers: Record<string, PaymentProvider> = {
  esewa: new EsewaProvider(),
  khalti: new KhaltiProvider(),
  fonepay: new FonepayProvider(),
  stripe: new StripeProvider(),
  cod: new CodProvider(),
};

export type PaymentProviderName = "esewa" | "khalti" | "fonepay" | "stripe" | "cod";

export function getPaymentProvider(name: string): PaymentProvider {
  const provider = providers[name];
  if (!provider) {
    throw new Error(`Unknown payment provider: ${name}. Supported: ${Object.keys(providers).join(", ")}`);
  }
  return provider;
}

export function getSupportedProviders(): string[] {
  return Object.keys(providers);
}
