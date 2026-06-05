import assert from "node:assert/strict";
import test from "node:test";

import { sampleProjects } from "../../prisma/seed-data";
import {
  BusinessConceptAIService,
  DisabledLLMClient,
  IntakeQuestionService,
  MockLLMClient,
  OpenAICompatibleLLMClient,
  WebsiteAIService,
  createOptionalLLMClient,
  enhanceEngineResultSafely,
  loadAllPromptTemplates,
  loadPromptTemplate,
  renderPromptTemplate,
  safeParseStructuredOutput,
} from "../ai";
import { AIEnhancementResultSchema } from "../ai/schemas/structured-output";
import { BusinessConceptEngine } from "../engine/concept";

test("MockLLMClient returns valid structured output through an AI service", async () => {
  const service = new IntakeQuestionService(new MockLLMClient());
  const result = await service.enhance({
    founder: { founderName: "Sample Founder" },
    idea: { businessIdea: "A focused local service" },
  });

  assert.match(result.data.summary, /Mock optional AI enhancement/i);
  assert.ok(result.data.recommendations.length > 0);
  assert.ok(result.assumptions.length > 0);
  assert.ok(result.warnings.length > 0);
  assert.ok(
    result.sources.some((source) => source.sourceType === "ai_generated"),
  );
  assert.ok(result.nextActions.length > 0);
});

test("invalid LLM output fails validation safely", async () => {
  const service = new WebsiteAIService(
    new MockLLMClient({ unexpected: "shape" }),
  );
  const attempt = await service.enhanceSafely({
    websitePackage: { businessName: "Sample Business" },
  });
  const parsed = safeParseStructuredOutput(
    '{"unexpected":"shape"}',
    AIEnhancementResultSchema,
  );

  assert.equal(attempt.status, "unavailable");
  assert.match(attempt.error, /structured validation/i);
  assert.equal(parsed.success, false);
});

test("AI service errors preserve deterministic engine output", async () => {
  const sample = sampleProjects[0];
  assert.ok(sample);
  const deterministicResult = BusinessConceptEngine.generate(sample.intake);
  const enhanced = await enhanceEngineResultSafely(
    deterministicResult,
    new BusinessConceptAIService(new DisabledLLMClient()),
    { businessConcept: deterministicResult.data },
  );

  assert.equal(enhanced.aiStatus, "unavailable");
  assert.equal(enhanced.aiEnhancement, null);
  assert.deepEqual(enhanced.deterministicResult, deterministicResult);
  assert.ok(
    enhanced.warnings.some((warning) =>
      warning.includes("Optional AI enhancement was skipped"),
    ),
  );
});

test("prompt templates load correctly and remain targeted", () => {
  const templates = loadAllPromptTemplates();
  const market = loadPromptTemplate("market-research");
  const rendered = renderPromptTemplate("market-research");

  assert.equal(templates.length, 14);
  assert.equal(new Set(templates.map((template) => template.id)).size, 14);
  assert.match(market.objective, /sourced market evidence/i);
  assert.match(rendered.systemPrompt, /Do not fabricate government statistics/i);
  assert.match(rendered.systemPrompt, /Do not quote or reproduce textbook passages/i);
  assert.match(rendered.userPrompt, /Never invent population/i);
});

test("optional client factory disables AI when configuration is missing", () => {
  const client = createOptionalLLMClient({});

  assert.equal(client.configured, false);
  assert.ok(client instanceof DisabledLLMClient);
});

test("optional client factory accepts OPENAI_API_KEY with an explicit model", () => {
  const client = createOptionalLLMClient({
    OPENAI_API_KEY: "test-openai-key",
    OPENAI_MODEL: "test-model",
  });

  assert.equal(client.configured, true);
  assert.ok(client instanceof OpenAICompatibleLLMClient);
});

test("OpenAI-compatible client scaffold sends one structured chat request", async () => {
  let requestedUrl = "";
  let requestBody: Record<string, unknown> = {};
  const fetchImplementation: typeof fetch = async (input, init) => {
    requestedUrl = String(input);
    requestBody = JSON.parse(String(init?.body));
    return new Response(
      JSON.stringify({
        choices: [{ message: { content: '{"status":"ok"}' } }],
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  };
  const client = new OpenAICompatibleLLMClient({
    baseUrl: "https://llm.example.test/v1/",
    apiKey: "test-key",
    model: "test-model",
    fetchImplementation,
  });
  const output = await client.generateStructured({
    promptId: "website",
    systemPrompt: "Return structured JSON.",
    userPrompt: "Refine website copy.",
    input: { businessName: "Sample Business" },
    outputSchemaName: "SampleSchema",
  });

  assert.equal(requestedUrl, "https://llm.example.test/v1/chat/completions");
  assert.equal(requestBody.model, "test-model");
  assert.deepEqual(requestBody.response_format, { type: "json_object" });
  assert.equal(output, '{"status":"ok"}');
});

test("AI output cannot cite an unsupplied official source", async () => {
  const service = new WebsiteAIService(
    new MockLLMClient({
      data: {
        summary: "Review the current website draft.",
        recommendations: ["Verify local details before publication."],
        questionsToResolve: [],
        sourceNotes: ["An official citation was attempted."],
      },
      confidence: 40,
      assumptions: [],
      missingInformation: [],
      warnings: [],
      sources: [
        {
          id: "invented-official-source",
          title: "Invented official source",
          sourceName: "Unverified agency",
          sourceType: "official",
          url: "https://example.gov/invented",
        },
      ],
      nextActions: ["Review the draft."],
    }),
  );
  const attempt = await service.enhanceSafely({
    websitePackage: { businessName: "Sample Business" },
  });

  assert.equal(attempt.status, "unavailable");
  assert.match(attempt.error, /source that was not present/i);
});
