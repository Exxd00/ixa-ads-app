import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { exchangeCodeForTokens, REFRESH_TOKEN_COOKIE, STATE_COOKIE } from "@/lib/googleAuth";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  const cookieStore = await cookies();
  const expectedState = cookieStore.get(STATE_COOKIE)?.value;
  cookieStore.delete(STATE_COOKIE);

  if (!code || !state || !expectedState || state !== expectedState) {
    return NextResponse.redirect(new URL("/?google_error=csrf", req.nextUrl.origin));
  }

  const redirectUri = new URL("/api/auth/google/callback", req.nextUrl.origin).toString();
  const tokens = await exchangeCodeForTokens(code, redirectUri);

  if (!tokens?.refresh_token) {
    return NextResponse.redirect(new URL("/?google_error=token_exchange", req.nextUrl.origin));
  }

  cookieStore.set(REFRESH_TOKEN_COOKIE, tokens.refresh_token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  });

  return NextResponse.redirect(new URL("/?connected=1", req.nextUrl.origin));
}
