import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { PLANS, PlanId } from "@/lib/plans";
import { SubscriptionInfo } from "@/lib/types";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const info: SubscriptionInfo = {
      authenticated: false,
      subscription: null,
      campaignsThisMonth: 0,
      campaignLimit: null,
    };
    return NextResponse.json(info);
  }

  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const { count } = await supabase
    .from("campaigns")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .gte("created_at", startOfMonth.toISOString());

  const plan = subscription?.plan as PlanId | undefined;
  const limit = plan ? PLANS[plan].campaignsPerMonth : null;

  const info: SubscriptionInfo = {
    authenticated: true,
    email: user.email,
    subscription: subscription
      ? {
          plan: subscription.plan,
          status: subscription.status,
          currentPeriodEnd: subscription.current_period_end,
        }
      : null,
    campaignsThisMonth: count ?? 0,
    campaignLimit: limit === Infinity ? null : limit,
  };

  return NextResponse.json(info);
}
