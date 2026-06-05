import { z } from "zod";

import type { VentureForgePlugin } from "../schema";
import { createPluginResult } from "../safety-validation";

export const WebsiteThemePluginOutputSchema = z.object({
  theme: z.object({
    id: z.string().min(1),
    name: z.string().min(1),
    cssVariables: z.record(z.string(), z.string()),
    notes: z.array(z.string()),
  }),
});

const configSchema = z.object({
  accentColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .default("#2457d6"),
});

export class WebsiteThemePlugin implements VentureForgePlugin {
  readonly id = "website-theme-plugin";
  readonly name = "Website Theme Plugin";
  readonly version = "1.0.0";
  readonly type = "website_theme";
  readonly sourceType = "plugin";
  readonly configSchema = configSchema;

  constructor(public enabled = true) {}

  async run() {
    return createPluginResult(
      this,
      WebsiteThemePluginOutputSchema.parse({
        theme: {
          id: "founder-focused-theme",
          name: "Founder-focused theme",
          cssVariables: {
            "--surface": "#ffffff",
            "--background": "#f5f7fb",
            "--ink": "#172033",
            "--accent": "#2457d6",
          },
          notes: [
            "Theme tokens are a conservative starting point for the static website export.",
          ],
        },
      }),
      {
        confidence: 75,
        assumptions: [
          "Theme selection is a design preference and requires founder review.",
        ],
      },
    );
  }
}
