import {
  getSupportedStateCodes,
  getStateProgramResources,
  loadStateResourceFile,
} from "@/engine/state-programs/resource-loader";
import {
  StateLaunchChecklistSchema,
  StateProgramProjectInputSchema,
  type ChecklistApplicabilitySummary,
  type LaunchComplianceTask,
  type NormalizedStateProgramProjectInput,
  type StateLaunchChecklist,
  type StateProgramApplicability,
  type StateProgramProjectInput,
  type StateProgramResource,
} from "@/engine/state-programs/schema";
import {
  engineResultSchema,
  type EngineResult,
} from "@/engine/shared/engine-result";
import type { SourceReference } from "@/engine/shared/source-reference";
import {
  getSBAResourcesForStages,
  sbaResourceToSourceReference,
} from "@/providers/sba/provider";

const VERIFY_WITH_AGENCY_WARNING =
  "Verify with the official state and local agency before filing, spending money, signing a lease, or relying on this checklist. Requirements can change and local rules vary.";
const PROFESSIONAL_REVIEW_WARNING =
  "This checklist is planning support, not legal, tax, accounting, insurance, or licensing advice. Use qualified professionals where appropriate.";

export const StateProgramEngine = {
  generateChecklist(
    projectDraft: StateProgramProjectInput,
  ): EngineResult<StateLaunchChecklist> {
    const project = StateProgramProjectInputSchema.parse(projectDraft);
    const stateCode = project.idea.state;
    const stateFile = loadStateResourceFile(stateCode);
    const applicability = determineApplicability(project);
    const resources = stateFile ? getStateProgramResources(stateFile) : [];
    const checklist = resources
      .filter((resource) => applies(resource.applicability, applicability))
      .map((resource) => toChecklistTask(resource, stateFile?.verifyWarning));
    const missingInformation = determineMissingInformation(
      project,
      applicability,
      Boolean(stateFile),
    );
    const warnings = [
      VERIFY_WITH_AGENCY_WARNING,
      PROFESSIONAL_REVIEW_WARNING,
      ...(stateFile
        ? []
        : [
            `No seeded state-program file is available for ${stateCode || "the selected state"}. Add a validated state resource file before relying on state-specific guidance. Supported seed states: ${getSupportedStateCodes().join(", ")}.`,
          ]),
      ...(checklist.some((task) => task.needsVerification)
        ? [
            "Some checklist resources are placeholders or need re-verification. Use the listed agency details and record the official response before relying on them.",
          ]
        : []),
      ...(applicability.localOperationsLikely
        ? [
            "Local licensing and permit requirements must be confirmed directly with every applicable city, county, and site-specific agency.",
          ]
        : []),
    ];
    const coverageScore = calculateCoverageScore(
      project,
      checklist,
      Boolean(stateFile),
    );

    return engineResultSchema(StateLaunchChecklistSchema).parse({
      data: {
        stateCode: stateCode || "UNSPECIFIED",
        stateName: stateFile?.stateName ?? "Unsupported or missing state",
        supportedState: Boolean(stateFile),
        checklist,
        applicabilitySummary: applicability,
        coverageScore,
        entityFormationAgency: stateFile?.entityFormationAgency,
        taxAgency: stateFile?.taxAgency,
        licensingPortal: stateFile?.licensingPortal,
        economicDevelopmentAgency: stateFile?.economicDevelopmentAgency,
        workforceAgency: stateFile?.workforceAgency,
        SBDC: stateFile?.SBDC,
        SCORE: stateFile?.SCORE,
        VBOC: stateFile?.VBOC,
        lastVerifiedAt: stateFile?.lastVerifiedAt,
        verifyWarning: stateFile?.verifyWarning ?? VERIFY_WITH_AGENCY_WARNING,
        sourceReliability: stateFile?.sourceReliability,
        needsVerification:
          stateFile?.needsVerification ||
          checklist.some((task) => task.needsVerification),
      },
      confidence: coverageScore,
      assumptions: [
        `Employee-related checklist items are ${applicability.hasEmployees ? "included" : "not included"} based on the explicit employee flag or the staffing-plan text.`,
        `Taxable-sales checklist items are ${applicability.taxableSalesLikely ? "included" : "not included"} based on the explicit taxability flag or the business description.`,
        `Physical-location checklist items are ${applicability.physicalLocationLikely ? "included" : "not included"} based on the selected business model.`,
        "Local-resource URLs are official starting points. The founder must confirm the exact city, county, and activity-specific authority.",
      ],
      missingInformation,
      warnings,
      sources: uniqueSources([
        ...checklist.map(toSourceReference),
        ...sbaResourceSourcesForStateChecklist(),
      ]),
      nextActions: [
        ...(stateFile
          ? []
          : ["Add and validate an official state-program resource file for the selected state."]),
        "Review every included checklist item and record the agency response in founder notes.",
        ...(applicability.physicalLocationLikely
          ? ["Confirm zoning and occupancy rules before signing a lease or committing to build-out."]
          : []),
        ...(applicability.foodBusinessLikely
          ? ["Contact the applicable health authority before purchasing food-service equipment or preparing food for sale."]
          : []),
        ...(applicability.hasEmployees
          ? ["Confirm employer registration, unemployment, payroll, and workers-compensation obligations before employees begin work."]
          : []),
      ],
    });
  },
};

function determineApplicability(
  project: NormalizedStateProgramProjectInput,
): ChecklistApplicabilitySummary {
  const description = [
    project.idea.businessIdea,
    project.idea.productOrService,
    project.idea.industry,
    project.idea.staffingPlan,
    ...project.idea.licensingConcerns,
  ]
    .join(" ")
    .toLowerCase();
  const model = project.idea.businessModel;
  const physicalLocationLikely = [
    "physical_location",
    "hybrid",
    "manufacturing",
    "franchise",
  ].includes(model);
  const localOperationsLikely =
    physicalLocationLikely || ["mobile", "home_based"].includes(model);
  const hasEmployees =
    project.hasEmployees ??
    (!/no employees|founder-only|solo owner|owner only/.test(description) &&
      /employee|staff|hire|hiring|worker|payroll|team/.test(description));
  const foodBusinessLikely =
    /food|restaurant|cafe|coffee|bakery|catering|kitchen|meal|beverage|food truck/.test(
      description,
    );
  const liquorBusinessLikely =
    project.liquorRelated ??
    /liquor|alcohol|beer|wine|spirits|cocktail|brewery|distillery|bar\b/.test(
      description,
    );
  const contractorBusinessLikely =
    project.contractorRelated ??
    /contractor|construction|remodel|roof|plumb|electric|hvac|landscap|home improvement/.test(
      description,
    );
  const professionalServiceLikely =
    project.professionalLicenseRelated ??
    /medical|healthcare|dentist|dental|law firm|attorney|accounting|architect|engineer|real estate|cosmetology|therapy|professional license/.test(
      description,
    );
  const taxableSalesLikely =
    project.sellsTaxableGoodsOrServices ??
    (foodBusinessLikely ||
      ["physical_location", "product", "manufacturing", "franchise"].includes(
        model,
      ) ||
      /retail|sell|sales|merchandise|inventory|record store|ecommerce|food|product/.test(
        description,
      ));

  return {
    hasEmployees,
    taxableSalesLikely,
    localOperationsLikely,
    physicalLocationLikely,
    foodBusinessLikely,
    liquorBusinessLikely,
    contractorBusinessLikely,
    professionalServiceLikely,
  };
}

function sbaResourceSourcesForStateChecklist(): SourceReference[] {
  return getSBAResourcesForStages([
    "state_checklist",
    "launch_compliance",
    "startup_guidance",
  ]).map(sbaResourceToSourceReference);
}

function applies(
  triggers: StateProgramApplicability[],
  summary: ChecklistApplicabilitySummary,
): boolean {
  return triggers.some((trigger) => {
    switch (trigger) {
      case "always":
        return true;
      case "taxable_sales":
        return summary.taxableSalesLikely;
      case "local_operations":
        return summary.localOperationsLikely;
      case "physical_location":
        return summary.physicalLocationLikely;
      case "food_business":
        return summary.foodBusinessLikely;
      case "liquor_business":
        return summary.liquorBusinessLikely;
      case "contractor_business":
        return summary.contractorBusinessLikely;
      case "professional_service":
        return summary.professionalServiceLikely;
      case "has_employees":
        return summary.hasEmployees;
    }
  });
}

function toChecklistTask(
  resource: StateProgramResource,
  verifyWarning = VERIFY_WITH_AGENCY_WARNING,
): LaunchComplianceTask {
  return {
    id: resource.id,
    category: resource.category,
    task: resource.title,
    agency: resource.agency,
    officialUrl: resource.url,
    description: resource.description,
    whenNeeded: resource.whenNeeded,
    dependency: resource.dependency,
    estimatedDifficulty: resource.estimatedDifficulty,
    founderNotes: resource.founderNotes,
    verifyWithAgencyWarning: verifyWarning,
    lastVerifiedAt: resource.lastVerifiedAt,
    sourceReliability: resource.sourceReliability,
    needsVerification: resource.needsVerification,
  };
}

function determineMissingInformation(
  project: NormalizedStateProgramProjectInput,
  summary: ChecklistApplicabilitySummary,
  supportedState: boolean,
): string[] {
  return unique([
    supportedState ? undefined : "Supported state-program resource file",
    project.idea.city ? undefined : "City",
    project.idea.county ? undefined : "County",
    summary.physicalLocationLikely && !project.idea.zipCode
      ? "ZIP code or proposed operating address"
      : undefined,
    project.hasEmployees === undefined && !project.idea.staffingPlan.trim()
      ? "Employee and staffing plan"
      : undefined,
    project.sellsTaxableGoodsOrServices === undefined &&
    !project.idea.productOrService.trim()
      ? "Products, services, and taxable-sales assumptions"
      : undefined,
  ]);
}

function calculateCoverageScore(
  project: NormalizedStateProgramProjectInput,
  checklist: LaunchComplianceTask[],
  supportedState: boolean,
): number {
  if (!supportedState) return 30;
  let score = 88;
  if (!project.idea.city) score -= 8;
  if (!project.idea.county) score -= 6;
  if (checklist.length === 0) score -= 25;
  return clamp(score);
}

function toSourceReference(task: LaunchComplianceTask): SourceReference {
  return {
    id: `state-program:${task.id}`,
    title: task.task,
    sourceName: task.agency,
    sourceType: "official",
    url: task.officialUrl,
    lastVerifiedAt: new Date(`${task.lastVerifiedAt}T00:00:00.000Z`),
    notes: `${task.sourceReliability}; ${task.needsVerification ? "needs verification; " : ""}Official starting point. Verify current state, local, and activity-specific requirements before relying on this checklist.`,
  };
}

function uniqueSources(sources: SourceReference[]): SourceReference[] {
  const seen = new Set<string>();
  return sources.filter((source) => {
    const key = `${source.sourceName}:${source.url}`;
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

function clamp(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}
