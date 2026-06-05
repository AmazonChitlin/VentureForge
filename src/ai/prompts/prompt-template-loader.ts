import { businessConceptPrompt } from "./business-concept";
import { businessPlanPrompt } from "./business-plan";
import { competitorAnalysisPrompt } from "./competitor-analysis";
import { customerAnalysisPrompt } from "./customer-analysis";
import { feasibilityPrompt } from "./feasibility";
import { financialNarrativePrompt } from "./financial-narrative";
import { fundingMatchPrompt } from "./funding-match";
import { intakeQuestionsPrompt } from "./intake-questions";
import { launchRoadmapPrompt } from "./launch-roadmap";
import { marketResearchPrompt } from "./market-research";
import { riskPrompt } from "./risk";
import { sourceAwareAnalysisPrompt } from "./source-aware-analysis";
import { stateChecklistPrompt } from "./state-checklist";
import { strategyPrompt } from "./strategy";
import type { PromptTemplate } from "./types";
import { websitePrompt } from "./website";

export const promptTemplates = [
  intakeQuestionsPrompt,
  businessConceptPrompt,
  feasibilityPrompt,
  marketResearchPrompt,
  customerAnalysisPrompt,
  competitorAnalysisPrompt,
  strategyPrompt,
  businessPlanPrompt,
  financialNarrativePrompt,
  fundingMatchPrompt,
  stateChecklistPrompt,
  launchRoadmapPrompt,
  websitePrompt,
  riskPrompt,
] as const satisfies readonly PromptTemplate[];

export type PromptTemplateId = (typeof promptTemplates)[number]["id"];

const templateById = new Map<string, PromptTemplate>(
  promptTemplates.map((template) => [template.id, template]),
);

export function loadPromptTemplate(id: PromptTemplateId): PromptTemplate {
  const template = templateById.get(id);
  if (!template) {
    throw new Error(`Unknown AI prompt template: ${id}.`);
  }
  return template;
}

export function loadAllPromptTemplates(): PromptTemplate[] {
  return [...promptTemplates];
}

export function renderPromptTemplate(id: PromptTemplateId): {
  systemPrompt: string;
  userPrompt: string;
} {
  const template = loadPromptTemplate(id);
  return {
    systemPrompt: [
      "You are an optional VentureForge planning assistant.",
      ...sourceAwareAnalysisPrompt.instructions,
      "Return only JSON matching the requested schema.",
    ].join("\n- "),
    userPrompt: [
      `Task: ${template.title}.`,
      `Objective: ${template.objective}`,
      ...template.instructions.map((instruction) => `- ${instruction}`),
    ].join("\n"),
  };
}
