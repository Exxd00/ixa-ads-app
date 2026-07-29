import Stripe from "stripe";

export function isStripeConfigured(): boolean {
  return !!process.env.STRIPE_SECRET_KEY;
}

let cachedClient: Stripe | null = null;

export function getStripe(): Stripe {
  if (!cachedClient) {
    cachedClient = new Stripe(process.env.STRIPE_SECRET_KEY!);
  }
  return cachedClient;
}
