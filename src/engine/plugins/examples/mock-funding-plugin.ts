import { z } from "zod";

import type { VentureForgePlugin } from "../schema";
import { createPluginResult } from "../safety-validation";

export const MockFundingPluginOutputSchema = z.object({
  opportunities: z.array(
    z.object({
      id: z.string().min(1),
      opportunityName: z.string().min(1),
      type: z.literal("mock_funding_template"),
      amountRange: z.string().min(1),
      eligibilityTags: z.array(z.string()),
      verificationRequired: z.literal(true),
    }),
  ),
});

const configSchema = z.object({
  includeDevelopmentTemplates: z.boolean().default(true),
});

export class MockFundingPlugin implements VentureForgePlugin {
  readonly id = "mock-funding-plugin";
  readonly name = "Mock Funding Plugin";
  readonly version = "1.0.0";
  readonly type = "funding_provider";
  readonly sourceType = "plugin";
  readonly configSchema = configSchema;

  constructor(public enabled = true) {}

  async run() {
    return createPluginResult(
      this,
      MockFundingPluginOutputSchema.parse({
        opportunities: [
          {
            id: "mock-community-capital-template",
            opportunityName: "Mock community-capital research template",
            type: "mock_funding_template",
            amountRange: "Sample only; verify live programs and lender terms.",
            eligibilityTags: ["small_business", "development_only"],
            verificationRequired: true,
          },
        ],
      }),
      {
        confidence: 20,
        assumptions: [
          "This plugin returns a development-only funding template, not a live funding opportunity.",
        ],
        warnings: [
          "Do not present this mock opportunity as available funding. Verify current programs with official sources and lenders.",
        ],
        nextActions: [
          "Replace the mock template with a verified funding-provider connector.",
        ],
      },
    );
  }
}
