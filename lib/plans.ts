export const PLANS = {
  basic: { name: "Basic", priceEur: 29, campaignsPerMonth: 3, priceEnvVar: "STRIPE_PRICE_BASIC" },
  pro: { name: "Pro", priceEur: 79, campaignsPerMonth: 15, priceEnvVar: "STRIPE_PRICE_PRO" },
  agency: { name: "Agency", priceEur: 199, campaignsPerMonth: Infinity, priceEnvVar: "STRIPE_PRICE_AGENCY" },
} as const;

export type PlanId = keyof typeof PLANS;

export function isPlanId(value: unknown): value is PlanId {
  return typeof value === "string" && value in PLANS;
}
