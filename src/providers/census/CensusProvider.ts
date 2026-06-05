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

const DEFAULT_ACS_YEAR = "2023";
const DEFAULT_ECON_YEAR = "2022";
const CENSUS_BASE_URL = "https://api.census.gov/data";

const CensusMetricSchema = z.object({
  label: z.string(),
  value: z.number().nullable(),
  unit: z.string().optional(),
  percent: z.number().nullable().optional(),
  notes: z.string().optional(),
});

export const CensusMarketIndicatorsSchema = z.object({
  geography: z.object({
    name: z.string(),
    summary: z.string(),
    level: z.enum(["state", "county", "place", "zcta"]),
    stateCode: z.string().optional(),
    stateFips: z.string().optional(),
    countyFips: z.string().optional(),
    placeFips: z.string().optional(),
    zcta: z.string().optional(),
  }),
  population: CensusMetricSchema.nullable(),
  medianHouseholdIncome: CensusMetricSchema.nullable(),
  households: CensusMetricSchema.nullable(),
  ageBands: z.array(CensusMetricSchema),
  education: z.object({
    highSchoolGraduateOrHigherPercent: z.number().nullable(),
    bachelorsOrHigherPercent: z.number().nullable(),
    notes: z.string().optional(),
  }),
  employment: z.object({
    laborForce: z.number().nullable(),
    employed: z.number().nullable(),
    unemployed: z.number().nullable(),
    unemploymentRatePercent: z.number().nullable(),
  }),
  businessCounts: z.object({
    naicsCode: z.string().optional(),
    naicsLabel: z.string().optional(),
    paidEmployerEstablishments: z.number().nullable(),
    paidEmployees: z.number().nullable(),
    annualPayrollThousands: z.number().nullable(),
    geographyName: z.string().optional(),
    year: z.string(),
  }).nullable(),
  nonemployerIndicators: z.object({
    naicsCode: z.string().optional(),
    naicsLabel: z.string().optional(),
    nonemployerEstablishments: z.number().nullable(),
    receiptsThousands: z.number().nullable(),
    geographyName: z.string().optional(),
    year: z.string(),
  }).nullable(),
  sources: z.array(z.custom<SourceReference>()),
  fetchedAt: z.coerce.date(),
  confidence: z.number().min(0).max(100),
  limitations: z.array(z.string()),
});

export type CensusMarketIndicators = z.infer<typeof CensusMarketIndicatorsSchema>;
export type CensusProviderPayload = MarketDataPayload & {
  censusMarketIndicators: CensusMarketIndicators;
};

interface CensusProviderOptions {
  apiKey?: string;
  acsYear?: string;
  economicYear?: string;
  fetchFn?: typeof fetch;
}

interface ResolvedGeography {
  name: string;
  summary: string;
  level: "state" | "county" | "place" | "zcta";
  stateCode?: string;
  stateFips?: string;
  countyFips?: string;
  placeFips?: string;
  zcta?: string;
}

interface CensusApiResponse {
  headers: string[];
  row: Record<string, string>;
  url: string;
}

const ACS_VARIABLES = [
  "NAME",
  "DP05_0001E",
  "DP02_0001E",
  "DP03_0062E",
  "DP05_0005E",
  "DP05_0006E",
  "DP05_0007E",
  "DP05_0008E",
  "DP05_0009E",
  "DP05_0010E",
  "DP05_0011E",
  "DP05_0012E",
  "DP05_0013E",
  "DP05_0014E",
  "DP05_0015E",
  "DP05_0016E",
  "DP05_0017E",
  "DP02_0067PE",
  "DP02_0068PE",
  "DP03_0002E",
  "DP03_0004E",
  "DP03_0005E",
  "DP03_0005PE",
] as const;

const AGE_BANDS = [
  ["Under 5 years", "DP05_0005E"],
  ["5 to 9 years", "DP05_0006E"],
  ["10 to 14 years", "DP05_0007E"],
  ["15 to 19 years", "DP05_0008E"],
  ["20 to 24 years", "DP05_0009E"],
  ["25 to 34 years", "DP05_0010E"],
  ["35 to 44 years", "DP05_0011E"],
  ["45 to 54 years", "DP05_0012E"],
  ["55 to 59 years", "DP05_0013E"],
  ["60 to 64 years", "DP05_0014E"],
  ["65 to 74 years", "DP05_0015E"],
  ["75 to 84 years", "DP05_0016E"],
  ["85 years and over", "DP05_0017E"],
] as const;

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

export class CensusProvider
  implements DataProvider<ProviderInput, CensusProviderPayload>
{
  readonly id = "census";
  readonly name = "Census Data API";
  readonly sourceType = "official_api" as const;

  private readonly apiKey: string;
  private readonly acsYear: string;
  private readonly economicYear: string;
  private readonly fetchFn: typeof fetch;

  constructor(options: CensusProviderOptions = {}) {
    this.apiKey = options.apiKey ?? process.env.CENSUS_API_KEY ?? "";
    this.acsYear = options.acsYear ?? DEFAULT_ACS_YEAR;
    this.economicYear = options.economicYear ?? DEFAULT_ECON_YEAR;
    this.fetchFn = options.fetchFn ?? globalThis.fetch.bind(globalThis);
  }

  static isEnabled(): boolean {
    return Boolean(process.env.CENSUS_API_KEY?.trim());
  }

  async fetch(input: ProviderInput): Promise<ProviderResult<CensusProviderPayload>> {
    const fetchedAt = new Date();
    if (!this.apiKey.trim()) {
      return unavailable([
        "CENSUS_API_KEY is not configured. Use the mock provider for development, or add a Census API key to enable official data.",
      ], fetchedAt);
    }

    const warnings: string[] = [];
    const resolved = await this.resolveGeography(input, warnings);
    if (!resolved) {
      return unavailable([
        ...warnings,
        "Census geography could not be resolved. Add a valid state plus county/city, or a 5-digit ZIP/ZCTA.",
      ], fetchedAt);
    }

    const sources: SourceReference[] = [];
    let acs: CensusApiResponse | null = null;
    let businessCounts: CensusMarketIndicators["businessCounts"] = null;
    let nonemployerIndicators: CensusMarketIndicators["nonemployerIndicators"] = null;

    try {
      acs = await this.fetchAcsProfile(resolved);
      sources.push(sourceFor("acs-profile", "ACS 5-year profile", this.acsYear, acs.url, resolved));
    } catch (error) {
      warnings.push(`Census ACS profile endpoint returned no usable data: ${errorMessage(error)}`);
    }

    try {
      businessCounts = await this.fetchBusinessPatterns(resolved, input.naicsCode);
      if (businessCounts) {
        sources.push(sourceFor(
          "cbp",
          "County Business Patterns",
          this.economicYear,
          `Endpoint: ${CENSUS_BASE_URL}/${this.economicYear}/cbp. Returned geography: ${businessCounts.geographyName ?? "unavailable"}.`,
          resolved,
        ));
      }
    } catch (error) {
      warnings.push(`Census County Business Patterns data is unavailable for this request: ${errorMessage(error)}`);
    }

    try {
      nonemployerIndicators = await this.fetchNonemployer(resolved, input.naicsCode);
      if (nonemployerIndicators) {
        sources.push(sourceFor(
          "nonemp",
          "Nonemployer Statistics",
          this.economicYear,
          `Endpoint: ${CENSUS_BASE_URL}/${this.economicYear}/nonemp. Returned geography: ${nonemployerIndicators.geographyName ?? "unavailable"}.`,
          resolved,
        ));
      }
    } catch (error) {
      warnings.push(`Census Nonemployer Statistics data is unavailable for this request: ${errorMessage(error)}`);
    }

    if (!acs) {
      return unavailable([
        ...warnings,
        "No ACS demographic indicators were returned. Try a county/state or 5-digit ZIP/ZCTA.",
      ], fetchedAt);
    }

    const indicators = this.toIndicators(resolved, acs, businessCounts, nonemployerIndicators, sources, fetchedAt, warnings);
    const payload = this.toMarketPayload(input, indicators);
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

  private async resolveGeography(
    input: ProviderInput,
    warnings: string[],
  ): Promise<ResolvedGeography | null> {
    const geography = input.geography ?? {};
    const stateCode = geography.stateCode?.trim().toUpperCase();
    const stateFips = stateCode ? STATE_FIPS[stateCode] : undefined;
    const zipCode = geography.zipCode?.trim();

    if (zipCode && /^\d{5}$/.test(zipCode)) {
      return {
        level: "zcta",
        name: `ZCTA ${zipCode}`,
        summary: `ZIP/ZCTA ${zipCode}`,
        stateCode,
        stateFips,
        zcta: zipCode,
      };
    }
    if (zipCode) {
      warnings.push("ZIP/ZCTA must be a 5-digit code for Census ACS ZCTA queries.");
    }
    if (!stateCode || !stateFips) {
      warnings.push("A valid two-letter state abbreviation is required unless a 5-digit ZIP/ZCTA is provided.");
      return null;
    }

    const county = geography.county?.trim();
    if (county) {
      const countyMatch = await this.resolveCounty(stateCode, stateFips, county);
      if (countyMatch) return countyMatch;
      warnings.push(`Could not match "${county}" to a Census county in ${stateCode}.`);
    }

    const city = geography.city?.trim();
    if (city) {
      const placeMatch = await this.resolvePlace(stateCode, stateFips, city);
      if (placeMatch) return placeMatch;
      warnings.push(`Could not match "${city}" to a Census place in ${stateCode}. Falling back to state-level data.`);
    }

    return {
      level: "state",
      name: STATE_NAMES[stateCode] ?? stateCode,
      summary: `${STATE_NAMES[stateCode] ?? stateCode} statewide`,
      stateCode,
      stateFips,
    };
  }

  private async resolveCounty(
    stateCode: string,
    stateFips: string,
    county: string,
  ): Promise<ResolvedGeography | null> {
    const response = await this.fetchRows(
      `${CENSUS_BASE_URL}/${this.acsYear}/acs/acs5/profile`,
      {
        get: "NAME",
        for: "county:*",
        in: `state:${stateFips}`,
      },
    );
    const wanted = normalizeName(county);
    const match = response
      .map((row) => ({ name: row.NAME, countyFips: row.county }))
      .find((row) => normalizeName(row.name).includes(wanted));
    return match
      ? {
          countyFips: match.countyFips,
          level: "county",
          name: match.name,
          stateCode,
          stateFips,
          summary: match.name,
        }
      : null;
  }

  private async resolvePlace(
    stateCode: string,
    stateFips: string,
    city: string,
  ): Promise<ResolvedGeography | null> {
    const response = await this.fetchRows(
      `${CENSUS_BASE_URL}/${this.acsYear}/acs/acs5/profile`,
      {
        get: "NAME",
        for: "place:*",
        in: `state:${stateFips}`,
      },
    );
    const wanted = normalizeName(city);
    const match = response
      .map((row) => ({ name: row.NAME, placeFips: row.place }))
      .find((row) => normalizeName(row.name).includes(wanted));
    return match
      ? {
          level: "place",
          name: match.name,
          placeFips: match.placeFips,
          stateCode,
          stateFips,
          summary: match.name,
        }
      : null;
  }

  private async fetchAcsProfile(geography: ResolvedGeography): Promise<CensusApiResponse> {
    const params = {
      get: ACS_VARIABLES.join(","),
      ...geographyParams(geography),
    };
    const url = `${CENSUS_BASE_URL}/${this.acsYear}/acs/acs5/profile`;
    const rows = await this.fetchRows(url, params);
    if (!rows[0]) throw new Error("No ACS rows returned.");
    return {
      headers: Object.keys(rows[0]),
      row: rows[0],
      url: sourceUrl(url, params),
    };
  }

  private async fetchBusinessPatterns(
    geography: ResolvedGeography,
    naicsCode?: string,
  ): Promise<CensusMarketIndicators["businessCounts"]> {
    if (!geography.stateFips) return null;
    const naics = normalizeNaicsForEconomicApi(naicsCode, "2017");
    const params = {
      get: "NAME,NAICS2017_LABEL,ESTAB,EMP,PAYANN",
      ...businessGeographyParams(geography),
      NAICS2017: naics,
      LFO: "001",
      EMPSZES: "001",
    };
    const url = `${CENSUS_BASE_URL}/${this.economicYear}/cbp`;
    const row = (await this.fetchRows(url, params))[0];
    if (!row) return null;
    return {
      annualPayrollThousands: numberOrNull(row.PAYANN),
      geographyName: row.NAME,
      naicsCode: naics,
      naicsLabel: row.NAICS2017_LABEL,
      paidEmployerEstablishments: numberOrNull(row.ESTAB),
      paidEmployees: numberOrNull(row.EMP),
      year: this.economicYear,
    };
  }

  private async fetchNonemployer(
    geography: ResolvedGeography,
    naicsCode?: string,
  ): Promise<CensusMarketIndicators["nonemployerIndicators"]> {
    if (!geography.stateFips) return null;
    const naics = normalizeNaicsForEconomicApi(naicsCode, "2022");
    const params = {
      get: "NAME,NAICS2022_LABEL,NESTAB,NRCPTOT",
      ...businessGeographyParams(geography),
      NAICS2022: naics,
      LFO: "001",
      RCPSZES: "001",
    };
    const url = `${CENSUS_BASE_URL}/${this.economicYear}/nonemp`;
    const row = (await this.fetchRows(url, params))[0];
    if (!row) return null;
    return {
      geographyName: row.NAME,
      naicsCode: naics,
      naicsLabel: row.NAICS2022_LABEL,
      nonemployerEstablishments: numberOrNull(row.NESTAB),
      receiptsThousands: numberOrNull(row.NRCPTOT),
      year: this.economicYear,
    };
  }

  private toIndicators(
    geography: ResolvedGeography,
    acs: CensusApiResponse,
    businessCounts: CensusMarketIndicators["businessCounts"],
    nonemployerIndicators: CensusMarketIndicators["nonemployerIndicators"],
    sources: SourceReference[],
    fetchedAt: Date,
    warnings: string[],
  ): CensusMarketIndicators {
    const row = acs.row;
    const limitations = [
      "ACS estimates describe residents and households, not guaranteed customers.",
      "ZCTA data approximates ZIP-code geography and may not match USPS delivery ZIP boundaries.",
      "Census business counts are establishment-level statistics and do not identify individual competitors.",
      ...warnings,
    ];
    const confidence = scoreCensusConfidence(geography, Boolean(businessCounts), Boolean(nonemployerIndicators), warnings.length);
    return CensusMarketIndicatorsSchema.parse({
      ageBands: AGE_BANDS.map(([label, variable]) => metric(label, row[variable], "people")),
      businessCounts,
      confidence,
      education: {
        bachelorsOrHigherPercent: numberOrNull(row.DP02_0068PE),
        highSchoolGraduateOrHigherPercent: numberOrNull(row.DP02_0067PE),
        notes: "ACS educational-attainment percentages are for the population covered by the selected ACS profile variable definitions.",
      },
      employment: {
        employed: numberOrNull(row.DP03_0004E),
        laborForce: numberOrNull(row.DP03_0002E),
        unemployed: numberOrNull(row.DP03_0005E),
        unemploymentRatePercent: numberOrNull(row.DP03_0005PE),
      },
      fetchedAt,
      geography,
      households: metric("Households", row.DP02_0001E, "households"),
      limitations,
      medianHouseholdIncome: metric("Median household income", row.DP03_0062E, "USD"),
      nonemployerIndicators,
      population: metric("Population", row.DP05_0001E, "people"),
      sources,
    });
  }

  private toMarketPayload(
    input: ProviderInput,
    indicators: CensusMarketIndicators,
  ): CensusProviderPayload {
    const populationIndicators = [
      toResearchIndicator(indicators.population),
      toResearchIndicator(indicators.households),
    ].filter((indicator): indicator is NonNullable<typeof indicator> => Boolean(indicator));
    const incomeIndicators = [
      toResearchIndicator(indicators.medianHouseholdIncome),
    ].filter((indicator): indicator is NonNullable<typeof indicator> => Boolean(indicator));
    const employmentIndicators = [
      indicator("Labor force", indicators.employment.laborForce, "people"),
      indicator("Employed civilian labor force", indicators.employment.employed, "people"),
      indicator("Unemployed civilian labor force", indicators.employment.unemployed, "people"),
      indicator("Unemployment rate", indicators.employment.unemploymentRatePercent, "%"),
    ].filter((item): item is NonNullable<typeof item> => Boolean(item));
    const missingData = [
      !indicators.population?.value ? "Census population value is missing for this geography." : undefined,
      !indicators.medianHouseholdIncome?.value ? "Median household income is missing for this geography." : undefined,
      !indicators.households?.value ? "Household count is missing for this geography." : undefined,
      !indicators.businessCounts ? "County Business Patterns data was not available for this geography/NAICS combination." : undefined,
      !indicators.nonemployerIndicators ? "Nonemployer Statistics data was not available for this geography/NAICS combination." : undefined,
      "Census APIs do not provide customer intent, competitor quality, pricing, or willingness-to-pay evidence.",
    ].filter((value): value is string => Boolean(value));
    const similarBusinessCount =
      indicators.businessCounts?.paidEmployerEstablishments ??
      indicators.nonemployerIndicators?.nonemployerEstablishments ??
      null;
    const payload = MarketDataPayloadSchema.parse({
      businessDensity: businessDensityNarrative(indicators),
      confidenceEvidence: {
        consistencyAcrossSources: indicators.sources.length > 1 ? 70 : 55,
        geographicSpecificity: geographySpecificity(indicators.geography),
        independentSources: Math.min(100, indicators.sources.length * 25),
        industrySpecificity: indicators.businessCounts || indicators.nonemployerIndicators ? 70 : 25,
        primaryResearchAvailability: 0,
        recency: 80,
        sampleSize: 80,
        secondaryDataAvailability: 85,
        sourceQuality: 95,
      },
      customerDemographics: [
        `Official Census profile geography: ${indicators.geography.summary}.`,
        educationNarrative(indicators),
        ageNarrative(indicators),
      ],
      demandSignals: [
        `Census population and household counts provide a starting point for sizing the local market in ${indicators.geography.summary}.`,
        "Use interviews, observations, and small tests to confirm that the target customer actually wants the offer.",
      ],
      economicCycleSensitivity: economicNarrative(indicators),
      employmentIndicators,
      incomeIndicators,
      industryOverview:
        `Official Census indicators are available for ${indicators.geography.summary}. ` +
        `${input.industry || "The selected industry"} should still be validated with customer interviews, competitor review, and local pricing evidence.`,
      marketSaturationEstimate: saturationNarrative(indicators),
      marketSizeEstimate: marketSizeNarrative(indicators),
      marketTrends: [
        "Census data is a public, official secondary source. Compare it with more recent local observations before spending significant money.",
      ],
      missingData,
      populationIndicators,
      pricingSignals: [
        "Census APIs do not provide local price points. Collect competitor prices and customer willingness-to-pay evidence separately.",
      ],
      regulatorySensitivity:
        "Census data does not determine licensing, zoning, tax, or legal compliance. Verify requirements with official state and local agencies.",
      seasonality:
        "Census APIs do not measure seasonality for this business concept. Validate seasonality with local sales patterns and interviews.",
      similarBusinessCount,
      supplyDistributionNotes: [
        indicators.businessCounts
          ? `County Business Patterns reports ${formatNumber(indicators.businessCounts.paidEmployerEstablishments)} paid-employer establishments for NAICS ${indicators.businessCounts.naicsCode}.`
          : "Paid-employer establishment counts were not available for this request.",
        indicators.nonemployerIndicators
          ? `Nonemployer Statistics reports ${formatNumber(indicators.nonemployerIndicators.nonemployerEstablishments)} nonemployer establishments for NAICS ${indicators.nonemployerIndicators.naicsCode}.`
          : "Nonemployer establishment counts were not available for this request.",
      ],
      technologyDisruption:
        "Census APIs do not assess technology disruption. Review online substitutes, automation, and digital customer behavior separately.",
    }) as CensusProviderPayload;
    payload.censusMarketIndicators = indicators;
    return payload;
  }

  private async fetchRows(
    endpoint: string,
    params: Record<string, string>,
  ): Promise<Record<string, string>[]> {
    const url = new URL(endpoint);
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }
    url.searchParams.set("key", this.apiKey);
    const response = await this.fetchFn(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const json = await response.json() as unknown;
    if (!Array.isArray(json) || !Array.isArray(json[0])) {
      throw new Error("Unexpected Census response shape.");
    }
    const headers = json[0].map(String);
    return json.slice(1).map((row) => {
      const values = Array.isArray(row) ? row.map(String) : [];
      return Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""]));
    });
  }
}

function unavailable(
  warnings: string[],
  fetchedAt: Date,
): ProviderResult<CensusProviderPayload> {
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

function geographyParams(geography: ResolvedGeography): Record<string, string> {
  switch (geography.level) {
    case "zcta":
      return { for: `zip code tabulation area:${geography.zcta}` };
    case "county":
      return { for: `county:${geography.countyFips}`, in: `state:${geography.stateFips}` };
    case "place":
      return { for: `place:${geography.placeFips}`, in: `state:${geography.stateFips}` };
    case "state":
      return { for: `state:${geography.stateFips}` };
  }
}

function businessGeographyParams(geography: ResolvedGeography): Record<string, string> {
  if (geography.level === "county" && geography.countyFips) {
    return { for: `county:${geography.countyFips}`, in: `state:${geography.stateFips}` };
  }
  if (geography.stateFips) {
    return { for: `state:${geography.stateFips}` };
  }
  return { for: "us:*" };
}

function sourceFor(
  id: string,
  dataset: string,
  year: string,
  urlOrNote: string,
  geography: ResolvedGeography,
): SourceReference {
  const isUrl = urlOrNote.startsWith("https://");
  return {
    id: `census-${id}-${year}-${geography.level}`,
    lastVerifiedAt: new Date(),
    notes: `${dataset}; dataset year ${year}; geography ${geography.summary}. ${isUrl ? "Constructed Census API URL excludes the API key." : urlOrNote}`,
    sourceName: "U.S. Census Bureau",
    sourceType: "official",
    title: id === "acs-profile" ? "Official Census data: ACS 5-year profile" : `Partial Census data: ${dataset}`,
    url: isUrl ? urlOrNote : undefined,
  };
}

function sourceUrl(endpoint: string, params: Record<string, string>): string {
  const url = new URL(endpoint);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  return url.toString();
}

function metric(label: string, raw: string | undefined, unit: string) {
  return {
    dataLabel: "official" as const,
    label,
    notes: "Official Census API estimate. Review margins of error in the source dataset before relying on it.",
    unit,
    value: numberOrNull(raw),
  };
}

function toResearchIndicator(metricValue: CensusMarketIndicators["population"]) {
  if (!metricValue || metricValue.value === null) return null;
  const unit = metricValue.unit ?? "";
  return {
    dataLabel: "official" as const,
    label: metricValue.label,
    notes: metricValue.notes ?? "Official Census API estimate.",
    unit,
    value: unit === "USD"
      ? `$${formatNumber(metricValue.value)}`
      : formatNumber(metricValue.value),
  };
}

function indicator(label: string, value: number | null, unit: string) {
  if (value === null) return null;
  return {
    dataLabel: "official" as const,
    label,
    notes: "Official Census API estimate.",
    unit,
    value: unit === "%" ? `${value}%` : formatNumber(value),
  };
}

function numberOrNull(raw: string | undefined): number | null {
  if (raw === undefined || raw === null || raw === "") return null;
  const value = Number(raw);
  if (!Number.isFinite(value)) return null;
  if (value <= -99_999_999) return null;
  return value;
}

function formatNumber(value: number | null | undefined): string {
  return value === null || value === undefined
    ? "unavailable"
    : new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 }).format(value);
}

function normalizeName(value: string): string {
  return value
    .toLowerCase()
    .replace(/\b(county|parish|borough|city|town|village|municipality|cdp|balance)\b/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function normalizeNaicsForEconomicApi(
  naicsCode: string | undefined,
  vintage: "2017" | "2022",
): string {
  const digits = naicsCode?.replace(/\D/g, "") ?? "";
  if (digits.startsWith("31") || digits.startsWith("32") || digits.startsWith("33")) {
    return vintage === "2017" ? "31-33" : "31";
  }
  return digits.length >= 2 ? digits.slice(0, 2) : "00";
}

function geographySpecificity(geography: ResolvedGeography): number {
  return {
    county: 80,
    place: 75,
    state: 45,
    zcta: 85,
  }[geography.level];
}

function scoreCensusConfidence(
  geography: ResolvedGeography,
  hasBusinessCounts: boolean,
  hasNonemployer: boolean,
  warningCount: number,
): number {
  return Math.max(
    30,
    Math.min(
      90,
      62 +
        Math.round(geographySpecificity(geography) / 5) +
        (hasBusinessCounts ? 8 : 0) +
        (hasNonemployer ? 6 : 0) -
        warningCount * 6,
    ),
  );
}

function educationNarrative(indicators: CensusMarketIndicators): string {
  const highSchool = indicators.education.highSchoolGraduateOrHigherPercent;
  const bachelors = indicators.education.bachelorsOrHigherPercent;
  return `Educational attainment: ${highSchool ?? "unavailable"}% high school graduate or higher; ${bachelors ?? "unavailable"}% bachelor's degree or higher.`;
}

function ageNarrative(indicators: CensusMarketIndicators): string {
  const largest = indicators.ageBands
    .filter((band) => band.value !== null)
    .sort((left, right) => (right.value ?? 0) - (left.value ?? 0))[0];
  return largest
    ? `Largest reported age band in this ACS profile request: ${largest.label} (${formatNumber(largest.value)} people).`
    : "Age-band details were unavailable for this ACS profile request.";
}

function businessDensityNarrative(indicators: CensusMarketIndicators): string {
  if (!indicators.businessCounts && !indicators.nonemployerIndicators) {
    return "Census business-density indicators are unavailable for this geography/NAICS combination.";
  }
  return [
    indicators.businessCounts
      ? `${formatNumber(indicators.businessCounts.paidEmployerEstablishments)} paid-employer establishments`
      : undefined,
    indicators.nonemployerIndicators
      ? `${formatNumber(indicators.nonemployerIndicators.nonemployerEstablishments)} nonemployer establishments`
      : undefined,
  ].filter(Boolean).join(" and ") + " are reported by Census economic datasets for the selected NAICS sector.";
}

function marketSizeNarrative(indicators: CensusMarketIndicators): string {
  return `Directional market-size inputs: ${formatNumber(indicators.population?.value)} residents, ${formatNumber(indicators.households?.value)} households, and median household income of ${indicators.medianHouseholdIncome?.value ? `$${formatNumber(indicators.medianHouseholdIncome.value)}` : "unavailable"}. Convert these into a business-specific market estimate using customer share, purchase frequency, and price assumptions.`;
}

function saturationNarrative(indicators: CensusMarketIndicators): string {
  const establishments = indicators.businessCounts?.paidEmployerEstablishments;
  if (establishments === null || establishments === undefined) {
    return "Market saturation cannot be estimated from Census business counts for this request.";
  }
  return `${formatNumber(establishments)} paid-employer establishments are reported for the selected NAICS sector. Treat this as a saturation input, not a direct competitor count.`;
}

function economicNarrative(indicators: CensusMarketIndicators): string {
  const income = indicators.medianHouseholdIncome?.value;
  const unemployment = indicators.employment.unemploymentRatePercent;
  return `Economic context: median household income ${income ? `$${formatNumber(income)}` : "unavailable"}; unemployment rate ${unemployment ?? "unavailable"}%. Compare this with local customer interviews and pricing tests.`;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown Census API error";
}
