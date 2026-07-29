"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import ModeBanner from "@/components/ModeBanner";
import ConnectGoogle from "@/components/ConnectGoogle";
import IntakeForm from "@/components/IntakeForm";
import LoopProgress from "@/components/LoopProgress";
import DraftReview from "@/components/DraftReview";
import PushResultView from "@/components/PushResultView";
import {
  CampaignDraft,
  IntakeData,
  LoopResult,
  PushResult,
  StatusInfo,
  SubscriptionInfo,
  WizardStep,
} from "@/lib/types";

export default function Home() {
  const [step, setStep] = useState<WizardStep>("connect");
  const [status, setStatus] = useState<StatusInfo | null>(null);
  const [account, setAccount] = useState<SubscriptionInfo | null>(null);
  const [googleError, setGoogleError] = useState<string | null>(null);
  const [simulatedConnect, setSimulatedConnect] = useState(false);
  const [customerId, setCustomerId] = useState("");
  const [loopResult, setLoopResult] = useState<LoopResult | null>(null);
  const [draft, setDraft] = useState<CampaignDraft | null>(null);
  const [pushResult, setPushResult] = useState<PushResult | null>(null);
  const [generateError, setGenerateError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/status")
      .then((r) => r.json())
      .then(setStatus);
    fetch("/api/subscription")
      .then((r) => r.json())
      .then(setAccount);

    const params = new URLSearchParams(window.location.search);
    const err = params.get("google_error");
    if (err) setGoogleError(err);
  }, []);

  const connected = simulatedConnect || status?.googleConnected;

  async function handleIntakeSubmit(data: IntakeData) {
    setStep("looping");
    setLoopResult(null);
    setGenerateError(null);
    const res = await fetch("/api/generate-campaign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const result = await res.json();
    if (!res.ok) {
      setGenerateError(result.error ?? "Fehler beim Erstellen der Kampagne.");
      setStep("describe");
      return;
    }
    setLoopResult(result as LoopResult);
    setDraft((result as LoopResult).finalDraft);
    setStep("review");
    fetch("/api/subscription")
      .then((r) => r.json())
      .then(setAccount);
  }

  async function handleApprove() {
    if (!draft) return;
    setStep("pushing");
    const res = await fetch("/api/push-campaign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ draft, customerId, dbCampaignId: loopResult?.dbCampaignId ?? null }),
    });
    const result: PushResult = await res.json();
    setPushResult(result);
    setStep("done");
  }

  function handleRestart() {
    setStep("describe");
    setLoopResult(null);
    setDraft(null);
    setPushResult(null);
    setGenerateError(null);
  }

  async function handleSignOut() {
    await fetch("/api/auth/signout", { method: "POST" });
    window.location.href = "/login";
  }

  async function handleManageSubscription() {
    const res = await fetch("/api/billing/portal", { method: "POST" });
    const data = await res.json();
    if (res.ok) window.location.href = data.redirectUrl;
  }

  const sub = account?.subscription;
  const hasActiveSub = sub?.status === "active" || sub?.status === "trialing";
  const limitReached =
    account?.campaignLimit !== null &&
    account?.campaignLimit !== undefined &&
    account.campaignsThisMonth >= account.campaignLimit;

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-6 py-12">
      <header className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-bold">IXA Ads</h1>
          <p className="text-sm text-neutral-500">
            KI erstellt deine Google-Ads-Kampagne — OpenAI entwirft, Claude prüft, bis alles passt.
          </p>
        </div>
        {account?.authenticated && (
          <div className="flex shrink-0 flex-col items-end gap-1 text-xs text-neutral-500">
            <span>{account.email}</span>
            {sub && (
              <button className="underline" onClick={handleManageSubscription}>
                Abo verwalten ({sub.plan})
              </button>
            )}
            <button className="underline" onClick={handleSignOut}>
              Abmelden
            </button>
          </div>
        )}
      </header>

      <ModeBanner status={status} />

      {account && !account.authenticated && (
        <div className="flex flex-col gap-4 rounded-lg border border-neutral-200 p-6 text-center">
          <p className="text-sm text-neutral-600">Melde dich an, um eine Kampagne zu erstellen.</p>
          <Link className="btn-primary self-center" href="/login">
            Anmelden
          </Link>
        </div>
      )}

      {account?.authenticated && !hasActiveSub && (
        <div className="flex flex-col gap-4 rounded-lg border border-neutral-200 p-6 text-center">
          <p className="text-sm text-neutral-600">Du brauchst ein aktives Abo, um Kampagnen zu erstellen.</p>
          <Link className="btn-primary self-center" href="/pricing">
            Preise ansehen
          </Link>
        </div>
      )}

      {account?.authenticated && hasActiveSub && (
        <>
          {account.campaignLimit !== null && (
            <p className="text-xs text-neutral-400">
              {account.campaignsThisMonth} / {account.campaignLimit} Kampagnen diesen Monat genutzt
            </p>
          )}

          {step === "connect" && (
            <>
              <ConnectGoogle
                status={status}
                customerId={customerId}
                onCustomerIdChange={setCustomerId}
                onSimulate={() => {
                  setSimulatedConnect(true);
                  setStep("describe");
                }}
                onDisconnect={async () => {
                  await fetch("/api/google-disconnect", { method: "POST" });
                  setStatus((s) => (s ? { ...s, googleConnected: false } : s));
                }}
                error={googleError}
              />
              {connected && (
                <button className="btn-primary self-start" onClick={() => setStep("describe")}>
                  Weiter
                </button>
              )}
            </>
          )}

          {step === "describe" && limitReached && (
            <div className="flex flex-col gap-4 rounded-lg border border-amber-300 bg-amber-50 p-6 text-center text-sm text-amber-800">
              Monatliches Kampagnen-Limit erreicht.
              <Link className="btn-primary self-center" href="/pricing">
                Upgrade ansehen
              </Link>
            </div>
          )}
          {step === "describe" && !limitReached && (
            <>
              {generateError && <p className="text-sm text-red-600">{generateError}</p>}
              <IntakeForm onSubmit={handleIntakeSubmit} />
            </>
          )}

          {step === "looping" && <LoopProgress result={loopResult} />}

          {step === "review" && loopResult && draft && (
            <>
              <LoopProgress result={loopResult} />
              <DraftReview result={loopResult} draft={draft} onChange={setDraft} onApprove={handleApprove} />
            </>
          )}

          {step === "pushing" && (
            <div className="flex flex-col items-center gap-3 py-10 text-center">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-neutral-300 border-t-blue-600" />
              <p className="text-sm text-neutral-500">Kampagne wird veröffentlicht…</p>
            </div>
          )}

          {step === "done" && pushResult && <PushResultView result={pushResult} onRestart={handleRestart} />}
        </>
      )}
    </main>
  );
}
