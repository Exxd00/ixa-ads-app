import { NextRequest } from "next/server";

export const REFRESH_TOKEN_COOKIE = "gads_refresh_token";
export const STATE_COOKIE = "gads_oauth_state";
const SCOPE = "https://www.googleapis.com/auth/adwords";

export function isGoogleOAuthConfigured(): boolean {
  return !!process.env.GOOGLE_OAUTH_CLIENT_ID && !!process.env.GOOGLE_OAUTH_CLIENT_SECRET;
}

export function buildGoogleAuthUrl(req: NextRequest, state: string): string {
  const redirectUri = new URL("/api/auth/google/callback", req.nextUrl.origin).toString();
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", process.env.GOOGLE_OAUTH_CLIENT_ID!);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", SCOPE);
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "consent"); // forces a fresh refresh_token on every connect
  url.searchParams.set("state", state);
  return url.toString();
}

export async function exchangeCodeForTokens(
  code: string,
  redirectUri: string
): Promise<{ refresh_token?: string; access_token?: string } | null> {
  try {
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_OAUTH_CLIENT_ID!,
        client_secret: process.env.GOOGLE_OAUTH_CLIENT_SECRET!,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });
    if (!res.ok) {
      console.error("Google token exchange failed", res.status, await res.text());
      return null;
    }
    return await res.json();
  } catch (err) {
    console.error("Google token exchange errored", err);
    return null;
  }
}
