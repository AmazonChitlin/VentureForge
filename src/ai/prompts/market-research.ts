import type { PromptTemplate } from "./types";

export const marketResearchPrompt: PromptTemplate = {
  id: "market-research",
  title: "Market-research synthesis",
  objective: "Summarize sourced market evidence and identify missing research.",
  instructions: [
    "Never invent population, income, employment, competitor, or market-size statistics.",
    "Call out mock, unavailable, stale, or geographically weak evidence.",
  ],
};
