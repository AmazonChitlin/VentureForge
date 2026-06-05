import type {
  WorkspaceModuleDescriptor,
  WorkspaceModuleKey,
} from "@/lib/project-workspace/types";

export const workspaceModuleCatalog: WorkspaceModuleDescriptor[] = [
  module("intake", "Detailed Answers", "Detailed Answers", "intake", "Review or edit the detailed answers behind your step-by-step walkthrough.", []),
  module("concept", "Business Idea Summary", "Idea Summary", "concept", "Turn your answers into a clear summary of what you may sell, who it may help, and what still needs proof.", ["intake"]),
  module("feasibility", "Idea Check", "Idea Check", "feasibility", "Estimate the idea's strengths and risks, then list what to test before spending serious money.", ["concept", "market", "competitors"]),
  module("market", "Market Research", "Market Research", "market", "Prepare a local research draft with clearly labeled official, user-provided, and sample sources.", ["concept"]),
  module("customers", "Customer Picture", "Customers", "customers", "Describe who may buy first, what may stop them, and what questions to ask.", ["concept", "market"]),
  module("competitors", "Other Customer Options", "Other Options", "competitors", "Organize other businesses and alternatives a customer could choose instead.", ["intake"]),
  module("strategy", "Business Strategy", "Strategy", "strategy", "Use your customers, local market, and other options to suggest a practical direction.", ["feasibility", "customers", "competitors"]),
  module("execution", "Action Plan", "Action Plan", "execution", "Turn the strategy into small tasks with owners, order, and ways to measure progress.", ["strategy"]),
  module("financials", "Money Estimate", "Money Estimate", "financials", "Estimate startup costs, monthly cash movement, and the sales needed to cover costs.", ["intake"]),
  module("funding", "Funding Options", "Funding Options", "funding", "Research possible funding paths and show what to prepare before applying.", ["financials", "feasibility", "market"]),
  module("state", "State Setup Checklist", "State Setup", "state", "Prepare a state-specific checklist to verify with official agencies.", ["intake"]),
  module("launch", "Launch Roadmap", "Launch", "launch", "Place execution initiatives into practical launch windows.", ["execution"]),
  module("risk", "Things to Watch", "Things to Watch", "risk", "List warning signs and backup plans for the risks most likely to matter.", ["financials", "feasibility", "strategy"]),
  module("plan", "Business Plan", "Business Plan", "plan", "Create an editable plan draft from the answers and research gathered so far.", ["concept"]),
  module("website", "Website Starter", "Website Starter", "website", "Create starter website copy and preview files to review before publishing.", ["concept", "customers", "strategy"]),
];

export const workspaceModuleCatalogByKey = new Map(
  workspaceModuleCatalog.map((item) => [item.key, item]),
);

export function isWorkspaceModuleKey(value: string): value is WorkspaceModuleKey {
  return workspaceModuleCatalogByKey.has(value as WorkspaceModuleKey);
}

function module(
  key: WorkspaceModuleKey,
  title: string,
  shortTitle: string,
  route: string,
  description: string,
  dependencies: WorkspaceModuleKey[],
): WorkspaceModuleDescriptor {
  return { key, title, shortTitle, route, description, dependencies };
}
