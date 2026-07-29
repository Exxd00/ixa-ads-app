"use client";

import { useState } from "react";
import { CampaignDraft, LoopResult } from "@/lib/types";

export default function DraftReview({
  result,
  draft,
  onChange,
  onApprove,
}: {
  result: LoopResult;
  draft: CampaignDraft;
  onChange: (draft: CampaignDraft) => void;
  onApprove: () => void;
}) {
  const [overrideChecked, setOverrideChecked] = useState(false);
  const needsReview = result.status === "needs_manual_review";
  const canApprove = !needsReview || overrideChecked;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        Dies ist nur ein <strong>Entwurf</strong>. Es wird keine Kampagne bei Google Ads
        veröffentlicht oder Budget ausgegeben, bis du ausdrücklich zustimmst.
      </div>

      {needsReview && (
        <div className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800">
          Dieser Entwurf hat die automatische Prüfung nach {result.iterations.length} Versuchen
          nicht bestanden. Bitte die Felder unten manuell korrigieren.
        </div>
      )}

      <Section title="Anzeigentitel">
        <TagList items={draft.headlines} onChange={(headlines) => onChange({ ...draft, headlines })} />
      </Section>

      <Section title="Anzeigentexte">
        <div className="flex flex-col gap-2">
          {draft.descriptions.map((d, i) => (
            <textarea
              key={i}
              className="input"
              rows={2}
              value={d}
              onChange={(e) => {
                const descriptions = [...draft.descriptions];
                descriptions[i] = e.target.value;
                onChange({ ...draft, descriptions });
              }}
            />
          ))}
        </div>
      </Section>

      <Section title="Keywords">
        <TagList items={draft.keywords} onChange={(keywords) => onChange({ ...draft, keywords })} />
      </Section>

      <div className="grid grid-cols-2 gap-6">
        <Section title="Zielregion(en)">
          <TagList
            items={draft.targetLocations}
            onChange={(targetLocations) => onChange({ ...draft, targetLocations })}
          />
        </Section>
        <Section title="Tagesbudget (EUR)">
          <input
            type="number"
            min={1}
            className="input w-32"
            value={draft.dailyBudgetEur}
            onChange={(e) => onChange({ ...draft, dailyBudgetEur: Number(e.target.value) })}
          />
        </Section>
      </div>

      <Section title="Ziel-URL">
        <input
          type="url"
          className="input"
          value={draft.finalUrl}
          onChange={(e) => onChange({ ...draft, finalUrl: e.target.value })}
        />
      </Section>

      {needsReview && (
        <label className="flex items-start gap-2 text-sm text-neutral-700">
          <input
            type="checkbox"
            checked={overrideChecked}
            onChange={(e) => setOverrideChecked(e.target.checked)}
            className="mt-1"
          />
          Ich habe die verbleibenden Probleme geprüft und möchte trotzdem fortfahren.
        </label>
      )}

      <button className="btn-primary self-start" disabled={!canApprove} onClick={onApprove}>
        {needsReview ? "Trotzdem freigeben" : "Freigeben & Veröffentlichen"}
      </button>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="mb-2 text-sm font-semibold text-neutral-700">{title}</h3>
      {children}
    </div>
  );
}

function TagList({ items, onChange }: { items: string[]; onChange: (items: string[]) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item, i) => (
        <input
          key={i}
          className="input"
          style={{ width: `${Math.max(6, item.length + 2)}ch` }}
          value={item}
          onChange={(e) => {
            const next = [...items];
            next[i] = e.target.value;
            onChange(next);
          }}
        />
      ))}
    </div>
  );
}
