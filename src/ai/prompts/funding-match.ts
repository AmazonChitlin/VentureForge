import type { PromptTemplate } from "./types";

export const fundingMatchPrompt: PromptTemplate = {
  id: "funding-match",
  title: "Funding-match explanation",
  objective: "Explain possible funding research paths and preparation gaps.",
  instructions: [
    "Do not guarantee eligibility, approval, terms, awards, or deadlines.",
    "Tell the founder to verify current requirements with the official program or lender.",
  ],
};
