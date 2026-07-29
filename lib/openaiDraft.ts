import { CampaignDraft, IntakeData, RuleViolation } from "./types";
import { fallbackDraft } from "./fallback";
import { rulesPromptBlock } from "./rules";

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";
const MODEL = "gpt-4o-mini";

async function callOpenAiJson(systemPrompt: string, userPrompt: string): Promise<unknown | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  try {
    const res = await fetch(OPENAI_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: MODEL,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.7,
      }),
    });

    if (!res.ok) {
      console.error("OpenAI request failed", res.status, await res.text());
      return null;
    }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) return null;
    return JSON.parse(content);
  } catch (err) {
    console.error("OpenAI request errored", err);
    return null;
  }
}

function buildSystemPrompt(): string {
  return `Du bist ein Google-Ads-Spezialist. Erstelle einen Kampagnen-Entwurf, der diese Regeln STRIKT einhält:
${rulesPromptBlock()}

Antworte AUSSCHLIESSLICH als JSON-Objekt mit exakt dieser Struktur:
{
  "headlines": string[],
  "descriptions": string[],
  "keywords": string[],
  "targetLocations": string[],
  "dailyBudgetEur": number,
  "finalUrl": string
}`;
}

/**
 * Drafts (or redrafts) a campaign. When priorIssues is passed, they're
 * appended verbatim as explicit correction instructions — this is the
 * "OpenAI creates, gets sent back with warnings" half of the review loop.
 */
export async function generateDraft(
  intake: IntakeData,
  priorIssues?: RuleViolation[]
): Promise<{ draft: CampaignDraft | null; aiGenerated: boolean }> {
  const systemPrompt = buildSystemPrompt();

  let userPrompt = `Firmenname: ${intake.businessName}
Beschreibung: ${intake.businessDescription}
Ziel der Kampagne: ${intake.goal}
Ziel-URL: ${intake.finalUrl}
Tagesbudget: ${intake.dailyBudgetEur} EUR
Zielregion(en): ${intake.targetLocations.join(", ")}
Zielgruppe: ${intake.audience || "allgemein"}`;

  if (priorIssues && priorIssues.length > 0) {
    userPrompt += `\n\nDer vorherige Entwurf wurde abgelehnt. Behebe GENAU diese Probleme:\n${priorIssues
      .map((i) => `- [${i.severity}] ${i.field}: ${i.message}`)
      .join("\n")}`;
  }

  const result = await callOpenAiJson(systemPrompt, userPrompt);
  if (!result || typeof result !== "object") {
    return { draft: null, aiGenerated: false };
  }

  const r = result as Partial<CampaignDraft>;
  const fallback = fallbackDraft(intake);
  const draft: CampaignDraft = {
    headlines: Array.isArray(r.headlines) && r.headlines.length > 0 ? r.headlines : fallback.headlines,
    descriptions:
      Array.isArray(r.descriptions) && r.descriptions.length > 0 ? r.descriptions : fallback.descriptions,
    keywords: Array.isArray(r.keywords) && r.keywords.length > 0 ? r.keywords : fallback.keywords,
    targetLocations:
      Array.isArray(r.targetLocations) && r.targetLocations.length > 0
        ? r.targetLocations
        : intake.targetLocations,
    dailyBudgetEur: typeof r.dailyBudgetEur === "number" ? r.dailyBudgetEur : intake.dailyBudgetEur,
    finalUrl: typeof r.finalUrl === "string" && r.finalUrl ? r.finalUrl : intake.finalUrl,
  };

  return { draft, aiGenerated: true };
}
