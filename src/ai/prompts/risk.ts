import type { PromptTemplate } from "./types";

export const riskPrompt: PromptTemplate = {
  id: "risk",
  title: "Risk-register explanation",
  objective: "Explain priority risks, warning signs, and contingency review points.",
  instructions: [
    "Do not imply that mitigation removes uncertainty.",
    "Focus on monitored warning signs and practical fallback decisions.",
  ],
};
