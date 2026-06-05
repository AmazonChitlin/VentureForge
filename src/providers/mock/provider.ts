import type {
  DataProvider,
  ProviderInput,
  ProviderResult,
} from "@/providers/provider";
import {
  MarketDataPayloadSchema,
  type MarketDataPayload,
} from "@/engine/market-research/schema";

export class MockMarketDataProvider
  implements DataProvider<ProviderInput, MarketDataPayload>
{
  readonly id = "mock-market-data";
  readonly name = "Mock market data";
  readonly sourceType = "mock" as const;

  async fetch(input: ProviderInput): Promise<ProviderResult<MarketDataPayload>> {
    const geography = describeGeography(input);
    const industry = input.industry || "the selected industry";
    return {
      status: "available",
      data: MarketDataPayloadSchema.parse({
        industryOverview: `Sample-only market profile for ${industry} in ${geography}. Replace this mock profile with live official and primary research connectors.`,
        populationIndicators: [
          sampleIndicator("Sample service-area population", "185,000", "people"),
          sampleIndicator("Sample household count", "76,000", "households"),
        ],
        incomeIndicators: [
          sampleIndicator("Sample median household income", "$72,000", "USD"),
        ],
        employmentIndicators: [
          sampleIndicator("Sample employed population", "96,000", "people"),
        ],
        customerDemographics: [
          `Sample-only target segment note for ${input.targetCustomer || "the intended customer segment"}.`,
        ],
        businessDensity:
          "Sample-only moderate-density placeholder. A Census business-pattern connector should replace this statement.",
        similarBusinessCount: 18,
        marketTrends: [
          "Sample-only trend placeholder. Verify with current official, trade, and primary research sources.",
        ],
        demandSignals: [
          "Sample-only demand signal. Run interviews and a low-cost behavioral demand test.",
        ],
        pricingSignals: [
          "Sample-only pricing placeholder. Collect local competitor prices and customer willingness-to-pay evidence.",
        ],
        supplyDistributionNotes: [
          "Sample-only distribution note. Verify suppliers, routes, channels, and lead times.",
        ],
        economicCycleSensitivity:
          "Sample-only sensitivity placeholder. Evaluate how customer spending changes under local economic stress.",
        seasonality:
          "Sample-only seasonality placeholder. Record expected peaks and slow periods with evidence.",
        technologyDisruption:
          "Sample-only technology placeholder. Identify digital substitutes and operating tools.",
        regulatorySensitivity:
          "Sample-only regulatory placeholder. Verify requirements with official state and local agencies.",
        marketSizeEstimate:
          "Sample-only directional estimate unavailable. Replace with a documented calculation from live and primary research.",
        marketSaturationEstimate:
          "Sample-only moderate-saturation placeholder. Replace with local competitor and business-density evidence.",
        confidenceEvidence: {
          sourceQuality: 10,
          recency: 15,
          geographicSpecificity: input.geography?.zipCode ? 35 : 20,
          industrySpecificity: input.naicsCode ? 35 : 20,
          sampleSize: 5,
          primaryResearchAvailability: 0,
          secondaryDataAvailability: 10,
          independentSources: 5,
          consistencyAcrossSources: 5,
        },
        missingData: [
          "Live population data is missing.",
          "Live income data is missing.",
          "Live employment data is missing.",
          "Official business-density data is missing.",
          "Local competitor evidence is missing.",
          "Primary customer research is missing.",
        ],
      }),
      sources: [
        {
          id: "mock-market-data",
          title: "Sample market data",
          sourceName: "VentureForge",
          sourceType: "mock",
          notes:
            "All values and narrative in this source are invented sample placeholders. Never present them as official data.",
        },
      ],
      confidence: 10,
      warnings: [
        "Mock provider output is for development only. Every mock value must be replaced before decisions rely on it.",
      ],
      fetchedAt: new Date(),
      isMockData: true,
    };
  }
}

function sampleIndicator(
  label: string,
  value: string,
  unit: string,
) {
  return {
    label,
    value,
    unit,
    dataLabel: "mock" as const,
    notes: "Invented sample placeholder. Replace with a live connector.",
  };
}

function describeGeography(input: ProviderInput): string {
  const { city, county, stateCode, zipCode } = input.geography ?? {};
  return [city, county, stateCode, zipCode].filter(Boolean).join(", ") ||
    "the selected geography";
}
