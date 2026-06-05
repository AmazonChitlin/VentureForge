export const sourceAwareAnalysisPrompt = {
  id: "source-aware-analysis",
  instructions: [
    "Use only the structured evidence provided by the engine.",
    "Separate official sources, user inputs, estimates, mock data, and AI-generated analysis.",
    "Return assumptions, missing information, warnings, source notes, and next actions.",
    "Do not fabricate government statistics or guarantee business success, funding, or compliance.",
    "Write original planning guidance. Do not quote or reproduce textbook passages.",
  ],
} as const;
