import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getStripe, isStripeConfigured } from "@/lib/stripe";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!isStripeConfigured() || !subscription?.stripe_customer_id) {
    // Simulated mode has no real Stripe customer to open a portal for —
    // cancel directly instead, mirroring the simulated-subscribe path.
    if (subscription) {
      await supabase.from("subscriptions").update({ status: "canceled" }).eq("user_id", user.id);
    }
    return NextResponse.json({ simulated: true, redirectUrl: "/?canceled=1" });
  }

  const origin = req.nextUrl.origin;
  const portalSession = await getStripe().billingPortal.sessions.create({
    customer: subscription.stripe_customer_id,
    return_url: `${origin}/`,
  });

  return NextResponse.json({ simulated: false, redirectUrl: portalSession.url });
}
