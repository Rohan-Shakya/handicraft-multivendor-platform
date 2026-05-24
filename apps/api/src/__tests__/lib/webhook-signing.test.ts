import { describe, expect, it } from "vitest";
import crypto from "node:crypto";
import { verifyWebhookSignature } from "../../lib/webhooks.js";

const SECRET = "test-secret-key-1234";

function sign(body: string, secret: string, timestamp: number): string {
  const hmac = crypto
    .createHmac("sha256", secret)
    .update(`${timestamp}.${body}`)
    .digest("hex");
  return `t=${timestamp},v1=${hmac}`;
}

describe("verifyWebhookSignature", () => {
  it("accepts a signature generated with the shared secret", () => {
    const body = JSON.stringify({ topic: "order.created" });
    const ts = Math.floor(Date.now() / 1000);
    const result = verifyWebhookSignature({
      rawBody: body,
      signatureHeader: sign(body, SECRET, ts),
      secret: SECRET,
    });
    expect(result.valid).toBe(true);
  });

  it("rejects a signature computed with the wrong secret", () => {
    const body = "{}";
    const ts = Math.floor(Date.now() / 1000);
    const result = verifyWebhookSignature({
      rawBody: body,
      signatureHeader: sign(body, "wrong", ts),
      secret: SECRET,
    });
    expect(result.valid).toBe(false);
    expect(result.reason).toBe("signature_mismatch");
  });

  it("rejects a signature that's older than the tolerance window", () => {
    const body = "{}";
    const ts = Math.floor(Date.now() / 1000) - 600; // 10 minutes old
    const result = verifyWebhookSignature({
      rawBody: body,
      signatureHeader: sign(body, SECRET, ts),
      secret: SECRET,
      toleranceSeconds: 300,
    });
    expect(result.valid).toBe(false);
    expect(result.reason).toBe("timestamp_out_of_tolerance");
  });

  it("rejects a malformed signature header", () => {
    expect(
      verifyWebhookSignature({
        rawBody: "{}",
        signatureHeader: "not-a-real-signature",
        secret: SECRET,
      }).reason
    ).toBe("malformed_signature");
  });

  it("rejects a missing signature header", () => {
    expect(
      verifyWebhookSignature({
        rawBody: "{}",
        signatureHeader: null,
        secret: SECRET,
      }).reason
    ).toBe("missing_signature");
  });

  it("rejects if the body has been tampered with after signing", () => {
    const body = JSON.stringify({ amount: 100 });
    const ts = Math.floor(Date.now() / 1000);
    const signature = sign(body, SECRET, ts);
    const tampered = JSON.stringify({ amount: 9_999 });
    const result = verifyWebhookSignature({
      rawBody: tampered,
      signatureHeader: signature,
      secret: SECRET,
    });
    expect(result.valid).toBe(false);
    expect(result.reason).toBe("signature_mismatch");
  });
});
