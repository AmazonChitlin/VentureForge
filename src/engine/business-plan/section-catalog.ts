import type {
  BusinessPlanSectionKey,
  BusinessPlanType,
} from "@/engine/business-plan/schema";

export interface BusinessPlanSectionDefinition {
  key: BusinessPlanSectionKey;
  title: string;
  requiredUserInputs: string[];
  qualityChecklist: string[];
  consumedEngineOutputs: string[];
}

export interface BusinessPlanVariant {
  type: BusinessPlanType;
  label: string;
  intendedAudience: string;
  concise: boolean;
  sectionKeys: BusinessPlanSectionKey[];
}

export const traditionalSectionKeys = [
  "executive_summary",
  "business_concept",
  "company_description",
  "mission_vision_values",
  "founder_management_team",
  "industry_analysis",
  "market_research",
  "customer_analysis",
  "competitive_analysis",
  "product_service_line",
  "business_model",
  "marketing_sales_plan",
  "operations_process_plan",
  "organization_legal_structure",
  "technology_systems_plan",
  "risk_contingency_plan",
  "growth_plan",
  "funding_request",
  "financial_plan",
  "launch_roadmap",
  "appendix",
] satisfies BusinessPlanSectionKey[];

export const businessPlanVariants: Record<
  BusinessPlanType,
  BusinessPlanVariant
> = {
  lean_plan: variant(
    "lean_plan",
    "Lean Plan",
    "Founder iteration and early validation",
    true,
    [
      "business_concept",
      "customer_analysis",
      "business_model",
      "marketing_sales_plan",
      "operations_process_plan",
      "financial_plan",
      "risk_contingency_plan",
      "launch_roadmap",
    ],
  ),
  traditional_plan: variant(
    "traditional_plan",
    "Traditional Business Plan",
    "Comprehensive planning, advisors, partners, and financing conversations",
    false,
    traditionalSectionKeys,
  ),
  sba_lender_style_plan: variant(
    "sba_lender_style_plan",
    "SBA / Lender Style Business Plan",
    "Lenders and SBA-backed lending conversations",
    true,
    [
      "executive_summary",
      "company_description",
      "founder_management_team",
      "industry_analysis",
      "market_research",
      "customer_analysis",
      "competitive_analysis",
      "product_service_line",
      "marketing_sales_plan",
      "operations_process_plan",
      "organization_legal_structure",
      "funding_request",
      "financial_plan",
      "risk_contingency_plan",
      "appendix",
    ],
  ),
  internal_operating_plan: variant(
    "internal_operating_plan",
    "Internal Operating Plan",
    "Founder and operating team execution",
    true,
    [
      "business_concept",
      "business_model",
      "marketing_sales_plan",
      "operations_process_plan",
      "technology_systems_plan",
      "risk_contingency_plan",
      "growth_plan",
      "financial_plan",
      "launch_roadmap",
    ],
  ),
  funding_package: variant(
    "funding_package",
    "Funding Readiness Package",
    "Lenders, grant-program research, and financing advisors",
    true,
    [
      "executive_summary",
      "company_description",
      "founder_management_team",
      "market_research",
      "customer_analysis",
      "competitive_analysis",
      "product_service_line",
      "business_model",
      "operations_process_plan",
      "risk_contingency_plan",
      "funding_request",
      "financial_plan",
      "appendix",
    ],
  ),
  one_page_plan: variant(
    "one_page_plan",
    "One-Page Business Plan",
    "Fast founder review and focused validation",
    true,
    [
      "executive_summary",
      "business_concept",
      "customer_analysis",
      "business_model",
      "financial_plan",
      "launch_roadmap",
    ],
  ),
};

export const businessPlanSectionDefinitions: Record<
  BusinessPlanSectionKey,
  BusinessPlanSectionDefinition
> = {
  executive_summary: section(
    "executive_summary",
    "Executive Summary",
    ["Business concept", "Target customer", "Location", "Funding need", "High-level growth objective"],
    ["State the business, customer, value proposition, location, funding need, and next milestone.", "Keep the summary concise and evidence-aware.", "Label estimates and missing research."],
    ["intake", "concept", "feasibility", "financials", "funding"],
  ),
  business_concept: section(
    "business_concept",
    "Business Concept",
    ["Customer problem", "Proposed solution", "Primary product or service", "Distribution model", "Proof needed"],
    ["Explain the problem, solution, customer benefit, and proof needed.", "Separate founder hypotheses from verified evidence."],
    ["concept", "feasibility"],
  ),
  company_description: section(
    "company_description",
    "Company Description",
    ["Business name", "Location", "Customer served", "Problem solved", "Competitive advantage"],
    ["Describe the company plainly.", "Identify the problem solved and customer served.", "Explain why the company may be able to compete."],
    ["intake", "concept"],
  ),
  mission_vision_values: section(
    "mission_vision_values",
    "Mission, Vision, and Values",
    ["Mission statement", "Vision statement", "Values"],
    ["Use founder-approved language.", "Avoid unsupported impact claims.", "Connect values to operating behavior."],
    ["intake"],
  ),
  founder_management_team: section(
    "founder_management_team",
    "Founder / Management Team",
    ["Founder experience", "Industry experience", "Skills", "Staffing plan", "Advisor needs"],
    ["Describe relevant founder strengths.", "Identify missing roles and professional advisors.", "Do not overstate experience."],
    ["intake", "concept", "execution"],
  ),
  industry_analysis: section(
    "industry_analysis",
    "Industry Analysis",
    ["Industry", "NAICS code", "Industry trends", "Regulatory sensitivity"],
    ["Use sourced industry evidence where available.", "Mark NAICS suggestions for verification.", "Name missing research."],
    ["concept", "market-research"],
  ),
  market_research: section(
    "market_research",
    "Market Research",
    ["Geography", "Demand signals", "Market size", "Saturation", "Pricing signals", "Sources"],
    ["Show source labels and URLs where available.", "Clearly distinguish mock data and estimates.", "List missing local research."],
    ["market-research"],
  ),
  customer_analysis: section(
    "customer_analysis",
    "Customer Analysis",
    ["Primary customer", "Customer problem", "Buying motivations", "Objections", "Validation evidence"],
    ["Define a specific first customer.", "Name pains, motivations, objections, and channels.", "Identify untested assumptions."],
    ["concept", "customer-analysis"],
  ),
  competitive_analysis: section(
    "competitive_analysis",
    "Competitive Analysis",
    ["Known competitors", "Direct competitors", "Indirect competitors", "Substitutes", "Differentiation"],
    ["Do not invent market share or review scores.", "Separate user-provided and manual evidence.", "Explain the intended competitive edge."],
    ["competitor-analysis", "strategy"],
  ),
  product_service_line: section(
    "product_service_line",
    "Product or Service Line",
    ["Offerings", "Customer benefit", "Pricing approach", "Lifecycle or service-delivery notes", "IP notes if relevant"],
    ["Describe what is sold and why customers benefit.", "Treat pricing as a testable assumption.", "Call out IP or R&D only when relevant."],
    ["intake", "concept", "customer-analysis"],
  ),
  business_model: section(
    "business_model",
    "Business Model",
    ["Revenue streams", "Distribution model", "Key resources", "Key activities", "Key partners", "Cost structure"],
    ["Explain how the business earns revenue.", "Connect resources and activities to customer value.", "Keep assumptions editable."],
    ["concept", "strategy"],
  ),
  marketing_sales_plan: section(
    "marketing_sales_plan",
    "Marketing and Sales Plan",
    ["Positioning", "Pricing", "Channels", "Sales process", "Retention approach"],
    ["Tie channels to the target customer.", "Use measurable acquisition and conversion tests.", "Explain how a sale happens."],
    ["customer-analysis", "strategy", "execution"],
  ),
  operations_process_plan: section(
    "operations_process_plan",
    "Operations / Process Plan",
    ["Location needs", "Equipment", "Suppliers", "Staffing", "Workflow", "Milestones"],
    ["Describe the operating workflow.", "List critical dependencies.", "Stage commitments behind evidence and compliance gates."],
    ["intake", "execution", "state-programs"],
  ),
  organization_legal_structure: section(
    "organization_legal_structure",
    "Organization and Legal Structure",
    ["Legal structure", "Ownership", "State registration", "Licenses and permits", "Professional review"],
    ["Do not provide final legal or tax advice.", "Identify unresolved filing and licensing decisions.", "Point to official sources where available."],
    ["intake", "state-programs"],
  ),
  technology_systems_plan: section(
    "technology_systems_plan",
    "Technology and Systems Plan",
    ["Core systems", "Website role", "Accounting tools", "Operations tools", "Data and backup needs"],
    ["Identify systems that support the customer path.", "Name manual fallbacks for critical technology.", "Keep tools proportional to the MVP."],
    ["intake", "execution", "risk"],
  ),
  risk_contingency_plan: section(
    "risk_contingency_plan",
    "Risk and Contingency Plan",
    ["Priority risks", "Warning signs", "Mitigation owners", "Fallback plans", "Review cadence"],
    ["Prioritize material risks.", "Include warning signs and owners.", "Treat the register as a living document."],
    ["feasibility", "risk"],
  ),
  growth_plan: section(
    "growth_plan",
    "Growth Plan",
    ["12-month objective", "Growth priorities", "Expansion gates", "KPIs", "Pivot triggers"],
    ["Tie growth to verified demand and repeatable operations.", "Avoid unsupported growth promises.", "Name the metrics that unlock expansion."],
    ["strategy", "execution", "launch-roadmap"],
  ),
  funding_request: section(
    "funding_request",
    "Funding Request",
    ["Amount requested", "Use of funds", "Owner contribution", "Debt or equity preference", "Repayment assumptions"],
    ["Connect the request to traceable uses.", "Do not guarantee approval.", "Explain why suggested pathways may not fit."],
    ["intake", "financials", "funding"],
  ),
  financial_plan: section(
    "financial_plan",
    "Financial Plan",
    ["Startup costs", "Fixed costs", "Variable costs", "Pricing", "Sales assumptions", "Funding sources", "Tax placeholder"],
    ["Trace every calculated number to an editable input or labeled placeholder.", "Show break-even, cash-flow, margin, runway, and funding-gap logic.", "Require CPA or bookkeeper review."],
    ["financials"],
  ),
  launch_roadmap: section(
    "launch_roadmap",
    "Launch Roadmap",
    ["Today", "This week", "30 days", "60 days", "90 days", "6 months", "12 months"],
    ["Show dependencies and KPIs.", "Do not advance blocked work.", "Connect compliance and evidence gates to timing."],
    ["execution", "launch-roadmap", "state-programs"],
  ),
  appendix: section(
    "appendix",
    "Appendix",
    ["Source notes", "Supporting documents", "Competitor notes", "Licenses and permits", "Resumes", "Financial detail"],
    ["Keep detailed evidence out of the main narrative.", "List source names and URLs.", "Identify requested supporting documents and missing attachments."],
    ["market-research", "financials", "funding", "state-programs", "risk"],
  ),
};

function section(
  key: BusinessPlanSectionKey,
  title: string,
  requiredUserInputs: string[],
  qualityChecklist: string[],
  consumedEngineOutputs: string[],
): BusinessPlanSectionDefinition {
  return {
    key,
    title,
    requiredUserInputs,
    qualityChecklist,
    consumedEngineOutputs,
  };
}

function variant(
  type: BusinessPlanType,
  label: string,
  intendedAudience: string,
  concise: boolean,
  sectionKeys: BusinessPlanSectionKey[],
): BusinessPlanVariant {
  return { type, label, intendedAudience, concise, sectionKeys };
}
