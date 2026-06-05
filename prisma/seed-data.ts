import {
  founderBusinessIntakeSchema,
  type FounderBusinessIntake,
} from "../src/engine/intake/schema";

const defaultFounder = {
  founderName: "Sample Founder",
  founderExperience: "Relevant customer-service, operations, and community experience",
  skills: ["customer service", "operations", "local partnerships"],
  industryExperience: "Early industry experience to verify during planning",
  creditReadinessSelfAssessment: "developing" as const,
  riskTolerance: "moderate" as const,
  weeklyAvailableHours: 40,
  launchTimeline: "90 days",
  ownershipAttributes: {
    veteranOwned: false,
    disabledVeteranOwned: false,
    womanOwned: false,
    minorityOwned: false,
    ruralOwned: false,
    tribalOwned: false,
    immigrantOwned: false,
    justiceImpactedFounder: false,
    studentFounder: false,
    seniorFounder: false,
  },
};

export const sampleProjects = [
  sampleProject({
    id: "sample-tempe-vinyl",
    businessName: "Needle & Groove Records",
    businessIdea: "A neighborhood vinyl record store with curated used records, listening events, and online pickup.",
    productOrService: "Curated vinyl records, accessories, trade-in credit, and listening events",
    customerProblem: "Collectors and new listeners want a trusted local place to discover records without sorting through an overwhelming catalog.",
    targetCustomer: "Music collectors, gift shoppers, and younger vinyl listeners near Tempe",
    city: "Tempe",
    county: "Maricopa County",
    state: "AZ",
    zipCode: "85281",
    businessModel: "physical_location",
    industry: "Retail - prerecorded media",
    naicsGuess: "459210",
    knownCompetitors: ["Local record stores", "Online vinyl marketplaces", "Streaming subscriptions"],
    pricingIdea: "Used records from $8 to $45; premium pressings and accessories from $25 to $120",
    expectedStartupCosts: 67_000,
    availableStartupCapital: 42_000,
    desiredFundingAmount: 25_000,
    requiredEquipment: ["point-of-sale", "display fixtures", "listening station"],
    licensingConcerns: ["Arizona tax registration", "local zoning and occupancy review"],
  }),
  sampleProject({
    id: "sample-phoenix-food-truck",
    businessName: "Desert Route Kitchen",
    businessIdea: "A Phoenix food truck serving a focused lunch menu near employment centers and events.",
    productOrService: "Mobile prepared-food service",
    customerProblem: "Workers and event attendees need a reliable, convenient local lunch option.",
    targetCustomer: "Phoenix lunch customers and event attendees",
    city: "Phoenix",
    county: "Maricopa County",
    state: "AZ",
    zipCode: "85004",
    businessModel: "mobile",
    industry: "Mobile food services",
    naicsGuess: "722330",
    knownCompetitors: ["Nearby food trucks", "Fast-casual restaurants", "Delivery apps"],
    pricingIdea: "Core meals from $11 to $16",
    expectedStartupCosts: 95_000,
    availableStartupCapital: 30_000,
    desiredFundingAmount: 65_000,
    requiredEquipment: ["food truck", "cooking equipment", "point-of-sale"],
    licensingConcerns: ["health department permits", "food-safety requirements", "location permissions"],
  }),
  sampleProject({
    id: "sample-pittsburgh-detailing",
    businessName: "Steel City Mobile Detail",
    businessIdea: "A mobile vehicle detailing service for busy Pittsburgh households and small fleets.",
    productOrService: "Mobile interior and exterior vehicle detailing",
    customerProblem: "Vehicle owners want professional detailing without losing time at a shop.",
    targetCustomer: "Busy households and small fleet operators in Pittsburgh",
    city: "Pittsburgh",
    county: "Allegheny County",
    state: "PA",
    zipCode: "15222",
    businessModel: "mobile",
    industry: "Automotive detailing",
    naicsGuess: "811192",
    knownCompetitors: ["Local detail shops", "Mobile detailing operators", "Automated car washes"],
    pricingIdea: "Packages from $95 to $260",
    expectedStartupCosts: 18_000,
    availableStartupCapital: 12_000,
    desiredFundingAmount: 6_000,
    requiredEquipment: ["water tank", "extractor", "pressure washer"],
    licensingConcerns: ["local operating requirements", "water and runoff review"],
  }),
  sampleProject({
    id: "sample-california-childcare",
    businessName: "Bright Steps Childcare",
    businessIdea: "A California childcare center focused on dependable care and clear parent communication.",
    productOrService: "Licensed center-based childcare",
    customerProblem: "Families need dependable care with transparent communication and a safe routine.",
    targetCustomer: "Working families seeking childcare in Sacramento",
    city: "Sacramento",
    county: "Sacramento County",
    state: "CA",
    zipCode: "95814",
    businessModel: "physical_location",
    industry: "Child day care services",
    naicsGuess: "624410",
    knownCompetitors: ["Licensed childcare centers", "Family childcare homes", "Informal care networks"],
    pricingIdea: "Monthly tuition to be verified against local licensed providers",
    expectedStartupCosts: 180_000,
    availableStartupCapital: 55_000,
    desiredFundingAmount: 125_000,
    requiredEquipment: ["classroom equipment", "security system", "play equipment"],
    licensingConcerns: ["California childcare licensing", "zoning", "health and safety", "staff background checks"],
  }),
  sampleProject({
    id: "sample-arizona-manufacturing",
    businessName: "Sonoran Precision Works",
    businessIdea: "A small Arizona manufacturing shop producing short-run precision components for local business customers.",
    productOrService: "Short-run precision manufacturing services",
    customerProblem: "Local buyers need responsive small-batch production and clear lead times.",
    targetCustomer: "Arizona small manufacturers, repair firms, and product teams",
    city: "Mesa",
    county: "Maricopa County",
    state: "AZ",
    zipCode: "85201",
    businessModel: "manufacturing",
    industry: "Machine shops",
    naicsGuess: "332710",
    knownCompetitors: ["Regional machine shops", "National contract manufacturers", "In-house production"],
    pricingIdea: "Quote-based project pricing with setup, material, and labor components",
    expectedStartupCosts: 260_000,
    availableStartupCapital: 85_000,
    desiredFundingAmount: 175_000,
    requiredEquipment: ["machining equipment", "inspection tools", "material handling"],
    licensingConcerns: ["zoning", "workplace safety", "environmental and waste review"],
  }),
] satisfies SampleProject[];

export const statePrograms = [
  stateProgram("AZ", "Arizona Corporation Commission", "Entity formation", "Arizona Corporation Commission", "https://azcc.gov/corporations"),
  stateProgram("AZ", "Arizona Department of Revenue", "Tax registration", "Arizona Department of Revenue", "https://azdor.gov/business"),
  stateProgram("PA", "Pennsylvania business registration", "Entity formation", "Pennsylvania Department of State", "https://www.pa.gov/agencies/dos/programs/business.html"),
  stateProgram("PA", "Pennsylvania tax registration", "Tax registration", "Pennsylvania Department of Revenue", "https://www.pa.gov/agencies/revenue.html"),
  stateProgram("CA", "California business formation", "Entity formation", "California Secretary of State", "https://bizfileonline.sos.ca.gov/"),
  stateProgram("CA", "California tax and permit registration", "Tax registration", "California Tax Service Center", "https://www.taxes.ca.gov/"),
] as const;

export const resources = [
  resource("SBA: Write your business plan", "SBA", "Planning", "https://www.sba.gov/business-guide/plan-your-business/write-your-business-plan"),
  resource("SBA: Market research and competitive analysis", "SBA", "Research", "https://www.sba.gov/business-guide/plan-your-business/market-research-competitive-analysis"),
  resource("SBA: Loans", "SBA", "Funding", "https://www.sba.gov/funding-programs/loans"),
  resource("Census Data API", "U.S. Census Bureau", "Live data", "https://www.census.gov/data/developers.html"),
  resource("BLS Public Data API", "BLS", "Live data", "https://www.bls.gov/developers/"),
  resource("Grants.gov", "Grants.gov", "Funding", "https://www.grants.gov/"),
  resource("SAM.gov", "SAM.gov", "Contracting", "https://sam.gov/"),
  resource("SCORE", "SCORE", "Advising", "https://www.score.org/"),
  resource("America's SBDC", "America's SBDC", "Advising", "https://americassbdc.org/"),
  resource("Veterans Business Outreach Center", "SBA", "Advising", "https://www.sba.gov/local-assistance/resource-partners/veterans-business-outreach-center-vboc-program"),
] as const;

export interface SampleProject {
  id: string;
  intake: FounderBusinessIntake;
}

function sampleProject(
  input: Omit<FounderBusinessIntake["idea"], "proposedSolution" | "staffingPlan" | "fundingNeed" | "websiteNeeds"> & {
    id: string;
    availableStartupCapital: number;
    desiredFundingAmount: number;
  },
): SampleProject {
  const {
    id,
    availableStartupCapital,
    desiredFundingAmount,
    ...idea
  } = input;
  const intake = founderBusinessIntakeSchema.parse({
    founder: {
      ...defaultFounder,
      availableStartupCapital,
      desiredFundingAmount,
    },
    idea: {
      ...idea,
      proposedSolution: input.businessIdea,
      staffingPlan: "Founder-led launch with staffing verified from the operating plan.",
      fundingNeed: "Use staged owner capital and appropriate financing for verified costs.",
      websiteNeeds: "Local-search website, clear offer, FAQs, and inquiry capture.",
    },
  });
  return { id, intake };
}

function stateProgram(
  stateCode: string,
  title: string,
  category: string,
  agency: string,
  url: string,
) {
  return {
    stateCode,
    title,
    category,
    agency,
    url,
    description: "Verify the current filing or registration requirements with the official agency.",
    eligibilityTags: [],
    industries: [],
    sourceType: "official",
  };
}

function resource(title: string, sourceName: string, category: string, url: string) {
  return {
    title,
    sourceName,
    sourceType: "official",
    url,
    category,
    tags: [category.toLowerCase()],
    description: `Official resource for ${category.toLowerCase()} work.`,
    reliabilityLevel: "official",
    notes: "Verify the current page and program details before relying on them.",
  };
}
