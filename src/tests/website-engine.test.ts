import assert from "node:assert/strict";
import test from "node:test";

import { sampleProjects } from "../../prisma/seed-data";
import { BusinessConceptEngine } from "../engine/concept";
import { CustomerAnalysisEngine } from "../engine/customer-analysis";
import { StrategicAnalysisEngine } from "../engine/strategy";
import { WebsiteEngine } from "../engine/website";

test("website copy changes when tone changes", () => {
  const professional = WebsiteEngine.generate({
    ...websiteInput(),
    tone: "professional",
  });
  const playful = WebsiteEngine.generate({
    ...websiteInput(),
    tone: "playful",
  });

  assert.notEqual(
    professional.data.homepage.headline,
    playful.data.homepage.headline,
  );
  assert.equal(professional.data.brandVoiceGuide.tone, "professional");
  assert.equal(playful.data.brandVoiceGuide.tone, "playful");
  assert.notEqual(professional.data.staticExport.css, playful.data.staticExport.css);
});

test("missing location skips local SEO and asks for an accurate location", () => {
  const result = WebsiteEngine.generate({
    ...websiteInput(),
    location: {},
    localServiceArea: [],
  });

  assert.equal(result.data.localSeoTitle, null);
  assert.equal(result.data.localBusinessJsonLd, null);
  assert.ok(
    result.missingInformation.includes(
      "Location or local service area for local SEO",
    ),
  );
  assert.ok(
    result.nextActions.some((action) => /accurate location or service area/i.test(action)),
  );
  assert.ok(result.warnings.some((warning) => /LocalBusiness JSON-LD were skipped/i.test(warning)));
});

test("FAQ reflects customer objections", () => {
  const input = websiteInput();
  const firstObjection = input.customerAnalysis.customerObjections[0];
  assert.ok(firstObjection);
  const result = WebsiteEngine.generate(input);

  assert.ok(
    result.data.faqPage.faqs.some(
      (faq) =>
        faq.source === "customer_objection" &&
        faq.answer.includes(firstObjection),
    ),
  );
});

test("output includes safe static HTML and a component-based Next.js export", () => {
  const result = WebsiteEngine.generate({
    ...websiteInput(),
    businessName: '<img src=x onerror="alert(1)"> Needle & Groove Records',
    differentiators: ["Best in town selection", "Curated discovery support"],
  });

  assert.match(result.data.staticExport.html, /^<!doctype html>/i);
  assert.match(result.data.staticExport.html, /styles\.css/);
  assert.doesNotMatch(result.data.staticExport.html, /<img src=x/i);
  assert.doesNotMatch(result.data.homepage.introduction, /best in town/i);
  assert.ok(
    result.warnings.some((warning) => /language was neutralized/i.test(warning)),
  );
  assert.ok(
    result.data.nextJsPageExport.files.some(
      (file) => file.path === "components/content-page.tsx",
    ),
  );
  assert.ok(
    result.data.nextJsPageExport.files.some(
      (file) => file.path === "app/faq/page.tsx",
    ),
  );
  assert.ok(result.data.copyBlocks.squarespace.content.includes("# Home"));
  assert.ok(result.data.copyBlocks.wordpress.content.includes("# FAQ"));
});

function websiteInput() {
  const sample = sampleProjects[0];
  assert.ok(sample);
  const businessConcept = BusinessConceptEngine.generate(sample.intake).data;
  const customerAnalysis = CustomerAnalysisEngine.generate({
    businessConcept,
    idea: sample.intake.idea,
  }).data;
  const strategicAnalysis = StrategicAnalysisEngine.generate({
    businessConcept,
    customerAnalysis,
    founder: sample.intake.founder,
  }).data;

  return {
    businessName: sample.intake.idea.businessName,
    brandStyle: "Warm neighborhood record-store guide",
    targetCustomer: sample.intake.idea.targetCustomer,
    productsServices: [
      "Curated vinyl records",
      "Accessories",
      "Listening events",
    ],
    location: {
      city: sample.intake.idea.city,
      state: sample.intake.idea.state,
      zipCode: sample.intake.idea.zipCode,
    },
    contactInfo: {
      email: "hello@example.com",
      phone: "480-555-0100",
      address: "123 Sample Street, Tempe, AZ",
    },
    hours: ["Monday-Saturday 10:00 AM-6:00 PM"],
    tone: "friendly" as const,
    callToAction: "Ask about current inventory",
    valueProposition: businessConcept.coreCustomerBenefit,
    customerPainPoints: customerAnalysis.customerPainPoints,
    differentiators: [
      "Curated selection",
      "Guidance for new and experienced listeners",
    ],
    seoKeywords: ["vinyl records", "record store", "Tempe records"],
    localServiceArea: ["Tempe, Arizona"],
    businessConcept,
    customerAnalysis,
    marketingStrategy:
      strategicAnalysis.strategicRecommendations.marketingStrategy,
    positioningStrategy:
      strategicAnalysis.strategicRecommendations.positioningStrategy,
  };
}
