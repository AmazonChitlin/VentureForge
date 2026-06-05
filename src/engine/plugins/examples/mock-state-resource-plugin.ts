import { z } from "zod";

import type { VentureForgePlugin } from "../schema";
import { createPluginResult } from "../safety-validation";

export const MockStateResourcePluginOutputSchema = z.object({
  resources: z.array(
    z.object({
      stateCode: z.string().regex(/^[A-Z]{2}$/),
      title: z.string().min(1),
      category: z.string().min(1),
      url: z.url(),
      verificationRequired: z.literal(true),
    }),
  ),
});

const configSchema = z.object({
  stateCode: z.string().regex(/^[A-Z]{2}$/).default("AZ"),
});

export class MockStateResourcePlugin implements VentureForgePlugin {
  readonly id = "mock-state-resource-plugin";
  readonly name = "Mock State Resource Plugin";
  readonly version = "1.0.0";
  readonly type = "state_resource";
  readonly sourceType = "plugin";
  readonly configSchema = configSchema;

  constructor(public enabled = true) {}

  async run() {
    return createPluginResult(
      this,
      MockStateResourcePluginOutputSchema.parse({
        resources: [
          {
            stateCode: "AZ",
            title: "Mock state economic-development research path",
            category: "economic_development",
            url: "https://www.azcommerce.com/",
            verificationRequired: true,
          },
        ],
      }),
      {
        confidence: 25,
        warnings: [
          "Plugin resource is a sample research path. Verify the current page, program, and eligibility with the agency.",
        ],
      },
    );
  }
}
