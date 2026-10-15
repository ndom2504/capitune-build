import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { verifyStripeSignature } from "@/lib/billing/stripe";

describe("stripe signatures", () => {
  it("accepts a fresh valid header", () => {
    const payload = "{\"id\":\"evt_1\"}";
    const secret = "whsec_test";
    const t = Math.floor(Date.now() / 1000);
    const v1 = createHmac("sha256", secret).update(`${t}.${payload}`).digest("hex");
    expect(verifyStripeSignature(payload, `t=${t},v1=${v1}`, secret)).toBe(true);
  });

  it("rejects a tampered payload", () => {
    const payload = "{\"id\":\"evt_1\"}";
    const secret = "whsec_test";
    const t = Math.floor(Date.now() / 1000);
    const v1 = createHmac("sha256", secret).update(`${t}.${payload}`).digest("hex");
    expect(verifyStripeSignature("{\"id\":\"evt_2\"}", `t=${t},v1=${v1}`, secret)).toBe(false);
  });
});
