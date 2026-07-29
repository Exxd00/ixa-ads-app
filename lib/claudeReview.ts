import { CampaignDraft, IntakeData, RuleViolation } from "./types";
import { rulesPromptBlock } from "./rules";

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-sonnet-4-5";

function extractJson(text: string): unknown | null {
  const cleaned = text.trim().replace(/^```(json)?/i, "").replace(/```$/, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    return null;
  }
}

async function callClaudeJson(systemPrompt: string, userPrompt: string): Promise<unknown | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  try {
    const res = await fetch(ANTHROPIC_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1500,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
      }),
    });

    if (!res.ok) {
      console.error("Claude review request failed", res.status, await res.text());
      return null;
    }

    const data = await res.json();
    const text = data.content?.[0]?.text;
    if (!text) return null;
    return extractJson(text);
  } catch (err) {
    console.error("Claude review request errored", err);
    return null;
  }
}

/**
 * Reviews a draft for semantic/policy issues a deterministic checker can't
 * catch. The hard structural violations (character/array counts) are
 * computed by lib/rules.ts's validateDraft() and passed in as context so
 * Claude never has to re-count characters itself — LLMs are unreliable at
 * that; Claude is reserved for judgment calls a regex can't make.
 */
export async function reviewDraft(
  intake: IntakeData,
  draft: CampaignDraft,
  hardViolations: RuleViolation[]
): Promise<{ issues: RuleViolation[]; reviewed: boolean }> {
  const systemPrompt = `Du bist ein strenger Prüfer für Google-Ads-Kampagnen-Entwürfe. Regeln:
${rulesPromptBlock()}

Ein deterministischer Checker hat bereits diese objektiven Verstöße gefunden (vertraue ihnen, zähle KEINE Zeichen oder Listenlängen selbst nach): ${JSON.stringify(hardViolations)}

Prüfe zusätzlich NUR semantische/inhaltliche Probleme: Passen Keywords, Anzeigentitel und Beschreibungen zueinander und zur Firma? Gibt es unbelegte Übertreibungen, riskante Formulierungen, oder Inkonsistenzen zur Ziel-URL/Zielgruppe, die der Checker nicht schon gefunden hat?

Antworte AUSSCHLIESSLICH als JSON-Objekt: { "issues": [ { "field": string, "rule": string, "message": string, "severity": "error"|"warning" } ] }. Gib ein leeres Array zurück, wenn es keine zusätzlichen Probleme gibt. Wiederhole NICHT die bereits genannten deterministischen Verstöße.`;

  const userPrompt = `Firma: ${intake.businessName} (${intake.businessDescription})
Ziel: ${intake.goal}, Ziel-URL: ${intake.finalUrl}

Entwurf:
${JSON.stringify(draft, null, 2)}`;

  const result = await callClaudeJson(systemPrompt, userPrompt);
  if (!result || typeof result !== "object") {
    return { issues: [], reviewed: false };
  }

  const r = result as { issues?: unknown };
  const issues = Array.isArray(r.issues)
    ? r.issues.filter((i): i is RuleViolation => {
        const v = i as Partial<RuleViolation>;
        return (
          typeof v === "object" &&
          v !== null &&
          typeof v.field === "string" &&
          typeof v.message === "string" &&
          (v.severity === "error" || v.severity === "warning")
        );
      })
    : [];

  return { issues, reviewed: true };
}
