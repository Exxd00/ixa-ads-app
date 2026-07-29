import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";
import { getStripe } from "@/lib/stripe";

function mapPriceToPlan(priceId?: string): "basic" | "pro" | "agency" {
  if (priceId && priceId === process.env.STRIPE_PRICE_PRO) return "pro";
  if (priceId && priceId === process.env.STRIPE_PRICE_AGENCY) return "agency";
  return "basic";
}

function mapStripeStatus(status: Stripe.Subscription.Status): "trialing" | "active" | "past_due" | "canceled" {
  if (status === "trialing") return "trialing";
  if (status === "active") return "active";
  if (status === "past_due" || status === "unpaid") return "past_due";
  return "canceled";
}

// Stripe calls this server-to-server with no user session, so it uses the
// Supabase service role key (bypasses RLS) rather than the cookie-based
// server client used everywhere else in this app.
export async function POST(req: NextRequest) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret || !process.env.STRIPE_SECRET_KEY || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: "Stripe/Supabase not fully configured" }, { status: 501 });
  }

  const body = await req.text();
  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(body, signature, webhookSecret);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId = session.client_reference_id;
    const subscriptionId = session.subscription as string | null;
    const customerId = session.customer as string | null;

    if (userId && subscriptionId && customerId) {
      const sub = await getStripe().subscriptions.retrieve(subscriptionId);
      const plan = mapPriceToPlan(sub.items.data[0]?.price.id);
      await supabaseAdmin.from("subscriptions").upsert(
        {
          user_id: userId,
          plan,
          status: mapStripeStatus(sub.status),
          stripe_customer_id: customerId,
          stripe_subscription_id: subscriptionId,
          current_period_end: new Date(sub.items.data[0].current_period_end * 1000).toISOString(),
        },
        { onConflict: "user_id" }
      );
    }
  } else if (event.type === "customer.subscription.updated" || event.type === "customer.subscription.deleted") {
    const sub = event.data.object as Stripe.Subscription;
    const plan = mapPriceToPlan(sub.items.data[0]?.price.id);
    await supabaseAdmin
      .from("subscriptions")
      .update({
        plan,
        status: mapStripeStatus(sub.status),
        current_period_end: new Date(sub.items.data[0].current_period_end * 1000).toISOString(),
      })
      .eq("stripe_subscription_id", sub.id);
  }

  return NextResponse.json({ received: true });
}
