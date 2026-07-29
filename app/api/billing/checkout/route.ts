import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getStripe, isStripeConfigured } from "@/lib/stripe";
import { PLANS, isPlanId } from "@/lib/plans";

export async function POST(req: NextRequest) {
  const body = (await req.json()) as { plan?: string };
  if (!isPlanId(body.plan)) {
    return NextResponse.json({ error: "Unknown plan" }, { status: 400 });
  }
  const plan = body.plan;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // No Stripe configured -> simulate an active subscription directly, same
  // gated real-vs-simulated pattern used throughout this app.
  if (!isStripeConfigured()) {
    const { error } = await supabase.from("subscriptions").upsert(
      {
        user_id: user.id,
        plan,
        status: "active",
        current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      },
      { onConflict: "user_id" }
    );
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ simulated: true, redirectUrl: "/?subscribed=1" });
  }

  const priceId = process.env[PLANS[plan].priceEnvVar];
  if (!priceId) {
    return NextResponse.json({ error: `${PLANS[plan].priceEnvVar} ist nicht konfiguriert.` }, { status: 500 });
  }
  if (!user.email) {
    return NextResponse.json({ error: "Account has no email" }, { status: 400 });
  }

  const origin = req.nextUrl.origin;
  const session = await getStripe().checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${origin}/?subscribed=1`,
    cancel_url: `${origin}/pricing?canceled=1`,
    client_reference_id: user.id,
    customer_email: user.email,
  });

  if (!session.url) {
    return NextResponse.json({ error: "Stripe returned no checkout URL" }, { status: 500 });
  }

  return NextResponse.json({ simulated: false, redirectUrl: session.url });
}
