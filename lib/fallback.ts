import { CampaignDraft, IntakeData } from "./types";
import { RSA_RULES } from "./rules";

function truncate(s: string, max: number): string {
  return s.length <= max ? s : s.slice(0, max - 1).trimEnd() + "…";
}

/**
 * Deterministic, no-network draft used whenever no AI key is configured (or
 * a generation call fails). Built purely from the intake form data, and
 * truncated defensively so it always satisfies validateDraft() — the loop
 * relies on this to short-circuit safely without ever needing an AI call.
 */
export function fallbackDraft(intake: IntakeData): CampaignDraft {
  const { businessName, businessDescription, targetLocations, dailyBudgetEur, finalUrl } = intake;
  const city = targetLocations[0] || "Deutschland";
  const keyword = (businessDescription.split(/\s+/).slice(0, 2).join(" ") || businessName).trim();

  const headlines = [
    businessName,
    `${keyword} in ${city}`,
    "Jetzt Anfragen",
    "Professionell & Zuverlässig",
  ].map((h) => truncate(h, RSA_RULES.headlines.maxChars));

  const descriptions = [
    `${businessName}: ${businessDescription}`,
    `Jetzt unverbindlich anfragen. Wir sind für Sie in ${city} da.`,
  ].map((d) => truncate(d, RSA_RULES.descriptions.maxChars));

  const keywords = [keyword, `${keyword} ${city}`, businessName, `${keyword} in der Nähe`].filter(
    (k, i, arr) => k.trim().length > 0 && arr.indexOf(k) === i
  );

  return {
    headlines,
    descriptions,
    keywords: keywords.length >= 3 ? keywords : [...keywords, businessName, city],
    targetLocations: targetLocations.length > 0 ? targetLocations : [city],
    dailyBudgetEur: Math.max(1, dailyBudgetEur || 5),
    finalUrl,
  };
}
