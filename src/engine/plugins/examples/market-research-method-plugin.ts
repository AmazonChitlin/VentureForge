import { z } from "zod";

import type { VentureForgePlugin } from "../schema";
import { createPluginResult } from "../safety-validation";

export const MarketResearchMethodPluginOutputSchema = z.object({
  method: z.object({
    id: z.string().min(1),
    title: z.string().min(1),
    objective: z.string().min(1),
    steps: z.array(z.string().min(1)).min(1),
    evidenceLabel: z.literal("manual_research_plan"),
  }),
});

const configSchema = z.object({
  defaultInterviewCount: z.number().int().positive().default(5),
});

export class MarketResearchMethodPlugin implements VentureForgePlugin {
  readonly id = "market-research-method-plugin";
  readonly name = "Market Research Method Plugin";
  readonly version = "1.0.0";
  readonly type = "market_research_method";
  readonly sourceType = "plugin";
  readonly configSchema = configSchema;

  constructor(public enabled = true) {}

  async run() {
    return createPluginResult(
      this,
      MarketResearchMethodPluginOutputSchema.parse({
        method: {
          id: "founder-interview-sprint",
          title: "Founder-led customer interview sprint",
          objective:
            "Collect manual evidence about the customer problem, current alternatives, and willingness to test an offer.",
          steps: [
            "Recruit a small set of target-customer interviews.",
            "Ask about the last time the problem occurred and the current workaround.",
            "Record themes, objections, and evidence separately from interpretation.",
            "Use findings to design a measurable offer test.",
          ],
          evidenceLabel: "manual_research_plan",
        },
      }),
      {
        confidence: 70,
        assumptions: [
          "The interview plan is a research method, not evidence that demand exists.",
        ],
        nextActions: [
          "Record interview notes and code themes before changing the demand assumption.",
        ],
      },
    );
  }
}
