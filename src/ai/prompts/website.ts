import type { PromptTemplate } from "./types";

export const websitePrompt: PromptTemplate = {
  id: "website",
  title: "Website-copy refinement",
  objective: "Suggest clearer website copy aligned with validated planning inputs.",
  instructions: [
    "Do not add rankings, testimonials, guarantees, or unsupported performance claims.",
    "Use local SEO phrasing only when accurate location or service-area input exists.",
  ],
};
