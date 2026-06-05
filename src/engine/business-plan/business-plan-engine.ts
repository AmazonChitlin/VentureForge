import {
  engineResultSchema,
  type EngineResult,
} from "@/engine/shared/engine-result";
import type { SourceReference } from "@/engine/shared/source-reference";

import { buildSectionDraft } from "./section-builders";
import {
  businessPlanSectionDefinitions,
  businessPlanVariants,
  type BusinessPlanVariant,
} from "./section-catalog";
import {
  BusinessPlanInputSchema,
  BusinessPlanSchema,
  BusinessPlanSectionKeySchema,
  BusinessPlanTypeSchema,
  EditableBusinessPlanSectionSchema,
  type BusinessPlan,
  type BusinessPlanInput,
  type BusinessPlanSectionKey,
  type BusinessPlanType,
  type EditableBusinessPlanSection,
  type NormalizedBusinessPlanInput,
} from "./schema";

export const BusinessPlanEngine = {
  generate(
    inputDraft: BusinessPlanInput,
    planTypeDraft: BusinessPlanType,
    existingSectionsDraft: EditableBusinessPlanSection[] = [],
  ): EngineResult<BusinessPlan> {
    const input = BusinessPlanInputSchema.parse(inputDraft);
    const planType = BusinessPlanTypeSchema.parse(planTypeDraft);
    const variant = businessPlanVariants[planType];
    const existingSections = existingSectionMap(existingSectionsDraft);
    const sections = variant.sectionKeys.map((key) =>
      buildEditableSection(input, variant, key, existingSections.get(key)),
    );
    const overallConfidence = average(
      sections.map((section) => section.confidenceScore),
    );
    const plan = BusinessPlanSchema.parse({
      planType,
      title: `${input.idea.businessName || "Untitled Business"} - ${variant.label}`,
      intendedAudience: variant.intendedAudience,
      concise: variant.concise,
      sections,
      sectionOrder: variant.sectionKeys,
      overallConfidence,
      detailedSupportMaterialPlacement: "appendix",
    });

    return engineResultSchema(BusinessPlanSchema).parse({
      data: plan,
      confidence: overallConfidence,
      assumptions: unique(sections.flatMap((section) => section.assumptions)),
      missingInformation: unique(
        sections.flatMap((section) =>
          section.missingInformation.map(
            (missing) => `${section.title}: ${missing}`,
          ),
        ),
      ),
      warnings: buildWarnings(input, sections),
      sources: uniqueSources(
        sections.flatMap((section) => section.sourceNotes),
      ),
      nextActions: buildNextActions(sections),
    });
  },

  regenerateSection(
    inputDraft: BusinessPlanInput,
    planTypeDraft: BusinessPlanType,
    sectionKeyDraft: BusinessPlanSectionKey,
    existingSectionDraft: EditableBusinessPlanSection,
  ): EditableBusinessPlanSection {
    const input = BusinessPlanInputSchema.parse(inputDraft);
    const planType = BusinessPlanTypeSchema.parse(planTypeDraft);
    const sectionKey = BusinessPlanSectionKeySchema.parse(sectionKeyDraft);
    const existingSection =
      EditableBusinessPlanSectionSchema.parse(existingSectionDraft);
    const variant = businessPlanVariants[planType];

    if (!variant.sectionKeys.includes(sectionKey)) {
      throw new Error(
        `${sectionKey} is not included in the ${variant.label} section set.`,
      );
    }
    if (existingSection.key !== sectionKey) {
      throw new Error(
        `Cannot regenerate ${sectionKey} from an existing ${existingSection.key} section.`,
      );
    }

    return buildEditableSection(input, variant, sectionKey, existingSection);
  },
};

function buildEditableSection(
  input: NormalizedBusinessPlanInput,
  variant: BusinessPlanVariant,
  key: BusinessPlanSectionKey,
  existingSection?: EditableBusinessPlanSection,
): EditableBusinessPlanSection {
  const definition = businessPlanSectionDefinitions[key];
  if (existingSection?.locked) {
    return EditableBusinessPlanSectionSchema.parse({
      ...existingSection,
      regenerateMetadata: {
        ...existingSection.regenerateMetadata,
        lastAction: "preserved_locked",
        preservedBecauseLocked: true,
      },
    });
  }

  const draft = buildSectionDraft(input, variant.type, key);
  return EditableBusinessPlanSectionSchema.parse({
    key,
    title: definition.title,
    narrative: draft.narrative,
    editableContent: draft.narrative,
    requiredUserInputs: definition.requiredUserInputs,
    assumptions: draft.assumptions,
    sourceNotes: draft.sourceNotes,
    confidenceScore: draft.confidenceScore,
    missingInformation: draft.missingInformation,
    qualityChecklist: definition.qualityChecklist,
    locked: false,
    regenerateMetadata: {
      canRegenerate: true,
      generationVersion: "deterministic-v1",
      lastAction: existingSection ? "regenerated" : "generated",
      regenerationCount:
        (existingSection?.regenerateMetadata.regenerationCount ?? 0) +
        (existingSection ? 1 : 0),
      preservedBecauseLocked: false,
      consumedEngineOutputs: definition.consumedEngineOutputs,
      regenerationGuidance:
        "Review edits before regenerating. Lock founder-approved content to preserve it.",
    },
  });
}

function existingSectionMap(
  sectionsDraft: EditableBusinessPlanSection[],
): Map<BusinessPlanSectionKey, EditableBusinessPlanSection> {
  return new Map(
    sectionsDraft.map((sectionDraft) => {
      const section = EditableBusinessPlanSectionSchema.parse(sectionDraft);
      return [section.key, section];
    }),
  );
}

function buildWarnings(
  input: NormalizedBusinessPlanInput,
  sections: EditableBusinessPlanSection[],
): string[] {
  return unique([
    "This business plan is editable planning support. It does not guarantee business success, funding, revenue, legal compliance, or tax treatment.",
    "Verify legal, tax, accounting, insurance, licensing, and filing decisions with official agencies and qualified professionals.",
    input.marketResearchReport
      ? undefined
      : "Market research is missing. Do not present unsupported local or industry claims as facts.",
    input.marketResearchReport?.containsMockData
      ? "Market research includes clearly labeled mock placeholders. Replace them before external use or spending decisions."
      : undefined,
    input.financialProjection
      ? undefined
      : "A traceable financial projection is missing. Do not present unsupported financial claims.",
    sections.some((section) => section.locked)
      ? "Locked sections were preserved during regeneration. Review them when upstream evidence changes."
      : undefined,
    "Detailed supporting evidence belongs in the appendix so external-facing narratives remain concise and reviewable.",
  ]);
}

function buildNextActions(sections: EditableBusinessPlanSection[]): string[] {
  const lowConfidenceSections = sections
    .filter((section) => section.confidenceScore < 55)
    .map((section) => section.title);
  const sectionsWithMissingInputs = sections
    .filter((section) => section.missingInformation.length > 0)
    .map((section) => section.title);

  return unique([
    lowConfidenceSections.length
      ? `Improve evidence for low-confidence sections: ${lowConfidenceSections.join(", ")}.`
      : undefined,
    sectionsWithMissingInputs.length
      ? `Review missing information in: ${sectionsWithMissingInputs.join(", ")}.`
      : undefined,
    "Edit the generated draft, then lock founder-approved sections before regenerating from updated engine outputs.",
    "Move detailed source evidence, formulas, and attachments into the appendix before external review.",
  ]);
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

function average(values: number[]): number {
  if (!values.length) return 0;
  return Math.round(
    values.reduce((total, value) => total + value, 0) / values.length,
  );
}
