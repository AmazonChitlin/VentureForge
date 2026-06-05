import {
  GuidedStepSchema,
  type GuidedStep,
  type GuidedStepId,
} from "@/engine/guided-builder/schema";

export const guidedSteps: GuidedStep[] = [
  {
    id: "welcome",
    journeySection: "Idea",
    title: "Let’s build your business step by step",
    subtitle:
      "You do not need to know business terms. Answer simple questions, and VentureForge will organize the details for you.",
    kind: "welcome",
    learnedMessage:
      "We will build your business profile, safer next steps, plan, and starter website as you go.",
    mapsTo: [],
  },
  {
    id: "idea_basics",
    journeySection: "Idea",
    title: "Start with your idea",
    subtitle: "A rough idea is enough. We will help you make it clearer.",
    kind: "question",
    question: {
      field: "businessIdea",
      question: "What kind of business do you want to start?",
      helperText:
        "Describe it in your own words. A sentence or two is enough. You can change this later.",
      whyItMatters:
        "This gives us the starting point for your business profile. We use your own words first, then suggest details to review.",
      examples: [
        "I want to open a punk record store near ASU that also sells shirts and local art.",
        "I want to start a mobile detailing service for busy families.",
        "I want to sell bookkeeping help to small restaurants.",
      ],
      inputControl: "textarea",
      allowUnsure: true,
      canSkip: false,
      choices: [],
    },
    learnedMessage:
      "This answer helps us shape your idea, suggest what to research, and build your plan later.",
    mapsTo: ["idea.businessIdea", "idea.industry", "concept.revenueStreams"],
  },
  {
    id: "customer_basics",
    journeySection: "Customers",
    title: "Picture your first customer",
    subtitle: "Start with the people most likely to try you first.",
    kind: "question",
    question: {
      field: "targetCustomer",
      question: "Who is most likely to buy from you first?",
      helperText:
        "Think about the first group of people who would actually spend money on this.",
      whyItMatters:
        "Knowing your first customer helps us estimate demand, suggest marketing ideas, and write a useful customer section.",
      examples: [
        "Busy parents near my neighborhood",
        "College students near ASU",
        "Contractors who need mobile equipment repair",
      ],
      inputControl: "textarea",
      allowUnsure: true,
      canSkip: false,
      choices: [],
    },
    learnedMessage:
      "We can use this group to test demand, choose marketing channels, and compare alternatives.",
    mapsTo: ["idea.targetCustomer", "customer.earlyAdopterProfile"],
  },
  {
    id: "location_model",
    journeySection: "Market",
    title: "Choose where the business happens",
    subtitle: "Location changes your market, costs, and possible permits.",
    kind: "question",
    question: {
      field: "businessModel",
      question: "How will customers buy from you?",
      helperText:
        "Tell us where you will operate and choose the closest fit. You can adjust this later.",
      whyItMatters:
        "A storefront, mobile service, and online shop need different market research, startup costs, and setup steps.",
      examples: [
        "Customers visit my shop",
        "I go to the customer",
        "Customers order online",
      ],
      inputControl: "location",
      allowUnsure: true,
      canSkip: false,
      choices: [
        {
          value: "physical_location",
          label: "Customers visit me",
          description: "A shop, office, studio, or other location",
          icon: "store",
        },
        {
          value: "mobile",
          label: "I go to customers",
          description: "A mobile service or delivery model",
          icon: "truck",
        },
        {
          value: "online",
          label: "Mostly online",
          description: "Customers buy or book through the internet",
          icon: "globe",
        },
        {
          value: "hybrid",
          label: "A mix of these",
          description: "More than one way to buy",
          icon: "layers",
        },
      ],
    },
    learnedMessage:
      "Your operating model tells us which local questions, market checks, and cost estimates matter most.",
    mapsTo: [
      "idea.city",
      "idea.county",
      "idea.state",
      "idea.zipCode",
      "idea.businessModel",
    ],
  },
  {
    id: "products_services",
    journeySection: "Idea",
    title: "Describe what you will sell",
    subtitle: "Keep it practical. Start with your main offer.",
    kind: "question",
    question: {
      field: "productOrService",
      question: "What will customers pay you for?",
      helperText:
        "List your main product or service first. Add the customer problem if you know it.",
      whyItMatters:
        "Your offer affects pricing, costs, competitors, and the first version of your website.",
      examples: [
        "New and used records, band shirts, and local art",
        "Exterior wash and interior detailing packages",
        "Weekly bookkeeping and monthly reporting",
      ],
      inputControl: "products",
      allowUnsure: true,
      canSkip: false,
      choices: [],
    },
    learnedMessage:
      "Now we can connect what you sell to a customer problem and estimate a simple revenue model.",
    mapsTo: ["idea.productOrService", "idea.customerProblem"],
  },
  {
    id: "differentiation",
    journeySection: "Market",
    title: "Find your practical edge",
    subtitle: "Different does not have to mean revolutionary.",
    kind: "question",
    question: {
      field: "differentiator",
      question: "Why might a customer choose you instead of another option?",
      helperText:
        "Think cheaper, faster, easier, friendlier, more specialized, or more convenient.",
      whyItMatters:
        "A clear reason to choose you helps us compare competitors and suggest a safer way to test the idea.",
      examples: [
        "Curated punk and metal records with local bands featured in-store",
        "Mobile appointments at the customer’s home or office",
        "Bookkeeping explained in plain language for restaurant owners",
      ],
      inputControl: "textarea",
      allowUnsure: true,
      canSkip: true,
      choices: [],
    },
    learnedMessage:
      "Your first differentiator is a hypothesis. We will treat it as something to test with customers.",
    mapsTo: ["idea.proposedSolution", "concept.differentiator"],
  },
  {
    id: "startup_costs",
    journeySection: "Money",
    title: "Estimate what you need to open",
    subtitle: "A rough estimate is useful. Exact numbers can come later.",
    kind: "question",
    question: {
      field: "startupCosts",
      question: "What do you need before you can open?",
      helperText:
        "Add a best guess for each item. Leave anything blank if you are unsure.",
      whyItMatters:
        "Startup costs show whether you can test the idea cheaply or need a funding plan before committing money.",
      examples: ["Equipment", "Starting inventory", "A deposit for a space"],
      inputControl: "cost_checklist",
      allowUnsure: true,
      canSkip: true,
      choices: [],
    },
    learnedMessage:
      "This gives us a starting estimate. Every number remains editable and any missing number stays labeled as an estimate.",
    mapsTo: [
      "idea.expectedStartupCosts",
      "financial.startupCosts",
      "financial.equipment",
      "financial.inventory",
    ],
  },
  {
    id: "money_funding",
    journeySection: "Funding",
    title: "Make a simple money estimate",
    subtitle: "We will do the math. You only need a reasonable first guess.",
    kind: "question",
    question: {
      field: "pricePerSale",
      question: "What might one normal sale cost, and how many could happen each week?",
      helperText:
        "A rough guess is enough. We use it to show a simple monthly estimate and possible funding gap.",
      whyItMatters:
        "A simple sales estimate helps you see whether the model deserves more research before you spend serious money.",
      examples: ["$25 per sale and 80 sales each week", "$150 per service and 8 jobs each week"],
      inputControl: "money_calculator",
      allowUnsure: true,
      canSkip: true,
      choices: [],
    },
    learnedMessage:
      "We can now generate a beginner-friendly estimate and clearly label anything that still needs research.",
    mapsTo: [
      "idea.pricingIdea",
      "founder.availableStartupCapital",
      "founder.desiredFundingAmount",
      "financial.pricePerUnitService",
      "financial.expectedUnitSales",
    ],
  },
  {
    id: "state_legal",
    journeySection: "Launch",
    title: "Flag rules that may apply",
    subtitle: "You do not need to know permit names. Just tell us what sounds relevant.",
    kind: "question",
    question: {
      field: "regulatedActivities",
      question: "Could any of these describe your business?",
      helperText:
        "Choose anything that might apply. We will create a checklist and ask you to verify it with official agencies.",
      whyItMatters:
        "Some activities need extra setup steps. Spotting them early can prevent expensive surprises.",
      examples: ["Food or drinks", "Employees", "Customers visiting a location"],
      inputControl: "flag_checklist",
      allowUnsure: true,
      canSkip: true,
      choices: [],
    },
    learnedMessage:
      "We will use these flags to prepare a state checklist. Official agencies still make the final call.",
    mapsTo: [
      "idea.licensingConcerns",
      "state.hasEmployees",
      "state.sellsTaxableGoodsOrServices",
    ],
  },
  {
    id: "profile_review",
    journeySection: "Plan",
    title: "Review your business profile",
    subtitle: "Here is the business we heard you describe.",
    kind: "review",
    learnedMessage:
      "You can edit any answer. Missing details become follow-up questions, not roadblocks.",
    mapsTo: ["intake", "concept"],
  },
  {
    id: "feasibility",
    journeySection: "Market",
    title: "Check the idea before spending money",
    subtitle: "This is a planning check, not a verdict.",
    kind: "result",
    learnedMessage:
      "The safest next steps focus on evidence: customer conversations, small tests, and verified costs.",
    mapsTo: ["feasibility"],
  },
  {
    id: "launch_plan",
    journeySection: "Launch",
    title: "Build your launch roadmap",
    subtitle: "Turn the idea into a short list of practical next steps.",
    kind: "result",
    learnedMessage:
      "Start with the lowest-cost proof and the setup steps that could block a launch.",
    mapsTo: ["launch-roadmap", "state-programs"],
  },
  {
    id: "business_plan",
    journeySection: "Plan",
    title: "Build your business plan",
    subtitle: "Your answers are already becoming useful plan sections.",
    kind: "result",
    learnedMessage:
      "Plan sections can stay in draft until the underlying evidence is strong enough to rely on.",
    mapsTo: ["business-plan"],
  },
  {
    id: "website",
    journeySection: "Website",
    title: "Create a starter website",
    subtitle: "Use the same customer and positioning answers to shape your first website.",
    kind: "result",
    learnedMessage:
      "Your website starter should be reviewed and edited before publishing.",
    mapsTo: ["website"],
  },
].map((step) => GuidedStepSchema.parse(step));

export function getGuidedStep(id: GuidedStepId): GuidedStep {
  const step = guidedSteps.find((candidate) => candidate.id === id);
  if (!step) {
    throw new Error(`Unknown guided-builder step: ${id}`);
  }
  return step;
}
