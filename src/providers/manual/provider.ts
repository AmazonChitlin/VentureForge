import {
  MarketDataPayloadSchema,
  type MarketDataPayload,
} from "@/engine/market-research/schema";
import type {
  DataProvider,
  ProviderInput,
  ProviderResult,
} from "@/providers/provider";

export class ManualResearchProvider
  implements DataProvider<ProviderInput, MarketDataPayload>
{
  readonly id = "manual-research";
  readonly name = "Manual research";
  readonly sourceType = "manual" as const;

  async fetch(input: ProviderInput): Promise<ProviderResult<MarketDataPayload>> {
    const entries = input.manualResearchEntries ?? [];
    if (entries.length === 0) {
      return {
        status: "unavailable",
        data: null,
        sources: [],
        confidence: 0,
        warnings: ["No founder-entered manual research is available yet."],
        fetchedAt: new Date(),
        isMockData: false,
      };
    }

    return {
      status: "available",
      data: MarketDataPayloadSchema.parse({
        industryOverview:
          "Founder-entered research notes are available. Review each note and preserve its original source before relying on it.",
        demandSignals: entries.map((entry) => `${entry.title}: ${entry.notes}`),
        confidenceEvidence: {
          sourceQuality: 35,
          recency: 45,
          geographicSpecificity: input.geography?.zipCode ? 55 : 35,
          industrySpecificity: input.naicsCode ? 55 : 35,
          sampleSize: 20,
          primaryResearchAvailability: 30,
          secondaryDataAvailability: 25,
          independentSources: Math.min(70, entries.length * 15),
          consistencyAcrossSources: entries.length > 1 ? 35 : 15,
        },
        missingData: [
          "Manual notes require review and verification.",
          "Official secondary data connectors are not active yet.",
        ],
      }),
      sources: entries.map((entry) => ({
        id: `manual-${entry.id}`,
        title: entry.title,
        sourceName: "Founder-entered manual research",
        sourceType: "manual" as const,
        url: entry.url,
        notes: "Founder-entered note. Review the original source before relying on it.",
      })),
      confidence: 35,
      warnings: [
        "Manual research is user-entered and has not been independently verified.",
      ],
      fetchedAt: new Date(),
      isMockData: false,
    };
  }
}
