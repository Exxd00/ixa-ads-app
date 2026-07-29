"use client";

import { PushResult } from "@/lib/types";

export default function PushResultView({
  result,
  onRestart,
}: {
  result: PushResult;
  onRestart: () => void;
}) {
  return (
    <div className="mx-auto flex w-full max-w-xl flex-col items-center gap-4 py-10 text-center">
      <div
        className={
          result.simulated
            ? "rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800"
            : "rounded-lg border border-green-300 bg-green-50 px-4 py-3 text-sm text-green-800"
        }
      >
        {result.simulated
          ? "Simulierter Push — es wurde nichts bei Google Ads veröffentlicht."
          : "Kampagne wurde bei Google Ads angelegt (pausiert)."}
      </div>
      <p className="text-sm text-neutral-600">{result.message}</p>
      {result.campaignId && <p className="text-xs text-neutral-400">Kampagne: {result.campaignId}</p>}
      <button className="btn-secondary" onClick={onRestart}>
        Neue Kampagne erstellen
      </button>
    </div>
  );
}
