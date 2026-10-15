import { createHmac, timingSafeEqual } from "node:crypto";

export function isStripeConfigured(): boolean {
  return Boolean(
    process.env.STRIPE_SECRET_KEY?.trim() &&
      process.env.STRIPE_PRICE_PRO?.trim() &&
      process.env.STRIPE_WEBHOOK_SECRET?.trim(),
  );
}

export function stripeSecret(): string {
  return process.env.STRIPE_SECRET_KEY?.trim() || "";
}

export function stripePricePro(): string {
  return process.env.STRIPE_PRICE_PRO?.trim() || "";
}

export function stripeWebhookSecret(): string {
  return process.env.STRIPE_WEBHOOK_SECRET?.trim() || "";
}

/** Verify Stripe-Signature (t=timestamp, v1=hmac). */
export function verifyStripeSignature(payload: string, header: string, secret: string, now = Date.now()): boolean {
  const parts = Object.fromEntries(
    header.split(",").map((item) => {
      const [key, ...rest] = item.split("=");
      return [key.trim(), rest.join("=")];
    }),
  );
  const timestamp = parts.t;
  const signature = parts.v1;
  if (!timestamp || !signature) return false;
  const ageMs = Math.abs(now - Number(timestamp) * 1000);
  if (!Number.isFinite(ageMs) || ageMs > 5 * 60 * 1000) return false;
  const expected = createHmac("sha256", secret).update(`${timestamp}.${payload}`).digest("hex");
  const left = Buffer.from(signature, "hex");
  const right = Buffer.from(expected, "hex");
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}
