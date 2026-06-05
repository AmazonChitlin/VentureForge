import type { PromptTemplate } from "./types";

export const feasibilityPrompt: PromptTemplate = {
  id: "feasibility",
  title: "Feasibility explanation",
  objective: "Explain the deterministic feasibility result and suggest low-cost validation steps.",
  instructions: [
    "Do not override deterministic scores.",
    "Prioritize evidence gates before major spending.",
  ],
};
