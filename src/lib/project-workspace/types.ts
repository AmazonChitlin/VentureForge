import type { EngineResult } from "@/engine/shared/engine-result";
import type { FinancialEngineInput } from "@/engine/financials";
import type {
  FounderBusinessIntake,
  FounderIntake,
  BusinessIdeaIntake,
} from "@/engine/intake";
import type { ProofOfConceptEvidence } from "@/engine/feasibility";
import type { WebsiteTone } from "@/engine/website";
import type { GenerationStatusInfo } from "@/lib/project-workspace/generation-status";

export const workspaceModuleKeys = [
  "intake",
  "concept",
  "feasibility",
  "market",
  "customers",
  "competitors",
  "strategy",
  "execution",
  "plan",
  "financials",
  "funding",
  "state",
  "launch",
  "risk",
  "website",
] as const;

export type WorkspaceModuleKey = (typeof workspaceModuleKeys)[number];

export interface WorkspaceProject {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  intake: FounderBusinessIntake;
  financialInput: FinancialEngineInput;
  proofOfConcept: Partial<ProofOfConceptEvidence>;
  websiteTone: WebsiteTone;
  outputs: Partial<Record<WorkspaceModuleKey, EngineResult<unknown>>>;
  generationStatuses: Partial<Record<WorkspaceModuleKey, GenerationStatusInfo>>;
}

export interface WorkspaceProjectSummary {
  id: string;
  name: string;
  businessIdea: string;
  location: string;
  updatedAt: string;
  completedModules: WorkspaceModuleKey[];
}

export interface CreateWorkspaceProjectInput {
  name?: string;
  businessIdea?: string;
  city?: string;
  state?: string;
  businessModel?: BusinessIdeaIntake["businessModel"];
}

export interface UpdateWorkspaceProjectInput {
  name?: string;
  intake?: {
    founder?: Partial<FounderIntake>;
    idea?: Partial<BusinessIdeaIntake>;
  };
  financialInput?: FinancialEngineInput;
  proofOfConcept?: Partial<ProofOfConceptEvidence>;
  websiteTone?: WebsiteTone;
}

export interface WorkspaceModuleDescriptor {
  key: WorkspaceModuleKey;
  title: string;
  shortTitle: string;
  route: string;
  description: string;
  dependencies: WorkspaceModuleKey[];
}
