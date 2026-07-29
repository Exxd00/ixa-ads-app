import { CampaignDraft, RuleViolation } from "./types";

/**
 * Single source of truth for the Google Ads Responsive Search Ad rule set.
 * Both AI prompts (via rulesPromptBlock) and the hard validator below read
 * from this one object, so a limit can never drift out of sync between
 * what OpenAI is told, what Claude reviews against, and what actually gates
 * a "passed" result.
 */
export const RSA_RULES = {
  headlines: { min: 3, max: 15, maxChars: 30 },
  descriptions: { min: 2, max: 4, maxChars: 90 },
  keywords: { min: 3, max: 20 },
  policy: {
    maxExclamationMarksTotal: 1,
    exclamationForbiddenInHeadlines: true,
    unqualifiedSuperlatives: [
      "bester",
      "beste",
      "besten",
      "nummer 1",
      "#1",
      "günstigste",
      "billigste",
      "garantiert",
    ],
  },
} as const;

const ALLOWED_CAPS = new Set([
  "SEO", "GMBH", "AGB", "KFZ", "TV", "PDF", "ID", "VIP", "DIY", "USA", "EU", "IT", "PR", "FAQ",
]);

export function rulesPromptBlock(): string {
  const r = RSA_RULES;
  return [
    `- Anzeigentitel (headlines): genau ${r.headlines.min}-${r.headlines.max} Stück, je maximal ${r.headlines.maxChars} Zeichen, NIEMALS ein Ausrufezeichen enthalten.`,
    `- Anzeigentexte (descriptions): genau ${r.descriptions.min}-${r.descriptions.max} Stück, je maximal ${r.descriptions.maxChars} Zeichen, insgesamt maximal ${r.policy.maxExclamationMarksTotal} Ausrufezeichen über alle Texte zusammen.`,
    `- Keywords: ${r.keywords.min}-${r.keywords.max} relevante Suchbegriffe.`,
    `- Keine Wörter komplett in GROSSBUCHSTABEN (außer bekannte Abkürzungen wie SEO, GmbH).`,
    `- Keine unbelegten Superlative wie "bester", "Nummer 1", "garantiert", "günstigste" ohne Beleg.`,
    `- finalUrl muss eine gültige, funktionierende Landingpage-URL sein (https://...).`,
  ].join("\n");
}

function checkPolicyText(text: string, field: string, violations: RuleViolation[]) {
  for (const word of text.split(/\s+/)) {
    const clean = word.replace(/[^A-ZÄÖÜa-zäöü0-9]/g, "");
    if (
      clean.length > 1 &&
      clean === clean.toUpperCase() &&
      /[A-ZÄÖÜ]/.test(clean) &&
      !ALLOWED_CAPS.has(clean.toUpperCase())
    ) {
      violations.push({
        field,
        rule: "EXCESSIVE_CAPS",
        message: `Wort in Großbuchstaben: "${word}" in "${text}".`,
        severity: "warning",
      });
    }
  }
  const lower = text.toLowerCase();
  for (const s of RSA_RULES.policy.unqualifiedSuperlatives) {
    if (lower.includes(s)) {
      violations.push({
        field,
        rule: "UNQUALIFIED_SUPERLATIVE",
        message: `Unbelegter Superlativ "${s}" in: "${text}".`,
        severity: "warning",
      });
    }
  }
}

/**
 * The hard authority for objective, countable constraints (array lengths,
 * character counts, exclamation marks, URL shape). This never delegates to
 * an LLM for these checks — LLMs are unreliable at exact counting. Caps and
 * superlative checks are included here too (they're just as deterministic
 * as a substring/regex match) but flagged as "warning" since they're softer
 * judgment calls a human may reasonably override.
 */
export function validateDraft(draft: CampaignDraft): RuleViolation[] {
  const violations: RuleViolation[] = [];
  const r = RSA_RULES;

  if (draft.headlines.length < r.headlines.min || draft.headlines.length > r.headlines.max) {
    violations.push({
      field: "headlines",
      rule: "HEADLINE_COUNT",
      message: `Es müssen ${r.headlines.min}-${r.headlines.max} Anzeigentitel sein, gefunden: ${draft.headlines.length}.`,
      severity: "error",
    });
  }
  draft.headlines.forEach((h, i) => {
    if (h.length > r.headlines.maxChars) {
      violations.push({
        field: `headlines[${i}]`,
        rule: "HEADLINE_TOO_LONG",
        message: `"${h}" hat ${h.length} Zeichen, maximal erlaubt sind ${r.headlines.maxChars}.`,
        severity: "error",
      });
    }
    if (r.policy.exclamationForbiddenInHeadlines && h.includes("!")) {
      violations.push({
        field: `headlines[${i}]`,
        rule: "HEADLINE_EXCLAMATION",
        message: `Anzeigentitel dürfen kein Ausrufezeichen enthalten: "${h}".`,
        severity: "error",
      });
    }
    checkPolicyText(h, `headlines[${i}]`, violations);
  });

  if (draft.descriptions.length < r.descriptions.min || draft.descriptions.length > r.descriptions.max) {
    violations.push({
      field: "descriptions",
      rule: "DESCRIPTION_COUNT",
      message: `Es müssen ${r.descriptions.min}-${r.descriptions.max} Anzeigentexte sein, gefunden: ${draft.descriptions.length}.`,
      severity: "error",
    });
  }
  draft.descriptions.forEach((d, i) => {
    if (d.length > r.descriptions.maxChars) {
      violations.push({
        field: `descriptions[${i}]`,
        rule: "DESCRIPTION_TOO_LONG",
        message: `"${d}" hat ${d.length} Zeichen, maximal erlaubt sind ${r.descriptions.maxChars}.`,
        severity: "error",
      });
    }
    checkPolicyText(d, `descriptions[${i}]`, violations);
  });
  const totalExclamations = draft.descriptions.join("").split("!").length - 1;
  if (totalExclamations > r.policy.maxExclamationMarksTotal) {
    violations.push({
      field: "descriptions",
      rule: "TOO_MANY_EXCLAMATIONS",
      message: `Insgesamt ${totalExclamations} Ausrufezeichen in den Anzeigentexten, erlaubt sind maximal ${r.policy.maxExclamationMarksTotal}.`,
      severity: "error",
    });
  }

  if (draft.keywords.length < r.keywords.min || draft.keywords.length > r.keywords.max) {
    violations.push({
      field: "keywords",
      rule: "KEYWORD_COUNT",
      message: `Es müssen ${r.keywords.min}-${r.keywords.max} Keywords sein, gefunden: ${draft.keywords.length}.`,
      severity: "error",
    });
  }

  if (!draft.finalUrl || !/^https?:\/\/.+\..+/.test(draft.finalUrl)) {
    violations.push({
      field: "finalUrl",
      rule: "INVALID_FINAL_URL",
      message: `"${draft.finalUrl}" ist keine gültige URL.`,
      severity: "error",
    });
  }

  return violations;
}
