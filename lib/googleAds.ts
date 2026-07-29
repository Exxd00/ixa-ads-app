import type { MutateOperation } from "google-ads-api";
import { CampaignDraft, PushResult } from "./types";

/**
 * Creates the campaign in Google Ads. Real publishing only happens if BOTH
 * GOOGLE_ADS_DEVELOPER_TOKEN is set AND ALLOW_REAL_PUBLISH is exactly the
 * string "true" — otherwise this simulates the push with no network call,
 * same gated real-vs-simulated pattern as ixa.app's lib/deploy.ts.
 */
export async function pushCampaignToGoogleAds(
  draft: CampaignDraft,
  customerId: string,
  refreshToken: string
): Promise<PushResult> {
  const developerToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN;
  const allowRealPublish = process.env.ALLOW_REAL_PUBLISH === "true";

  if (!developerToken || !allowRealPublish) {
    return {
      simulated: true,
      message: "Simulierter Push — es wurde nichts bei Google Ads veröffentlicht.",
    };
  }

  if (!customerId || !refreshToken) {
    throw new Error("Google-Ads-Kunden-ID oder Verbindung fehlt.");
  }

  const { GoogleAdsApi } = await import("google-ads-api");
  const client = new GoogleAdsApi({
    client_id: process.env.GOOGLE_OAUTH_CLIENT_ID!,
    client_secret: process.env.GOOGLE_OAUTH_CLIENT_SECRET!,
    developer_token: developerToken,
  });
  const customer = client.Customer({
    customer_id: customerId.replace(/-/g, ""),
    refresh_token: refreshToken,
    login_customer_id: process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID,
  });

  const budgetResourceName = `customers/${customerId}/campaignBudgets/-1`;
  const campaignResourceName = `customers/${customerId}/campaigns/-1`;
  const adGroupResourceName = `customers/${customerId}/adGroups/-2`;

  // Campaign is always created PAUSED — real spending requires a further,
  // deliberate step inside the actual Google Ads UI, never automatically.
  //
  // NOTE: this is a best-effort implementation of a mixed-entity atomic
  // mutate (budget -> campaign -> ad group -> ad -> keywords via temporary
  // resource names), based on the google-ads-api v24 type definitions
  // inspected in node_modules. It has never run against a live Google Ads
  // account (no developer token was available while building this) and MUST
  // be verified against a real test account before ALLOW_REAL_PUBLISH is
  // ever set to "true". `MutateOperation<any>` is used deliberately because
  // mutateResources()'s single generic type parameter can't express a batch
  // spanning multiple different resource shapes in one strictly-typed call.
  const operations: MutateOperation<any>[] = [
    {
      entity: "campaign_budget",
      operation: "create",
      resource: {
        resource_name: budgetResourceName,
        name: `IXA Ads Budget ${Date.now()}`,
        amount_micros: Math.round(draft.dailyBudgetEur * 1_000_000),
        delivery_method: "STANDARD",
      },
    },
    {
      entity: "campaign",
      operation: "create",
      resource: {
        resource_name: campaignResourceName,
        name: `IXA Ads Kampagne ${Date.now()}`,
        campaign_budget: budgetResourceName,
        status: "PAUSED",
        advertising_channel_type: "SEARCH",
      },
    },
    {
      entity: "ad_group",
      operation: "create",
      resource: {
        resource_name: adGroupResourceName,
        name: "IXA Ads Anzeigengruppe",
        campaign: campaignResourceName,
        status: "ENABLED",
      },
    },
    {
      entity: "ad_group_ad",
      operation: "create",
      resource: {
        ad_group: adGroupResourceName,
        status: "PAUSED",
        ad: {
          final_urls: [draft.finalUrl],
          responsive_search_ad: {
            headlines: draft.headlines.map((text) => ({ text })),
            descriptions: draft.descriptions.map((text) => ({ text })),
          },
        },
      },
    },
    ...draft.keywords.map((keyword) => ({
      entity: "ad_group_criterion" as const,
      operation: "create" as const,
      resource: {
        ad_group: adGroupResourceName,
        status: "ENABLED",
        keyword: { text: keyword, match_type: "BROAD" },
      },
    })),
  ];

  const result = await customer.mutateResources(operations);

  return {
    simulated: false,
    campaignId: campaignResourceName,
    message: `Kampagne angelegt (pausiert): ${JSON.stringify(result)}`,
  };
}
