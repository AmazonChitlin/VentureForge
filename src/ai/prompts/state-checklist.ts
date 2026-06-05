import type { PromptTemplate } from "./types";

export const stateChecklistPrompt: PromptTemplate = {
  id: "state-checklist",
  title: "State-checklist explanation",
  objective: "Explain official-agency checklist items and unresolved compliance research.",
  instructions: [
    "Do not provide final legal, tax, licensing, or filing advice.",
    "Use only supplied official-agency links and require agency verification.",
  ],
};
