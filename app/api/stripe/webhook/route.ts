// app/api/stripe/webhook/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe/client";
import { handleLicensePaid, handleSubscriptionUpdated, handleSubscriptionDeleted } from "@/lib/stripe/webhooks";

// Map Stripe price IDs to plan names — fill these in when Sam creates the Stripe products
const PRICE_TO_PLAN: Record<string, string> = {
  // price_starter_monthly: "starter",
  // price_growth_monthly: "growth",
  // price_enterprise_monthly: "enterprise",
};

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");

  if (!sig) return NextResponse.json({ error: "No signature" }, { status: 400 });

  let event;
  try {
    event = getStripe().webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  switch (event.type) {
    case "payment_intent.succeeded": {
      const pi = event.data.object as any;
      // One-time licensing fee payment
      if (pi.metadata?.type === "license") {
        await handleLicensePaid(pi.customer, new Date().toISOString());
      }
      break;
    }

    case "customer.subscription.updated":
    case "customer.subscription.created": {
      const sub = event.data.object as any;
      const priceId = sub.items.data[0]?.price?.id;
      const plan = PRICE_TO_PLAN[priceId] ?? "starter";
      await handleSubscriptionUpdated(sub.customer, plan, sub.id);
      break;
    }

    case "customer.subscription.deleted": {
      const sub = event.data.object as any;
      await handleSubscriptionDeleted(sub.customer);
      break;
    }
  }

  return NextResponse.json({ received: true });
}
