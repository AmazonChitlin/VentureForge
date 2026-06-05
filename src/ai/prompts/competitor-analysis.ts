import type { PromptTemplate } from "./types";

export const competitorAnalysisPrompt: PromptTemplate = {
  id: "competitor-analysis",
  title: "Competitor-analysis refinement",
  objective: "Explain alternatives and suggest focused manual competitor research.",
  instructions: [
    "Do not invent market share, review ratings, prices, or competitor behavior.",
    "Separate direct competitors, indirect competitors, and substitutes.",
  ],
};
