import { z } from "zod";

import sbaResources from "@/knowledge/resources/sba-resources.json";
import type { SourceReference } from "@/engine/shared/source-reference";
import type {
  DataProvider,
  ProviderInput,
  ProviderResult,
} from "@/providers/provider";

export const SBAResourceSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  category: z.string().min(1),
  url: z.url(),
  sourceName: z.string().min(1),
  sourceType: z.literal("official"),
  description: z.string().min(1),
  tags: z.array(z.string().min(1)),
  appliesToStages: z.array(z.string().min(1)),
  lastVerifiedAt: z.iso.date(),
  notes: z.string().min(1),
});

export const SBAResourceProviderInputSchema = z.object({
  projectId: z.string().optional(),
  geography: z.unknown().optional(),
  naicsCode: z.string().optional(),
  industry: z.string().optional(),
  targetCustomer: z.string().optional(),
  query: z.string().optional(),
  manualResearchEntries: z.unknown().optional(),
  stage: z.string().optional(),
  stages: z.array(z.string()).optional(),
  category: z.string().optional(),
  tags: z.array(z.string()).optional(),
  businessPlanSection: z.string().optional(),
  fundingCategory: z.string().optional(),
  fundingNeed: z.boolean().optional(),
  stateChecklist: z.boolean().optional(),
  businessStructure: z.boolean().optional(),
  marketResearchSection: z.boolean().optional(),
});

export const SBAResourceProviderPayloadSchema = z.object({
  resources: z.array(SBAResourceSchema),
  matchedResourceIds: z.array(z.string()),
  sourceReferences: z.array(z.custom<SourceReference>()),
  filterSummary: z.string(),
});

export type SBAResource = z.infer<typeof SBAResourceSchema>;
export type SBAResourceProviderInput = z.input<typeof SBAResourceProviderInputSchema>;
export type SBAResourceProviderPayload = z.infer<typeof SBAResourceProviderPayloadSchema>;

const validatedSBAResources = z.array(SBAResourceSchema).parse(sbaResources);

const SECTION_STAGE_MAP: Record<string, string[]> = {
  appendix: ["business_plan", "startup_guidance"],
  business_concept: ["business_plan"],
  business_model: ["business_plan"],
  company_description: ["business_plan"],
  competitive_analysis: ["market_research_section"],
  executive_summary: ["business_plan"],
  financial_plan: ["financial_plan"],
  founder_management_team: ["business_plan"],
  funding_request: ["funding_request", "funding"],
  growth_plan: ["business_plan"],
  industry_analysis: ["market_research_section"],
  launch_roadmap: ["state_checklist", "startup_guidance"],
  market_research: ["market_research_section", "market_research"],
  marketing_sales_plan: ["market_research", "business_plan"],
  mission_vision_values: ["business_plan"],
  operations_process_plan: ["startup_guidance"],
  organization_legal_structure: ["organization_legal_structure", "state_checklist"],
  product_service_line: ["business_plan"],
  risk_contingency_plan: ["risk", "startup_guidance"],
  technology_systems_plan: ["startup_guidance"],
};

const FUNDING_CATEGORY_RESOURCE_IDS: Record<string, string[]> = {
  sba_7a: ["sba-7a-loans", "sba-loans", "sba-lender-match"],
  sba_504: ["sba-504-loans", "sba-loans", "sba-lender-match"],
  sba_lender_match: ["sba-lender-match", "sba-loans"],
  sba_microloan: ["sba-microloans", "sba-loans"],
};

export class SBAResourceProvider
  implements DataProvider<ProviderInput, SBAResourceProviderPayload>
{
  readonly id = "sba-resources";
  readonly name = "SBA resources";
  readonly sourceType = "public_web" as const;

  async fetch(
    inputDraft: ProviderInput | SBAResourceProviderInput,
  ): Promise<ProviderResult<SBAResourceProviderPayload>> {
    const fetchedAt = new Date();
    const input = SBAResourceProviderInputSchema.parse(inputDraft);
    const resources = selectSBAResources(input);
    const payload = SBAResourceProviderPayloadSchema.parse({
      filterSummary: filterSummary(input, resources.length),
      matchedResourceIds: resources.map((resource) => resource.id),
      resources,
      sourceReferences: resources.map(sbaResourceToSourceReference),
    });

    return {
      confidence: 90,
      data: payload,
      fetchedAt,
      isMockData: false,
      sources: payload.sourceReferences,
      status: "available",
      warnings: [
        "SBA resources are curated official references, not scraped live data. Open the official resource and verify current details before relying on it.",
      ],
    };
  }
}

export function loadSBAResources(): SBAResource[] {
  return validatedSBAResources;
}

export function getSBAResourceById(id: string): SBAResource | undefined {
  return validatedSBAResources.find((resource) => resource.id === id);
}

export function getSBAResourcesForStages(stages: string[]): SBAResource[] {
  const normalizedStages = new Set(stages.map(normalizeToken));
  return validatedSBAResources.filter((resource) =>
    resource.appliesToStages.some((stage) => normalizedStages.has(normalizeToken(stage))),
  );
}

export function getSBAResourcesForFundingCategory(category: string): SBAResource[] {
  const ids = FUNDING_CATEGORY_RESOURCE_IDS[category] ?? [];
  if (ids.length === 0) return [];
  return ids
    .map(getSBAResourceById)
    .filter((resource): resource is SBAResource => Boolean(resource));
}

export function getSBAResourcesForBusinessPlanSection(sectionKey: string): SBAResource[] {
  return selectSBAResources({
    businessPlanSection: sectionKey,
  });
}

export function sbaResourceToSourceReference(resource: SBAResource): SourceReference {
  return {
    id: resource.id,
    lastVerifiedAt: new Date(`${resource.lastVerifiedAt}T00:00:00.000Z`),
    notes: resource.notes,
    sourceName: resource.sourceName,
    sourceType: resource.sourceType,
    title: resource.title,
    url: resource.url,
  };
}

function selectSBAResources(input: z.output<typeof SBAResourceProviderInputSchema>): SBAResource[] {
  const requestedStages = new Set<string>();
  for (const stage of input.stages ?? []) requestedStages.add(normalizeToken(stage));
  if (input.stage) requestedStages.add(normalizeToken(input.stage));
  if (input.businessPlanSection) {
    for (const stage of SECTION_STAGE_MAP[input.businessPlanSection] ?? []) {
      requestedStages.add(normalizeToken(stage));
    }
  }
  if (input.fundingNeed) {
    requestedStages.add("funding");
    requestedStages.add("funding_readiness");
  }
  if (input.stateChecklist) {
    requestedStages.add("state_checklist");
    requestedStages.add("launch_compliance");
    requestedStages.add("startup_guidance");
  }
  if (input.businessStructure) {
    requestedStages.add("organization_legal_structure");
    requestedStages.add("startup_guidance");
  }
  if (input.marketResearchSection) {
    requestedStages.add("market_research");
    requestedStages.add("market_research_section");
  }

  const requestedTags = new Set((input.tags ?? []).map(normalizeToken));
  if (input.fundingCategory) {
    for (const resource of getSBAResourcesForFundingCategory(input.fundingCategory)) {
      requestedTags.add(resource.id);
    }
    requestedTags.add(normalizeToken(input.fundingCategory));
  }
  if (input.category) requestedTags.add(normalizeToken(input.category));

  const directFundingResources = input.fundingCategory
    ? getSBAResourcesForFundingCategory(input.fundingCategory)
    : [];
  const stageMatches = requestedStages.size > 0
    ? validatedSBAResources.filter((resource) =>
        resource.appliesToStages.some((stage) => requestedStages.has(normalizeToken(stage))) ||
        resource.tags.some((tag) => requestedStages.has(normalizeToken(tag))),
      )
    : [];
  const tagMatches = requestedTags.size > 0
    ? validatedSBAResources.filter((resource) =>
        requestedTags.has(resource.id) ||
        requestedTags.has(normalizeToken(resource.category)) ||
        resource.tags.some((tag) => requestedTags.has(normalizeToken(tag))) ||
        resource.appliesToStages.some((stage) => requestedTags.has(normalizeToken(stage))),
      )
    : [];
  const queryMatches = input.query
    ? searchSBAResources(input.query)
    : [];

  const combined = uniqueResources([
    ...directFundingResources,
    ...stageMatches,
    ...tagMatches,
    ...queryMatches,
  ]);

  if (combined.length > 0) {
    return combined;
  }

  return [
    "sba-write-business-plan",
    "sba-market-research-competitive-analysis",
    "sba-local-assistance",
  ]
    .map(getSBAResourceById)
    .filter((resource): resource is SBAResource => Boolean(resource));
}

function searchSBAResources(query: string): SBAResource[] {
  const terms = normalizeToken(query)
    .split("_")
    .filter((term) => term.length >= 3);
  if (terms.length === 0) return [];
  return validatedSBAResources.filter((resource) => {
    const haystack = normalizeToken([
      resource.title,
      resource.category,
      resource.description,
      resource.tags.join(" "),
      resource.appliesToStages.join(" "),
    ].join(" "));
    return terms.some((term) => haystack.includes(term));
  });
}

function filterSummary(
  input: z.output<typeof SBAResourceProviderInputSchema>,
  count: number,
): string {
  const parts = [
    input.stage ? `stage=${input.stage}` : undefined,
    input.businessPlanSection ? `section=${input.businessPlanSection}` : undefined,
    input.fundingCategory ? `fundingCategory=${input.fundingCategory}` : undefined,
    input.stateChecklist ? "stateChecklist=true" : undefined,
    input.marketResearchSection ? "marketResearchSection=true" : undefined,
  ].filter(Boolean);
  return `${count} curated SBA resource${count === 1 ? "" : "s"} matched${parts.length ? ` (${parts.join(", ")})` : ""}.`;
}

function uniqueResources(resources: SBAResource[]): SBAResource[] {
  const seen = new Set<string>();
  return resources.filter((resource) => {
    if (seen.has(resource.id)) return false;
    seen.add(resource.id);
    return true;
  });
}

function normalizeToken(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}
