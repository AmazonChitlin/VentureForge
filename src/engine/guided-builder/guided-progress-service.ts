import { guidedSteps } from "@/engine/guided-builder/stage-catalog";
import type {
  GuidedAnswer,
  GuidedBuilderState,
  GuidedStep,
  GuidedStepId,
} from "@/engine/guided-builder/schema";

const requiredAnswerFields: Partial<Record<GuidedStepId, string[]>> = {
  idea_basics: ["businessIdea"],
  customer_basics: ["targetCustomer"],
  location_model: ["businessModel", "state"],
  products_services: ["productOrService"],
  differentiation: ["differentiator"],
  startup_costs: [
    "startupSpaceCost",
    "equipmentCost",
    "inventoryCost",
    "otherStartupCost",
  ],
  money_funding: ["pricePerSale", "weeklySales"],
  state_legal: ["regulatedActivities"],
};

export interface GuidedProgress {
  currentStep: GuidedStep;
  currentStepNumber: number;
  totalSteps: number;
  percentComplete: number;
  answeredQuestionSteps: number;
  questionStepCount: number;
  canContinue: boolean;
}

export const GuidedProgressService = {
  createInitialState(projectId: string): GuidedBuilderState {
    const now = new Date().toISOString();
    return {
      projectId,
      mode: "guided",
      currentStepIndex: 0,
      answers: {},
      completedStepIds: [],
      startedAt: now,
      updatedAt: now,
    };
  },

  getProgress(state: GuidedBuilderState): GuidedProgress {
    const questionSteps = guidedSteps.filter((step) => step.kind === "question");
    const answeredQuestionSteps = questionSteps.filter((step) =>
      this.isStepComplete(step, state.answers),
    ).length;
    const currentStep =
      guidedSteps[Math.min(state.currentStepIndex, guidedSteps.length - 1)] ??
      guidedSteps[0];
    return {
      currentStep,
      currentStepNumber: state.currentStepIndex + 1,
      totalSteps: guidedSteps.length,
      percentComplete: Math.round(
        (answeredQuestionSteps / questionSteps.length) * 100,
      ),
      answeredQuestionSteps,
      questionStepCount: questionSteps.length,
      canContinue: this.isStepComplete(currentStep, state.answers),
    };
  },

  isStepComplete(
    step: GuidedStep,
    answers: Record<string, GuidedAnswer>,
  ): boolean {
    if (step.kind !== "question") {
      return true;
    }
    const fields = requiredAnswerFields[step.id] ?? [];
    if (fields.length === 0) {
      return true;
    }
    return (
      fields.some((field) => hasAnswer(answers[field])) ||
      Boolean(step.question && hasAnswer(answers[step.question.field]))
    );
  },

  next(state: GuidedBuilderState): GuidedBuilderState {
    const step = guidedSteps[state.currentStepIndex];
    const completedStepIds = step
      ? [...new Set([...state.completedStepIds, step.id])]
      : state.completedStepIds;
    return {
      ...state,
      currentStepIndex: Math.min(state.currentStepIndex + 1, guidedSteps.length - 1),
      completedStepIds,
      updatedAt: new Date().toISOString(),
    };
  },

  back(state: GuidedBuilderState): GuidedBuilderState {
    return {
      ...state,
      currentStepIndex: Math.max(0, state.currentStepIndex - 1),
      updatedAt: new Date().toISOString(),
    };
  },

  goTo(state: GuidedBuilderState, stepId: GuidedStepId): GuidedBuilderState {
    const index = guidedSteps.findIndex((step) => step.id === stepId);
    if (index < 0) {
      return state;
    }
    return {
      ...state,
      currentStepIndex: index,
      updatedAt: new Date().toISOString(),
    };
  },
};

function hasAnswer(answer?: GuidedAnswer): boolean {
  if (!answer) {
    return false;
  }
  if (answer.isUnsure) {
    return true;
  }
  if (Array.isArray(answer.structuredValue)) {
    return answer.structuredValue.length > 0;
  }
  return answer.structuredValue !== "" && answer.structuredValue !== null;
}
