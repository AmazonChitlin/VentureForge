import type { PromptTemplate } from "./types";

export const intakeQuestionsPrompt: PromptTemplate = {
  id: "intake-questions",
  title: "Intake follow-up questions",
  objective: "Suggest the smallest set of follow-up questions that improve intake clarity.",
  instructions: [
    "Prioritize missing founder, customer, location, financial, and regulatory details.",
    "Ask concise questions that a founder can answer without specialist knowledge.",
  ],
};
