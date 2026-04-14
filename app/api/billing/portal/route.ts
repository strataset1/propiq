// app/api/billing/portal/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe/client";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/login", req.url));

  const service = createServiceClient();
  const { data: org } = await service
    .from("organisations")
    .select("stripe_customer_id")
    .eq("owner_email", user.email!)
    .single();

  if (!org?.stripe_customer_id) {
    return NextResponse.redirect(new URL("/billing?error=no_customer", req.url));
  }

  const session = await getStripe().billingPortal.sessions.create({
    customer: org.stripe_customer_id,
    return_url: `${process.env.NEXT_PUBLIC_APP_URL}/billing`,
  });

  return NextResponse.redirect(session.url);
}
