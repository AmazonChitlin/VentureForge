import {
  getFrameworkById,
  loadAllKnowledgeFiles,
  loadKnowledgeFile,
} from "../src/knowledge/loader";

const requiredPlanSections = [
  "Executive Summary",
  "Business Concept",
  "Company Description",
  "Mission, Vision, and Values",
  "Founder / Management Team",
  "Industry Analysis",
  "Market Research",
  "Customer Analysis",
  "Competitive Analysis",
  "Product or Service Line",
  "Business Model",
  "Marketing and Sales Plan",
  "Operations / Process Plan",
  "Organization and Legal Structure",
  "Technology and Systems Plan",
  "Risk and Contingency Plan",
  "Growth Plan",
  "Funding Request",
  "Financial Plan",
  "Launch Roadmap",
  "Appendix",
];

const requiredResearchMethods = [
  "secondary research",
  "official statistics",
  "surveys",
  "interviews",
  "focus groups",
  "observational research",
  "ethnographic research",
  "experiments",
  "internet research",
  "mixed methods",
];

const requiredExecutionStages = [
  "strategy formulation",
  "impact assessment",
  "future state / target business design",
  "initiative scoping and prioritization",
  "roadmap and deployment planning",
  "feedback loop and KPI review",
];

async function main() {
  const frameworks = await loadAllKnowledgeFiles();
  if (frameworks.length !== 12) {
    throw new Error(`Expected 12 methodology files, received ${frameworks.length}.`);
  }

  const ids = new Set(frameworks.map((framework) => framework.id));
  if (ids.size !== frameworks.length) {
    throw new Error("Methodology IDs must be unique.");
  }

  const businessPlan = await loadKnowledgeFile("business-plan");
  requireValues("business-plan outputs", businessPlan.outputs, requiredPlanSections);

  const marketResearch = await loadKnowledgeFile("market-research");
  requireValues(
    "market-research outputs",
    marketResearch.outputs,
    requiredResearchMethods,
  );

  const strategyExecution = await getFrameworkById("strategy-execution");
  if (!strategyExecution) {
    throw new Error("Expected strategy-execution framework.");
  }
  requireValues(
    "strategy-execution outputs",
    strategyExecution.outputs,
    requiredExecutionStages,
  );

  const unknown = await getFrameworkById("not-a-framework");
  if (unknown !== undefined) {
    throw new Error("Unknown framework IDs must return undefined.");
  }

  console.info(`Knowledge pack valid: ${frameworks.length} methodology files.`);
}

function requireValues(
  label: string,
  actual: string[],
  required: string[],
) {
  const normalized = actual.map((value) => value.toLowerCase());
  for (const expected of required) {
    if (!normalized.includes(expected.toLowerCase())) {
      throw new Error(`Missing ${label} entry: ${expected}`);
    }
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
