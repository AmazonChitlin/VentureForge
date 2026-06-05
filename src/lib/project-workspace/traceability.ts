import type { SourceReference } from "@/engine/shared/source-reference";
import { workspaceModuleCatalogByKey } from "@/lib/project-workspace/catalog";
import type {
  WorkspaceModuleKey,
  WorkspaceProject,
} from "@/lib/project-workspace/types";

export interface TraceabilityStageDescriptor {
  key: WorkspaceModuleKey;
  title: string;
  inputsConsumed: string[];
  outputsProduced: string[];
  downstreamStages: WorkspaceModuleKey[];
}

export interface TraceabilityStage extends TraceabilityStageDescriptor {
  generated: boolean;
  confidence: number | null;
  assumptions: string[];
  sources: SourceReference[];
  warnings: string[];
  nextActions: string[];
}

export interface TraceabilityReport {
  projectId: string;
  projectName: string;
  updatedAt: string;
  generatedStageCount: number;
  totalStageCount: number;
  stages: TraceabilityStage[];
}

export const traceabilityStageCatalog: TraceabilityStageDescriptor[] = [
  stage(
    "intake",
    "Founder Intake",
    ["Founder answers", "Business idea answers", "Location and operating-model answers"],
    ["Intake completeness score", "Missing fields", "Next-best questions"],
    ["concept", "competitors", "financials", "state"],
  ),
  stage(
    "concept",
    "Business Concept",
    ["Founder intake", "Business idea intake", "Intake completeness review"],
    ["Concept statement", "Customer problem and solution", "NAICS suggestions", "Assumptions and early risks"],
    ["feasibility", "market", "customers", "strategy", "execution", "plan", "website"],
  ),
  stage(
    "feasibility",
    "Feasibility Review",
    ["Business concept", "Founder intake", "Market research", "Competitor analysis", "Financial assumptions", "Proof of concept"],
    ["Feasibility score", "Proof-of-concept score", "Evidence gates", "Validation steps"],
    ["strategy", "execution", "funding", "risk", "plan"],
  ),
  stage(
    "market",
    "Market Research",
    ["Business concept", "Location", "Industry and NAICS hints", "Configured data providers"],
    ["Market indicators", "Demand and pricing signals", "Market-size and saturation estimates", "Source-quality confidence"],
    ["feasibility", "customers", "strategy", "execution", "funding", "plan"],
  ),
  stage(
    "customers",
    "Customer Analysis",
    ["Business concept", "Business idea intake", "Market research"],
    ["Customer personas", "Buying hypotheses", "Objections", "Validation questions"],
    ["strategy", "execution", "plan", "website"],
  ),
  stage(
    "competitors",
    "Competitor Analysis",
    ["Known competitors", "Location", "Industry", "Target customer", "Pricing idea"],
    ["Competitive grid", "Direct and indirect alternatives", "White-space opportunities", "Differentiation recommendations"],
    ["feasibility", "strategy", "execution", "plan"],
  ),
  stage(
    "strategy",
    "Strategic Analysis",
    ["Business concept", "Feasibility review", "Market research", "Customer analysis", "Competitor analysis", "Founder intake"],
    ["SWOT", "PESTLE", "Opportunity and threat profile", "Marketing mix", "Strategic recommendations"],
    ["execution", "risk", "plan", "website"],
  ),
  stage(
    "execution",
    "Strategy Execution Plan",
    ["Strategic analysis", "Business concept", "Feasibility review", "Market research", "Customer and competitor analysis"],
    ["Strategy formulation", "Impact assessment", "Target operating model", "Prioritized initiatives", "Feedback cycles"],
    ["launch", "plan"],
  ),
  stage(
    "financials",
    "Financial Model",
    ["Startup-cost assumptions", "Monthly-cost assumptions", "Sales assumptions", "Founder capital"],
    ["Startup-cost table", "Cash-flow forecast", "Break-even analysis", "Funding gap", "Sensitivity analysis"],
    ["funding", "risk", "plan"],
  ),
  stage(
    "funding",
    "Funding Readiness",
    ["Founder profile", "Business idea", "Feasibility review", "Financial model", "Market research", "Ownership attributes"],
    ["Funding-readiness score", "Matched research pathways", "Documents to prepare", "Verification reminders"],
    ["plan"],
  ),
  stage(
    "state",
    "State Launch Checklist",
    ["State", "Business model", "Industry flags", "Staffing plan", "Taxable-sales hints"],
    ["State-specific checklist", "Local compliance tasks", "Official agency sources", "Verification warnings"],
    ["plan"],
  ),
  stage(
    "plan",
    "Business Plan",
    ["Available upstream engine outputs", "Founder intake", "Editable plan sections", "Locked-section state"],
    ["Editable plan sections", "Section confidence scores", "Source notes", "Export-ready narrative"],
    [],
  ),
  stage(
    "website",
    "Website Package",
    ["Business concept", "Customer persona", "Customer objections", "Positioning strategy", "Marketing strategy"],
    ["Website pages", "FAQ", "SEO metadata", "Static HTML and CSS", "Next.js starter files"],
    [],
  ),
];

export function buildTraceabilityReport(
  project: WorkspaceProject,
): TraceabilityReport {
  const stages = traceabilityStageCatalog.map((descriptor) => {
    const result = project.outputs[descriptor.key];
    return {
      ...descriptor,
      generated: Boolean(result),
      confidence: result?.confidence ?? null,
      assumptions: result?.assumptions ?? [],
      sources: result?.sources ?? [],
      warnings: result?.warnings ?? [],
      nextActions: result?.nextActions ?? [],
    };
  });

  return {
    projectId: project.id,
    projectName: project.name,
    updatedAt: project.updatedAt,
    generatedStageCount: stages.filter((stage) => stage.generated).length,
    totalStageCount: stages.length,
    stages,
  };
}

export function traceabilityStageTitle(key: WorkspaceModuleKey): string {
  return (
    traceabilityStageCatalog.find((stageDescriptor) => stageDescriptor.key === key)
      ?.title ??
    workspaceModuleCatalogByKey.get(key)?.title ??
    key
  );
}

function stage(
  key: WorkspaceModuleKey,
  title: string,
  inputsConsumed: string[],
  outputsProduced: string[],
  downstreamStages: WorkspaceModuleKey[],
): TraceabilityStageDescriptor {
  return { key, title, inputsConsumed, outputsProduced, downstreamStages };
}
