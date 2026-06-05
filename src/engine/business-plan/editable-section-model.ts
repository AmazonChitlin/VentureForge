import {
  BusinessPlanSchema,
  EditableBusinessPlanSectionSchema,
  type BusinessPlan,
  type EditableBusinessPlanSection,
} from "@/engine/business-plan/schema";

export interface BusinessPlanSectionPersistenceContent {
  editableContent: string;
  requiredUserInputs: string[];
  assumptions: string[];
  sourceNotes: EditableBusinessPlanSection["sourceNotes"];
  confidenceScore: number;
  missingInformation: string[];
  qualityChecklist: string[];
  regenerateMetadata: EditableBusinessPlanSection["regenerateMetadata"];
}

export interface BusinessPlanSectionPersistenceRecord {
  sectionKey: string;
  title: string;
  narrative: string;
  isLocked: boolean;
  content: BusinessPlanSectionPersistenceContent;
}

export interface BusinessPlanPersistenceRecord {
  planType: string;
  title: string;
  sections: BusinessPlanSectionPersistenceRecord[];
}

export function updateEditableContent(
  sectionInput: EditableBusinessPlanSection,
  editableContent: string,
): EditableBusinessPlanSection {
  return EditableBusinessPlanSectionSchema.parse({
    ...sectionInput,
    editableContent,
  });
}

export function setSectionLocked(
  sectionInput: EditableBusinessPlanSection,
  locked = true,
): EditableBusinessPlanSection {
  return EditableBusinessPlanSectionSchema.parse({
    ...sectionInput,
    locked,
  });
}

export function toBusinessPlanSectionPersistenceRecord(
  sectionInput: EditableBusinessPlanSection,
): BusinessPlanSectionPersistenceRecord {
  const section = EditableBusinessPlanSectionSchema.parse(sectionInput);
  return {
    sectionKey: section.key,
    title: section.title,
    narrative: section.narrative,
    isLocked: section.locked,
    content: {
      editableContent: section.editableContent,
      requiredUserInputs: section.requiredUserInputs,
      assumptions: section.assumptions,
      sourceNotes: section.sourceNotes,
      confidenceScore: section.confidenceScore,
      missingInformation: section.missingInformation,
      qualityChecklist: section.qualityChecklist,
      regenerateMetadata: section.regenerateMetadata,
    },
  };
}

export function toBusinessPlanPersistenceRecord(
  planInput: BusinessPlan,
): BusinessPlanPersistenceRecord {
  const plan = BusinessPlanSchema.parse(planInput);
  return {
    planType: plan.planType,
    title: plan.title,
    sections: plan.sections.map(toBusinessPlanSectionPersistenceRecord),
  };
}
