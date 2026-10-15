import { NextResponse } from "next/server";
import { isStripeConfigured, stripeWebhookSecret, verifyStripeSignature } from "@/lib/billing/stripe";
import { getRepository } from "@/lib/store";

export async function POST(request: Request) {
  if (!isStripeConfigured()) {
    return NextResponse.json({ error: "Webhook inactif." }, { status: 503 });
  }
  const payload = await request.text();
  const header = request.headers.get("stripe-signature") || "";
  if (!verifyStripeSignature(payload, header, stripeWebhookSecret())) {
    return NextResponse.json({ error: "Signature invalide." }, { status: 400 });
  }
  const event = JSON.parse(payload) as {
    type?: string;
    data?: { object?: Record<string, unknown> };
  };
  const repository = await getRepository();
  const object = event.data?.object ?? {};

  if (event.type === "checkout.session.completed") {
    const ownerId = String(object.client_reference_id || (object.metadata as { ownerId?: string } | undefined)?.ownerId || "");
    const customer = typeof object.customer === "string" ? object.customer : null;
    if (ownerId) {
      await repository.setUserPlan(ownerId, "pro", customer);
    }
  }

  if (event.type === "customer.subscription.deleted") {
    const customer = typeof object.customer === "string" ? object.customer : "";
    if (customer) {
      const profile = await repository.findUserByStripeCustomerId(customer);
      if (profile) {
        await repository.setUserPlan(profile.id, "free", customer);
      }
    }
  }

  return NextResponse.json({ received: true });
}
