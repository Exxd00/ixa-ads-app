"use client";

import { StatusInfo } from "@/lib/types";

export default function ModeBanner({ status }: { status: StatusInfo | null }) {
  if (!status) return null;

  const notes: string[] = [];
  if (!status.openaiConfigured && !status.anthropicConfigured) {
    notes.push("KI-Generierung: Vorlage (kein OpenAI/Claude-Key hinterlegt)");
  } else {
    if (!status.openaiConfigured) notes.push("OpenAI-Key fehlt");
    if (!status.anthropicConfigured) notes.push("Anthropic-Key fehlt (keine Review)");
  }
  if (!status.googleConfigured) notes.push("Google-Ads-Verbindung: Testmodus");
  if (!status.realPublishConfigured) notes.push("Veröffentlichung: Testmodus");

  if (notes.length === 0) return null;

  return (
    <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
      <strong>Testmodus:</strong> {notes.join(" · ")}
    </div>
  );
}
