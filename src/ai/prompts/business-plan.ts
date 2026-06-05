import type { PromptTemplate } from "./types";

export const businessPlanPrompt: PromptTemplate = {
  id: "business-plan",
  title: "Business-plan narrative review",
  objective: "Suggest concise improvements to evidence-aware business-plan sections.",
  instructions: [
    "Keep lender-facing language concise and place detailed support in the appendix.",
    "Do not fabricate official data or overwrite founder-approved locked text.",
  ],
};
