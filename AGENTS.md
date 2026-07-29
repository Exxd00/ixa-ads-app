<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Project state (as of 2026-07-29)

## What this is
AI-driven Google Ads campaign builder. User connects a Google Ads account (real OAuth or simulated), describes their business, and a closed loop — OpenAI drafts (`lib/openaiDraft.ts`), a deterministic checker + Claude review it against a shared rule set (`lib/rules.ts`, `lib/claudeReview.ts`) — retries with explicit correction instructions until it passes or hits `MAX_ITERATIONS` (4, in `lib/loop.ts`). Only an approved draft can be pushed (real or simulated, `lib/googleAds.ts`). Gated behind Supabase magic-link auth + a 3-tier Stripe subscription (Basic/Pro/Agency, `lib/plans.ts`) that caps campaigns/month.

Every external effect (AI calls, Google Ads OAuth/push, Stripe billing) follows the same pattern: gated behind env vars, gracefully simulated when they're absent, real when present. This is deliberate and should be preserved, not "fixed" into always-real.

## Deployed infra
- GitHub: `Exxd00/ixa-ads-app` (this repo)
- Vercel: project `ixa-ads-app`, team `ixa` (`team_e4OHQxTc1BSk9lI8KFrOc93r`), https://ixa-ads-app.vercel.app
- Supabase: project `ixa-ads-app` (ref `tbzlxeehgiiphslbhmsx`, region eu-central-1), org `roxqtfpwtmiybnbrffcy`. Tables `subscriptions` and `campaigns`, both RLS-scoped to `auth.uid() = user_id`.
- Sibling projects in the same GitHub/Vercel/Supabase accounts, fully separate: `ixa-lead.de` (agency marketing site) and `ixa.app` (a different AI SaaS product) — don't mix code or infra between them.

## BLOCKING as of the last deploy (dpl_5Ns5iUt51izzGb8sGSZ2voZUUHP9)
Production was returning 500 on every page because `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` were not yet set in Vercel. These are NOT secrets (publishable by design) — the user was given the exact values to paste into Vercel Dashboard → Settings → Environment Variables, then redeploy:
```
NEXT_PUBLIC_SUPABASE_URL=https://tbzlxeehgiiphslbhmsx.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_JcuV4T00J6Wo8Lpjp83mfw_TsJFmDYx
```
If picking this back up and the user says the site is broken, confirm these were actually added and redeployed before debugging anything else.

## Env vars still needed from the user (never set these yourself)
No tool in this environment can write Vercel env vars — only give the user names/values to paste themselves. Real secrets (never ask the user to paste them into chat, never enter them yourself):
- `OPENAI_API_KEY`, `ANTHROPIC_API_KEY` — without them the loop skips AI entirely and uses a deterministic German template (`lib/fallback.ts`), fully functional.
- `GOOGLE_OAUTH_CLIENT_ID` / `GOOGLE_OAUTH_CLIENT_SECRET` — without them the UI offers a "simulated connect" button instead of real Google OAuth.
- `GOOGLE_ADS_DEVELOPER_TOKEN`, `GOOGLE_ADS_LOGIN_CUSTOMER_ID` (optional), `ALLOW_REAL_PUBLISH="true"` — without them, push is always simulated.
- `SUPABASE_SERVICE_ROLE_KEY` — used only by `app/api/billing/webhook/route.ts` (Stripe calls it server-to-server with no user session, needs RLS bypass). Supabase MCP tools deliberately never expose this key — user pastes it from Supabase Dashboard → Project Settings → API.
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_BASIC` / `_PRO` / `_AGENCY` — without `STRIPE_SECRET_KEY`, subscribe/cancel write straight to the `subscriptions` table (fully testable, zero real payment).

## Manual Supabase Dashboard steps required (no MCP tool exposes these)
1. **Authentication → Emails**: both "Magic Link" and "Confirm signup" templates must have their link changed from `{{ .ConfirmationURL }}` to `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email`. Without this the email points to a flow this app doesn't implement (current Supabase docs use `verifyOtp`+`token_hash`, not the older `exchangeCodeForSession`+`code` pattern).
2. **Authentication → URL Configuration**: Site URL + Redirect URLs must include the Vercel production URL, plus `http://localhost:3002` for local dev.

## Verified vs. unverified
**Verified in-browser** (dev + prod): `proxy.ts` correctly redirects unauthenticated users to `/login`; `/login`, `/pricing`, `/auth/*` stay public; API routes return JSON/status codes (not HTML redirects) when unauthenticated; the Supabase Auth connection is live (`signInWithOtp` round-trips to the real API); the full golden path in simulated mode (fallback draft, simulated Google connect, simulated push) works end to end; `npx tsc --noEmit` is clean.

**NOT verified** (couldn't be, from this environment — check these first if the user reports a bug in these areas):
- A real magic-link login round trip — needs an inbox no one here can access.
- Real Stripe checkout/webhook/portal — untested against a live Stripe account.
- Real Google Ads push (`lib/googleAds.ts`'s `mutateResources` call) — built from the installed `google-ads-api` v24 type defs but never run against a live account. Treat as best-effort; test carefully on a Google Ads test account before ever setting `ALLOW_REAL_PUBLISH=true`.

## Known simplifications (deliberate, not oversights)
- Only campaigns/month is technically enforced per plan; "connected Google Ads accounts" limit is marketing copy on `/pricing` only, not enforced (would need real multi-account UI).
- No admin UI for plans/prices — `PLANS` in `lib/plans.ts` is a hardcoded constant; edit it directly to change tiers/limits.
- `MAX_ITERATIONS = 4` in `lib/loop.ts` is a deliberate cost/latency cap, not a bug.
