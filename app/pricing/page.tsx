"use client";

import { useState } from "react";
import { PLANS, PlanId } from "@/lib/plans";

const FEATURES: Record<PlanId, string[]> = {
  basic: ["3 Kampagnen / Monat", "1 Google-Ads-Konto", "OpenAI + Claude Review-Loop"],
  pro: ["15 Kampagnen / Monat", "Bis zu 3 Google-Ads-Konten", "Kampagnen-Verlauf"],
  agency: ["Unbegrenzte Kampagnen", "Unbegrenzte Google-Ads-Konten", "Priorisierter Support"],
};

export default function PricingPage() {
  const [loadingPlan, setLoadingPlan] = useState<PlanId | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubscribe(plan: PlanId) {
    setLoadingPlan(plan);
    setError(null);
    const res = await fetch("/api/billing/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Fehler beim Starten des Abos.");
      setLoadingPlan(null);
      return;
    }
    window.location.href = data.redirectUrl;
  }

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-8 px-6 py-12">
      <div className="flex flex-col gap-2 text-center">
        <h1 className="text-2xl font-bold">Preise</h1>
        <p className="text-sm text-neutral-500">Wähle ein Abo, um Kampagnen zu erstellen.</p>
      </div>

      {error && <p className="text-center text-sm text-red-600">{error}</p>}

      <div className="grid gap-6 sm:grid-cols-3">
        {(Object.keys(PLANS) as PlanId[]).map((id) => {
          const plan = PLANS[id];
          return (
            <div key={id} className="flex flex-col gap-4 rounded-lg border border-neutral-200 p-6">
              <div>
                <h2 className="text-lg font-semibold">{plan.name}</h2>
                <p className="text-2xl font-bold">
                  €{plan.priceEur}
                  <span className="text-sm font-normal text-neutral-500"> / Monat</span>
                </p>
              </div>
              <ul className="flex flex-col gap-1 text-sm text-neutral-600">
                {FEATURES[id].map((f) => (
                  <li key={f}>✓ {f}</li>
                ))}
              </ul>
              <button
                className="btn-primary mt-auto"
                disabled={loadingPlan !== null}
                onClick={() => handleSubscribe(id)}
              >
                {loadingPlan === id ? "Wird geladen…" : "Abonnieren"}
              </button>
            </div>
          );
        })}
      </div>
    </main>
  );
}
