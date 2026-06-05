import {
  RiskEngineInputSchema,
  RiskRegisterSchema,
  type ContingencyScenario,
  type NormalizedRiskEngineInput,
  type RiskCategory,
  type RiskEngineInput,
  type RiskItem,
  type RiskLevel,
  type RiskRegister,
} from "@/engine/risk/schema";
import type { FeasibilityCategory } from "@/engine/feasibility/schema";
import {
  engineResultSchema,
  type EngineResult,
} from "@/engine/shared/engine-result";
import type { SourceReference } from "@/engine/shared/source-reference";

const GENERAL_WARNING =
  "Contingency planning reduces exposure but cannot remove business risk. Update ratings as evidence, costs, regulations, and operating conditions change.";
const PROFESSIONAL_REVIEW_WARNING =
  "Use qualified legal, tax, accounting, insurance, and licensing professionals where appropriate. VentureForge risk ratings are planning support, not professional advice.";

interface RiskContext {
  input: NormalizedRiskEngineInput;
  description: string;
  physicalBusiness: boolean;
  localOperations: boolean;
  foodBusiness: boolean;
  onlineCritical: boolean;
  employeePlanLikely: boolean;
  lowFounderCapacity: boolean;
  startupCosts: number;
  fundingGap: number;
  fundingGapRatio: number;
  baselineNetIncome: number | undefined;
  runwayMonths: number | null | undefined;
  strategyThreats: string[];
  strategyMitigation: string | undefined;
}

export const RiskEngine = {
  generate(inputDraft: RiskEngineInput): EngineResult<RiskRegister> {
    const input = RiskEngineInputSchema.parse(inputDraft);
    const context = buildContext(input);
    const risks = buildRisks(context).sort(
      (left, right) =>
        right.exposureScore - left.exposureScore ||
        left.title.localeCompare(right.title),
    );
    const priorityRisks = risks.filter((risk) => risk.exposureScore >= 6);
    const overallExposureScore = clamp(
      (risks.reduce((total, risk) => total + risk.exposureScore, 0) /
        (risks.length * 9)) *
        100,
    );
    const missingInformation = determineMissingInformation(input);
    const register = RiskRegisterSchema.parse({
      risks,
      priorityRisks,
      contingencyScenarios: buildContingencyScenarios(context),
      overallRiskLevel: levelFromOverallScore(overallExposureScore),
      overallExposureScore,
      summary:
        `${priorityRisks.length} of ${risks.length} monitored risks currently require priority attention. ` +
        `The register is a living planning tool: review warning signs, owners, and fallback plans as validation evidence arrives.`,
    });

    return engineResultSchema(RiskRegisterSchema).parse({
      data: register,
      confidence: calculateConfidence(input),
      assumptions: [
        "Risk likelihood and impact are deterministic planning estimates based on the available VentureForge pipeline outputs.",
        input.financialProjection
          ? `Funding-gap and cash-flow ratings use the current editable financial projection, including a ${money(context.fundingGap)} funding gap.`
          : `Funding-gap ratings use intake estimates because an editable financial projection is missing. Estimated gap: ${money(context.fundingGap)}.`,
        context.physicalBusiness
          ? "Location exposure is elevated because the selected model depends on a physical site, build-out, or facility readiness."
          : "Location exposure is lower because the selected model does not require a committed physical site.",
        context.foodBusiness
          ? "Food-service exposure is elevated for regulatory review and supplier continuity."
          : "Food-service-specific exposure is not elevated from the current description.",
      ],
      missingInformation,
      warnings: [
        GENERAL_WARNING,
        PROFESSIONAL_REVIEW_WARNING,
        ...(context.fundingGapRatio >= 0.5
          ? [
              `The current funding gap is ${percentage(context.fundingGapRatio)} of estimated startup costs. Treat funding and cash-flow exposure as priority risks.`,
            ]
          : []),
        ...(context.physicalBusiness
          ? [
              "Do not sign a lease, purchase a site, or commit to build-out until location, zoning, occupancy, and cost assumptions are verified.",
            ]
          : []),
        ...(context.foodBusiness
          ? [
              "Food operations require early regulatory and supplier-continuity review before equipment purchases or launch commitments.",
            ]
          : []),
        ...(context.lowFounderCapacity
          ? [
              `Founder capacity is constrained at ${input.founder.weeklyAvailableHours} available hours per week. Reduce scope, extend timing, or assign support before launch.`,
            ]
          : []),
      ],
      sources: riskSources(input),
      nextActions: [
        ...priorityRisks.slice(0, 4).map(
          (risk) =>
            `Assign ${risk.owner} to review ${risk.title.toLowerCase()} ${risk.reviewCadence.toLowerCase()}.`,
        ),
        "Set calendar reminders for the eight contingency-scenario triggers.",
        "Update the risk register after customer validation, financing decisions, licensing responses, and material cost changes.",
      ],
    });
  },
};

function buildContext(input: NormalizedRiskEngineInput): RiskContext {
  const description = [
    input.idea.businessIdea,
    input.idea.productOrService,
    input.idea.industry,
    input.idea.staffingPlan,
    input.idea.websiteNeeds,
    ...input.idea.licensingConcerns,
    ...input.idea.requiredEquipment,
  ]
    .join(" ")
    .toLowerCase();
  const physicalBusiness = [
    "physical_location",
    "hybrid",
    "manufacturing",
    "franchise",
  ].includes(input.idea.businessModel);
  const localOperations =
    physicalBusiness || ["mobile", "home_based"].includes(input.idea.businessModel);
  const foodBusiness =
    /food|restaurant|cafe|coffee|bakery|catering|kitchen|meal|beverage|food truck/.test(
      description,
    );
  const employeePlanLikely =
    !/no employees|founder-only|solo owner|owner only/.test(description) &&
    /employee|staff|hire|hiring|worker|payroll|team/.test(description);
  const onlineCritical =
    input.websiteOrMarketingCritical ??
    (["online", "marketplace", "subscription"].includes(
      input.idea.businessModel,
    ) ||
      /website|online|ecommerce|digital|social media/.test(description));
  const startupCosts = determineStartupCosts(input);
  const fundingGap = determineFundingGap(input, startupCosts);

  return {
    input,
    description,
    physicalBusiness,
    localOperations,
    foodBusiness,
    onlineCritical,
    employeePlanLikely,
    lowFounderCapacity:
      input.founder.weeklyAvailableHours > 0 &&
      input.founder.weeklyAvailableHours < 20,
    startupCosts,
    fundingGap,
    fundingGapRatio: startupCosts > 0 ? fundingGap / startupCosts : 0,
    baselineNetIncome: input.financialProjection?.monthlyProfitLoss12Months[0]
      ?.netIncome,
    runwayMonths: input.financialProjection?.runway.value,
    strategyThreats: input.strategicAnalysis?.swot.threats ?? [],
    strategyMitigation:
      input.strategicAnalysis?.strategicRecommendations.riskMitigationStrategy
        .recommendation,
  };
}

function buildRisks(context: RiskContext): RiskItem[] {
  const { input } = context;
  const demandScore = feasibilityScore(input, "market_demand");
  const marketSizeScore = feasibilityScore(input, "market_size");
  const customerNeedScore = feasibilityScore(input, "customer_need");
  const proofScore = input.feasibilityReport?.proofOfConceptScore.score;
  const fundingScore = feasibilityScore(input, "funding_feasibility");
  const regulatoryScore = feasibilityScore(input, "legal_regulatory_complexity");
  const operationalScore = feasibilityScore(input, "operational_complexity");
  const competitionScore = feasibilityScore(input, "competitive_saturation");
  const differentiationScore = feasibilityScore(input, "differentiation");
  const localOpportunityScore = feasibilityScore(input, "local_opportunity");
  const highGap = context.fundingGapRatio >= 0.5;
  const negativeCashFlow =
    context.baselineNetIncome !== undefined && context.baselineNetIncome < 0;
  const shortRunway =
    context.runwayMonths !== undefined &&
    context.runwayMonths !== null &&
    context.runwayMonths < 4;

  return [
    risk(
      "market_risk",
      "Market risk",
      "Demand or market size may not support the expected sales volume.",
      weakestEvidenceLevel([demandScore, marketSizeScore], "moderate"),
      "high",
      [
        "Customer discovery does not confirm a recurring need.",
        "Qualified inquiries or test conversions remain below the planned threshold.",
      ],
      [
        "Run low-cost validation before major commitments.",
        "Track demand assumptions against actual inquiries, pilots, and paid conversions.",
      ],
      [
        "Narrow the target segment and reduce fixed commitments.",
        "Revise the offer, pricing, or launch geography before additional spending.",
      ],
      "Founder",
      "Weekly during validation",
      evidence([
        demandScore === undefined
          ? "Feasibility market-demand evidence is missing."
          : `Feasibility market-demand score: ${demandScore}/100.`,
        marketSizeScore === undefined
          ? "Feasibility market-size evidence is missing."
          : `Feasibility market-size score: ${marketSizeScore}/100.`,
      ]),
    ),
    risk(
      "customer_adoption_risk",
      "Customer adoption risk",
      "Target customers may not adopt, buy, or repeat at the expected rate.",
      weakestEvidenceLevel([customerNeedScore, proofScore], "moderate"),
      "high",
      [
        "Interviews show weak urgency or unclear willingness to pay.",
        "First buyers do not return, refer, or advance to the next sales step.",
      ],
      [
        "Interview target customers and test a concrete offer.",
        "Define a repeat-purchase or retention metric before launch.",
      ],
      [
        "Simplify the offer around the strongest customer problem.",
        "Pause expansion and run a smaller paid pilot.",
      ],
      "Founder",
      "Weekly during validation and launch",
      evidence([
        customerNeedScore === undefined
          ? "Customer-need feasibility evidence is missing."
          : `Feasibility customer-need score: ${customerNeedScore}/100.`,
        proofScore === undefined
          ? "Proof-of-concept evidence is missing."
          : `Proof-of-concept score: ${proofScore}/100.`,
      ]),
    ),
    risk(
      "funding_risk",
      "Funding risk",
      `The business may not secure or safely structure the ${money(context.fundingGap)} estimated funding gap.`,
      highGap
        ? "high"
        : weakestEvidenceLevel([fundingScore], context.fundingGap > 0 ? "moderate" : "low"),
      highGap || context.fundingGap > 0 ? "high" : "moderate",
      [
        "Lenders or programs request missing financial or validation evidence.",
        "Available financing adds repayment obligations that the baseline forecast cannot support.",
      ],
      [
        "Stage spending and prepare a documented use-of-funds plan.",
        "Compare written lender terms and preserve a lower-capital launch option.",
      ],
      [
        "Reduce initial scope and delay nonessential purchases.",
        "Shift to staged bootstrapping or a smaller proof-of-concept launch.",
      ],
      "Founder and finance advisor",
      "Weekly until the funding path is verified",
      evidence([
        `Estimated startup costs: ${money(context.startupCosts)}.`,
        `Estimated funding gap: ${money(context.fundingGap)} (${percentage(context.fundingGapRatio)} of startup costs).`,
        fundingScore === undefined
          ? "Feasibility funding evidence is missing."
          : `Feasibility funding score: ${fundingScore}/100.`,
      ]),
    ),
    risk(
      "cash_flow_risk",
      "Cash-flow risk",
      "Operating cash may be depleted before the business reaches a stable sales level.",
      highGap || negativeCashFlow || shortRunway ? "high" : context.input.financialProjection ? "moderate" : "high",
      "high",
      [
        "Cash balance falls below the minimum reserve threshold.",
        "Monthly sales miss plan while fixed costs, debt payments, or owner draw remain unchanged.",
      ],
      [
        "Review cash, receivables, bills, and sales against the forecast every month.",
        "Set a minimum-cash trigger that stops discretionary spending.",
      ],
      [
        "Cut discretionary costs, defer expansion, and negotiate timing where appropriate.",
        "Move to the conservative scenario and protect essential operating cash.",
      ],
      "Founder and bookkeeper",
      "Weekly during launch; monthly after stabilization",
      evidence([
        context.input.financialProjection
          ? `Baseline month-one net income: ${money(context.baselineNetIncome ?? 0)}.`
          : "Editable financial projection is missing.",
        context.runwayMonths === null
          ? "Baseline cash flow is non-negative, so a finite burn-rate runway does not apply."
          : context.runwayMonths === undefined
            ? "Runway evidence is missing."
            : `Estimated runway: ${context.runwayMonths} months.`,
        `Estimated funding gap: ${money(context.fundingGap)}.`,
      ]),
    ),
    risk(
      "regulatory_risk",
      "Regulatory risk",
      context.foodBusiness
        ? "Food-service approvals, inspections, safety rules, and local operating permissions may delay or constrain launch."
        : "Licenses, permits, registrations, insurance, or local rules may delay or constrain launch.",
      context.foodBusiness
        ? "high"
        : weakestEvidenceLevel([regulatoryScore], input.idea.licensingConcerns.length > 0 ? "moderate" : "low"),
      context.foodBusiness || input.idea.licensingConcerns.length > 0
        ? "high"
        : "moderate",
      [
        "An agency identifies an unplanned permit, inspection, credential, or location requirement.",
        "Approval timing begins to threaten the planned launch date.",
      ],
      [
        "Verify requirements directly with official state and local agencies before major spending.",
        "Track each unresolved requirement, owner, dependency, and response date.",
      ],
      [
        "Delay regulated operations and launch only permitted activities.",
        "Revise timing, location, menu, service scope, or staffing plan to match verified requirements.",
      ],
      "Founder and qualified compliance advisor",
      "Weekly until official requirements are verified",
      evidence([
        input.idea.licensingConcerns.length > 0
          ? `Intake licensing concerns: ${input.idea.licensingConcerns.join(", ")}.`
          : "No licensing concerns are recorded yet.",
        context.foodBusiness
          ? "Food-service activity detected from intake."
          : "Food-service activity not detected.",
      ]),
    ),
    risk(
      "operational_risk",
      "Operational risk",
      "Day-to-day fulfillment may fail to meet quality, timing, or cost expectations.",
      weakestEvidenceLevel([operationalScore], context.foodBusiness || context.physicalBusiness ? "moderate" : "low"),
      context.foodBusiness || context.physicalBusiness ? "high" : "moderate",
      [
        "Delivery times, rework, waste, cancellations, or customer complaints increase.",
        "The founder cannot explain or repeat the core workflow consistently.",
      ],
      [
        "Document the core workflow and define a small set of service-quality KPIs.",
        "Test operations at pilot volume before increasing commitments.",
      ],
      [
        "Reduce service scope, operating hours, or product variety temporarily.",
        "Pause growth activity until the workflow and quality controls stabilize.",
      ],
      "Operations owner",
      "Weekly during launch",
      evidence([
        operationalScore === undefined
          ? "Operational-complexity feasibility evidence is missing."
          : `Feasibility operational-complexity score: ${operationalScore}/100.`,
        strategyContext(context),
      ]),
    ),
    risk(
      "supplier_risk",
      "Supplier risk",
      context.foodBusiness
        ? "Ingredient, commissary, equipment, or other supplier disruption may interrupt food-service operations."
        : "Supplier, equipment, inventory, or service-vendor disruption may interrupt delivery.",
      context.foodBusiness || input.supplierDependence === "high"
        ? "high"
        : input.idea.requiredEquipment.length > 0 ||
            input.supplierDependence === "moderate"
          ? "moderate"
          : "low",
      context.foodBusiness || input.idea.requiredEquipment.length > 0
        ? "high"
        : "moderate",
      [
        "A critical input becomes unavailable, delayed, or materially more expensive.",
        "A vendor cannot meet quality, quantity, or service-level expectations.",
      ],
      [
        "Identify backup suppliers for critical inputs and equipment service.",
        "Track lead times, quality, cost movement, and minimum reserve inventory where appropriate.",
      ],
      [
        "Switch to approved substitutes or a backup supplier.",
        "Temporarily narrow the offer to inputs that can be sourced reliably.",
      ],
      "Operations owner",
      context.foodBusiness ? "Weekly" : "Monthly and before major orders",
      evidence([
        input.idea.requiredEquipment.length > 0
          ? `Required equipment: ${input.idea.requiredEquipment.join(", ")}.`
          : "Required equipment is not itemized.",
        `Supplier dependence self-assessment: ${input.supplierDependence}.`,
      ]),
    ),
    risk(
      "staffing_risk",
      "Staffing risk",
      "The business may not have enough trained capacity to deliver reliably.",
      context.employeePlanLikely ? "moderate" : context.lowFounderCapacity ? "high" : "low",
      context.employeePlanLikely || context.lowFounderCapacity ? "high" : "moderate",
      [
        "Open shifts, missed tasks, overtime, training gaps, or quality issues increase.",
        "The launch plan assumes capacity that is not assigned to a named owner.",
      ],
      [
        "Define launch roles, required coverage, and backup responsibilities.",
        "Use a hiring or contractor gate tied to verified demand and workload.",
      ],
      [
        "Reduce hours, service area, or offer complexity while capacity is restored.",
        "Use qualified temporary or contractor support where appropriate.",
      ],
      "Founder and operations owner",
      "Weekly during launch",
      evidence([
        context.employeePlanLikely
          ? `Staffing-plan text suggests employees or a team: ${input.idea.staffingPlan}.`
          : `Staffing-plan text: ${input.idea.staffingPlan || "not provided"}.`,
        `Founder availability: ${input.founder.weeklyAvailableHours} hours per week.`,
      ]),
    ),
    risk(
      "technology_risk",
      "Technology risk",
      "Technology, website, point-of-sale, scheduling, data, or platform failures may disrupt acquisition or delivery.",
      context.onlineCritical ? "moderate" : "low",
      context.onlineCritical ? "high" : "moderate",
      [
        "Website, checkout, booking, analytics, or point-of-sale errors persist.",
        "Critical data is not backed up or a single system blocks delivery.",
      ],
      [
        "Identify critical systems, owners, backups, and manual fallbacks.",
        "Test website, forms, payments, booking, and analytics before launch.",
      ],
      [
        "Switch to a manual order, booking, or payment fallback.",
        "Pause affected campaigns until the customer path is working again.",
      ],
      "Founder or technology owner",
      context.onlineCritical ? "Weekly and before campaigns" : "Monthly",
      evidence([
        context.onlineCritical
          ? "Digital acquisition or technology dependency detected from the business model or website needs."
          : "Digital dependency is limited in the current intake.",
      ]),
    ),
    risk(
      "competition_risk",
      "Competition risk",
      "Competitors or substitutes may constrain pricing, acquisition, or retention.",
      weakestEvidenceLevel([competitionScore, differentiationScore], "moderate"),
      "moderate",
      [
        "Competitors copy the offer, discount aggressively, or improve convenience.",
        "Customers cannot explain why they would choose this business.",
      ],
      [
        "Track direct, indirect, and substitute options regularly.",
        "Test a specific differentiator that matters to the target customer.",
      ],
      [
        "Focus on the most defensible customer segment and strongest differentiator.",
        "Adjust the offer without entering an unsustainable price war.",
      ],
      "Founder",
      "Monthly",
      evidence([
        competitionScore === undefined
          ? "Competitive-saturation feasibility evidence is missing."
          : `Feasibility competitive-saturation score: ${competitionScore}/100.`,
        differentiationScore === undefined
          ? "Differentiation feasibility evidence is missing."
          : `Feasibility differentiation score: ${differentiationScore}/100.`,
        ...context.strategyThreats.slice(0, 2),
      ]),
    ),
    risk(
      "founder_burnout_risk",
      "Founder capacity and burnout risk",
      context.lowFounderCapacity
        ? `The founder reports only ${input.founder.weeklyAvailableHours} available hours per week, which may not support the current launch scope.`
        : "Founder workload, decision fatigue, and unassigned responsibilities may undermine execution.",
      context.lowFounderCapacity ? "high" : input.founder.weeklyAvailableHours === 0 ? "moderate" : "low",
      context.lowFounderCapacity ? "high" : "moderate",
      [
        "Important tasks repeatedly slip or stay unassigned.",
        "The founder works unsustainable hours or stops reviewing financial and customer evidence.",
      ],
      [
        "Define a weekly capacity budget and prioritize only launch-critical work.",
        "Assign advisors, contractors, or team support for specialized responsibilities.",
      ],
      [
        "Reduce launch scope, extend the timeline, and pause nonessential initiatives.",
        "Delegate defined tasks before adding new commitments.",
      ],
      "Founder",
      "Weekly",
      evidence([
        `Founder availability: ${input.founder.weeklyAvailableHours} hours per week.`,
        `Launch timeline: ${input.founder.launchTimeline || "not provided"}.`,
      ]),
    ),
    risk(
      "location_risk",
      "Location risk",
      context.physicalBusiness
        ? "The physical site, lease, build-out, zoning, occupancy, parking, or customer-access assumptions may not hold."
        : context.localOperations
          ? "The service area and local operating permissions may constrain delivery."
          : "Location exposure is limited, but geography may still affect customer reach and compliance.",
      context.physicalBusiness
        ? input.locationCommitment === "committed"
          ? "high"
          : "moderate"
        : context.localOperations
          ? "moderate"
          : "low",
      context.physicalBusiness ? "high" : "moderate",
      [
        "Zoning, occupancy, parking, access, lease, or local-permit assumptions remain unverified.",
        "The proposed area does not produce expected customer demand or service efficiency.",
      ],
      [
        "Verify site and local rules before signing or spending.",
        "Test local demand and access assumptions before committing to a fixed location.",
      ],
      [
        "Delay the site commitment or negotiate an exit option.",
        "Use a smaller, mobile, temporary, or alternative-location model where feasible.",
      ],
      "Founder and qualified real-estate or compliance advisor",
      context.physicalBusiness ? "Before every location commitment" : "Monthly",
      evidence([
        `Business model: ${input.idea.businessModel || "not specified"}.`,
        `Location commitment: ${input.locationCommitment}.`,
        localOpportunityScore === undefined
          ? "Local-opportunity feasibility evidence is missing."
          : `Feasibility local-opportunity score: ${localOpportunityScore}/100.`,
      ]),
    ),
    risk(
      "seasonality_risk",
      "Seasonality risk",
      "Sales, staffing, inventory, or cash needs may vary materially by season, weather, school calendar, events, or holidays.",
      /event|season|holiday|weather|touris|school|childcare|food truck|retail/.test(
        context.description,
      )
        ? "moderate"
        : "low",
      "moderate",
      [
        "Sales and cash receipts vary sharply by week or month.",
        "Inventory, staffing, or marketing plans do not reflect peak and slow periods.",
      ],
      [
        "Track sales by week and month and annotate seasonal drivers.",
        "Keep a conservative reserve for slower periods.",
      ],
      [
        "Reduce variable spending and adjust operating hours during slow periods.",
        "Add carefully tested off-season offers or channels.",
      ],
      "Founder and bookkeeper",
      "Monthly and before expected seasonal shifts",
      evidence([
        /event|season|holiday|weather|touris|school|childcare|food truck|retail/.test(
          context.description,
        )
          ? "Potential seasonal or event-related exposure detected from intake."
          : "No strong seasonal indicator is recorded yet.",
      ]),
    ),
    risk(
      "economic_downturn_risk",
      "Economic downturn risk",
      "A weaker economy may reduce customer spending, increase input costs, or tighten financing.",
      context.physicalBusiness || context.fundingGap > 0 ? "moderate" : "low",
      "high",
      [
        "Sales conversion, average order value, or repeat purchase falls while cost pressure rises.",
        "Lenders tighten terms or customers delay discretionary purchases.",
      ],
      [
        "Maintain conservative cash reserves and a lower-sales scenario.",
        "Separate essential from discretionary spending and monitor customer sensitivity.",
      ],
      [
        "Move to the conservative forecast and pause expansion.",
        "Focus on the strongest customer need, most resilient segment, and lowest-risk offer.",
      ],
      "Founder and bookkeeper",
      "Monthly",
      evidence([
        context.fundingGap > 0
          ? `External-capital need increases sensitivity: ${money(context.fundingGap)} estimated gap.`
          : "No startup funding gap is currently estimated.",
      ]),
    ),
  ];
}

function buildContingencyScenarios(
  context: RiskContext,
): ContingencyScenario[] {
  return [
    scenario(
      "demand_lower_than_expected",
      "Demand lower than expected",
      "Actual demand may fall below the baseline forecast.",
      "Qualified leads, conversions, or sales remain below 75% of plan for two review periods.",
      ["Freeze discretionary expansion spending.", "Interview lost prospects and recent customers."],
      ["Narrow the target segment.", "Revise the offer and operate against the conservative forecast."],
      "Founder",
      "Weekly during launch",
    ),
    scenario(
      "costs_higher_than_expected",
      "Costs higher than expected",
      "Startup or operating costs may exceed the editable plan.",
      "A critical startup or monthly cost exceeds plan by 15% or more.",
      ["Reforecast cash flow and identify the cost driver.", "Pause nonessential purchases."],
      ["Negotiate, substitute, phase, or remove the cost.", "Reduce scope before using expensive emergency capital."],
      "Founder and bookkeeper",
      "Monthly and before purchases",
    ),
    scenario(
      "funding_denied",
      "Funding denied",
      "The preferred capital path may be delayed, reduced, or declined.",
      "A lender, investor, or program declines the request or offers terms the business cannot safely support.",
      ["Request specific feedback.", "Recalculate the minimum viable launch budget."],
      ["Stage the launch with owner capital where prudent.", "Delay assets or activities that are not required for proof of concept."],
      "Founder",
      "Weekly until funding path is verified",
    ),
    scenario(
      "competitor_response",
      "Competitor response",
      "Competitors may discount, copy, or increase promotion.",
      "A competitor launches a similar offer, discounts aggressively, or changes customer expectations.",
      ["Revisit customer interviews and competitor notes.", "Protect margins and clarify the differentiator."],
      ["Focus on the most defensible segment.", "Improve convenience, service quality, or proof rather than entering an unsustainable price war."],
      "Founder",
      "Monthly",
    ),
    scenario(
      "delay_in_licensing",
      "Delay in licensing",
      "Approvals, inspections, or permits may take longer than planned.",
      "An official agency identifies an unmet requirement or the expected approval date threatens launch.",
      ["Update the dependency plan and contact the agency.", "Stop spending that assumes approval."],
      ["Launch only permitted activities.", "Adjust location, timing, service scope, or product mix."],
      "Founder and qualified compliance advisor",
      "Weekly until resolved",
    ),
    scenario(
      "founder_time_shortage",
      "Founder time shortage",
      "Available founder capacity may not cover the launch workload.",
      `Founder capacity falls below ${Math.max(10, context.input.founder.weeklyAvailableHours)} reliable hours per week or critical tasks repeatedly slip.`,
      ["Review the weekly task list and remove noncritical work.", "Assign explicit owners."],
      ["Extend the launch timeline.", "Delegate defined work or reduce scope."],
      "Founder",
      "Weekly",
    ),
    scenario(
      "supplier_failure",
      "Supplier failure",
      "A critical supplier or equipment dependency may fail.",
      "A critical supplier misses a commitment, cannot meet quality needs, or raises costs materially.",
      ["Contact backup suppliers.", "Assess current inventory, lead time, and customer impact."],
      ["Use approved substitutes.", "Temporarily narrow the offer or reschedule affected work."],
      "Operations owner",
      context.foodBusiness ? "Weekly" : "Monthly and before major orders",
    ),
    scenario(
      "website_or_marketing_underperforms",
      "Website or marketing underperforms",
      "Marketing activity may fail to produce qualified interest or conversions.",
      "Campaigns, website visits, inquiries, or conversions remain below the planned threshold for two review periods.",
      ["Check the offer, audience, message, customer path, and tracking.", "Pause channels with poor evidence."],
      ["Run a smaller message or offer test.", "Shift effort to channels that produce qualified conversations and measurable conversion."],
      "Founder or marketing owner",
      context.onlineCritical ? "Weekly" : "Monthly",
    ),
  ];
}

function risk(
  category: RiskCategory,
  title: string,
  description: string,
  likelihood: RiskLevel,
  impact: RiskLevel,
  warningSigns: string[],
  mitigation: string[],
  contingencyPlan: string[],
  owner: string,
  reviewCadence: string,
  evidenceItems: string[],
): RiskItem {
  return {
    category,
    title,
    description,
    likelihood,
    impact,
    exposureScore: levelScore(likelihood) * levelScore(impact),
    warningSigns,
    mitigation,
    contingencyPlan,
    owner,
    reviewCadence,
    evidence: evidenceItems,
  };
}

function scenario(
  scenarioKey: ContingencyScenario["scenario"],
  title: string,
  description: string,
  trigger: string,
  immediateActions: string[],
  fallbackPlan: string[],
  owner: string,
  reviewCadence: string,
): ContingencyScenario {
  return {
    scenario: scenarioKey,
    title,
    description,
    trigger,
    immediateActions,
    fallbackPlan,
    owner,
    reviewCadence,
  };
}

function determineStartupCosts(input: NormalizedRiskEngineInput): number {
  if (input.financialProjection) {
    return roundMoney(
      input.financialProjection.startupCostTable.reduce(
        (total, row) => total + row.amount,
        0,
      ),
    );
  }
  return roundMoney(input.idea.expectedStartupCosts);
}

function determineFundingGap(
  input: NormalizedRiskEngineInput,
  startupCosts: number,
): number {
  const projectionGap = input.financialProjection?.fundingGap.value;
  if (projectionGap !== undefined && projectionGap !== null) {
    return projectionGap;
  }
  return roundMoney(
    Math.max(0, startupCosts - input.founder.availableStartupCapital),
  );
}

function feasibilityScore(
  input: NormalizedRiskEngineInput,
  category: FeasibilityCategory,
): number | undefined {
  return input.feasibilityReport?.categoryScores.find(
    (item) => item.category === category,
  )?.score;
}

function weakestEvidenceLevel(
  scores: (number | undefined)[],
  fallback: RiskLevel,
): RiskLevel {
  const presentScores = scores.filter(
    (score): score is number => score !== undefined,
  );
  if (presentScores.length === 0) return fallback;
  const weakest = Math.min(...presentScores);
  if (weakest < 45) return "high";
  if (weakest < 70) return "moderate";
  return "low";
}

function strategyContext(context: RiskContext): string {
  return context.strategyMitigation
    ? `Strategy mitigation: ${context.strategyMitigation}`
    : "Strategy mitigation output is missing.";
}

function determineMissingInformation(
  input: NormalizedRiskEngineInput,
): string[] {
  return unique([
    input.feasibilityReport ? undefined : "Feasibility report",
    input.financialProjection ? undefined : "Editable financial projection",
    input.strategicAnalysis ? undefined : "Strategic analysis",
    input.founder.weeklyAvailableHours > 0
      ? undefined
      : "Founder weekly available hours",
    input.idea.licensingConcerns.length > 0
      ? undefined
      : "Licensing and regulatory concerns",
    input.supplierDependence === "unknown"
      ? "Supplier-dependence assessment"
      : undefined,
  ]);
}

function calculateConfidence(input: NormalizedRiskEngineInput): number {
  let score = 40;
  if (input.feasibilityReport) score += 15;
  if (input.financialProjection) score += 15;
  if (input.strategicAnalysis) score += 15;
  if (input.founder.weeklyAvailableHours > 0) score += 5;
  if (input.idea.licensingConcerns.length > 0) score += 5;
  if (input.supplierDependence !== "unknown") score += 5;
  return clamp(score);
}

function riskSources(input: NormalizedRiskEngineInput): SourceReference[] {
  return [
    {
      id: "risk-founder-intake",
      title: "Founder and business intake",
      sourceName: "VentureForge intake engine",
      sourceType: "user",
      notes: "Business model, founder capacity, equipment, staffing, licensing, and location inputs.",
    },
    ...(input.feasibilityReport
      ? [
          {
            id: "risk-feasibility-report",
            title: "Feasibility report",
            sourceName: "VentureForge feasibility engine",
            sourceType: "manual" as const,
            notes: "Risk-oriented category scores and proof-of-concept evidence.",
          },
        ]
      : []),
    ...(input.financialProjection
      ? [
          {
            id: "risk-financial-projection",
            title: "Editable financial projection",
            sourceName: "VentureForge financial engine",
            sourceType: "manual" as const,
            notes: "Funding gap, month-one cash flow, runway, and startup-cost estimates.",
          },
        ]
      : []),
    ...(input.strategicAnalysis
      ? [
          {
            id: "risk-strategy-analysis",
            title: "Strategic analysis",
            sourceName: "VentureForge strategy engine",
            sourceType: "manual" as const,
            notes: "SWOT threats and risk-mitigation recommendation.",
          },
        ]
      : []),
  ];
}

function evidence(values: string[]): string[] {
  return values.filter((value) => value.trim().length > 0);
}

function unique(values: (string | undefined)[]): string[] {
  return [
    ...new Set(values.filter((value): value is string => value !== undefined)),
  ];
}

function levelScore(level: RiskLevel): number {
  return { low: 1, moderate: 2, high: 3 }[level];
}

function levelFromOverallScore(score: number): RiskLevel {
  if (score >= 65) return "high";
  if (score >= 35) return "moderate";
  return "low";
}

function clamp(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function money(value: number): string {
  return `$${roundMoney(value).toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

function percentage(value: number): string {
  return `${Math.round(value * 100)}%`;
}
