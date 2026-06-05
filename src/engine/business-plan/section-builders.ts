import type {
  BusinessPlanSectionKey,
  BusinessPlanType,
  NormalizedBusinessPlanInput,
} from "@/engine/business-plan/schema";
import type { SourceReference } from "@/engine/shared/source-reference";
import {
  getSBAResourcesForBusinessPlanSection,
  getSBAResourcesForStages,
  sbaResourceToSourceReference,
} from "@/providers/sba/provider";

export interface BusinessPlanSectionDraft {
  narrative: string;
  assumptions: string[];
  sourceNotes: SourceReference[];
  confidenceScore: number;
  missingInformation: string[];
}

const intakeSource: SourceReference = internalSource(
  "plan-founder-intake",
  "Founder and business intake",
  "VentureForge intake engine",
  "user",
  "Founder-entered inputs have not been independently verified.",
);
const conceptSource = internalSource(
  "plan-business-concept",
  "Structured business concept",
  "VentureForge concept engine",
);
const feasibilitySource = internalSource(
  "plan-feasibility-report",
  "Feasibility report",
  "VentureForge feasibility engine",
);
const customerSource = internalSource(
  "plan-customer-analysis",
  "Customer analysis",
  "VentureForge customer-analysis engine",
);
const competitorSource = internalSource(
  "plan-competitor-analysis",
  "Competitor analysis",
  "VentureForge competitor-analysis engine",
);
const strategySource = internalSource(
  "plan-strategy-analysis",
  "Strategic analysis",
  "VentureForge strategy engine",
);
const executionSource = internalSource(
  "plan-execution-plan",
  "Strategy execution plan",
  "VentureForge execution engine",
);
const financialSource = internalSource(
  "plan-financial-projection",
  "Editable financial projection",
  "VentureForge financial engine",
);
const fundingSource = internalSource(
  "plan-funding-match",
  "Funding-readiness matches",
  "VentureForge funding engine",
);
const riskSource = internalSource(
  "plan-risk-register",
  "Risk and contingency register",
  "VentureForge risk engine",
);
const launchSource = internalSource(
  "plan-launch-roadmap",
  "Launch roadmap",
  "VentureForge launch-roadmap engine",
);

export function buildSectionDraft(
  input: NormalizedBusinessPlanInput,
  planType: BusinessPlanType,
  key: BusinessPlanSectionKey,
): BusinessPlanSectionDraft {
  const missingInformation = missingInformationForSection(input, key);
  const sourceNotes = sourceNotesForSection(input, key);
  return {
    narrative: narrativeForSection(input, key, planType),
    assumptions: assumptionsForSection(input, key),
    sourceNotes,
    confidenceScore: confidenceForSection(input, key, missingInformation),
    missingInformation,
  };
}

function narrativeForSection(
  input: NormalizedBusinessPlanInput,
  key: BusinessPlanSectionKey,
  planType: BusinessPlanType,
): string {
  const concise = planType !== "traditional_plan";
  const { founder, idea, businessConcept } = input;

  switch (key) {
    case "executive_summary": {
      const financial = input.financialProjection;
      return paragraph([
        `${idea.businessName || "The proposed business"} is an estimated ${businessConcept.suggestedBusinessType} concept based in ${location(input)}. It plans to offer ${businessConcept.primaryProductOrService} for ${businessConcept.targetCustomerSegment}.`,
        `The customer-value hypothesis is ${businessConcept.coreCustomerBenefit}. The intended differentiator is ${businessConcept.differentiator}.`,
        financial
          ? `The editable financial model currently estimates ${money(startupCostTotal(input))} in startup costs, a ${money(financial.fundingGap.value ?? 0)} funding gap, and ${breakEvenText(input)}. These are planning estimates, not promises.`
          : "A traceable financial model is still missing, so startup cost, funding need, and break-even claims remain incomplete.",
        input.feasibilityReport
          ? `The feasibility engine currently classifies the opportunity as "${input.feasibilityReport.recommendation}" with a ${input.feasibilityReport.totalFeasibilityScore}/100 estimate.`
          : "A feasibility review is still needed before major spending.",
        concise
          ? "Use the appendix for supporting evidence and replace missing research before sending this summary externally."
          : "The immediate objective is to validate demand, verify compliance, and update this living plan as evidence improves.",
      ]);
    }
    case "business_concept":
      return paragraph([
        businessConcept.businessConceptStatement,
        `Problem: ${businessConcept.customerProblem} Solution: ${businessConcept.proposedSolution}`,
        `Revenue hypothesis: ${businessConcept.revenueModel} Distribution hypothesis: ${businessConcept.distributionModel}`,
        `Early proof still needed: ${businessConcept.unknowns.join(" ") || "Confirm customer demand, pricing, and delivery assumptions."}`,
      ]);
    case "company_description":
      return paragraph([
        `${idea.businessName || "The proposed company"} plans to serve ${businessConcept.targetCustomerSegment} from ${location(input)} through a ${idea.businessModel || "not-yet-selected"} model.`,
        `The company is intended to solve this customer problem: ${businessConcept.customerProblem}`,
        `Founder-entered advantage: ${businessConcept.founderAdvantage} Intended competitive edge: ${businessConcept.differentiator}`,
      ]);
    case "mission_vision_values":
      return paragraph([
        `Mission: ${input.missionStatement || placeholder("Founder-approved mission statement")}`,
        `Vision: ${input.visionStatement || placeholder("Founder-approved long-term vision")}`,
        `Values: ${input.values.length ? input.values.join(", ") : placeholder("Founder-approved operating values")}.`,
        "Values should be translated into concrete operating behavior before publication.",
      ]);
    case "founder_management_team":
      return paragraph([
        `${founder.founderName || "The founder"} reports this background: ${founder.founderExperience || placeholder("founder experience")}.`,
        `Industry experience: ${founder.industryExperience || placeholder("industry experience")}. Skills: ${founder.skills.join(", ") || placeholder("founder skills")}.`,
        `Staffing plan: ${idea.staffingPlan || placeholder("staffing plan")}. Advisor needs should be reviewed with a CPA or bookkeeper, attorney, insurance agent, lender, and SBDC or SCORE counselor where relevant.`,
      ]);
    case "industry_analysis": {
      const market = input.marketResearchReport;
      return paragraph([
        `Industry: ${idea.industry || placeholder("industry classification")}. Suggested NAICS: ${businessConcept.suggestedNaicsCodes.map((item) => `${item.code} ${item.title}`).join("; ") || placeholder("verified NAICS code")}. Confirm the final primary activity before relying on industry-specific statistics.`,
        market
          ? `Current report overview: ${market.industryOverview}`
          : "Sourced industry research is missing. Add official statistics, industry-specific evidence, and regulatory research.",
        market
          ? `Trend notes: ${market.marketTrends.join(" ") || placeholder("industry trends")}`
          : `Regulatory concerns from intake: ${idea.licensingConcerns.join(", ") || placeholder("industry regulatory review")}.`,
      ]);
    }
    case "market_research": {
      const market = input.marketResearchReport;
      if (!market) {
        return paragraph([
          "Market research has not been generated. Do not insert unsupported population, income, employment, market-size, saturation, or competitor-count claims.",
          `Research the ${location(input)} geography using official and primary sources, then record demand signals, pricing signals, saturation, and missing data.`,
        ]);
      }
      return paragraph([
        `${market.containsMockData ? "Placeholder-data warning: this report contains mock data and must not be presented as official statistics. " : ""}The current research geography is ${market.geography.city || "unspecified city"}, ${market.geography.stateCode || "unspecified state"} ${market.geography.zipCode || ""}.`,
        `Market-size note: ${market.marketSizeEstimate} Saturation note: ${market.marketSaturationEstimate}`,
        `Demand signals: ${market.demandSignals.join(" ") || placeholder("verified demand signals")}`,
        `Pricing signals: ${market.pricingSignals.join(" ") || placeholder("verified pricing signals")}`,
        `Source notes: ${formatSources(market.sourcesUsed) || placeholder("reviewed official and primary sources")}`,
      ]);
    }
    case "customer_analysis": {
      const customer = input.customerAnalysis;
      return paragraph([
        customer
          ? `Primary customer hypothesis: ${customer.primaryCustomerPersona.segment}. ${customer.primaryCustomerPersona.summary}`
          : `Primary customer hypothesis: ${businessConcept.targetCustomerSegment}.`,
        customer
          ? `Customer pains: ${customer.customerPainPoints.join(" ")} Motivations: ${customer.buyingMotivations.join(" ")}`
          : `Customer problem: ${businessConcept.customerProblem}`,
        customer
          ? `Objections to test: ${customer.customerObjections.join(" ")}`
          : "Customer pains, objections, buying behavior, and willingness to pay still require structured discovery.",
      ]);
    }
    case "competitive_analysis": {
      const competitors = input.competitorAnalysis;
      return paragraph([
        competitors
          ? `Direct competitors recorded: ${competitors.directCompetitors.map((item) => item.name).join(", ") || placeholder("direct competitors")}. Indirect competitors: ${competitors.indirectCompetitors.map((item) => item.name).join(", ") || placeholder("indirect competitors")}.`
          : `Founder-known alternatives: ${idea.knownCompetitors.join(", ") || placeholder("direct, indirect, and substitute competitors")}.`,
        competitors
          ? `Substitutes: ${competitors.substituteProductsOrServices.join(", ")}. White-space opportunities: ${competitors.whiteSpaceOpportunities.join(" ")}`
          : "A structured competitor grid is missing. Do not invent review scores or market-share claims.",
        `Intended differentiation: ${businessConcept.differentiator}`,
      ]);
    }
    case "product_service_line":
      return paragraph([
        `Primary offer: ${businessConcept.primaryProductOrService}. Proposed customer benefit: ${businessConcept.coreCustomerBenefit}`,
        `Pricing hypothesis: ${idea.pricingIdea || placeholder("pricing model and tested price range")}.`,
        `Potential later extensions: ${businessConcept.possibleSpinOffProducts.join(", ") || "No spin-off products are assumed at this stage."}`,
        "Document lifecycle, fulfillment, intellectual-property, and research-and-development notes only where they apply.",
      ]);
    case "business_model": {
      const strategy = input.strategicAnalysis?.businessModelSummary;
      return paragraph([
        `Distribution: ${businessConcept.distributionModel} Revenue: ${businessConcept.revenueModel}`,
        strategy
          ? `Key activities: ${strategy.keyActivities.join(" ")} Key resources: ${strategy.keyResources.join(" ")}`
          : "Key activities, resources, partners, cost structure, and customer relationships should be refined through strategy analysis.",
        strategy
          ? `Key partners: ${strategy.keyPartners.join(" ")} Cost structure: ${strategy.costStructure.join(" ")}`
          : `Current model selection: ${idea.businessModel || placeholder("business model")}.`,
      ]);
    }
    case "marketing_sales_plan": {
      const strategy = input.strategicAnalysis?.strategicRecommendations;
      const customer = input.customerAnalysis;
      return paragraph([
        strategy
          ? `Positioning: ${strategy.positioningStrategy.recommendation} Reasoning: ${strategy.positioningStrategy.reasoning}`
          : `Position the offer around this customer problem: ${businessConcept.customerProblem}`,
        strategy
          ? `Pricing: ${strategy.pricingStrategy.recommendation} Marketing: ${strategy.marketingStrategy.recommendation} Sales: ${strategy.salesStrategy.recommendation}`
          : `Test the pricing hypothesis (${idea.pricingIdea || "not defined"}) and a measurable customer-acquisition path.`,
        customer
          ? `Initial channels to test: ${customer.channelsWhereCustomersCanBeReached.join(", ")}.`
          : "Customer-channel research is missing.",
        "Measure qualified inquiries, conversion, retention or repeat purchase, and customer-acquisition assumptions.",
      ]);
    }
    case "operations_process_plan": {
      const execution = input.executionPlan;
      return paragraph([
        `Operating model: ${idea.businessModel || placeholder("selected operating model")}. Required equipment: ${idea.requiredEquipment.join(", ") || placeholder("equipment list")}. Staffing: ${idea.staffingPlan || placeholder("staffing plan")}.`,
        execution
          ? `Future operating model: ${execution.targetBusinessDesign.futureOperatingModel}`
          : "A strategy-execution plan is missing. Map the workflow, resources, systems, suppliers, quality controls, and milestones before launch.",
        execution
          ? `Core capabilities: ${execution.targetBusinessDesign.coreCapabilitiesNeeded.join(" ")}`
          : "Stage operational commitments behind demand evidence and verified compliance requirements.",
      ]);
    }
    case "organization_legal_structure": {
      const checklist = input.stateLaunchChecklist;
      return paragraph([
        `Planned legal structure: ${input.legalStructure || placeholder("legal structure recommendation reviewed with qualified legal and tax professionals")}. Founder ownership inputs are user-controlled and do not establish certification.`,
        checklist
          ? `State-launch checklist: ${checklist.stateName} (${checklist.stateCode}). Review ${checklist.checklist.length} included compliance tasks and verify every filing, tax, permit, insurance, and local requirement with the official agency.`
          : "A state-specific launch checklist is missing. Verify entity formation, tax, permit, insurance, employer, and local requirements before filing or committing funds.",
        "This section is planning support, not final legal or tax advice.",
      ]);
    }
    case "technology_systems_plan": {
      const execution = input.executionPlan;
      return paragraph([
        `Website need: ${idea.websiteNeeds || placeholder("website role and customer action")}.`,
        input.technologyNotes.length
          ? `Founder-entered technology notes: ${input.technologyNotes.join(" ")}`
          : "Identify the minimum systems needed for website, customer intake, scheduling or point of sale, accounting, operations, security, backup, and analytics.",
        execution
          ? `Execution systems and tools: ${execution.targetBusinessDesign.requiredSystemsTools.join(" ")}`
          : "Add manual fallbacks for systems that could block customer acquisition or delivery.",
      ]);
    }
    case "risk_contingency_plan": {
      const risk = input.riskRegister;
      return paragraph([
        risk
          ? `Current risk-register estimate: ${risk.overallRiskLevel} overall exposure (${risk.overallExposureScore}/100). Priority risks: ${risk.priorityRisks.map((item) => `${item.title} (${item.likelihood} likelihood, ${item.impact} impact)`).join("; ") || "none currently elevated"}.`
          : `Early concept risks: ${businessConcept.earlyRisks.join(" ") || placeholder("risk register")}.`,
        risk
          ? `Fallback scenarios tracked: ${risk.contingencyScenarios.map((item) => item.title).join(", ")}.`
          : "Generate the full risk register with warning signs, owners, review cadences, mitigations, and fallback plans.",
        "Contingency planning reduces exposure but does not guarantee success.",
      ]);
    }
    case "growth_plan": {
      const strategy = input.strategicAnalysis?.strategicRecommendations;
      const execution = input.executionPlan;
      return paragraph([
        strategy
          ? `Growth strategy: ${strategy.growthStrategy.recommendation} Reasoning: ${strategy.growthStrategy.reasoning}`
          : "Growth should remain gated by verified demand, repeatable operations, and cash-flow evidence.",
        execution
          ? `Success metrics: ${execution.strategyFormulation.successMetrics.join(" ")}`
          : "Define 12-month objectives, KPIs, expansion gates, and pivot triggers.",
        "Do not treat forecasted growth as a promise. Expand only after the current model produces credible evidence.",
      ]);
    }
    case "funding_request": {
      const financial = input.financialProjection;
      const funding = input.fundingMatchResult;
      return paragraph([
        `Founder-entered desired funding amount: ${money(founder.desiredFundingAmount)}. Available founder capital: ${money(founder.availableStartupCapital)}.`,
        financial
          ? `Editable projection funding gap: ${money(financial.fundingGap.value ?? 0)}. Reconciled startup uses: ${money(startupCostTotal(input))}.`
          : "A traceable use-of-funds schedule and financial projection are missing.",
        funding
          ? `Current research templates to verify: ${funding.priorityMatches.map((item) => `${item.opportunityName} (${item.matchScore}/100 template fit)`).join("; ")}.`
          : "Run the funding-readiness matcher before presenting possible financing paths.",
        "Funding eligibility, terms, approval, and repayment suitability are determined by the lender, investor, or program administrator. VentureForge does not guarantee funding.",
      ]);
    }
    case "financial_plan": {
      const financial = input.financialProjection;
      if (!financial) {
        return paragraph([
          "An editable financial projection has not been generated. Do not insert unsupported revenue, margin, break-even, cash-flow, or funding-gap claims.",
          "Add startup costs, recurring costs, variable costs, pricing, sales assumptions, funding sources, and a tax placeholder. Review projections with a CPA or bookkeeper.",
        ]);
      }
      const monthOne = financial.monthlyProfitLoss12Months[0];
      return paragraph([
        `${financial.assumptionsNarrative}`,
        `Current estimated metrics: startup costs ${money(startupCostTotal(input))}; funding gap ${money(financial.fundingGap.value ?? 0)}; gross margin ${percent(financial.grossMargin.value)}; net margin ${percent(financial.netMargin.value)}; ${breakEvenText(input)}; month-one estimated net income ${money(monthOne?.netIncome ?? 0)}.`,
        `Cash runway: ${financial.runway.value === null ? "a finite burn-rate runway does not apply under the baseline because month-one cash flow is non-negative" : `${financial.runway.value} months under the current baseline`}.`,
        `Placeholder assumptions requiring replacement: ${financial.editableAssumptions.filter((item) => item.isPlaceholder).map((item) => item.label).join(", ") || "none recorded"}. Every calculated number must remain traceable to an editable input or labeled placeholder. Review with a CPA or bookkeeper.`,
      ]);
    }
    case "launch_roadmap": {
      const roadmap = input.launchRoadmap;
      const execution = input.executionPlan;
      if (!roadmap && !execution) {
        return paragraph([
          "A launch roadmap has not been generated. Build the execution plan before assigning timing.",
          "The roadmap should cover today, this week, 30 days, 60 days, 90 days, 6 months, and 12 months with dependencies, evidence, KPIs, and compliance gates.",
        ]);
      }
      return paragraph([
        roadmap
          ? `Today: ${roadmap.today.map((item) => item.title).join(", ") || "review immediate validation priorities"}. This week: ${roadmap.thisWeek.map((item) => item.title).join(", ") || "confirm this-week tasks"}.`
          : `Critical path: ${execution?.deploymentPlan.criticalPath.join(", ") || placeholder("critical-path initiatives")}.`,
        roadmap
          ? `30 days: ${roadmap.thirtyDays.map((item) => item.title).join(", ") || "review 30-day tasks"}. 60 days: ${roadmap.sixtyDays.map((item) => item.title).join(", ") || "review 60-day tasks"}. 90 days: ${roadmap.ninetyDays.map((item) => item.title).join(", ") || "review 90-day tasks"}.`
          : "Convert execution initiatives into staged roadmap buckets.",
        "Do not advance blocked work until dependencies, official requirements, and evidence gates are satisfied.",
      ]);
    }
    case "appendix": {
      const allSources = allAvailableSources(input);
      return paragraph([
        `Source notes: ${formatSources(allSources) || placeholder("official, user-provided, manual, and mock source notes")}`,
        `Supporting documents requested or available: ${input.supportingDocuments.join(", ") || placeholder("resumes, permits, licenses, supplier quotes, contracts, financial support, and other requested attachments")}.`,
        `Detailed financial support should include editable assumptions, startup uses, funding sources, monthly projections, scenario analysis, and calculation formulas. ${input.financialProjection ? "The current financial engine output is available for attachment." : "The financial attachment is missing."}`,
        `Missing research requiring follow-up: ${allMissingResearch(input).join(" ") || "No missing research was explicitly recorded; review the plan before external use."}`,
      ]);
    }
  }
}

function assumptionsForSection(
  input: NormalizedBusinessPlanInput,
  key: BusinessPlanSectionKey,
): string[] {
  const base = [
    "Generated narrative is an editable planning draft, not a guarantee of business success, funding, compliance, or financial performance.",
    "Founder-entered facts and estimates require review before external use.",
  ];

  switch (key) {
    case "market_research":
    case "industry_analysis":
      return unique([
        ...base,
        input.marketResearchReport?.containsMockData
          ? "Market research contains mock placeholders and must not be represented as official data."
          : undefined,
        "Market evidence should be refreshed as official and primary research improves.",
      ]);
    case "financial_plan":
    case "funding_request":
      return unique([
        ...base,
        "Financial projections are editable estimates and should be reviewed by a CPA or bookkeeper.",
        "Funding matches are research templates and do not imply eligibility or approval.",
      ]);
    case "organization_legal_structure":
      return unique([
        ...base,
        "Legal, entity, tax, insurance, and licensing decisions require official-agency verification and qualified professional review.",
      ]);
    case "appendix":
      return unique([
        ...base,
        "Detailed support belongs in the appendix so the main narrative remains concise and evidence-aware.",
      ]);
    default:
      return unique([...base, ...input.businessConcept.assumptions.slice(0, 3)]);
  }
}

function missingInformationForSection(
  input: NormalizedBusinessPlanInput,
  key: BusinessPlanSectionKey,
): string[] {
  const { founder, idea } = input;
  switch (key) {
    case "executive_summary":
      return unique([
        input.feasibilityReport ? undefined : "Feasibility report",
        input.marketResearchReport ? undefined : "Market research report",
        input.financialProjection ? undefined : "Editable financial projection",
      ]);
    case "business_concept":
      return unique(input.businessConcept.unknowns);
    case "company_description":
      return unique([
        idea.businessName ? undefined : "Business name",
        idea.city && idea.state ? undefined : "Business location",
      ]);
    case "mission_vision_values":
      return unique([
        input.missionStatement ? undefined : "Mission statement",
        input.visionStatement ? undefined : "Vision statement",
        input.values.length ? undefined : "Values",
      ]);
    case "founder_management_team":
      return unique([
        founder.founderExperience ? undefined : "Founder experience",
        founder.industryExperience ? undefined : "Founder industry experience",
        idea.staffingPlan ? undefined : "Staffing plan",
        "Named advisors and outside professionals",
      ]);
    case "industry_analysis":
      return unique([
        idea.industry ? undefined : "Industry",
        input.businessConcept.suggestedNaicsCodes.length
          ? undefined
          : "Verified NAICS code",
        input.marketResearchReport ? undefined : "Sourced industry research",
      ]);
    case "market_research":
      return unique([
        input.marketResearchReport ? undefined : "Market research report",
        ...(input.marketResearchReport?.missingData ?? []),
      ]);
    case "customer_analysis":
      return unique([
        input.customerAnalysis ? undefined : "Customer analysis",
        "Primary customer-validation evidence",
      ]);
    case "competitive_analysis":
      return unique([
        input.competitorAnalysis ? undefined : "Competitor analysis",
        "Verified competitor pricing and positioning notes",
      ]);
    case "product_service_line":
      return unique([
        idea.productOrService ? undefined : "Product or service description",
        idea.pricingIdea ? undefined : "Pricing hypothesis",
        "Lifecycle, fulfillment, IP, or R&D notes where applicable",
      ]);
    case "business_model":
      return unique([
        idea.businessModel ? undefined : "Business model",
        input.strategicAnalysis ? undefined : "Strategic analysis",
      ]);
    case "marketing_sales_plan":
      return unique([
        input.customerAnalysis ? undefined : "Customer analysis",
        input.strategicAnalysis ? undefined : "Strategic recommendations",
        "Measured acquisition and conversion evidence",
      ]);
    case "operations_process_plan":
      return unique([
        input.executionPlan ? undefined : "Strategy execution plan",
        idea.staffingPlan ? undefined : "Staffing plan",
        "Verified supplier and operating-workflow notes",
      ]);
    case "organization_legal_structure":
      return unique([
        input.legalStructure ? undefined : "Legal-structure decision",
        input.stateLaunchChecklist ? undefined : "State-specific launch checklist",
        "Qualified legal and tax review",
      ]);
    case "technology_systems_plan":
      return unique([
        input.technologyNotes.length ? undefined : "Technology and systems notes",
        input.executionPlan ? undefined : "Execution systems and tools",
      ]);
    case "risk_contingency_plan":
      return unique([input.riskRegister ? undefined : "Risk and contingency register"]);
    case "growth_plan":
      return unique([
        input.strategicAnalysis ? undefined : "Growth strategy",
        input.executionPlan ? undefined : "Execution success metrics",
        input.launchRoadmap ? undefined : "Launch roadmap",
      ]);
    case "funding_request":
      return unique([
        input.financialProjection ? undefined : "Editable financial projection",
        input.fundingMatchResult ? undefined : "Funding-readiness matches",
        founder.desiredFundingAmount > 0 ? undefined : "Requested funding amount",
      ]);
    case "financial_plan":
      return unique([
        input.financialProjection ? undefined : "Editable financial projection",
        ...(input.financialProjection?.editableAssumptions
          .filter((item) => item.isPlaceholder)
          .map((item) => `Replace placeholder: ${item.label}`) ?? []),
      ]);
    case "launch_roadmap":
      return unique([
        input.executionPlan ? undefined : "Strategy execution plan",
        input.launchRoadmap ? undefined : "Launch roadmap",
        input.stateLaunchChecklist ? undefined : "State-specific launch checklist",
      ]);
    case "appendix":
      return unique([
        input.supportingDocuments.length
          ? undefined
          : "Supporting documents and attachments",
        ...allMissingResearch(input),
      ]);
  }
}

function sourceNotesForSection(
  input: NormalizedBusinessPlanInput,
  key: BusinessPlanSectionKey,
): SourceReference[] {
  const stateSources =
    input.stateLaunchChecklist?.checklist.map((task) => ({
      id: `plan-state:${task.id}`,
      title: task.task,
      sourceName: task.agency,
      sourceType: "official" as const,
      url: task.officialUrl,
      notes: task.verifyWithAgencyWarning,
    })) ?? [];
  const common = [
    intakeSource,
    ...sbaSourcesForPlanSection(key),
    ...input.manualSourceNotes,
  ];

  switch (key) {
    case "industry_analysis":
    case "market_research":
      return uniqueSources([
        ...common,
        conceptSource,
        ...(input.marketResearchReport?.sourcesUsed ?? []),
      ]);
    case "customer_analysis":
      return uniqueSources([...common, conceptSource, customerSource]);
    case "competitive_analysis":
      return uniqueSources([...common, conceptSource, competitorSource, strategySource]);
    case "business_model":
    case "marketing_sales_plan":
    case "growth_plan":
      return uniqueSources([...common, conceptSource, strategySource, executionSource]);
    case "operations_process_plan":
    case "launch_roadmap":
      return uniqueSources([...common, executionSource, launchSource, ...stateSources]);
    case "organization_legal_structure":
      return uniqueSources([...common, ...stateSources]);
    case "financial_plan":
      return uniqueSources([...common, financialSource]);
    case "funding_request":
      return uniqueSources([...common, financialSource, fundingSource]);
    case "risk_contingency_plan":
      return uniqueSources([...common, feasibilitySource, riskSource]);
    case "appendix":
      return uniqueSources(allAvailableSources(input));
    default:
      return uniqueSources([...common, conceptSource]);
  }
}

function confidenceForSection(
  input: NormalizedBusinessPlanInput,
  key: BusinessPlanSectionKey,
  missingInformation: string[],
): number {
  let score = 82;
  switch (key) {
    case "market_research":
      score = input.marketResearchReport
        ? input.marketResearchReport.confidenceLevel.score
        : 25;
      break;
    case "industry_analysis":
      score = input.marketResearchReport
        ? Math.round((input.marketResearchReport.confidenceLevel.score + 75) / 2)
        : 40;
      break;
    case "financial_plan":
      score = input.financialProjection ? 88 : 25;
      break;
    case "funding_request":
      score = input.financialProjection && input.fundingMatchResult ? 82 : 38;
      break;
    case "customer_analysis":
      score = input.customerAnalysis ? 72 : 42;
      break;
    case "competitive_analysis":
      score = input.competitorAnalysis ? 70 : 40;
      break;
    case "operations_process_plan":
    case "growth_plan":
    case "launch_roadmap":
      score = input.executionPlan ? 72 : 42;
      break;
    case "organization_legal_structure":
      score = input.stateLaunchChecklist ? 68 : 35;
      break;
    case "risk_contingency_plan":
      score = input.riskRegister ? 78 : 40;
      break;
    case "appendix":
      score = 68;
      break;
  }
  return clamp(score - Math.min(30, missingInformation.length * 4));
}

function allAvailableSources(
  input: NormalizedBusinessPlanInput,
): SourceReference[] {
  return uniqueSources([
    ...getSBAResourcesForStages([
      "business_plan",
      "market_research",
      "financial_plan",
      "funding",
      "state_checklist",
      "startup_guidance",
    ]).map(sbaResourceToSourceReference),
    intakeSource,
    conceptSource,
    ...(input.marketResearchReport?.sourcesUsed ?? []),
    customerSource,
    competitorSource,
    strategySource,
    executionSource,
    financialSource,
    fundingSource,
    riskSource,
    launchSource,
    ...(input.stateLaunchChecklist?.checklist.map((task) => ({
      id: `plan-state:${task.id}`,
      title: task.task,
      sourceName: task.agency,
      sourceType: "official" as const,
      url: task.officialUrl,
      notes: task.verifyWithAgencyWarning,
    })) ?? []),
    ...input.manualSourceNotes,
  ]);
}

function sbaSourcesForPlanSection(
  key: BusinessPlanSectionKey,
): SourceReference[] {
  return getSBAResourcesForBusinessPlanSection(key).map(
    sbaResourceToSourceReference,
  );
}

function allMissingResearch(input: NormalizedBusinessPlanInput): string[] {
  return unique([
    ...input.businessConcept.unknowns,
    ...(input.marketResearchReport?.missingData ??
      (["Market research report"] as string[])),
    input.customerAnalysis ? undefined : "Customer analysis",
    input.competitorAnalysis ? undefined : "Competitor analysis",
    input.financialProjection ? undefined : "Editable financial projection",
    input.stateLaunchChecklist ? undefined : "State-specific launch checklist",
    input.riskRegister ? undefined : "Risk register",
  ]);
}

function startupCostTotal(input: NormalizedBusinessPlanInput): number {
  return (
    input.financialProjection?.startupCostTable.reduce(
      (total, row) => total + row.amount,
      0,
    ) ?? input.idea.expectedStartupCosts
  );
}

function breakEvenText(input: NormalizedBusinessPlanInput): string {
  const breakEven = input.financialProjection?.breakEvenAnalysis;
  if (!breakEven || breakEven.breakEvenUnits === null) {
    return "break-even still requires a valid contribution-margin assumption";
  }
  return `estimated break-even of ${breakEven.breakEvenUnits} units or services per month (${money(breakEven.breakEvenRevenue ?? 0)} revenue)`;
}

function location(input: NormalizedBusinessPlanInput): string {
  return [input.idea.city, input.idea.state].filter(Boolean).join(", ") ||
    "an unconfirmed location";
}

function formatSources(sources: SourceReference[]): string {
  return sources
    .map((source) =>
      source.url
        ? `${source.sourceName}: ${source.title} (${source.url})`
        : `${source.sourceName}: ${source.title}`,
    )
    .join("; ");
}

function internalSource(
  id: string,
  title: string,
  sourceName: string,
  sourceType: SourceReference["sourceType"] = "manual",
  notes = "Deterministic VentureForge planning output derived from available inputs.",
): SourceReference {
  return { id, title, sourceName, sourceType, notes };
}

function uniqueSources(sources: SourceReference[]): SourceReference[] {
  const seen = new Set<string>();
  return sources.filter((source) => {
    const key = `${source.id}:${source.url ?? ""}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function unique(values: (string | undefined)[]): string[] {
  return [
    ...new Set(values.filter((value): value is string => value !== undefined)),
  ];
}

function placeholder(label: string): string {
  return `[Missing information: ${label}]`;
}

function paragraph(parts: string[]): string {
  return parts.filter(Boolean).join("\n\n");
}

function money(value: number): string {
  return `$${value.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

function percent(value: number | null): string {
  return value === null ? "not available" : `${(value * 100).toFixed(1)}%`;
}

function clamp(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}
