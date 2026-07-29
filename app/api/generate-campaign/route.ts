import { NextRequest, NextResponse } from "next/server";
import { orchestrateLoop } from "@/lib/loop";
import { IntakeData } from "@/lib/types";
import { createClient } from "@/lib/supabase/server";
import { PLANS, PlanId } from "@/lib/plans";

// The generate -> review loop can take up to ~4 sequential OpenAI + Claude
// round trips; extend beyond Vercel's default serverless timeout.
export const maxDuration = 60;

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
  if (!subscription || subscription.status !== "active") {
    return NextResponse.json({ error: "No active subscription" }, { status: 403 });
  }

  const plan = subscription.plan as PlanId;
  const limit = PLANS[plan].campaignsPerMonth;

  if (limit !== Infinity) {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    const { count } = await supabase
      .from("campaigns")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gte("created_at", startOfMonth.toISOString());
    if ((count ?? 0) >= limit) {
      return NextResponse.json({ error: "Monatliches Kampagnen-Limit erreicht" }, { status: 429 });
    }
  }

  const intake = (await req.json()) as IntakeData;

  if (!intake.businessName || !intake.businessDescription || !intake.finalUrl || !intake.goal) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }
  if (!/^https?:\/\/.+\..+/.test(intake.finalUrl)) {
    return NextResponse.json({ error: "finalUrl must be a valid URL" }, { status: 400 });
  }
  if (!Array.isArray(intake.targetLocations) || intake.targetLocations.length === 0) {
    return NextResponse.json({ error: "At least one target location is required" }, { status: 400 });
  }

  const result = await orchestrateLoop(intake);

  const { data: saved } = await supabase
    .from("campaigns")
    .insert({
      user_id: user.id,
      business_name: intake.businessName,
      draft: result.finalDraft,
      status: result.status,
    })
    .select("id")
    .single();

  return NextResponse.json({ ...result, dbCampaignId: saved?.id ?? null });
}
