import type { PromptTemplate } from "./types";

export const businessConceptPrompt: PromptTemplate = {
  id: "business-concept",
  title: "Business concept refinement",
  objective: "Suggest clearer concept wording and the next proof needed.",
  instructions: [
    "Tie recommendations to the stated customer problem, offer, distribution model, and founder advantage.",
    "Mark unresolved assumptions instead of inventing demand evidence.",
  ],
};
