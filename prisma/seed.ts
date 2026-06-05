import { PrismaClient } from "@prisma/client";
import { resources, sampleProjects, statePrograms } from "./seed-data";

const isDryRun = process.argv.includes("--dry-run");

async function main() {
  validateFixtures();

  if (isDryRun) {
    console.info(
      `Seed fixtures valid: ${sampleProjects.length} projects, ${statePrograms.length} state programs, ${resources.length} resources.`,
    );
    return;
  }

  const prisma = new PrismaClient();
  try {
    const user = await prisma.user.upsert({
      where: { email: "demo@ventureforge.local" },
      update: { name: "VentureForge Demo Founder" },
      create: {
        email: "demo@ventureforge.local",
        name: "VentureForge Demo Founder",
      },
    });

    for (const fixture of seedProjects()) {
      const { founder, idea } = fixture.intake;
      await prisma.businessProject.upsert({
        where: { id: fixture.id },
        update: {
          name: idea.businessName,
          city: idea.city,
          county: idea.county,
          stateCode: idea.state,
          zipCode: idea.zipCode,
          summary: idea.businessIdea,
          workspaceState: workspaceState(fixture),
          founderProfile: {
            upsert: {
              update: founderData(founder),
              create: founderData(founder),
            },
          },
          businessIdea: {
            upsert: {
              update: ideaData(idea),
              create: ideaData(idea),
            },
          },
        },
        create: {
          id: fixture.id,
          userId: user.id,
          name: idea.businessName,
          city: idea.city,
          county: idea.county,
          stateCode: idea.state,
          zipCode: idea.zipCode,
          summary: idea.businessIdea,
          workspaceState: workspaceState(fixture),
          founderProfile: { create: founderData(founder) },
          businessIdea: { create: ideaData(idea) },
        },
      });
    }

    for (const program of statePrograms) {
      await prisma.stateProgram.upsert({
        where: {
          stateCode_title: {
            stateCode: program.stateCode,
            title: program.title,
          },
        },
        update: program,
        create: program,
      });
    }

    for (const resource of resources) {
      await prisma.resource.upsert({
        where: { url: resource.url },
        update: resource,
        create: resource,
      });
    }

    console.info(
      `Seed complete: ${sampleProjects.length} projects, ${statePrograms.length} state programs, ${resources.length} resources.`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

function seedProjects() {
  const first = sampleProjects[0];
  return first ? [...sampleProjects, { ...first, id: "demo" }] : sampleProjects;
}

function validateFixtures() {
  if (sampleProjects.length !== 5) {
    throw new Error("Expected five sample projects.");
  }
  if (new Set(statePrograms.map((program) => program.stateCode)).size !== 3) {
    throw new Error("Expected state programs for AZ, PA, and CA.");
  }
  if (resources.length < 10) {
    throw new Error("Expected the core official-resource seed set.");
  }
}

function founderData(founder: (typeof sampleProjects)[number]["intake"]["founder"]) {
  return {
    founderName: founder.founderName,
    founderExperience: founder.founderExperience,
    skills: founder.skills,
    industryExperience: founder.industryExperience,
    startupCapital: founder.availableStartupCapital,
    desiredFunding: founder.desiredFundingAmount,
    creditReadiness: founder.creditReadinessSelfAssessment,
    riskTolerance: founder.riskTolerance,
    weeklyAvailableHours: founder.weeklyAvailableHours,
    launchTimeline: founder.launchTimeline,
    ownershipAttributes: founder.ownershipAttributes,
  };
}

function ideaData(idea: (typeof sampleProjects)[number]["intake"]["idea"]) {
  return {
    businessName: idea.businessName,
    businessIdea: idea.businessIdea,
    productOrService: idea.productOrService,
    customerProblem: idea.customerProblem,
    proposedSolution: idea.proposedSolution,
    targetCustomer: idea.targetCustomer,
    businessModels: [idea.businessModel],
    industry: idea.industry,
    naicsGuess: idea.naicsGuess,
    knownCompetitors: idea.knownCompetitors,
    pricingIdea: idea.pricingIdea,
    expectedStartupCosts: idea.expectedStartupCosts,
    staffingPlan: idea.staffingPlan,
    requiredEquipment: idea.requiredEquipment,
    licensingConcerns: idea.licensingConcerns,
    fundingNeed: idea.fundingNeed,
    websiteNeeds: idea.websiteNeeds,
  };
}

function workspaceState(fixture: (typeof sampleProjects)[number]) {
  return {
    financialInput: {
      startupCosts: fixture.intake.idea.expectedStartupCosts,
      availableOwnerCapital: fixture.intake.founder.availableStartupCapital,
    },
    proofOfConcept: {},
    websiteTone: "professional",
  };
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
