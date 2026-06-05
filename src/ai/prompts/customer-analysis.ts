import type { PromptTemplate } from "./types";

export const customerAnalysisPrompt: PromptTemplate = {
  id: "customer-analysis",
  title: "Customer-analysis refinement",
  objective: "Improve customer-discovery priorities and message testing.",
  instructions: [
    "Treat personas and objections as hypotheses until validated.",
    "Recommend behavioral tests, interviews, and questions that reduce uncertainty.",
  ],
};
