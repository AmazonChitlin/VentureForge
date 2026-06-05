import { engineResultSchema, type EngineResult } from "@/engine/shared/engine-result";
import type { SourceReference } from "@/engine/shared/source-reference";
import {
  StrategyExecutionInputSchema,
  StrategyExecutionPlanSchema,
  type ExecutionInitiative,
  type ImpactAssessmentItem,
  type InitiativeKey,
  type NormalizedStrategyExecutionInput,
  type StrategyExecutionInput,
  type StrategyExecutionPlan,
} from "@/engine/execution/schema";

const executionSource: SourceReference = {
  id: "strategy-execution-method",
  title: "Deterministic strategy execution planning",
  sourceName: "VentureForge execution engine",
  sourceType: "manual",
  notes: "Execution initiatives are planning estimates tied to available diagnosis.",
};

const conceptSource: SourceReference = {
  id: "execution-business-concept",
  title: "Structured business concept",
  sourceName: "VentureForge concept engine",
  sourceType: "manual",
  notes: "Concept-stage planning output derived from founder intake.",
};

export const StrategyExecutionEngine = {
  buildExecutionPlan(
    inputDraft: StrategyExecutionInput,
  ): EngineResult<StrategyExecutionPlan> {
    const input = StrategyExecutionInputSchema.parse(inputDraft);
    const model = normalizedBusinessModel(input);
    const physical = isPhysicalModel(model);
    const online = isOnlineModel(model);
    const initiatives = buildInitiatives(input, model, physical, online);
    const missingInformation = buildMissingInformation(input);
    const warnings = buildWarnings(input);
    const assumptions = unique([
      ...input.businessConcept.assumptions,
      "Initiative cost and duration estimates are planning ranges until verified.",
      "Execution must remain gated by evidence: diagnose before committing capital or capacity.",
    ]);
    const feedbackLoop = buildFeedbackLoop(input);
    const plan = StrategyExecutionPlanSchema.parse({
      strategyFormulation: {
        strategicObjective: strategicObjective(input),
        targetCustomer: targetCustomer(input),
        valueProposition: input.businessConcept.coreCustomerBenefit,
        targetPosition: input.strategicAnalysis?.strategicRecommendations
          .positioningStrategy.recommendation ??
          `Test a focused position around ${input.businessConcept.coreCustomerBenefit}.`,
        businessModel: model,
        successMetrics: [
          "Validated customer problem and measurable offer response",
          "First paid proof and repeat-behavior evidence",
          "Traceable startup-cost and unit-economics assumptions",
          "Verified licensing, insurance, and compliance requirements",
        ],
      },
      impactAssessment: buildImpactAssessment(input, model, physical, online),
      targetBusinessDesign: {
        futureOperatingModel:
          `A staged ${model} operating model that validates demand before major commitments and reliably delivers ${input.businessConcept.primaryProductOrService}.`,
        coreCapabilitiesNeeded: unique([
          "Customer discovery and offer validation",
          "Reliable fulfillment and quality control",
          "Basic financial tracking and KPI review",
          physical ? "Location readiness and local compliance" : undefined,
          online ? "Digital acquisition and conversion measurement" : undefined,
        ]),
        requiredResources: unique([
          "Founder time and a clearly assigned initiative owner",
          "Verified startup budget and spending gates",
          "Required suppliers, equipment, facilities, or service tools",
          "Professional review where legal, tax, accounting, lending, insurance, or compliance questions arise",
        ]),
        requiredSystemsTools: unique([
          "Task tracker with initiative dependencies and evidence links",
          "Accounting or bookkeeping system",
          "Customer feedback and sales tracking",
          online || input.websiteNeeded
            ? "Website analytics and measurable inquiry or purchase tracking"
            : undefined,
        ]),
        valueStream: [
          "Customer awareness",
          "Problem recognition",
          "Offer evaluation",
          "Inquiry, booking, preorder, or purchase",
          "Reliable delivery",
          "Feedback and issue recovery",
          "Repeat purchase, referral, or follow-on order",
        ],
        supplierResourceMap: unique([
          input.strategicAnalysis?.strategicRecommendations
            .supplierResourceStrategy.recommendation ??
            "Identify the smallest supplier and resource set needed for a pilot.",
          "Record lead time, cost, quality, backup option, and owner for each critical resource.",
        ]),
        dataInformationNeeds: unique([
          ...input.feasibilityReport?.researchNeeded ?? [],
          ...input.marketResearchReport?.missingData ?? [],
          "Customer interview evidence, objections, willingness to pay, and repeat behavior",
          "Verified operating costs, supplier terms, and compliance requirements",
        ]),
      },
      initiatives,
      deploymentPlan: buildDeploymentPlan(initiatives),
      feedbackLoop,
    });
    const nextActions = initiatives
      .filter((initiative) => initiative.priority === "critical")
      .slice(0, 5)
      .map((initiative) => `Start initiative: ${initiative.title}.`);

    return engineResultSchema(StrategyExecutionPlanSchema).parse({
      data: plan,
      confidence: calculateConfidence(input),
      assumptions,
      missingInformation,
      warnings,
      sources: buildSources(input),
      nextActions,
    });
  },
};

function buildInitiatives(
  input: NormalizedStrategyExecutionInput,
  model: string,
  physical: boolean,
  online: boolean,
): ExecutionInitiative[] {
  const validationDependency: InitiativeKey[] = ["market_validation"];
  const formationDependency: InitiativeKey[] = ["entity_formation"];
  return [
    initiative("entity_formation", "Entity formation", "Choose and form the appropriate entity only after the initial concept review; verify filing decisions with qualified professionals and official agencies.", [], "Founder", "$100-$1,500 estimated; verify locally", "1-3 weeks", "high", "moderate", "Entity decision documented and filing status tracked", ["Entity options reviewed", "Official filing source identified"]),
    initiative("licensing", "Licensing and location readiness", physical
      ? "Verify zoning, occupancy, permits, state and local licenses, and location constraints before signing a lease or opening."
      : "Verify business, tax, professional, and local operating requirements before launch.", formationDependency, "Founder", "Unknown until official verification", "1-8+ weeks", physical ? "critical" : "high", physical ? "high" : "moderate", "Required approvals mapped and blockers resolved", ["Official agency checklist", "Location or operating requirements verified"]),
    initiative("market_validation", "Market validation", "Run interviews and a measurable low-cost offer test before major spending.", [], "Founder", "$0-$1,000 estimated", "1-4 weeks", "critical", "high", "Qualified interviews, measurable responses, and paid proof recorded", ["Customer interview notes", "Landing-page, preorder, booking, or pilot results"]),
    initiative("funding_preparation", "Funding preparation", "Document staged use of funds, owner contribution, assumptions, and evidence before requesting financing.", ["market_validation"], "Founder", "$0-$2,500 estimated", "2-6 weeks", "high", "moderate", "Funding gap and use-of-funds plan documented", ["Validated cost assumptions", "Business and financial documents list"]),
    initiative("supplier_setup", "Supplier and resource setup", "Verify the minimum supplier, equipment, facility, and service-resource set needed for the first reliable delivery.", validationDependency, "Founder", "Variable; verify quotes", "1-6 weeks", "high", "moderate", "Critical resources have verified cost, lead time, and backup", ["Supplier quotes", "Lead-time notes", "Backup plan"]),
    initiative("prototype_mvp", "Prototype or MVP", "Build the smallest testable version of the offer that produces customer-behavior evidence.", validationDependency, "Founder", "$0-$5,000 estimated; stage spending", "1-6 weeks", "critical", "moderate", "Pilot delivered and customer evidence recorded", ["Prototype, sample, pilot, or first-service workflow", "Customer feedback"]),
    initiative("branding", "Branding", "Create a simple, credible brand message tied to the tested customer problem and value proposition.", validationDependency, "Founder", "$0-$2,000 estimated", "1-3 weeks", "medium", "low", "Core message tested with target customers", ["Brand message", "Customer feedback"]),
    initiative("website", "Website and digital measurement", online
      ? "Launch a conversion-focused website with analytics, a clear offer, and a measurable inquiry or purchase action."
      : "Launch a simple website with local discovery, clear offer, contact details, and a measurable inquiry action.", ["branding", "prototype_mvp"], "Founder", "$0-$3,000 estimated", "1-4 weeks", online ? "critical" : "high", "moderate", "Website live with measurable conversion action", ["Website pages", "Analytics or inquiry tracking", "Verified contact information"]),
    initiative("launch_marketing", "Launch marketing", online
      ? "Run small digital campaigns and channel experiments that measure qualified traffic, inquiries, and conversions."
      : "Run small local and digital channel tests tied to qualified inquiries, visits, bookings, or purchases.", ["branding", "website"], "Founder", "$100-$2,500 estimated test budget", "2-8 weeks", "high", "moderate", "Qualified leads and conversion rate tracked by channel", ["Channel plan", "Campaign results", "Cost per qualified response"]),
    initiative("sales_process", "Sales process", "Define the steps from inquiry to paid proof, follow-up, objection tracking, and repeat behavior.", ["prototype_mvp"], "Founder", "$0-$1,000 estimated", "1-3 weeks", "critical", "moderate", "Conversion, objection, and follow-up steps documented", ["Sales script or flow", "Objection log", "Conversion data"]),
    initiative("accounting_setup", "Accounting setup", "Create bookkeeping categories, receipt capture, cash tracking, and a review cadence with professional support where needed.", formationDependency, "Founder", "$0-$2,500 estimated", "1-4 weeks", "high", "moderate", "Monthly close process and cash view established", ["Account chart", "Expense capture method", "Monthly review owner"]),
    initiative("insurance", "Insurance review", "Verify coverage needs with a licensed insurance professional before operations begin.", formationDependency, "Founder", "Unknown until quotes are collected", "1-4 weeks", "high", "high", "Coverage decision and renewal date documented", ["Insurance quotes", "Coverage notes"]),
    initiative("hiring_contractors", "Hiring or contractor readiness", "Define roles, timing, budget, training, and compliance only when workload evidence justifies added capacity.", ["operational_workflow"], "Founder", "Variable; verify payroll or contract assumptions", "2-8 weeks", "medium", "moderate", "Capacity trigger and role definition documented", ["Workload evidence", "Role description", "Cost estimate"]),
    initiative("operational_workflow", "Operational workflow", `Document the repeatable ${model} workflow from request through delivery, quality control, issue recovery, and follow-up.`, ["supplier_setup", "prototype_mvp"], "Founder", "$0-$2,500 estimated", "2-6 weeks", "high", "moderate", "Pilot workflow completed with tracked quality and timing", ["Workflow map", "Pilot timing", "Quality checklist"]),
    initiative("customer_feedback_loop", "Customer feedback loop", "Create a lightweight way to capture feedback, objections, satisfaction, repeat behavior, referrals, and pivot signals.", ["sales_process", "prototype_mvp"], "Founder", "$0-$500 estimated", "1-3 weeks", "high", "low", "Feedback and repeat-behavior review occurs weekly", ["Feedback form or notes", "Weekly review log"]),
  ];
}

function buildImpactAssessment(
  input: NormalizedStrategyExecutionInput,
  model: string,
  physical: boolean,
  online: boolean,
): ImpactAssessmentItem[] {
  return [
    impact("founder time", "high", `The founder must reserve time to validate and operate the ${model} model.`, "Set weekly capacity and assign owners before committing deadlines."),
    impact("capital", input.feasibilityReport ? "moderate" : "unknown", "Capital requirements need staged assumptions and spending gates.", "Release funds only after validation evidence and verified quotes."),
    impact("operations", "high", `The operating workflow must reliably deliver ${input.businessConcept.primaryProductOrService}.`, "Pilot the end-to-end workflow and record timing, quality, and bottlenecks."),
    impact("licensing", physical || input.regulatoryConcerns.length > 0 ? "high" : "moderate", "Official requirements may affect timing, location, and operating choices.", "Verify agency requirements before lease, equipment, or launch commitments."),
    impact("staffing", "moderate", "Capacity needs are not proven until the pilot workflow is measured.", "Define workload triggers before hiring or contractor spend."),
    impact("supply chain", "moderate", "Critical suppliers, tools, facilities, and backups require verification.", "Collect quotes, lead times, quality expectations, and fallback options."),
    impact("technology", online ? "high" : "moderate", "Technology should support measurement and reliable fulfillment.", "Use the smallest tool set that tracks conversion, delivery, and feedback."),
    impact("website", online ? "high" : "moderate", "The website must produce measurable learning or customer action.", "Launch a focused site with analytics and one clear call to action."),
    impact("marketing", "high", "Marketing must test a customer problem and channel rather than chase visibility alone.", "Use small channel experiments with qualified-response KPIs."),
    impact("sales", "high", "The sales process must turn interest into paid or behavioral proof.", "Track conversion, objections, follow-up, and repeat behavior."),
    impact("accounting", "moderate", "Cash, expense, and unit-economics visibility are needed before scaling.", "Set up bookkeeping and a monthly review cadence."),
    impact("insurance", "moderate", "Coverage needs vary by model, location, equipment, and staffing.", "Collect professional coverage advice and quotes before operations."),
    impact("compliance", physical ? "high" : "moderate", "Formation, tax, employment, and local compliance require verification.", "Maintain an official-source checklist and review calendar."),
    impact("customer experience", "high", "The first experience drives learning, trust, referrals, and repeat behavior.", "Define service standards, feedback capture, and issue recovery."),
  ];
}

function buildDeploymentPlan(initiatives: ExecutionInitiative[]) {
  const sequence = initiatives.map((initiative) => initiative.key);
  return {
    sequence,
    criticalPath: initiatives
      .filter((initiative) => initiative.priority === "critical")
      .map((initiative) => initiative.key),
    deploymentNotes: [
      "Start with diagnosis, market validation, and a small pilot before major capital commitments.",
      "Verify licensing, insurance, accounting, and compliance tasks with qualified professionals and official agencies.",
      "Update initiative status as evidence changes.",
    ],
  };
}

function buildFeedbackLoop(input: NormalizedStrategyExecutionInput) {
  return {
    weeklyLaunchReview: [
      "Review initiative status, blockers, evidence collected, and the next seven days.",
      "Review customer interviews, conversion, objections, and repeat-behavior signals.",
    ],
    monthlyFinancialReview: [
      "Review cash, revenue, fixed costs, variable costs, and funding gap.",
      "Compare actual results with assumptions and update spending gates.",
    ],
    quarterlyBusinessPlanReview: [
      "Review the business concept, market evidence, strategy, risks, and roadmap.",
      "Archive stale assumptions and record material changes.",
    ],
    kpiReview: [
      "Review qualified customer conversations and measurable offer responses.",
      "Review paid proof, conversion, repeat purchase, referrals, and fulfillment quality.",
      "Review cash runway and regulatory blockers.",
    ],
    assumptionsToRetest: unique([
      ...input.businessConcept.assumptions.slice(0, 4),
      "The first target segment has enough urgency and willingness to pay.",
      "The planned channel reaches qualified customers efficiently.",
    ]),
    pivotTriggers: [
      "Repeated customer interviews do not confirm the problem or urgency.",
      "Offer tests produce interest but no meaningful purchase behavior.",
      "Costs, licensing, supplier, or capacity constraints make the model impractical.",
      "A narrower customer segment or different delivery model consistently performs better.",
    ],
  };
}

function strategicObjective(input: NormalizedStrategyExecutionInput): string {
  return input.strategicAnalysis?.strategicRecommendations.positioningStrategy
    .recommendation ??
    `Validate a focused offer for ${targetCustomer(input)} before scaling commitments.`;
}

function targetCustomer(input: NormalizedStrategyExecutionInput): string {
  return input.customerAnalysis?.primaryCustomerPersona.segment ??
    input.businessConcept.targetCustomerSegment;
}

function normalizedBusinessModel(input: NormalizedStrategyExecutionInput): string {
  return input.businessModel ||
    inferBusinessModel(input.businessConcept.distributionModel);
}

function inferBusinessModel(distributionModel: string): string {
  const text = distributionModel.toLowerCase();
  if (text.includes("online")) return "online";
  if (text.includes("physical") || text.includes("storefront") || text.includes("facility")) {
    return "physical_location";
  }
  if (text.includes("mobile")) return "mobile";
  if (text.includes("home")) return "home_based";
  if (text.includes("subscription")) return "subscription";
  if (text.includes("marketplace")) return "marketplace";
  return "service_or_product_model_to_verify";
}

function isPhysicalModel(model: string): boolean {
  return ["physical_location", "hybrid", "manufacturing", "franchise"].includes(model);
}

function isOnlineModel(model: string): boolean {
  return ["online", "hybrid", "marketplace", "subscription", "ecommerce"].includes(model);
}

function buildMissingInformation(input: NormalizedStrategyExecutionInput): string[] {
  return unique([
    !input.feasibilityReport ? "Feasibility report is missing." : undefined,
    !input.marketResearchReport ? "Market-research report is missing." : undefined,
    !input.customerAnalysis ? "Customer analysis is missing." : undefined,
    !input.competitorAnalysis ? "Competitor analysis is missing." : undefined,
    !input.strategicAnalysis ? "Strategic analysis is missing." : undefined,
    !input.founder ? "Founder intake is missing." : undefined,
    !input.businessModel ? "Explicit business model is missing; the engine inferred a model from the concept." : undefined,
  ]);
}

function buildWarnings(input: NormalizedStrategyExecutionInput): string[] {
  return unique([
    "Diagnose before operating: initiative estimates are planning aids, not commitments or guarantees.",
    "Verify legal, tax, accounting, insurance, licensing, and compliance decisions with official agencies and qualified professionals.",
    !input.feasibilityReport
      ? "Feasibility diagnosis is missing. Keep spending limited to low-cost validation."
      : undefined,
    input.marketResearchReport?.containsMockData
      ? "Market-research input contains mock data. Replace placeholders before major spending."
      : undefined,
  ]);
}

function calculateConfidence(input: NormalizedStrategyExecutionInput): number {
  let score = 25;
  if (input.feasibilityReport) score += 15;
  if (input.marketResearchReport) score += 15;
  if (input.marketResearchReport && !input.marketResearchReport.containsMockData) score += 5;
  if (input.customerAnalysis) score += 10;
  if (input.competitorAnalysis) score += 10;
  if (input.strategicAnalysis) score += 15;
  if (input.founder) score += 5;
  return clamp(score);
}

function buildSources(input: NormalizedStrategyExecutionInput): SourceReference[] {
  return uniqueSources([
    conceptSource,
    executionSource,
    ...(input.marketResearchReport?.sourcesUsed ?? []),
  ]);
}

function initiative(
  key: InitiativeKey,
  title: string,
  description: string,
  dependency: InitiativeKey[],
  owner: string,
  costEstimate: string,
  durationEstimate: string,
  priority: ExecutionInitiative["priority"],
  risk: ExecutionInitiative["risk"],
  KPI: string,
  evidenceRequired: string[],
): ExecutionInitiative {
  return {
    key,
    title,
    description,
    owner,
    dependency,
    costEstimate,
    durationEstimate,
    priority,
    risk,
    KPI,
    evidenceRequired,
    status: "not_started",
  };
}

function impact(
  area: ImpactAssessmentItem["area"],
  impactLevel: ImpactAssessmentItem["impactLevel"],
  assessment: string,
  response: string,
): ImpactAssessmentItem {
  return { area, impactLevel, assessment, response };
}

function uniqueSources(sources: SourceReference[]): SourceReference[] {
  const seen = new Set<string>();
  return sources.filter((source) => {
    if (seen.has(source.id)) return false;
    seen.add(source.id);
    return true;
  });
}

function unique(values: (string | undefined)[]): string[] {
  return [...new Set(values.filter((value): value is string => value !== undefined))];
}

function clamp(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}
