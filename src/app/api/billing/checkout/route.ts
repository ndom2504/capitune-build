import { NextResponse } from "next/server";
import { appOrigin } from "@/lib/auth/redirect";
import { requireUser } from "@/lib/auth/server";
import { isStripeConfigured, stripePricePro, stripeSecret } from "@/lib/billing/stripe";
import { errorResponse } from "@/lib/http/guard";

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    if (user.plan === "pro") {
      return NextResponse.json({ ok: true, alreadyPro: true });
    }
    if (!isStripeConfigured()) {
      return NextResponse.json({ error: "Paiement non configuré." }, { status: 503 });
    }
    const origin = appOrigin(request);
    const body = new URLSearchParams({
      mode: "subscription",
      success_url: `${origin}/dashboard?billing=success`,
      cancel_url: `${origin}/dashboard?billing=cancel`,
      client_reference_id: user.id,
      "line_items[0][price]": stripePricePro(),
      "line_items[0][quantity]": "1",
      "metadata[ownerId]": user.id,
    });
    if (user.stripeCustomerId) {
      body.set("customer", user.stripeCustomerId);
    } else {
      body.set("customer_email", user.email);
    }
    const response = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${stripeSecret()}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    });
    const payload = (await response.json()) as { id?: string; url?: string; error?: { message?: string } };
    if (!response.ok || !payload.url) {
      throw new Error(payload.error?.message || "Impossible d’ouvrir le paiement.");
    }
    return NextResponse.json({ url: payload.url });
  } catch (error) {
    return errorResponse(error);
  }
}
