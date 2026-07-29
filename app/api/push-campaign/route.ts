import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { pushCampaignToGoogleAds } from "@/lib/googleAds";
import { REFRESH_TOKEN_COOKIE } from "@/lib/googleAuth";
import { createClient } from "@/lib/supabase/server";
import { CampaignDraft } from "@/lib/types";

export async function POST(req: NextRequest) {
  const body = (await req.json()) as {
    draft: CampaignDraft;
    customerId?: string;
    dbCampaignId?: string | null;
  };
  if (!body?.draft) {
    return NextResponse.json({ error: "Missing draft" }, { status: 400 });
  }

  const cookieStore = await cookies();
  const refreshToken = cookieStore.get(REFRESH_TOKEN_COOKIE)?.value;

  try {
    const result = await pushCampaignToGoogleAds(body.draft, body.customerId ?? "", refreshToken ?? "");

    if (body.dbCampaignId) {
      const supabase = await createClient();
      await supabase.from("campaigns").update({ pushed: true }).eq("id", body.dbCampaignId);
    }

    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Push failed" },
      { status: 500 }
    );
  }
}
