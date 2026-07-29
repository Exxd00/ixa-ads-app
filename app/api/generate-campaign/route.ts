import { NextRequest, NextResponse } from "next/server";
import { orchestrateLoop } from "@/lib/loop";
import { IntakeData } from "@/lib/types";

export async function POST(req: NextRequest) {
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
  return NextResponse.json(result);
}
