import assert from "node:assert/strict";
import test from "node:test";
import { BusinessConceptEngine } from "../engine/concept/business-concept-engine";
import { MarketResearchEngine } from "../engine/market-research/market-research-engine";
import { BLSProvider } from "../providers/bls/provider";
import { CensusProvider } from "../providers/census/provider";
import { MockMarketDataProvider } from "../providers/mock/provider";
import { sampleProjects } from "../../prisma/seed-data";

test("mock provider returns clearly labeled mock data", async () => {
  const provider = new MockMarketDataProvider();
  const result = await provider.fetch({
    projectId: "sample-tempe-vinyl",
    geography: {
      city: "Tempe",
      county: "Maricopa County",
      stateCode: "AZ",
      zipCode: "85281",
    },
    naicsCode: "449210",
    industry: "Specialty retail - prerecorded media",
  });

  assert.equal(result.status, "available");
  assert.equal(result.isMockData, true);
  assert.ok(result.fetchedAt instanceof Date);
  assert.equal(result.sources[0]?.sourceType, "mock");
  assert.ok(
    result.warnings.some((warning) => warning.includes("development only")),
  );
  assert.ok(
    result.data?.populationIndicators.every(
      (indicator) => indicator.dataLabel === "mock",
    ),
  );
});

test("unavailable provider scaffolds do not crash the engine", async () => {
  const result = await MarketResearchEngine.generate(sampleInput(0), {
    providers: [new CensusProvider({ apiKey: "" }), new BLSProvider({ apiKey: "" })],
  });

  assert.equal(result.data.providerRuns.length, 2);
  assert.ok(
    result.data.providerRuns.every((run) => run.status === "unavailable"),
  );
  assert.ok(
    result.warnings.some((warning) => warning.includes("CENSUS_API_KEY")),
  );
  assert.match(result.data.industryOverview, /unavailable/i);
});

test("missing provider data lowers confidence", async () => {
  const mockResult = await MarketResearchEngine.generate(sampleInput(0));
  const unavailableResult = await MarketResearchEngine.generate(sampleInput(0), {
    providers: [new CensusProvider({ apiKey: "" })],
  });

  assert.ok(mockResult.confidence > unavailableResult.confidence);
  assert.ok(
    unavailableResult.missingInformation.length >
      mockResult.missingInformation.length,
  );
});

test("missing Census API key returns unavailable without crashing", async () => {
  const provider = new CensusProvider({ apiKey: "" });
  const result = await provider.fetch({
    projectId: "missing-key",
    geography: { stateCode: "AZ", county: "Maricopa County" },
    naicsCode: "44",
  });

  assert.equal(result.status, "unavailable");
  assert.equal(result.isMockData, false);
  assert.ok(result.warnings.some((warning) => warning.includes("CENSUS_API_KEY")));
});

test("bad Census geography returns a helpful warning", async () => {
  const provider = new CensusProvider({
    apiKey: "test-key",
    fetchFn: mockedCensusFetch(),
  });
  const result = await provider.fetch({
    projectId: "bad-geo",
    geography: { city: "Nowhere" },
    naicsCode: "44",
  });

  assert.equal(result.status, "unavailable");
  assert.ok(result.warnings.some((warning) => warning.includes("state")));
  assert.ok(result.warnings.some((warning) => warning.includes("county/city")));
});

test("successful mocked Census HTTP response normalizes official indicators", async () => {
  const provider = new CensusProvider({
    apiKey: "test-key",
    fetchFn: mockedCensusFetch(),
  });
  const result = await provider.fetch({
    projectId: "sample-tempe-vinyl",
    geography: {
      stateCode: "AZ",
      zipCode: "85281",
    },
    naicsCode: "449210",
    industry: "Specialty retail",
  });

  assert.equal(result.status, "available");
  assert.equal(result.isMockData, false);
  assert.equal(result.data?.censusMarketIndicators.population?.value, 185000);
  assert.equal(result.data?.censusMarketIndicators.medianHouseholdIncome?.value, 72000);
  assert.equal(result.data?.censusMarketIndicators.households?.value, 76000);
  assert.equal(result.data?.censusMarketIndicators.businessCounts?.paidEmployerEstablishments, 18);
  assert.equal(result.data?.populationIndicators[0]?.dataLabel, "official");
  assert.ok(result.sources.some((source) => source.title.includes("ACS 5-year")));
});

test("MarketResearchEngine prefers CensusProvider when enabled and keeps mock fallback out of used sources", async () => {
  const previousKey = process.env.CENSUS_API_KEY;
  const previousFetch = globalThis.fetch;
  process.env.CENSUS_API_KEY = "test-key";
  globalThis.fetch = mockedCensusFetch();
  try {
    const result = await MarketResearchEngine.generate(sampleInput(0));

    assert.ok(result.sources.some((source) => source.sourceName === "U.S. Census Bureau"));
    assert.ok(result.sources.every((source) => source.sourceType !== "mock"));
    assert.equal(result.data.containsMockData, false);
    assert.ok(result.data.providerRuns.some((run) => run.providerId === "census"));
    assert.ok(result.data.populationIndicators.some((indicator) => indicator.dataLabel === "official"));
  } finally {
    if (previousKey === undefined) {
      delete process.env.CENSUS_API_KEY;
    } else {
      process.env.CENSUS_API_KEY = previousKey;
    }
    globalThis.fetch = previousFetch;
  }
});

test("Census source references appear in the market report", async () => {
  const result = await MarketResearchEngine.generate(sampleInput(0), {
    providers: [
      new CensusProvider({
        apiKey: "test-key",
        fetchFn: mockedCensusFetch(),
      }),
    ],
  });

  assert.ok(result.sources.some((source) => source.title === "Official Census data: ACS 5-year profile"));
  assert.ok(result.data.sourcesUsed.some((source) => source.sourceName === "U.S. Census Bureau"));
});

test("missing BLS API key returns unavailable without crashing", async () => {
  const provider = new BLSProvider({ apiKey: "" });
  const result = await provider.fetch({
    projectId: "missing-bls-key",
    geography: { stateCode: "AZ", city: "Tempe" },
    industry: "Retail",
  });

  assert.equal(result.status, "unavailable");
  assert.equal(result.isMockData, false);
  assert.ok(result.warnings.some((warning) => warning.includes("BLS_API_KEY")));
});

test("bad BLS geography returns a helpful warning", async () => {
  const provider = new BLSProvider({
    apiKey: "test-key",
    fetchFn: mockedBLSFetch(),
  });
  const result = await provider.fetch({
    projectId: "bad-bls-geo",
    geography: { city: "Nowhere" },
    industry: "Retail",
  });

  assert.equal(result.status, "unavailable");
  assert.ok(result.warnings.some((warning) => warning.includes("state")));
  assert.ok(result.warnings.some((warning) => warning.includes("BLS geography")));
});

test("successful mocked BLS response normalizes official labor indicators", async () => {
  const provider = new BLSProvider({
    apiKey: "test-key",
    fetchFn: mockedBLSFetch(),
  });
  const result = await provider.fetch({
    projectId: "sample-tempe-vinyl",
    geography: {
      city: "Tempe",
      stateCode: "AZ",
    },
    industry: "Specialty retail",
    naicsCode: "449210",
    query: "record store",
  });

  assert.equal(result.status, "available");
  assert.equal(result.isMockData, false);
  assert.equal(result.data?.blsMarketIndicators.geography.level, "metro");
  assert.equal(result.data?.blsMarketIndicators.unemploymentRate?.value, 4.2);
  assert.equal(result.data?.blsMarketIndicators.wageEstimates[0]?.value, 35.42);
  assert.ok(result.data?.employmentIndicators.some((indicator) => indicator.dataLabel === "official"));
  assert.ok(result.sources.some((source) => source.title.includes("BLS data")));
});

test("MarketResearchEngine includes BLS indicators when enabled", async () => {
  const previousKey = process.env.BLS_API_KEY;
  const previousFetch = globalThis.fetch;
  process.env.BLS_API_KEY = "test-key";
  globalThis.fetch = mockedBLSFetch();
  try {
    const result = await MarketResearchEngine.generate(sampleInput(0));

    assert.ok(result.sources.some((source) => source.sourceName === "U.S. Bureau of Labor Statistics"));
    assert.ok(result.sources.every((source) => source.sourceType !== "mock"));
    assert.equal(result.data.containsMockData, false);
    assert.ok(result.data.providerRuns.some((run) => run.providerId === "bls"));
    assert.ok(result.data.employmentIndicators.some((indicator) => indicator.dataLabel === "official"));
  } finally {
    if (previousKey === undefined) {
      delete process.env.BLS_API_KEY;
    } else {
      process.env.BLS_API_KEY = previousKey;
    }
    globalThis.fetch = previousFetch;
  }
});

test("BLS source references appear in the market report", async () => {
  const result = await MarketResearchEngine.generate(sampleInput(0), {
    providers: [
      new BLSProvider({
        apiKey: "test-key",
        fetchFn: mockedBLSFetch(),
      }),
    ],
  });

  assert.ok(result.sources.some((source) => source.title === "Official BLS data: Local Area Unemployment Statistics"));
  assert.ok(result.data.sourcesUsed.some((source) => source.sourceName === "U.S. Bureau of Labor Statistics"));
});

test("source references are returned with the generated report", async () => {
  const result = await MarketResearchEngine.generate(sampleInput(0));

  assert.ok(result.sources.length > 0);
  assert.deepEqual(result.data.sourcesUsed, result.sources);
  assert.ok(result.sources.some((source) => source.sourceType === "mock"));
  assert.equal(result.data.containsMockData, true);
});

test("mock market research reports work for all seeded sample projects", async () => {
  for (const [index, sample] of sampleProjects.entries()) {
    const result = await MarketResearchEngine.generate(sampleInput(index));

    assert.ok(result.data.industryOverview.includes("Sample-only"));
    assert.equal(result.data.geography.city, sample.intake.idea.city);
    assert.ok(result.data.naicsCode.length > 0);
    assert.ok(result.data.missingData.length > 0);
  }
});

function sampleInput(index: number) {
  const sample = sampleProjects[index];
  assert.ok(sample);
  const businessConcept = BusinessConceptEngine.generate(sample.intake).data;
  return {
    projectId: sample.id,
    businessConcept,
    idea: sample.intake.idea,
    manualResearchEntries: [],
  };
}

function mockedCensusFetch(): typeof fetch {
  return (async (request: RequestInfo | URL) => {
    const url = new URL(String(request));
    const path = url.pathname;
    if (path.includes("/acs/acs5/profile")) {
      return jsonResponse([
        [
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
          "zip code tabulation area",
        ],
        [
          "ZCTA5 85281",
          "185000",
          "76000",
          "72000",
          "9000",
          "8000",
          "7000",
          "11000",
          "22000",
          "38000",
          "28000",
          "24000",
          "10000",
          "9000",
          "13000",
          "5000",
          "3000",
          "91.2",
          "46.5",
          "98000",
          "93000",
          "5000",
          "5.1",
          "85281",
        ],
      ]);
    }
    if (path.includes("/cbp")) {
      return jsonResponse([
        ["NAME", "NAICS2017_LABEL", "ESTAB", "EMP", "PAYANN", "state"],
        ["Arizona", "Retail trade", "18", "240", "12000", "04"],
      ]);
    }
    if (path.includes("/nonemp")) {
      return jsonResponse([
        ["NAME", "NAICS2022_LABEL", "NESTAB", "NRCPTOT", "state"],
        ["Arizona", "Retail trade", "44", "5200", "81000", "04"],
      ]);
    }
    return jsonResponse({ error: "Unexpected URL" }, 404);
  }) as typeof fetch;
}

function mockedBLSFetch(): typeof fetch {
  return (async (_request: RequestInfo | URL, init?: RequestInit) => {
    const body = JSON.parse(String(init?.body ?? "{}")) as { seriesid?: string[] };
    const seriesIds = body.seriesid ?? [];
    return jsonResponse({
      Results: {
        series: seriesIds.map(mockedBLSSeries),
      },
      message: [],
      status: "REQUEST_SUCCEEDED",
    });
  }) as typeof fetch;
}

function mockedBLSSeries(seriesID: string) {
  if (seriesID === "CES0500000003") {
    return {
      data: [
        { period: "M04", periodName: "April", value: "35.42", year: "2026" },
        { period: "M03", periodName: "March", value: "35.10", year: "2026" },
      ],
      seriesID,
    };
  }
  const measure = seriesID.slice(-2);
  const values: Record<string, [string, string]> = {
    "03": ["4.2", "4.5"],
    "04": ["98000", "104000"],
    "05": ["2350000", "2340000"],
    "06": ["2448000", "2444000"],
  };
  const [latest, previous] = values[measure] ?? ["", ""];
  return {
    data: [
      { period: "M04", periodName: "April", value: latest, year: "2026" },
      { period: "M03", periodName: "March", value: previous, year: "2026" },
    ],
    seriesID,
  };
}

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response;
}
