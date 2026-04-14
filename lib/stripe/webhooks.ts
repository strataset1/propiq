// lib/stripe/webhooks.ts
import { createServiceClient } from "@/lib/supabase/server";

const PLAN_QUOTAS: Record<string, number> = {
  starter: 500,
  growth: 2000,
  enterprise: -1, // -1 = unlimited
};

export async function handleLicensePaid(
  stripeCustomerId: string,
  paidAt: string
): Promise<void> {
  const supabase = createServiceClient();
  await supabase
    .from("organisations")
    .update({ license_paid_at: paidAt })
    .eq("stripe_customer_id", stripeCustomerId);
}

export async function handleSubscriptionUpdated(
  stripeCustomerId: string,
  plan: string,
  subscriptionId: string
): Promise<void> {
  const supabase = createServiceClient();
  await supabase
    .from("organisations")
    .update({
      plan: plan as "starter" | "growth" | "enterprise",
      stripe_subscription_id: subscriptionId,
      monthly_quota: PLAN_QUOTAS[plan] ?? 500,
    })
    .eq("stripe_customer_id", stripeCustomerId);
}

export async function handleSubscriptionDeleted(
  stripeCustomerId: string
): Promise<void> {
  const supabase = createServiceClient();
  await supabase
    .from("organisations")
    .update({
      plan: "starter",
      stripe_subscription_id: null,
      monthly_quota: 500,
    })
    .eq("stripe_customer_id", stripeCustomerId);
}
