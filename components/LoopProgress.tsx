"use client";

import { LoopResult } from "@/lib/types";

export default function LoopProgress({ result }: { result: LoopResult | null }) {
  if (!result) {
    return (
      <div className="flex flex-col items-center gap-3 py-10 text-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-neutral-300 border-t-blue-600" />
        <p className="text-sm text-neutral-500">
          OpenAI entwirft, Claude prüft — das kann bis zu ~30s dauern…
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
      {result.iterations.map((iter) => (
        <div key={iter.n} className="rounded-lg border border-neutral-200 p-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-semibold">
              Versuch {iter.n} — {iter.source === "openai" ? "OpenAI-Entwurf" : "Vorlage"}
            </span>
            <span
              className={
                iter.passed
                  ? "rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700"
                  : "rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700"
              }
            >
              {iter.passed
                ? "Bestanden"
                : `${iter.issues.filter((i) => i.severity === "error").length} Fehler`}
            </span>
          </div>
          {iter.issues.length > 0 && (
            <ul className="flex flex-col gap-1 text-xs text-neutral-600">
              {iter.issues.map((issue, idx) => (
                <li key={idx}>
                  <span
                    className={
                      issue.severity === "error"
                        ? "font-medium text-red-600"
                        : "font-medium text-amber-600"
                    }
                  >
                    [{issue.severity === "error" ? "Fehler" : "Warnung"}]
                  </span>{" "}
                  {issue.field}: {issue.message}
                </li>
              ))}
            </ul>
          )}
          <p className="mt-2 text-xs text-neutral-400">
            {iter.reviewedByClaude ? "Von Claude geprüft" : "Nicht geprüft (kein Anthropic-Key)"}
          </p>
        </div>
      ))}
      <div
        className={
          result.status === "passed"
            ? "rounded-lg border border-green-300 bg-green-50 px-4 py-3 text-sm text-green-800"
            : "rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800"
        }
      >
        {result.status === "passed"
          ? "Der Entwurf hat alle Regeln bestanden."
          : `Nach ${result.iterations.length} Versuchen bestehen weiterhin Probleme — bitte manuell prüfen.`}
      </div>
    </div>
  );
}
