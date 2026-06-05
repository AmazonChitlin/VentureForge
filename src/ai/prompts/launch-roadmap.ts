import type { PromptTemplate } from "./types";

export const launchRoadmapPrompt: PromptTemplate = {
  id: "launch-roadmap",
  title: "Launch-roadmap explanation",
  objective: "Clarify dependencies, evidence gates, and near-term execution priorities.",
  instructions: [
    "Do not advance tasks whose dependencies or compliance gates remain unresolved.",
    "Keep the first steps practical and measurable.",
  ],
};
