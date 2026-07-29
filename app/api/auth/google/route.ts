import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { buildGoogleAuthUrl, isGoogleOAuthConfigured, STATE_COOKIE } from "@/lib/googleAuth";

export async function GET(req: NextRequest) {
  if (!isGoogleOAuthConfigured()) {
    return NextResponse.redirect(new URL("/?google_error=not_configured", req.nextUrl.origin));
  }

  const state = crypto.randomUUID();
  const cookieStore = await cookies();
  cookieStore.set(STATE_COOKIE, state, {
    httpOnly: true,
    maxAge: 600,
    sameSite: "lax",
    path: "/",
  });

  return NextResponse.redirect(buildGoogleAuthUrl(req, state));
}
