"use client";

import { useState } from "react";
import { IntakeData } from "@/lib/types";

export default function IntakeForm({ onSubmit }: { onSubmit: (data: IntakeData) => void }) {
  const [businessName, setBusinessName] = useState("");
  const [businessDescription, setBusinessDescription] = useState("");
  const [goal, setGoal] = useState<IntakeData["goal"]>("leads");
  const [finalUrl, setFinalUrl] = useState("");
  const [dailyBudgetEur, setDailyBudgetEur] = useState(15);
  const [targetLocations, setTargetLocations] = useState("");
  const [audience, setAudience] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit({
      businessName,
      businessDescription,
      goal,
      finalUrl,
      dailyBudgetEur,
      targetLocations: targetLocations
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      audience,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto flex w-full max-w-xl flex-col gap-4">
      <label className="flex flex-col gap-1 text-sm">
        Firmenname
        <input
          className="input"
          required
          value={businessName}
          onChange={(e) => setBusinessName(e.target.value)}
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Was macht dein Unternehmen?
        <textarea
          className="input"
          required
          rows={3}
          value={businessDescription}
          onChange={(e) => setBusinessDescription(e.target.value)}
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Kampagnenziel
        <select className="input" value={goal} onChange={(e) => setGoal(e.target.value as IntakeData["goal"])}>
          <option value="leads">Leads / Anfragen</option>
          <option value="sales">Verkäufe</option>
          <option value="traffic">Website-Traffic</option>
          <option value="awareness">Bekanntheit</option>
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Ziel-URL (Landingpage)
        <input
          className="input"
          type="url"
          required
          placeholder="https://…"
          value={finalUrl}
          onChange={(e) => setFinalUrl(e.target.value)}
        />
      </label>
      <div className="grid grid-cols-2 gap-4">
        <label className="flex flex-col gap-1 text-sm">
          Tagesbudget (EUR)
          <input
            className="input"
            type="number"
            min={1}
            required
            value={dailyBudgetEur}
            onChange={(e) => setDailyBudgetEur(Number(e.target.value))}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Zielregion(en), kommagetrennt
          <input
            className="input"
            required
            placeholder="Berlin, München"
            value={targetLocations}
            onChange={(e) => setTargetLocations(e.target.value)}
          />
        </label>
      </div>
      <label className="flex flex-col gap-1 text-sm">
        Zielgruppe (optional)
        <input className="input" value={audience} onChange={(e) => setAudience(e.target.value)} />
      </label>
      <button type="submit" className="btn-primary mt-2 self-start">
        Kampagne erstellen
      </button>
    </form>
  );
}
