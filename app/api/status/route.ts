import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { isGoogleOAuthConfigured, REFRESH_TOKEN_COOKIE } from "@/lib/googleAuth";
import { StatusInfo } from "@/lib/types";

export async function GET() {
  const cookieStore = await cookies();
  const status: StatusInfo = {
    googleConfigured: isGoogleOAuthConfigured(),
    googleConnected: cookieStore.has(REFRESH_TOKEN_COOKIE),
    openaiConfigured: !!process.env.OPENAI_API_KEY,
    anthropicConfigured: !!process.env.ANTHROPIC_API_KEY,
    realPublishConfigured:
      !!process.env.GOOGLE_ADS_DEVELOPER_TOKEN && process.env.ALLOW_REAL_PUBLISH === "true",
  };
  return NextResponse.json(status);
}
