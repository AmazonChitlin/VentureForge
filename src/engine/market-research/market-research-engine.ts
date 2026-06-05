import { engineResultSchema, type EngineResult } from "@/engine/shared/engine-result";
import type { SourceReference } from "@/engine/shared/source-reference";
import {
  MarketDataPayloadSchema,
  MarketResearchEngineInputSchema,
  MarketResearchReportSchema,
  type MarketDataPayload,
  type MarketResearchConfidenceEvidence,
  type MarketResearchEngineInput,
  type MarketResearchReport,
  type ProviderRunSummary,
  type ResearchIndicator,
} from "@/engine/market-research/schema";
import { scoreMarketResearchConfidence } from "@/engine/market-research/confidence-score";
import { ManualResearchProvider } from "@/providers/manual/provider";
import { MockMarketDataProvider } from "@/providers/mock/provider";
import { BLSProvider } from "@/providers/bls/provider";
import { CensusProvider } from "@/providers/census/provider";
import type {
  DataProvider,
  ProviderInput,
  ProviderResult,
} from "@/providers/provider";
import { logError, logWarning } from "@/lib/logging/safeLogger";

export interface MarketResearchEngineOptions {
  providers?: DataProvider[];
}

type SuccessfulProviderRun = {
  providerId: string;
  providerName: string;
  result: ProviderResult<unknown>;
  payload: MarketDataPayload;
};

type ProviderExecution = {
  summary: ProviderRunSummary;
  result?: ProviderResult<unknown>;
  payload?: MarketDataPayload;
};

export const MarketResearchEngine = {
  async generate(
    engineInput: MarketResearchEngineInput,
    options: MarketResearchEngineOptions = {},
  ): Promise<EngineResult<MarketResearchReport>> {
    const input = MarketResearchEngineInputSchema.parse(engineInput);
    const providerInput = toProviderInput(input);
    const providers = options.providers ?? defaultProviders(input);
    const executions = await Promise.all(
      providers.map((provider) => executeProvider(provider, providerInput)),
    );
    const allSuccessfulRuns = executions
      .filter(
        (execution): execution is ProviderExecution & {
          result: ProviderResult<unknown>;
          payload: MarketDataPayload;
        } => Boolean(execution.result && execution.payload),
      )
      .map((execution) => ({
        providerId: execution.summary.providerId,
        providerName: execution.summary.providerName,
        result: execution.result,
        payload: execution.payload,
      }));
    const nonMockSuccessfulRuns = allSuccessfulRuns.filter(
      (run) => !run.result.isMockData,
    );
    const successfulRuns = nonMockSuccessfulRuns.length > 0
      ? nonMockSuccessfulRuns
      : allSuccessfulRuns;
    const usedProviderIds = new Set(successfulRuns.map((run) => run.providerId));
    const payload = aggregatePayloads(successfulRuns);
    const sourcesUsed = uniqueSources(
      successfulRuns.flatMap((run) => run.result.sources),
    );
    const missingData = unique([
      ...payload.missingData,
      ...executions
        .filter((execution) => execution.summary.status !== "available")
        .map(
          (execution) =>
            `${execution.summary.providerName} did not provide market data.`,
        ),
    ]);
    const confidenceLevel = scoreMarketResearchConfidence(
      adjustIndependentSourceScore(payload.confidenceEvidence, sourcesUsed),
      missingData.length,
    );
    const warnings = unique([
      ...executions
        .filter(
          (execution) =>
            execution.summary.status !== "available" ||
            usedProviderIds.has(execution.summary.providerId),
        )
        .flatMap((execution) => execution.summary.warnings),
      successfulRuns.some((run) => run.result.isMockData)
        ? "This report contains clearly labeled mock data. Replace sample placeholders with live official and primary research before making spending decisions."
        : undefined,
      successfulRuns.length === 0
        ? "No market-data provider returned usable data. The report is an unavailable-data shell."
        : undefined,
    ]);
    const assumptions = [
      "Provider output is treated as provisional research input until its original source is reviewed.",
      "Mock values are invented placeholders and are never official statistics.",
      "Market-research confidence measures evidence coverage, not business success.",
    ];
    const nextActions = buildNextActions(input, missingData, sourcesUsed);
    const report = MarketResearchReportSchema.parse({
      industryOverview: payload.industryOverview ||
        "Market overview unavailable. Add a configured provider or founder-entered research.",
      naicsCode: selectNaicsCode(input),
      geography: {
        city: input.idea.city,
        county: input.idea.county,
        stateCode: input.idea.state,
        zipCode: input.idea.zipCode,
      },
      populationIndicators: payload.populationIndicators,
      incomeIndicators: payload.incomeIndicators,
      employmentIndicators: payload.employmentIndicators,
      customerDemographics: payload.customerDemographics,
      businessDensity: payload.businessDensity ||
        "Business-density data unavailable.",
      similarBusinessCount: payload.similarBusinessCount,
      marketTrends: payload.marketTrends,
      demandSignals: payload.demandSignals,
      pricingSignals: payload.pricingSignals,
      supplyDistributionNotes: payload.supplyDistributionNotes,
      economicCycleSensitivity: payload.economicCycleSensitivity ||
        "Economic-cycle sensitivity has not been researched.",
      seasonality: payload.seasonality ||
        "Seasonality has not been researched.",
      technologyDisruption: payload.technologyDisruption ||
        "Technology disruption has not been researched.",
      regulatorySensitivity: payload.regulatorySensitivity ||
        "Regulatory sensitivity has not been researched.",
      marketSizeEstimate: payload.marketSizeEstimate ||
        "Market-size estimate unavailable.",
      marketSaturationEstimate: payload.marketSaturationEstimate ||
        "Market-saturation estimate unavailable.",
      confidenceLevel,
      sourcesUsed,
      missingData,
      providerRuns: executions.map((execution) => execution.summary),
      containsMockData: successfulRuns.some((run) => run.result.isMockData),
    });

    return engineResultSchema(MarketResearchReportSchema).parse({
      data: report,
      confidence: confidenceLevel.score,
      assumptions,
      missingInformation: missingData,
      warnings,
      sources: sourcesUsed,
      nextActions,
    });
  },
};

function defaultProviders(
  input: MarketResearchEngineInput,
): DataProvider[] {
  const providers: DataProvider[] = [];
  if (CensusProvider.isEnabled()) {
    providers.push(new CensusProvider());
  }
  if (BLSProvider.isEnabled()) {
    providers.push(new BLSProvider());
  }
  providers.push(new MockMarketDataProvider());
  if (input.manualResearchEntries.length > 0) {
    providers.push(new ManualResearchProvider());
  }
  return providers;
}

async function executeProvider(
  provider: DataProvider,
  input: ProviderInput,
): Promise<ProviderExecution> {
  try {
    const result = await provider.fetch(input);
    if (result.status === "unavailable" || result.data === null) {
      logWarning("provider_unavailable", {
        providerId: provider.id,
        providerName: provider.name,
        sourceType: provider.sourceType,
      });
      return {
        summary: summarizeProviderRun(provider, result, "unavailable"),
        result,
      };
    }
    const parsedPayload = MarketDataPayloadSchema.safeParse(result.data);
    if (!parsedPayload.success) {
      logWarning("provider_contract_error", {
        providerId: provider.id,
        providerName: provider.name,
        sourceType: provider.sourceType,
      });
      return {
        summary: {
          ...summarizeProviderRun(provider, result, "error"),
          warnings: [
            ...result.warnings,
            `${provider.name} returned data that does not match the market-data payload contract.`,
          ],
        },
        result,
      };
    }
    return {
      summary: summarizeProviderRun(provider, result, "available"),
      result,
      payload: parsedPayload.data,
    };
  } catch (error) {
    logError("provider_failure", error, {
      providerId: provider.id,
      providerName: provider.name,
      sourceType: provider.sourceType,
    });
    return {
      summary: {
        providerId: provider.id,
        providerName: provider.name,
        status: "error",
        confidence: 0,
        isMockData: provider.sourceType === "mock",
        warnings: [
          `${provider.name} failed without stopping the report: ${errorMessage(error)}`,
        ],
      },
    };
  }
}

function summarizeProviderRun(
  provider: DataProvider,
  result: ProviderResult<unknown>,
  status: ProviderRunSummary["status"],
): ProviderRunSummary {
  return {
    providerId: provider.id,
    providerName: provider.name,
    status,
    confidence: clamp(result.confidence),
    isMockData: result.isMockData,
    warnings: result.warnings,
  };
}

function aggregatePayloads(runs: SuccessfulProviderRun[]): MarketDataPayload {
  if (runs.length === 0) {
    return emptyPayload();
  }
  return MarketDataPayloadSchema.parse({
    industryOverview: joinText(
      runs.map((run) => run.payload.industryOverview),
    ),
    populationIndicators: uniqueIndicators(
      runs.flatMap((run) => run.payload.populationIndicators),
    ),
    incomeIndicators: uniqueIndicators(
      runs.flatMap((run) => run.payload.incomeIndicators),
    ),
    employmentIndicators: uniqueIndicators(
      runs.flatMap((run) => run.payload.employmentIndicators),
    ),
    customerDemographics: unique(
      runs.flatMap((run) => run.payload.customerDemographics),
    ),
    businessDensity: joinText(
      runs.map((run) => run.payload.businessDensity),
    ),
    similarBusinessCount:
      runs.find((run) => run.payload.similarBusinessCount !== null)?.payload
        .similarBusinessCount ?? null,
    marketTrends: unique(runs.flatMap((run) => run.payload.marketTrends)),
    demandSignals: unique(runs.flatMap((run) => run.payload.demandSignals)),
    pricingSignals: unique(runs.flatMap((run) => run.payload.pricingSignals)),
    supplyDistributionNotes: unique(
      runs.flatMap((run) => run.payload.supplyDistributionNotes),
    ),
    economicCycleSensitivity: joinText(
      runs.map((run) => run.payload.economicCycleSensitivity),
    ),
    seasonality: joinText(runs.map((run) => run.payload.seasonality)),
    technologyDisruption: joinText(
      runs.map((run) => run.payload.technologyDisruption),
    ),
    regulatorySensitivity: joinText(
      runs.map((run) => run.payload.regulatorySensitivity),
    ),
    marketSizeEstimate: joinText(
      runs.map((run) => run.payload.marketSizeEstimate),
    ),
    marketSaturationEstimate: joinText(
      runs.map((run) => run.payload.marketSaturationEstimate),
    ),
    confidenceEvidence: averageEvidence(
      runs.map((run) => run.payload.confidenceEvidence),
    ),
    missingData: unique(runs.flatMap((run) => run.payload.missingData)),
  });
}

function emptyPayload(): MarketDataPayload {
  return MarketDataPayloadSchema.parse({
    confidenceEvidence: zeroEvidence(),
    missingData: [
      "Population indicators are missing.",
      "Income indicators are missing.",
      "Employment indicators are missing.",
      "Customer-demographic research is missing.",
      "Business-density data is missing.",
      "Demand signals are missing.",
      "Pricing signals are missing.",
      "Market-size evidence is missing.",
      "Market-saturation evidence is missing.",
    ],
  });
}

function averageEvidence(
  evidenceItems: MarketResearchConfidenceEvidence[],
): MarketResearchConfidenceEvidence {
  if (evidenceItems.length === 0) {
    return zeroEvidence();
  }
  const keys = Object.keys(zeroEvidence()) as (keyof MarketResearchConfidenceEvidence)[];
  return keys.reduce<MarketResearchConfidenceEvidence>(
    (result, key) => ({
      ...result,
      [key]: Math.round(
        evidenceItems.reduce((total, evidence) => total + evidence[key], 0) /
          evidenceItems.length,
      ),
    }),
    zeroEvidence(),
  );
}

function adjustIndependentSourceScore(
  evidence: MarketResearchConfidenceEvidence,
  sources: SourceReference[],
): MarketResearchConfidenceEvidence {
  return {
    ...evidence,
    independentSources: Math.max(
      evidence.independentSources,
      Math.min(100, sources.length * 15),
    ),
  };
}

function zeroEvidence(): MarketResearchConfidenceEvidence {
  return {
    sourceQuality: 0,
    recency: 0,
    geographicSpecificity: 0,
    industrySpecificity: 0,
    sampleSize: 0,
    primaryResearchAvailability: 0,
    secondaryDataAvailability: 0,
    independentSources: 0,
    consistencyAcrossSources: 0,
  };
}

function toProviderInput(input: MarketResearchEngineInput): ProviderInput {
  return {
    projectId: input.projectId,
    geography: {
      city: input.idea.city,
      county: input.idea.county,
      stateCode: input.idea.state,
      zipCode: input.idea.zipCode,
    },
    naicsCode: selectNaicsCode(input),
    industry: input.idea.industry,
    targetCustomer: input.idea.targetCustomer,
    query: input.idea.businessIdea,
    manualResearchEntries: input.manualResearchEntries,
  };
}

function selectNaicsCode(input: MarketResearchEngineInput): string {
  return input.idea.naicsGuess ||
    input.businessConcept.suggestedNaicsCodes[0]?.code ||
    "NAICS classification not yet verified";
}

function buildNextActions(
  input: MarketResearchEngineInput,
  missingData: string[],
  sources: SourceReference[],
): string[] {
  return unique([
    "Replace mock placeholders with official API results before relying on the report.",
    sources.length === 0
      ? "Add at least one configured provider or founder-entered research source."
      : undefined,
    missingData.length > 0
      ? "Work through the missing-data list and record sources for each research claim."
      : undefined,
    "Verify the selected NAICS classification with the official Census NAICS reference.",
    input.manualResearchEntries.length === 0
      ? "Add customer interviews, observations, or other founder-led research notes."
      : undefined,
  ]);
}

function uniqueIndicators(indicators: ResearchIndicator[]): ResearchIndicator[] {
  const seen = new Set<string>();
  return indicators.filter((indicator) => {
    const key = `${indicator.label}:${indicator.value}:${indicator.dataLabel}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function uniqueSources(sources: SourceReference[]): SourceReference[] {
  const seen = new Set<string>();
  return sources.filter((source) => {
    if (seen.has(source.id)) return false;
    seen.add(source.id);
    return true;
  });
}

function joinText(values: string[]): string {
  return unique(values.filter(Boolean)).join(" ");
}

function unique(values: (string | undefined)[]): string[] {
  return [...new Set(values.filter((value): value is string => value !== undefined))];
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown provider error";
}

function clamp(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}
