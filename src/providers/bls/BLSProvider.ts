import { z } from "zod";

import {
  MarketDataPayloadSchema,
  type MarketDataPayload,
} from "@/engine/market-research/schema";
import type { SourceReference } from "@/engine/shared/source-reference";
import type {
  DataProvider,
  ProviderInput,
  ProviderResult,
} from "@/providers/provider";

const BLS_API_URL = "https://api.bls.gov/publicAPI/v2/timeseries/data/";
const DEFAULT_YEAR_WINDOW = 3;
const NATIONAL_AVERAGE_HOURLY_EARNINGS_SERIES = "CES0500000003";

const BLSMetricSchema = z.object({
  label: z.string(),
  value: z.number().nullable(),
  unit: z.string().optional(),
  seriesId: z.string().optional(),
  period: z.string().optional(),
  periodName: z.string().optional(),
  year: z.string().optional(),
  notes: z.string().optional(),
});

const BLSEmploymentTrendSchema = z.object({
  seriesId: z.string().optional(),
  latestValue: z.number().nullable(),
  previousValue: z.number().nullable(),
  change: z.number().nullable(),
  direction: z.enum(["improving", "softening", "flat", "unknown"]),
  dateRange: z.string().optional(),
  notes: z.string().optional(),
});

export const BLSMarketIndicatorsSchema = z.object({
  geography: z.object({
    name: z.string(),
    summary: z.string(),
    level: z.enum(["state", "metro"]),
    stateCode: z.string(),
    stateFips: z.string(),
    metroCode: z.string().optional(),
  }),
  unemploymentRate: BLSMetricSchema.nullable(),
  employmentTrend: BLSEmploymentTrendSchema,
  wageEstimates: z.array(BLSMetricSchema),
  occupationData: z.object({
    occupationTitle: z.string().optional(),
    socCode: z.string().optional(),
    notes: z.string(),
    wageEstimate: BLSMetricSchema.nullable(),
  }),
  industryLaborNotes: z.array(z.string()),
  sources: z.array(z.custom<SourceReference>()),
  fetchedAt: z.coerce.date(),
  confidence: z.number().min(0).max(100),
  limitations: z.array(z.string()),
});

export type BLSMarketIndicators = z.infer<typeof BLSMarketIndicatorsSchema>;
export type BLSProviderPayload = MarketDataPayload & {
  blsMarketIndicators: BLSMarketIndicators;
};

interface BLSProviderOptions {
  apiKey?: string;
  fetchFn?: typeof fetch;
  endYear?: number;
}

interface ResolvedBLSGeography {
  name: string;
  summary: string;
  level: "state" | "metro";
  stateCode: string;
  stateFips: string;
  metroCode?: string;
}

interface BLSSeriesPoint {
  year: string;
  period: string;
  periodName?: string;
  value: string;
  footnotes?: { code?: string; text?: string }[];
}

interface BLSSeries {
  seriesID: string;
  data?: BLSSeriesPoint[];
}

interface BLSTimeSeriesResponse {
  status?: string;
  message?: string[];
  Results?: {
    series?: BLSSeries[];
  };
}

interface SeriesPlan {
  id: string;
  label: string;
  dataset: string;
  unit: string;
  role:
    | "unemploymentRate"
    | "unemployed"
    | "employed"
    | "laborForce"
    | "averageHourlyEarnings";
}

const STATE_FIPS: Record<string, string> = {
  AL: "01", AK: "02", AZ: "04", AR: "05", CA: "06", CO: "08", CT: "09",
  DE: "10", DC: "11", FL: "12", GA: "13", HI: "15", ID: "16", IL: "17",
  IN: "18", IA: "19", KS: "20", KY: "21", LA: "22", ME: "23", MD: "24",
  MA: "25", MI: "26", MN: "27", MS: "28", MO: "29", MT: "30", NE: "31",
  NV: "32", NH: "33", NJ: "34", NM: "35", NY: "36", NC: "37", ND: "38",
  OH: "39", OK: "40", OR: "41", PA: "42", RI: "44", SC: "45", SD: "46",
  TN: "47", TX: "48", UT: "49", VT: "50", VA: "51", WA: "53", WV: "54",
  WI: "55", WY: "56", PR: "72",
};

const STATE_NAMES: Record<string, string> = {
  AL: "Alabama", AK: "Alaska", AZ: "Arizona", AR: "Arkansas", CA: "California",
  CO: "Colorado", CT: "Connecticut", DE: "Delaware", DC: "District of Columbia",
  FL: "Florida", GA: "Georgia", HI: "Hawaii", ID: "Idaho", IL: "Illinois",
  IN: "Indiana", IA: "Iowa", KS: "Kansas", KY: "Kentucky", LA: "Louisiana",
  ME: "Maine", MD: "Maryland", MA: "Massachusetts", MI: "Michigan",
  MN: "Minnesota", MS: "Mississippi", MO: "Missouri", MT: "Montana",
  NE: "Nebraska", NV: "Nevada", NH: "New Hampshire", NJ: "New Jersey",
  NM: "New Mexico", NY: "New York", NC: "North Carolina", ND: "North Dakota",
  OH: "Ohio", OK: "Oklahoma", OR: "Oregon", PA: "Pennsylvania",
  RI: "Rhode Island", SC: "South Carolina", SD: "South Dakota",
  TN: "Tennessee", TX: "Texas", UT: "Utah", VT: "Vermont", VA: "Virginia",
  WA: "Washington", WV: "West Virginia", WI: "Wisconsin", WY: "Wyoming",
  PR: "Puerto Rico",
};

const METRO_LOOKUP: Record<string, { name: string; code: string; stateCode: string }> = {
  chandler: { code: "043806", name: "Phoenix-Mesa-Chandler, AZ metropolitan area", stateCode: "AZ" },
  mesa: { code: "043806", name: "Phoenix-Mesa-Chandler, AZ metropolitan area", stateCode: "AZ" },
  phoenix: { code: "043806", name: "Phoenix-Mesa-Chandler, AZ metropolitan area", stateCode: "AZ" },
  scottsdale: { code: "043806", name: "Phoenix-Mesa-Chandler, AZ metropolitan area", stateCode: "AZ" },
  tempe: { code: "043806", name: "Phoenix-Mesa-Chandler, AZ metropolitan area", stateCode: "AZ" },
  pittsburgh: { code: "423830", name: "Pittsburgh, PA metropolitan area", stateCode: "PA" },
  losangeles: { code: "063108", name: "Los Angeles-Long Beach-Anaheim, CA metropolitan area", stateCode: "CA" },
  sacramento: { code: "064090", name: "Sacramento-Roseville-Folsom, CA metropolitan area", stateCode: "CA" },
  sandiego: { code: "064174", name: "San Diego-Chula Vista-Carlsbad, CA metropolitan area", stateCode: "CA" },
  sanfrancisco: { code: "064186", name: "San Francisco-Oakland-Berkeley, CA metropolitan area", stateCode: "CA" },
};

export class BLSProvider implements DataProvider<ProviderInput, BLSProviderPayload> {
  readonly id = "bls";
  readonly name = "BLS Public Data API";
  readonly sourceType = "official_api" as const;

  private readonly apiKey: string;
  private readonly fetchFn: typeof fetch;
  private readonly endYear: number;

  constructor(options: BLSProviderOptions = {}) {
    this.apiKey = options.apiKey ?? process.env.BLS_API_KEY ?? "";
    this.fetchFn = options.fetchFn ?? globalThis.fetch.bind(globalThis);
    this.endYear = options.endYear ?? new Date().getFullYear();
  }

  static isEnabled(): boolean {
    return Boolean(process.env.BLS_API_KEY?.trim());
  }

  async fetch(input: ProviderInput): Promise<ProviderResult<BLSProviderPayload>> {
    const fetchedAt = new Date();
    if (!this.apiKey.trim()) {
      return unavailable([
        "BLS_API_KEY is not configured. Add a BLS registration key to enable official labor-market time-series data, or continue with mock/sample research.",
      ], fetchedAt);
    }

    const warnings: string[] = [];
    const resolved = resolveGeography(input, warnings);
    if (!resolved) {
      return unavailable([
        ...warnings,
        "BLS geography could not be resolved. Add a valid two-letter state, or a supported city plus state.",
      ], fetchedAt);
    }

    const occupation = inferOccupation(input);
    const seriesPlan = buildSeriesPlan(resolved);
    let seriesMap: Map<string, BLSSeries> = new Map();

    try {
      seriesMap = await this.fetchSeries(seriesPlan.map((series) => series.id));
    } catch (error) {
      return unavailable([
        ...warnings,
        `BLS API request failed: ${errorMessage(error)}`,
      ], fetchedAt);
    }

    const missingSeries = seriesPlan.filter((series) => !seriesMap.has(series.id));
    for (const series of missingSeries) {
      warnings.push(`BLS series ${series.id} (${series.label}) was not returned. The report uses partial labor-market data.`);
    }

    const sources = buildSources(seriesPlan, seriesMap, resolved);
    const indicators = toIndicators(
      input,
      resolved,
      occupation,
      seriesPlan,
      seriesMap,
      sources,
      fetchedAt,
      warnings,
    );

    if (!indicators.unemploymentRate && indicators.wageEstimates.length === 0) {
      return unavailable([
        ...warnings,
        "BLS returned no usable unemployment or wage series for this request.",
      ], fetchedAt);
    }

    const payload = toMarketPayload(input, indicators);
    return {
      status: "available",
      data: payload,
      sources,
      confidence: indicators.confidence,
      warnings,
      fetchedAt,
      isMockData: false,
    };
  }

  private async fetchSeries(seriesIds: string[]): Promise<Map<string, BLSSeries>> {
    const body: Record<string, unknown> = {
      endyear: String(this.endYear),
      registrationkey: this.apiKey,
      seriesid: seriesIds,
      startyear: String(this.endYear - DEFAULT_YEAR_WINDOW),
    };
    const response = await this.fetchFn(BLS_API_URL, {
      body: JSON.stringify(body),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const json = await response.json() as BLSTimeSeriesResponse;
    if (json.status !== "REQUEST_SUCCEEDED") {
      throw new Error(json.message?.join("; ") || `Unexpected BLS status: ${json.status ?? "missing"}`);
    }
    const series = json.Results?.series ?? [];
    return new Map(series.map((item) => [item.seriesID, item]));
  }
}

function unavailable(
  warnings: string[],
  fetchedAt: Date,
): ProviderResult<BLSProviderPayload> {
  return {
    confidence: 0,
    data: null,
    fetchedAt,
    isMockData: false,
    sources: [],
    status: "unavailable",
    warnings,
  };
}

function resolveGeography(
  input: ProviderInput,
  warnings: string[],
): ResolvedBLSGeography | null {
  const stateCode = input.geography?.stateCode?.trim().toUpperCase();
  const stateFips = stateCode ? STATE_FIPS[stateCode] : undefined;
  if (!stateCode || !stateFips) {
    warnings.push("A valid two-letter state abbreviation is required for BLS local labor-market series.");
    return null;
  }

  const cityKey = normalizePlace(input.geography?.city ?? "");
  const metro = cityKey ? METRO_LOOKUP[cityKey] : undefined;
  if (metro && metro.stateCode === stateCode) {
    return {
      level: "metro",
      metroCode: metro.code,
      name: metro.name,
      stateCode,
      stateFips,
      summary: metro.name,
    };
  }
  if (input.geography?.city && !metro) {
    warnings.push(`BLS metro mapping is not available yet for "${input.geography.city}". Falling back to state-level labor indicators.`);
  }

  return {
    level: "state",
    name: STATE_NAMES[stateCode] ?? stateCode,
    stateCode,
    stateFips,
    summary: `${STATE_NAMES[stateCode] ?? stateCode} statewide`,
  };
}

function buildSeriesPlan(geography: ResolvedBLSGeography): SeriesPlan[] {
  const lausBase = geography.level === "metro"
    ? `LAUMT${geography.metroCode}`
    : `LASST${geography.stateFips}000000000000`;
  return [
    {
      dataset: "Local Area Unemployment Statistics",
      id: `${lausBase}03`,
      label: "Unemployment rate",
      role: "unemploymentRate",
      unit: "%",
    },
    {
      dataset: "Local Area Unemployment Statistics",
      id: `${lausBase}05`,
      label: "Employed people",
      role: "employed",
      unit: "people",
    },
    {
      dataset: "Local Area Unemployment Statistics",
      id: `${lausBase}04`,
      label: "Unemployed people",
      role: "unemployed",
      unit: "people",
    },
    {
      dataset: "Local Area Unemployment Statistics",
      id: `${lausBase}06`,
      label: "Civilian labor force",
      role: "laborForce",
      unit: "people",
    },
    {
      dataset: "Current Employment Statistics",
      id: NATIONAL_AVERAGE_HOURLY_EARNINGS_SERIES,
      label: "National private-sector average hourly earnings",
      role: "averageHourlyEarnings",
      unit: "USD/hour",
    },
  ];
}

function toIndicators(
  input: ProviderInput,
  geography: ResolvedBLSGeography,
  occupation: { title: string; socCode: string; notes: string } | null,
  seriesPlan: SeriesPlan[],
  seriesMap: Map<string, BLSSeries>,
  sources: SourceReference[],
  fetchedAt: Date,
  warnings: string[],
): BLSMarketIndicators {
  const byRole = new Map(seriesPlan.map((series) => [series.role, series]));
  const unemploymentSeries = byRole.get("unemploymentRate");
  const employedSeries = byRole.get("employed");
  const wageSeries = byRole.get("averageHourlyEarnings");
  const unemploymentRate = unemploymentSeries
    ? metricFromSeries(unemploymentSeries, seriesMap.get(unemploymentSeries.id))
    : null;
  const employmentTrend = employedSeries
    ? employmentTrendFromSeries(employedSeries, seriesMap.get(employedSeries.id))
    : unknownTrend();
  const wageEstimates = wageSeries
    ? [metricFromSeries(wageSeries, seriesMap.get(wageSeries.id))]
        .filter((metric): metric is NonNullable<typeof metric> => Boolean(metric))
    : [];
  const laborForceSeries = byRole.get("laborForce");
  const unemployedSeries = byRole.get("unemployed");
  const laborForce = laborForceSeries
    ? metricFromSeries(laborForceSeries, seriesMap.get(laborForceSeries.id))
    : null;
  const unemployed = unemployedSeries
    ? metricFromSeries(unemployedSeries, seriesMap.get(unemployedSeries.id))
    : null;
  const limitations = [
    "BLS time series are official labor-market indicators, not proof that the business will find workers or customers.",
    "Local Area Unemployment Statistics are place-of-residence labor estimates and do not measure industry-specific hiring difficulty.",
    "The current live connector fetches LAUS labor-market series and a national CES wage-pressure series; detailed OEWS occupational wage tables are scaffolded for future integration.",
    "Inflation/CPI indicators are not fetched in this connector version.",
    ...warnings,
  ];
  const industryLaborNotes = [
    unemploymentRate
      ? `${geography.summary} unemployment rate is ${formatNumber(unemploymentRate.value)}% for ${formatPeriod(unemploymentRate)}.`
      : `BLS unemployment-rate data was unavailable for ${geography.summary}.`,
    laborForce
      ? `Reported civilian labor force: ${formatNumber(laborForce.value)} people.`
      : "Civilian labor-force series was not returned.",
    unemployed
      ? `Reported unemployed people: ${formatNumber(unemployed.value)}.`
      : "Unemployed-person count was not returned.",
    wageEstimates[0]
      ? `National private-sector average hourly earnings were ${formatMoney(wageEstimates[0].value)} for ${formatPeriod(wageEstimates[0])}. Treat this as broad wage pressure, not an occupation-specific local wage.`
      : "National wage-pressure series was not returned.",
    occupation
      ? `Likely occupation lens: ${occupation.title} (${occupation.socCode}). ${occupation.notes}`
      : "No occupation-specific wage lens was inferred from the business idea yet.",
    input.naicsCode
      ? `NAICS ${input.naicsCode} may guide future BLS industry-series mapping, but this connector does not yet fetch NAICS-specific wage series.`
      : "A verified NAICS code would improve future BLS industry-series matching.",
  ];

  return BLSMarketIndicatorsSchema.parse({
    confidence: scoreBLSConfidence(geography, unemploymentRate, wageEstimates.length > 0, warnings.length),
    employmentTrend,
    fetchedAt,
    geography,
    industryLaborNotes,
    limitations,
    occupationData: {
      notes: occupation
        ? "Occupation mapping is a deterministic planning hint. Review BLS OEWS tables before using wages in hiring budgets."
        : "Add a job role or staffing plan to connect occupational wage data later.",
      occupationTitle: occupation?.title,
      socCode: occupation?.socCode,
      wageEstimate: null,
    },
    sources,
    unemploymentRate,
    wageEstimates,
  });
}

function toMarketPayload(
  input: ProviderInput,
  indicators: BLSMarketIndicators,
): BLSProviderPayload {
  const employmentIndicators = [
    toResearchIndicator(indicators.unemploymentRate),
    indicators.employmentTrend.latestValue !== null
      ? {
          dataLabel: "official" as const,
          label: "Employment trend",
          notes: indicators.employmentTrend.notes,
          unit: "people",
          value: `${formatNumber(indicators.employmentTrend.latestValue)} (${indicators.employmentTrend.direction}; change ${formatSigned(indicators.employmentTrend.change)})`,
        }
      : null,
  ].filter((indicator): indicator is NonNullable<typeof indicator> => Boolean(indicator));
  const incomeIndicators = indicators.wageEstimates
    .map(toResearchIndicator)
    .filter((indicator): indicator is NonNullable<typeof indicator> => Boolean(indicator));
  const missingData = [
    !indicators.unemploymentRate ? "BLS unemployment-rate series is missing for this geography." : undefined,
    indicators.wageEstimates.length === 0 ? "BLS wage-pressure series is missing." : undefined,
    "Detailed BLS OEWS occupational wage tables are not integrated yet.",
    "BLS CPI/inflation indicators are not integrated yet.",
    "BLS indicators do not estimate customer demand, competitor quality, pricing, licensing, or business feasibility by themselves.",
  ].filter((value): value is string => Boolean(value));
  const payload = MarketDataPayloadSchema.parse({
    businessDensity: "",
    confidenceEvidence: {
      consistencyAcrossSources: indicators.sources.length > 1 ? 70 : 55,
      geographicSpecificity: indicators.geography.level === "metro" ? 75 : 55,
      independentSources: Math.min(100, indicators.sources.length * 25),
      industrySpecificity: indicators.occupationData.socCode ? 35 : 20,
      primaryResearchAvailability: 0,
      recency: 85,
      sampleSize: 70,
      secondaryDataAvailability: 85,
      sourceQuality: 95,
    },
    customerDemographics: [],
    demandSignals: [
      "BLS labor-market indicators help estimate hiring conditions and local economic context, but they do not prove customer demand.",
    ],
    economicCycleSensitivity:
      indicators.unemploymentRate
        ? `Labor-market context from BLS: unemployment rate ${formatNumber(indicators.unemploymentRate.value)}% and employment trend ${indicators.employmentTrend.direction}.`
        : "BLS labor-market context was unavailable.",
    employmentIndicators,
    incomeIndicators,
    industryOverview:
      `Official BLS labor-market indicators are available for ${indicators.geography.summary}. ` +
      `${input.industry || "The selected industry"} still needs customer, competitor, and pricing validation.`,
    marketSaturationEstimate: "",
    marketSizeEstimate: "",
    marketTrends: indicators.industryLaborNotes,
    missingData,
    populationIndicators: [],
    pricingSignals: [
      "BLS wage data can inform labor-cost assumptions, but local competitor pricing and customer willingness to pay must be researched separately.",
    ],
    regulatorySensitivity: "",
    seasonality: "",
    similarBusinessCount: null,
    supplyDistributionNotes: [
      "Use BLS labor availability notes alongside supplier, staffing, and hiring-plan research.",
    ],
    technologyDisruption: "",
  }) as BLSProviderPayload;
  payload.blsMarketIndicators = indicators;
  return payload;
}

function buildSources(
  seriesPlan: SeriesPlan[],
  seriesMap: Map<string, BLSSeries>,
  geography: ResolvedBLSGeography,
): SourceReference[] {
  const returnedLaus = seriesPlan.filter(
    (series) => series.dataset === "Local Area Unemployment Statistics" && seriesMap.has(series.id),
  );
  const returnedCes = seriesPlan.filter(
    (series) => series.dataset === "Current Employment Statistics" && seriesMap.has(series.id),
  );
  const sources: SourceReference[] = [];
  if (returnedLaus.length > 0) {
    sources.push(sourceFor({
      dataset: "Local Area Unemployment Statistics",
      geography,
      id: "laus",
      seriesIds: returnedLaus.map((series) => series.id),
      title: returnedLaus.length === 4
        ? "Official BLS data: Local Area Unemployment Statistics"
        : "Partial BLS data: Local Area Unemployment Statistics",
      url: "https://www.bls.gov/lau/",
    }));
  }
  if (returnedCes.length > 0) {
    sources.push(sourceFor({
      dataset: "Current Employment Statistics",
      geography,
      id: "ces-wages",
      seriesIds: returnedCes.map((series) => series.id),
      title: "Official BLS data: Current Employment Statistics wages",
      url: "https://www.bls.gov/ces/",
    }));
  }
  return sources;
}

function sourceFor(input: {
  dataset: string;
  geography: ResolvedBLSGeography;
  id: string;
  seriesIds: string[];
  title: string;
  url: string;
}): SourceReference {
  return {
    id: `bls-${input.id}-${input.geography.level}`,
    lastVerifiedAt: new Date(),
    notes:
      `${input.dataset}; BLS series ID(s): ${input.seriesIds.join(", ")}; geography ${input.geography.summary}. ` +
      "Fetched through the BLS Public Data API v2. Registration key is never included in source notes.",
    sourceName: "U.S. Bureau of Labor Statistics",
    sourceType: "official",
    title: input.title,
    url: input.url,
  };
}

function metricFromSeries(
  plan: SeriesPlan,
  series: BLSSeries | undefined,
) {
  const latest = latestPoint(series);
  if (!latest) return null;
  return {
    label: plan.label,
    notes: `Official BLS ${plan.dataset} series ${plan.id}.`,
    period: latest.period,
    periodName: latest.periodName,
    seriesId: plan.id,
    unit: plan.unit,
    value: numberOrNull(latest.value),
    year: latest.year,
  };
}

function employmentTrendFromSeries(
  plan: SeriesPlan,
  series: BLSSeries | undefined,
): z.infer<typeof BLSEmploymentTrendSchema> {
  const points = sortedPoints(series);
  const latest = points[0];
  const previous = points[1];
  if (!latest) return unknownTrend(plan.id);
  const latestValue = numberOrNull(latest.value);
  const previousValue = numberOrNull(previous?.value);
  const change = latestValue !== null && previousValue !== null
    ? latestValue - previousValue
    : null;
  return {
    change,
    dateRange: previous ? `${formatPeriodPoint(previous)} to ${formatPeriodPoint(latest)}` : formatPeriodPoint(latest),
    direction: trendDirection(change),
    latestValue,
    notes: `Official BLS ${plan.dataset} series ${plan.id}. Positive change means more people reported employed in the geography.`,
    previousValue,
    seriesId: plan.id,
  };
}

function unknownTrend(seriesId?: string): z.infer<typeof BLSEmploymentTrendSchema> {
  return {
    change: null,
    direction: "unknown",
    latestValue: null,
    notes: "BLS employment trend could not be calculated because the series was unavailable or had too few usable points.",
    previousValue: null,
    seriesId,
  };
}

function latestPoint(series: BLSSeries | undefined): BLSSeriesPoint | null {
  return sortedPoints(series)[0] ?? null;
}

function sortedPoints(series: BLSSeries | undefined): BLSSeriesPoint[] {
  return (series?.data ?? [])
    .filter((point) => point.period !== "M13")
    .sort((left, right) => pointSortValue(right) - pointSortValue(left));
}

function pointSortValue(point: BLSSeriesPoint): number {
  const periodNumber = Number(point.period.replace(/\D/g, ""));
  return Number(point.year) * 100 + (Number.isFinite(periodNumber) ? periodNumber : 0);
}

function trendDirection(change: number | null): "improving" | "softening" | "flat" | "unknown" {
  if (change === null) return "unknown";
  if (Math.abs(change) < 0.5) return "flat";
  return change > 0 ? "improving" : "softening";
}

function toResearchIndicator(metric: BLSMarketIndicators["unemploymentRate"]) {
  if (!metric || metric.value === null) return null;
  const unit = metric.unit ?? "";
  return {
    dataLabel: "official" as const,
    label: metric.label,
    notes: metric.notes ?? "Official BLS time-series data.",
    unit,
    value: unit.includes("USD")
      ? formatMoney(metric.value)
      : unit === "%"
        ? `${formatNumber(metric.value)}%`
        : formatNumber(metric.value),
  };
}

function inferOccupation(
  input: ProviderInput,
): { title: string; socCode: string; notes: string } | null {
  const text = `${input.industry ?? ""} ${input.query ?? ""} ${input.targetCustomer ?? ""} ${input.naicsCode ?? ""}`.toLowerCase();
  if (/child\s?care|daycare|preschool/.test(text)) {
    return {
      notes: "Useful for staffing and payroll assumptions in childcare concepts.",
      socCode: "39-9011",
      title: "Childcare Workers",
    };
  }
  if (/food\s?truck|restaurant|cafe|coffee|bakery|food service/.test(text)) {
    return {
      notes: "Useful for kitchen, prep, and service labor assumptions.",
      socCode: "35-2019",
      title: "Cooks, All Other",
    };
  }
  if (/record|retail|store|shop|ecommerce|e-commerce/.test(text)) {
    return {
      notes: "Useful for retail staffing and customer-service wage planning.",
      socCode: "41-2031",
      title: "Retail Salespersons",
    };
  }
  if (/detailing|automotive|auto|vehicle|car wash/.test(text)) {
    return {
      notes: "Useful for vehicle-service labor assumptions.",
      socCode: "49-3021",
      title: "Automotive Body and Related Repairers",
    };
  }
  if (/manufactur|machin|fabricat|production/.test(text)) {
    return {
      notes: "Useful for production-worker wage and hiring assumptions.",
      socCode: "51-0000",
      title: "Production Occupations",
    };
  }
  if (/consult|bookkeep|accounting|advisor|professional service/.test(text)) {
    return {
      notes: "Useful for professional-service labor assumptions.",
      socCode: "13-1111",
      title: "Management Analysts",
    };
  }
  return null;
}

function scoreBLSConfidence(
  geography: ResolvedBLSGeography,
  unemploymentRate: BLSMarketIndicators["unemploymentRate"],
  hasWageData: boolean,
  warningCount: number,
): number {
  return Math.max(
    30,
    Math.min(
      88,
      58 +
        (geography.level === "metro" ? 14 : 8) +
        (unemploymentRate ? 12 : 0) +
        (hasWageData ? 8 : 0) -
        warningCount * 6,
    ),
  );
}

function numberOrNull(raw: string | undefined): number | null {
  if (raw === undefined || raw === null || raw === "") return null;
  const value = Number(String(raw).replace(/,/g, ""));
  if (!Number.isFinite(value)) return null;
  return value;
}

function formatNumber(value: number | null | undefined): string {
  return value === null || value === undefined
    ? "unavailable"
    : new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 }).format(value);
}

function formatMoney(value: number | null | undefined): string {
  return value === null || value === undefined
    ? "unavailable"
    : `$${new Intl.NumberFormat("en-US", {
        maximumFractionDigits: 2,
        minimumFractionDigits: 2,
      }).format(value)}`;
}

function formatSigned(value: number | null | undefined): string {
  if (value === null || value === undefined) return "unavailable";
  const formatted = formatNumber(Math.abs(value));
  return value >= 0 ? `+${formatted}` : `-${formatted}`;
}

function formatPeriod(metric: { periodName?: string; period?: string; year?: string }): string {
  return `${metric.periodName || metric.period || "latest period"} ${metric.year ?? ""}`.trim();
}

function formatPeriodPoint(point: BLSSeriesPoint): string {
  return `${point.periodName || point.period} ${point.year}`.trim();
}

function normalizePlace(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown BLS API error";
}
