import {
  engineResultSchema,
  type EngineResult,
} from "@/engine/shared/engine-result";
import type { SourceReference } from "@/engine/shared/source-reference";

import {
  buildNextJsWebsiteExport,
  buildStaticWebsiteExport,
  buildWebsiteCopyBlocks,
  type ExportableWebsiteContent,
} from "./export-builders";
import {
  WebsiteEngineInputSchema,
  WebsitePackageSchema,
  type BrandVoiceGuide,
  type NormalizedWebsiteEngineInput,
  type WebsiteFaqItem,
  type WebsiteMetaDescriptions,
  type WebsitePackage,
  type WebsitePage,
  type WebsiteSocialBios,
} from "./schema";
import { toneProfiles } from "./tone-profiles";

const inputSource: SourceReference = {
  id: "website-founder-input",
  title: "Website package inputs",
  sourceName: "VentureForge website intake",
  sourceType: "user",
  notes: "Founder-entered copy details require review before publication.",
};

const conceptSource: SourceReference = {
  id: "website-business-concept",
  title: "Structured business concept",
  sourceName: "VentureForge concept engine",
  sourceType: "manual",
  notes: "Deterministic concept-stage planning output derived from founder intake.",
};

const customerSource: SourceReference = {
  id: "website-customer-analysis",
  title: "Customer analysis",
  sourceName: "VentureForge customer-analysis engine",
  sourceType: "manual",
  notes: "Customer personas and objections remain hypotheses until validated.",
};

const marketingSource: SourceReference = {
  id: "website-marketing-strategy",
  title: "Marketing and positioning recommendations",
  sourceName: "VentureForge strategy engine",
  sourceType: "manual",
  notes: "Strategy recommendations are planning hypotheses tied to available inputs.",
};

const unsupportedClaimPattern =
  /\b(best in town|best ever|number one|#1|guarantee(?:d|s|ing)?(?: results?)?|award[- ]winning|top[- ]rated|unmatched|100% certain|officially approved|proven results?|lowest price)\b/gi;

export const WebsiteEngine = {
  generate(inputDraft: unknown): EngineResult<WebsitePackage> {
    const input = WebsiteEngineInputSchema.parse(inputDraft);
    const facts = resolveFacts(input);
    const missingInformation = buildMissingInformation(input);
    const unsupportedClaimsDetected = containsUnsupportedClaims(input);
    const warnings = buildWarnings(
      input,
      unsupportedClaimsDetected,
      facts.hasLocalContext,
    );
    const brandVoiceGuide = buildBrandVoiceGuide(input);
    const metaDescriptions = buildMetaDescriptions(facts);
    const homepage = buildHomepage(facts, metaDescriptions.homepage);
    const aboutPage = buildAboutPage(facts, metaDescriptions.about);
    const productsServicesPage = buildProductsServicesPage(
      facts,
      metaDescriptions.productsServices,
    );
    const contactPage = buildContactPage(facts, metaDescriptions.contact);
    const faqPage = buildFaqPage(facts, metaDescriptions.faq);
    const socialBios = buildSocialBios(facts);
    const localBusinessJsonLd = facts.hasLocalContext
      ? buildLocalBusinessJsonLd(facts)
      : null;
    const exportableContent: ExportableWebsiteContent = {
      businessName: facts.businessName,
      tone: input.tone,
      homepage,
      aboutPage,
      productsServicesPage,
      contactPage,
      faqPage,
      localSeoTitle: facts.localSeoTitle,
      metaDescriptions,
      googleBusinessProfileDescription: buildGoogleBusinessProfileDescription(
        facts,
      ),
      socialBios,
      brandVoiceGuide,
      localBusinessJsonLd,
    };
    const websitePackage = WebsitePackageSchema.parse({
      ...exportableContent,
      staticExport: buildStaticWebsiteExport(exportableContent),
      nextJsPageExport: buildNextJsWebsiteExport(exportableContent),
      copyBlocks: buildWebsiteCopyBlocks(exportableContent),
    });
    const assumptions = unique([
      "Generated website copy is an editable founder-review draft, not verified advertising copy.",
      "Customer pains, positioning, and marketing recommendations remain hypotheses until validated.",
      "Only founder-provided location and service-area details are used for local SEO metadata.",
      "Testimonials, rankings, performance guarantees, and unsupported superiority claims are excluded.",
      ...input.businessConcept.assumptions.slice(0, 3),
    ]);
    const sources = uniqueSources([
      inputSource,
      conceptSource,
      input.customerAnalysis ? customerSource : undefined,
      input.marketingStrategy || input.positioningStrategy
        ? marketingSource
        : undefined,
    ]);

    return engineResultSchema(WebsitePackageSchema).parse({
      data: websitePackage,
      confidence: calculateConfidence(
        input,
        missingInformation,
        unsupportedClaimsDetected,
      ),
      assumptions,
      missingInformation,
      warnings,
      sources,
      nextActions: buildNextActions(input, facts.hasLocalContext),
    });
  },
};

interface WebsiteFacts {
  businessName: string;
  brandStyle: string;
  targetCustomer: string;
  productsServices: string[];
  locationLabel: string;
  hasLocalContext: boolean;
  localSeoTitle: string | null;
  serviceAreas: string[];
  email: string;
  phone: string;
  address: string;
  hours: string[];
  callToAction: string;
  valueProposition: string;
  customerPainPoints: string[];
  differentiators: string[];
  seoKeywords: string[];
  customerObjections: string[];
  positioning: string;
  marketingStrategy: string;
  conceptStatement: string;
  founderAdvantage: string;
  distributionModel: string;
  toneLead: string;
}

function resolveFacts(input: NormalizedWebsiteEngineInput): WebsiteFacts {
  const businessName = cleanText(input.businessName) || "Your Business";
  const targetCustomer =
    cleanText(input.targetCustomer) ||
    cleanText(input.businessConcept.targetCustomerSegment);
  const productsServices = unique(
    (input.productsServices.length
      ? input.productsServices
      : [input.businessConcept.primaryProductOrService]
    ).map(cleanText),
  );
  const valueProposition =
    cleanText(input.valueProposition) ||
    cleanText(input.businessConcept.coreCustomerBenefit);
  const serviceAreas = unique(input.localServiceArea.map(cleanText));
  const seoKeywords = unique(input.seoKeywords.map(cleanText));
  const locationLabel = formatLocation(input);
  const hasLocalContext = Boolean(locationLabel || serviceAreas.length);
  const offerLabel = productsServices[0] || "Products and services";

  return {
    businessName,
    brandStyle: cleanText(input.brandStyle) || "clear and customer-focused",
    targetCustomer,
    productsServices,
    locationLabel,
    hasLocalContext,
    localSeoTitle: hasLocalContext
      ? truncate(
          `${businessName} | ${seoKeywords[0] || offerLabel} in ${serviceAreas[0] || locationLabel}`,
          70,
        )
      : null,
    serviceAreas,
    email: cleanText(input.contactInfo.email),
    phone: cleanText(input.contactInfo.phone),
    address: cleanText(input.contactInfo.address),
    hours: unique(input.hours.map(cleanText)),
    callToAction:
      cleanText(input.callToAction) || `Contact ${businessName}`,
    valueProposition,
    customerPainPoints: unique(
      (input.customerPainPoints.length
        ? input.customerPainPoints
        : input.customerAnalysis?.customerPainPoints.length
          ? input.customerAnalysis.customerPainPoints
          : [input.businessConcept.customerProblem]
      ).map(cleanText),
    ),
    differentiators: unique(
      (input.differentiators.length
        ? input.differentiators
        : [input.businessConcept.differentiator]
      ).map(cleanText),
    ),
    seoKeywords,
    customerObjections: unique(
      (input.customerAnalysis?.customerObjections.length
        ? input.customerAnalysis.customerObjections
        : [
            "Customers may want to confirm fit, pricing, and next steps before deciding.",
          ]
      ).map(cleanText),
    ),
    positioning:
      cleanText(input.positioningStrategy?.recommendation ?? "") ||
      `Focus on ${valueProposition} for ${targetCustomer}.`,
    marketingStrategy:
      cleanText(input.marketingStrategy?.recommendation ?? "") ||
      "Use a measurable call to action and learn from customer inquiries.",
    conceptStatement: cleanText(input.businessConcept.businessConceptStatement),
    founderAdvantage: cleanText(input.businessConcept.founderAdvantage),
    distributionModel: cleanText(input.businessConcept.distributionModel),
    toneLead: toneProfiles[input.tone].headlineLead,
  };
}

function buildHomepage(
  facts: WebsiteFacts,
  metaDescription: string,
): WebsitePage {
  return page(
    "home",
    "Home",
    `${facts.businessName} | Home`,
    `${facts.toneLead} ${lowerFirst(facts.valueProposition)}.`,
    `${facts.productsServices.join(", ")} for ${facts.targetCustomer}.${localPhrase(facts)}`,
    [
      section(
        "What we offer",
        `${facts.businessName} is being developed around a focused offer: ${facts.productsServices.join(", ")}.`,
        facts.productsServices,
      ),
      section(
        "Why it may fit",
        `The customer-value focus is ${facts.valueProposition}.`,
        facts.differentiators,
      ),
      section(
        "Start with a conversation",
        `${facts.marketingStrategy} Use the next step below to ask about fit, availability, and current details.`,
        [],
      ),
    ],
    facts.callToAction,
    metaDescription,
  );
}

function buildAboutPage(
  facts: WebsiteFacts,
  metaDescription: string,
): WebsitePage {
  return page(
    "about",
    "About",
    `About ${facts.businessName}`,
    `A focused idea built around ${lowerFirst(facts.valueProposition)}.`,
    facts.conceptStatement,
    [
      section(
        "Who this is for",
        `${facts.businessName} is being developed for ${facts.targetCustomer}.`,
        facts.customerPainPoints,
      ),
      section(
        "How we approach the work",
        `The brand direction is ${facts.brandStyle}. The intended positioning is: ${facts.positioning}`,
        facts.differentiators,
      ),
      section(
        "Founder perspective",
        `The founder advantage identified during planning is: ${facts.founderAdvantage}.`,
        [],
      ),
    ],
    facts.callToAction,
    metaDescription,
  );
}

function buildProductsServicesPage(
  facts: WebsiteFacts,
  metaDescription: string,
): WebsitePage {
  return page(
    "services",
    "Products / Services",
    `${facts.businessName} | Products and Services`,
    `Explore the first ${facts.businessName} offer.`,
    `${facts.productsServices.join(", ")} designed around ${facts.valueProposition}.`,
    [
      section(
        "Products and services",
        "The launch offer should stay clear and focused while customer feedback improves the details.",
        facts.productsServices,
      ),
      section(
        "Delivery approach",
        `${facts.businessName} plans to reach customers through ${facts.distributionModel}.`,
        [],
      ),
      section(
        "Ask before you decide",
        "Contact the business to confirm current availability, pricing, service-area fit, and next steps.",
        [],
      ),
    ],
    facts.callToAction,
    metaDescription,
  );
}

function buildContactPage(
  facts: WebsiteFacts,
  metaDescription: string,
): WebsitePage {
  return page(
    "contact",
    "Contact",
    `Contact ${facts.businessName}`,
    `Talk with ${facts.businessName} about fit and next steps.`,
    "Use the available contact details below to ask about the current offer.",
    [
      section(
        "Contact information",
        "Confirm availability and details directly with the business.",
        contactDetails(facts),
      ),
      section(
        "Hours",
        facts.hours.length
          ? "Current founder-provided hours:"
          : "Business hours still need confirmation.",
        facts.hours.length ? facts.hours : ["Hours to be confirmed"],
      ),
      section(
        "Service area",
        facts.hasLocalContext
          ? `Current founder-provided service area: ${serviceAreaText(facts)}.`
          : "The service area still needs confirmation.",
        [],
      ),
    ],
    facts.callToAction,
    metaDescription,
  );
}

function buildFaqPage(
  facts: WebsiteFacts,
  metaDescription: string,
) {
  const faqs: WebsiteFaqItem[] = [
    ...facts.customerObjections.slice(0, 4).map((objection) => ({
      question: `What should I know about this concern: ${trimSentence(objection)}?`,
      answer: `That is a reasonable question. The current planning note is: ${ensureSentence(objection)} Contact ${facts.businessName} to discuss fit, current details, and the next step.`,
      source: "customer_objection" as const,
    })),
    {
      question: "Which products or services are available?",
      answer: `${facts.businessName} is starting with ${facts.productsServices.join(", ")}. Contact the business to confirm current availability and details.`,
      source: "business_input",
    },
    {
      question: "Which area does the business serve?",
      answer: facts.hasLocalContext
        ? `The founder-provided service area is ${serviceAreaText(facts)}. Confirm your address or project location before making plans.`
        : "The service area still needs confirmation. Contact the business to check whether your location is a fit.",
      source: "business_input",
    },
  ];
  return {
    ...page(
      "faq",
      "FAQ",
      `${facts.businessName} | Frequently Asked Questions`,
      "Questions worth asking before you decide.",
      "These answers are a starting point. Contact the business to confirm current details.",
      [],
      facts.callToAction,
      metaDescription,
    ),
    faqs,
  };
}

function buildMetaDescriptions(facts: WebsiteFacts): WebsiteMetaDescriptions {
  const local = localPhrase(facts);
  return {
    homepage: truncate(
      `${facts.businessName} offers ${facts.productsServices.join(", ")} for ${facts.targetCustomer}.${local} ${facts.callToAction}.`,
      160,
    ),
    about: truncate(
      `Learn about ${facts.businessName}, a focused business concept built around ${facts.valueProposition}.${local}`,
      160,
    ),
    productsServices: truncate(
      `Explore ${facts.productsServices.join(", ")} from ${facts.businessName}.${local} Contact the business to confirm details.`,
      160,
    ),
    contact: truncate(
      `Contact ${facts.businessName} to ask about availability, fit, and next steps.${local}`,
      160,
    ),
    faq: truncate(
      `Read common questions about ${facts.businessName}, its offer, and the next step.${local}`,
      160,
    ),
  };
}

function buildSocialBios(facts: WebsiteFacts): WebsiteSocialBios {
  const base = `${facts.businessName}: ${facts.productsServices.join(", ")} for ${facts.targetCustomer}.${localPhrase(facts)}`;
  return {
    shortBio: truncate(base, 160),
    instagramBio: truncate(`${facts.businessName} | ${facts.valueProposition}${facts.locationLabel ? ` | ${facts.locationLabel}` : ""}`, 150),
    facebookAbout: truncate(`${base} ${facts.callToAction}.`, 255),
    linkedInAbout: truncate(`${base} Positioning focus: ${facts.positioning}`, 500),
  };
}

function buildBrandVoiceGuide(
  input: NormalizedWebsiteEngineInput,
): BrandVoiceGuide {
  const profile = toneProfiles[input.tone];
  return {
    tone: input.tone,
    summary: profile.summary,
    traits: profile.traits,
    wordsToUse: profile.wordsToUse,
    wordsToAvoid: profile.wordsToAvoid,
    writingGuidelines: [
      ...profile.writingGuidelines,
      "Do not publish rankings, testimonials, guarantees, or superiority claims without supporting evidence and review.",
    ],
  };
}

function buildGoogleBusinessProfileDescription(facts: WebsiteFacts): string {
  return truncate(
    `${facts.businessName} offers ${facts.productsServices.join(", ")} for ${facts.targetCustomer}.${localPhrase(facts)} The focus is ${facts.valueProposition}. Contact the business to ask about availability, fit, and next steps.`,
    750,
  );
}

function buildLocalBusinessJsonLd(facts: WebsiteFacts): string {
  return JSON.stringify(
    {
      "@context": "https://schema.org",
      "@type": "LocalBusiness",
      name: facts.businessName,
      description: buildGoogleBusinessProfileDescription(facts),
      ...(facts.phone ? { telephone: facts.phone } : {}),
      ...(facts.email ? { email: facts.email } : {}),
      ...(facts.address ? { address: facts.address } : {}),
      areaServed: facts.serviceAreas.length
        ? facts.serviceAreas
        : [facts.locationLabel],
      ...(facts.hours.length ? { openingHours: facts.hours } : {}),
    },
    null,
    2,
  );
}

function buildMissingInformation(
  input: NormalizedWebsiteEngineInput,
): string[] {
  return unique([
    input.businessName ? undefined : "Business name",
    input.brandStyle ? undefined : "Brand style",
    input.targetCustomer ? undefined : "Founder-confirmed target customer",
    input.productsServices.length
      ? undefined
      : "Founder-confirmed products or services",
    formatLocation(input) || input.localServiceArea.length
      ? undefined
      : "Location or local service area for local SEO",
    input.contactInfo.email || input.contactInfo.phone
      ? undefined
      : "Customer-facing email address or phone number",
    input.hours.length ? undefined : "Business hours",
    input.callToAction ? undefined : "Founder-confirmed call to action",
    input.seoKeywords.length ? undefined : "SEO keywords",
    input.customerAnalysis ? undefined : "Customer analysis",
    input.marketingStrategy ? undefined : "Marketing strategy",
    input.positioningStrategy ? undefined : "Positioning strategy",
  ]);
}

function buildWarnings(
  input: NormalizedWebsiteEngineInput,
  unsupportedClaimsDetected: boolean,
  hasLocalContext: boolean,
): string[] {
  return unique([
    "Generated website copy is a draft. Review every statement before publication.",
    "Do not publish unsupported rankings, guarantees, testimonials, review claims, legal claims, or performance claims.",
    unsupportedClaimsDetected
      ? "Potentially unsupported superiority or guarantee language was neutralized in the generated copy."
      : undefined,
    hasLocalContext
      ? undefined
      : "Location is missing. Local SEO title and LocalBusiness JSON-LD were skipped.",
    input.contactInfo.email || input.contactInfo.phone
      ? undefined
      : "Customer-facing email and phone details are missing.",
    input.customerAnalysis
      ? undefined
      : "Customer analysis is missing. FAQ and customer-fit copy use limited concept-stage hypotheses.",
    input.marketingStrategy
      ? undefined
      : "Marketing strategy is missing. The website uses a conservative measurable-CTA fallback.",
  ]);
}

function buildNextActions(
  input: NormalizedWebsiteEngineInput,
  hasLocalContext: boolean,
): string[] {
  return unique([
    hasLocalContext
      ? undefined
      : "Add an accurate location or service area before using local SEO metadata.",
    input.contactInfo.email || input.contactInfo.phone
      ? undefined
      : "Add a customer-facing email address or phone number.",
    input.hours.length ? undefined : "Confirm business hours before publishing.",
    input.customerAnalysis
      ? undefined
      : "Generate customer analysis so FAQ copy can address recorded objections.",
    input.marketingStrategy
      ? undefined
      : "Generate strategy analysis and pass its positioning and marketing recommendations into the website engine.",
    "Review the generated copy, local details, contact information, and claims before publishing or importing an export.",
    "Test the primary call to action and track qualified customer inquiries.",
  ]);
}

function calculateConfidence(
  input: NormalizedWebsiteEngineInput,
  missingInformation: string[],
  unsupportedClaimsDetected: boolean,
): number {
  let score = 96 - Math.min(48, missingInformation.length * 4);
  if (!input.customerAnalysis) score -= 8;
  if (!input.marketingStrategy) score -= 6;
  if (!input.positioningStrategy) score -= 4;
  if (unsupportedClaimsDetected) score -= 8;
  return clamp(score);
}

function page(
  slug: string,
  navigationLabel: string,
  title: string,
  headline: string,
  introduction: string,
  sections: WebsitePage["sections"],
  callToAction: string,
  metaDescription: string,
): WebsitePage {
  return {
    slug,
    navigationLabel,
    title,
    headline,
    introduction,
    sections,
    callToAction,
    metaDescription,
  };
}

function section(
  heading: string,
  body: string,
  bullets: string[],
): WebsitePage["sections"][number] {
  return { heading, body, bullets };
}

function contactDetails(facts: WebsiteFacts): string[] {
  return unique([
    facts.email ? `Email: ${facts.email}` : undefined,
    facts.phone ? `Phone: ${facts.phone}` : undefined,
    facts.address ? `Address: ${facts.address}` : undefined,
    !facts.email && !facts.phone && !facts.address
      ? "Contact details to be confirmed"
      : undefined,
  ]);
}

function formatLocation(input: NormalizedWebsiteEngineInput): string {
  return [input.location.city, input.location.state, input.location.zipCode]
    .map(cleanText)
    .filter(Boolean)
    .join(", ");
}

function serviceAreaText(facts: WebsiteFacts): string {
  return facts.serviceAreas.length
    ? facts.serviceAreas.join(", ")
    : facts.locationLabel;
}

function localPhrase(facts: WebsiteFacts): string {
  if (!facts.hasLocalContext) return "";
  return ` Serving ${serviceAreaText(facts)}.`;
}

function cleanText(value: string): string {
  return value
    .replace(/<[^>]*>/g, " ")
    .replace(unsupportedClaimPattern, "focused")
    .replace(/\s+/g, " ")
    .trim();
}

function containsUnsupportedClaims(input: NormalizedWebsiteEngineInput): boolean {
  unsupportedClaimPattern.lastIndex = 0;
  return unsupportedClaimPattern.test(JSON.stringify(input));
}

function trimSentence(value: string): string {
  return value.replace(/[.!?]+$/g, "");
}

function ensureSentence(value: string): string {
  return /[.!?]$/.test(value) ? value : `${value}.`;
}

function lowerFirst(value: string): string {
  return value ? `${value[0]?.toLowerCase()}${value.slice(1)}` : value;
}

function truncate(value: string, maxLength: number): string {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
}

function clamp(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function unique<T>(values: (T | undefined)[]): T[] {
  return [
    ...new Set(values.filter((value): value is T => value !== undefined)),
  ];
}

function uniqueSources(
  sources: (SourceReference | undefined)[],
): SourceReference[] {
  const seen = new Set<string>();
  return sources.filter((source): source is SourceReference => {
    if (!source || seen.has(source.id)) return false;
    seen.add(source.id);
    return true;
  });
}
