import type { PromptTemplate } from "./types";

export const strategyPrompt: PromptTemplate = {
  id: "strategy",
  title: "Strategy refinement",
  objective: "Explain the recommended position and identify the next strategy test.",
  instructions: [
    "Tie each recommendation to customer, market, competitor, founder, or feasibility input.",
    "Avoid generic growth language and unsupported promises.",
  ],
};
