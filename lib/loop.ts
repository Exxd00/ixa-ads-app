import { CampaignDraft, IntakeData, LoopIteration, LoopResult, RuleViolation } from "./types";
import { generateDraft } from "./openaiDraft";
import { reviewDraft } from "./claudeReview";
import { fallbackDraft } from "./fallback";
import { validateDraft } from "./rules";

// 1 initial draft + up to 3 corrective retries. Bounds worst-case wait to
// roughly 4 * (OpenAI + Claude call latency) and caps API cost per request;
// in practice a correctly-prompted draft against explicit rules should pass
// in 1-2 rounds.
const MAX_ITERATIONS = 4;

/**
 * The generate -> review -> fix loop: OpenAI drafts, the deterministic
 * validator + Claude review it, and on any error-severity issue the draft
 * goes back to OpenAI with those issues as explicit correction instructions.
 * Never silently passes a failing draft — if MAX_ITERATIONS is exhausted the
 * result is a distinct "needs_manual_review" terminal state.
 */
export async function orchestrateLoop(intake: IntakeData): Promise<LoopResult> {
  const iterations: LoopIteration[] = [];

  // No AI keys at all -> skip the loop entirely, same graceful-fallback
  // philosophy as ixa.app: no network call, one deterministic iteration.
  if (!process.env.OPENAI_API_KEY && !process.env.ANTHROPIC_API_KEY) {
    const draft = fallbackDraft(intake);
    iterations.push({ n: 1, source: "fallback", draft, issues: [], reviewedByClaude: false, passed: true });
    return { status: "passed", iterations, finalDraft: draft, aiUsed: false };
  }

  let priorIssues: RuleViolation[] | undefined;
  let lastDraft: CampaignDraft = fallbackDraft(intake);

  for (let n = 1; n <= MAX_ITERATIONS; n++) {
    const gen = await generateDraft(intake, priorIssues);
    const draft = gen.draft ?? fallbackDraft(intake);
    lastDraft = draft;

    const hardViolations = validateDraft(draft);
    const review = await reviewDraft(intake, draft, hardViolations);
    const issues = [...hardViolations, ...review.issues];
    const passed = issues.every((i) => i.severity !== "error");

    iterations.push({
      n,
      source: gen.aiGenerated ? "openai" : "fallback",
      draft,
      issues,
      reviewedByClaude: review.reviewed,
      passed,
    });

    if (passed) {
      return { status: "passed", iterations, finalDraft: draft, aiUsed: true };
    }
    priorIssues = issues;
  }

  return { status: "needs_manual_review", iterations, finalDraft: lastDraft, aiUsed: true };
}
