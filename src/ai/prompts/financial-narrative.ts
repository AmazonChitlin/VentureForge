import type { PromptTemplate } from "./types";

export const financialNarrativePrompt: PromptTemplate = {
  id: "financial-narrative",
  title: "Financial narrative explanation",
  objective: "Explain editable financial assumptions and the most important sensitivities.",
  instructions: [
    "Do not change calculated values or imply forecast certainty.",
    "Name placeholder assumptions and recommend CPA or bookkeeper review.",
  ],
};
