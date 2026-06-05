import type { BusinessIdeaIntake } from "@/engine/intake/schema";
import type { SuggestedNaicsCode } from "@/engine/concept/schema";

export type MockNaicsMapping = {
  id: string;
  keywords: string[];
  businessType: string;
  suggestions: Omit<SuggestedNaicsCode, "origin" | "verificationRequired">[];
  spinOffProducts: string[];
  impactNotes: string[];
};

export const MOCK_NAICS_MAPPINGS: MockNaicsMapping[] = [
  {
    id: "record_store",
    keywords: ["record store", "vinyl", "records", "prerecorded media"],
    businessType: "Specialty retail business",
    suggestions: [
      {
        code: "449210",
        title: "Electronics and Appliance Retailers",
        rationale:
          "Candidate when the primary activity is retailing new prerecorded audio media.",
      },
      {
        code: "459510",
        title: "Used Merchandise Retailers",
        rationale:
          "Candidate when used records and other secondhand merchandise are a primary line.",
      },
    ],
    spinOffProducts: [
      "Record-cleaning services",
      "Listening events and small community performances",
      "Collector subscriptions or curated gift bundles",
    ],
    impactNotes: [
      "A local record shop may create a neighborhood gathering place through events and discovery.",
      "Used inventory can extend the useful life of physical media.",
    ],
  },
  {
    id: "food_truck",
    keywords: ["food truck", "mobile food", "food cart"],
    businessType: "Mobile food-service business",
    suggestions: [
      {
        code: "722330",
        title: "Mobile Food Services",
        rationale:
          "Candidate for preparing and serving meals or snacks from a vehicle or cart.",
      },
    ],
    spinOffProducts: [
      "Event catering",
      "Pre-order pickup packages",
      "Packaged signature sauces or meal kits",
    ],
    impactNotes: [
      "Food sourcing, packaging waste, commissary use, and route planning should be evaluated.",
      "A mobile model can serve events and neighborhoods without a full restaurant footprint.",
    ],
  },
  {
    id: "mobile_detailing",
    keywords: ["mobile detailing", "auto detailing", "car detailing"],
    businessType: "Mobile automotive service business",
    suggestions: [
      {
        code: "811192",
        title: "Car Washes",
        rationale:
          "Candidate for automotive cleaning, washing, waxing, and detailing services.",
      },
    ],
    spinOffProducts: [
      "Fleet maintenance packages",
      "Recurring residential detailing memberships",
      "Interior-only or water-conscious service packages",
    ],
    impactNotes: [
      "Water use, runoff controls, and chemical handling should be verified for the service area.",
    ],
  },
  {
    id: "childcare",
    keywords: ["childcare", "child care", "day care", "daycare"],
    businessType: "Child-care service business",
    suggestions: [
      {
        code: "624410",
        title: "Child Care Services",
        rationale:
          "Candidate for establishments providing care and early learning opportunities for children.",
      },
    ],
    spinOffProducts: [
      "Before-school and after-school programs",
      "Parent workshops",
      "Holiday or school-break programs",
    ],
    impactNotes: [
      "The concept may improve local access to dependable child care and early learning.",
      "Licensing, staffing ratios, facility suitability, and safety requirements require official verification.",
    ],
  },
  {
    id: "small_manufacturing",
    keywords: ["small manufacturing", "manufacturing shop", "manufacturer"],
    businessType: "Small manufacturing business",
    suggestions: [
      {
        code: "339999",
        title: "All Other Miscellaneous Manufacturing",
        rationale:
          "Broad placeholder candidate until the primary manufactured product and process are defined.",
      },
    ],
    spinOffProducts: [
      "Prototype services",
      "Short-run custom production",
      "Contract manufacturing",
    ],
    impactNotes: [
      "Material sourcing, energy use, waste handling, and local job creation should be evaluated.",
    ],
  },
  {
    id: "machine_shop",
    keywords: ["machine shop", "machining", "cnc"],
    businessType: "Job-order machine shop",
    suggestions: [
      {
        code: "332710",
        title: "Machine Shops",
        rationale:
          "Candidate for job-order machining of metal, plastic, or composite parts.",
      },
    ],
    spinOffProducts: [
      "Prototype machining",
      "Small-batch production",
      "Design-for-manufacturing reviews",
    ],
    impactNotes: [
      "Material sourcing, scrap handling, coolant management, and local job creation should be evaluated.",
    ],
  },
  {
    id: "consulting",
    keywords: ["consulting", "consultant", "business advisory"],
    businessType: "Professional consulting service",
    suggestions: [
      {
        code: "541611",
        title: "Administrative Management and General Management Consulting Services",
        rationale:
          "Candidate for general management, planning, and business-process consulting.",
      },
    ],
    spinOffProducts: [
      "Workshops",
      "Retainer-based advisory services",
      "Templates or self-service training products",
    ],
    impactNotes: [
      "The community impact depends on which clients are served and what operating improvements are delivered.",
    ],
  },
  {
    id: "ecommerce",
    keywords: ["ecommerce", "e-commerce", "online store", "web shop"],
    businessType: "Online retail business",
    suggestions: [
      {
        code: "44-45",
        title: "Retail Trade sector - product-specific classification required",
        rationale:
          "Placeholder for an online retailer until the primary merchandise line is known.",
      },
    ],
    spinOffProducts: [
      "Subscription bundles",
      "Wholesale packages",
      "Digital buying guides",
    ],
    impactNotes: [
      "Packaging, shipping distance, returns, and supplier practices should be evaluated.",
    ],
  },
];

export function suggestNaicsCodes(
  idea: BusinessIdeaIntake,
): SuggestedNaicsCode[] {
  const founderGuess = idea.naicsGuess
    ? [
        {
          code: idea.naicsGuess,
          title: "Founder-provided NAICS guess",
          rationale:
            "Preserved from intake as a candidate classification; it has not been verified.",
          origin: "founder_guess" as const,
          verificationRequired: true,
        },
      ]
    : [];

  const mappedSuggestions = findMockNaicsMappings(idea).flatMap((mapping) =>
    mapping.suggestions.map((suggestion) => ({
      ...suggestion,
      origin: "mock_mapping" as const,
      verificationRequired: true,
    })),
  );

  return dedupeByCode([...founderGuess, ...mappedSuggestions]);
}

export function findMockNaicsMappings(
  idea: BusinessIdeaIntake,
): MockNaicsMapping[] {
  const searchText = [
    idea.businessName,
    idea.businessIdea,
    idea.productOrService,
    idea.proposedSolution,
    idea.industry,
  ]
    .join(" ")
    .toLowerCase();

  return MOCK_NAICS_MAPPINGS.filter((mapping) =>
    mapping.keywords.some((keyword) => searchText.includes(keyword)),
  );
}

function dedupeByCode(suggestions: SuggestedNaicsCode[]): SuggestedNaicsCode[] {
  const seen = new Set<string>();
  return suggestions.filter((suggestion) => {
    if (seen.has(suggestion.code)) {
      return false;
    }
    seen.add(suggestion.code);
    return true;
  });
}
