export interface IntakeData {
  businessName: string;
  businessDescription: string;
  goal: "leads" | "sales" | "traffic" | "awareness";
  finalUrl: string;
  dailyBudgetEur: number;
  targetLocations: string[];
  audience: string;
}

export interface CampaignDraft {
  headlines: string[];
  descriptions: string[];
  keywords: string[];
  targetLocations: string[];
  dailyBudgetEur: number;
  finalUrl: string;
}

export interface RuleViolation {
  field: string;
  rule: string;
  message: string;
  severity: "error" | "warning";
}

export interface LoopIteration {
  n: number;
  source: "openai" | "fallback";
  draft: CampaignDraft;
  issues: RuleViolation[];
  reviewedByClaude: boolean;
  passed: boolean;
}

export interface LoopResult {
  status: "passed" | "needs_manual_review";
  iterations: LoopIteration[];
  finalDraft: CampaignDraft;
  aiUsed: boolean;
}

export interface PushResult {
  simulated: boolean;
  campaignId?: string;
  message: string;
}

export interface StatusInfo {
  googleConfigured: boolean;
  googleConnected: boolean;
  openaiConfigured: boolean;
  anthropicConfigured: boolean;
  realPublishConfigured: boolean;
}

export type WizardStep = "connect" | "describe" | "looping" | "review" | "pushing" | "done";
