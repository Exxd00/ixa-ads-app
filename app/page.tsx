"use client";

import { useEffect, useState } from "react";
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
  WizardStep,
} from "@/lib/types";

export default function Home() {
  const [step, setStep] = useState<WizardStep>("connect");
  const [status, setStatus] = useState<StatusInfo | null>(null);
  const [googleError, setGoogleError] = useState<string | null>(null);
  const [simulatedConnect, setSimulatedConnect] = useState(false);
  const [customerId, setCustomerId] = useState("");
  const [loopResult, setLoopResult] = useState<LoopResult | null>(null);
  const [draft, setDraft] = useState<CampaignDraft | null>(null);
  const [pushResult, setPushResult] = useState<PushResult | null>(null);

  useEffect(() => {
    fetch("/api/status")
      .then((r) => r.json())
      .then(setStatus);

    const params = new URLSearchParams(window.location.search);
    const err = params.get("google_error");
    if (err) setGoogleError(err);
  }, []);

  const connected = simulatedConnect || status?.googleConnected;

  async function handleIntakeSubmit(data: IntakeData) {
    setStep("looping");
    setLoopResult(null);
    const res = await fetch("/api/generate-campaign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const result: LoopResult = await res.json();
    setLoopResult(result);
    setDraft(result.finalDraft);
    setStep("review");
  }

  async function handleApprove() {
    if (!draft) return;
    setStep("pushing");
    const res = await fetch("/api/push-campaign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ draft, customerId }),
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
  }

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-6 py-12">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold">IXA Ads</h1>
        <p className="text-sm text-neutral-500">
          KI erstellt deine Google-Ads-Kampagne — OpenAI entwirft, Claude prüft, bis alles passt.
        </p>
      </header>

      <ModeBanner status={status} />

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

      {step === "describe" && <IntakeForm onSubmit={handleIntakeSubmit} />}

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
    </main>
  );
}
