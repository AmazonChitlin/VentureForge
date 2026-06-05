import { BusinessPlanEngine } from "@/engine/business-plan";
import { CompetitorAnalysisEngine } from "@/engine/competitor-analysis";
import { BusinessConceptEngine } from "@/engine/concept";
import { CustomerAnalysisEngine } from "@/engine/customer-analysis";
import { StrategyExecutionEngine } from "@/engine/execution";
import { FeasibilityEngine } from "@/engine/feasibility";
import { FinancialEngine } from "@/engine/financials";
import { FundingEngine } from "@/engine/funding";
import { IntakeEngine } from "@/engine/intake";
import { LaunchRoadmapEngine } from "@/engine/launch-roadmap";
import { MarketResearchEngine } from "@/engine/market-research";
import { RiskEngine } from "@/engine/risk";
import type { EngineResult } from "@/engine/shared/engine-result";
import { StateProgramEngine } from "@/engine/state-programs";
import { StrategicAnalysisEngine } from "@/engine/strategy";
import { WebsiteEngine } from "@/engine/website";
import { workspaceModuleCatalogByKey } from "@/lib/project-workspace/catalog";
import {
  markEngineOutputFailed,
  markEngineOutputPending,
  saveEngineOutput,
} from "@/lib/repositories/engineOutputRepository";
import { logError } from "@/lib/logging/safeLogger";
import type {
  WorkspaceModuleKey,
  WorkspaceProject,
} from "@/lib/project-workspace/types";

export async function runWorkspaceModule(
  project: WorkspaceProject,
  key: WorkspaceModuleKey,
  options: { persist?: boolean; userId?: string } = {},
): Promise<WorkspaceProject> {
  const persist = options.persist ?? true;
  if (persist && !options.userId) {
    throw new Error("Authenticated project ownership is required to save engine output.");
  }
  const userId = options.userId;
  let parentPendingMarked = false;
  if (persist && userId) {
    parentPendingMarked = await markEngineOutputPending(project.id, key, userId);
    if (!parentPendingMarked) {
      throw new Error("Project no longer exists.");
    }
  }
  try {
    await ensureDependencies(project, key, persist, userId);
  } catch (error) {
    if (persist && userId) {
      await markEngineOutputFailed(project.id, key, userId, error);
    }
    throw error;
  }
  return generateAndPersist(project, key, persist, userId, {
    skipPending: parentPendingMarked,
  });
}

async function ensureDependencies(
  project: WorkspaceProject,
  key: WorkspaceModuleKey,
  persist: boolean,
  userId?: string,
): Promise<void> {
  const descriptor = workspaceModuleCatalogByKey.get(key);
  for (const dependency of descriptor?.dependencies ?? []) {
    if (!project.outputs[dependency]) {
      await ensureDependencies(project, dependency, persist, userId);
      await generateAndPersist(project, dependency, persist, userId);
    }
  }
}

async function generateAndPersist(
  project: WorkspaceProject,
  key: WorkspaceModuleKey,
  persist: boolean,
  userId?: string,
  options: { skipPending?: boolean } = {},
): Promise<WorkspaceProject> {
  if (
    persist &&
    userId &&
    !options.skipPending &&
    !(await markEngineOutputPending(project.id, key, userId))
  ) {
    throw new Error("Project no longer exists.");
  }

  try {
    const output = await generateOutput(project, key);
    project.outputs[key] = output;
    if (persist && userId && !(await saveEngineOutput(project.id, key, output, userId))) {
      throw new Error("Project no longer exists.");
    }
    const completedAt = new Date().toISOString();
    project.generationStatuses[key] = {
      completedAt,
      errorMessage: null,
      failedAt: null,
      retryAvailable: true,
      sanitizedErrorMessage: null,
      startedAt: project.generationStatuses[key]?.startedAt ?? completedAt,
      status: "completed",
      updatedAt: completedAt,
    };
    project.updatedAt = new Date().toISOString();
    return project;
  } catch (error) {
    if (persist && userId) {
      await markEngineOutputFailed(project.id, key, userId, error);
      const failedAt = new Date().toISOString();
      project.generationStatuses[key] = {
        completedAt: null,
        errorMessage: "VentureForge could not safely finish this generation. You can retry.",
        failedAt,
        retryAvailable: true,
        sanitizedErrorMessage: "VentureForge could not safely finish this generation. You can retry.",
        startedAt: project.generationStatuses[key]?.startedAt ?? failedAt,
        status: "failed",
        updatedAt: failedAt,
      };
    }
    logError("generation_failure", error, {
      moduleKey: key,
      projectId: project.id,
    });
    throw error;
  }
}

async function generateOutput(
  project: WorkspaceProject,
  key: WorkspaceModuleKey,
): Promise<EngineResult<unknown>> {
  const { founder, idea } = project.intake;
  const concept = data(project, "concept");
  const market = data(project, "market");
  const customers = data(project, "customers");
  const competitors = data(project, "competitors");
  const feasibility = data(project, "feasibility");
  const strategy = data(project, "strategy");
  const execution = data(project, "execution");
  const financials = data(project, "financials");
  const funding = data(project, "funding");
  const state = data(project, "state");
  const launch = data(project, "launch");
  const risk = data(project, "risk");

  switch (key) {
    case "intake":
      return IntakeEngine.evaluate(project.intake);
    case "concept":
      return BusinessConceptEngine.generate({
        ...project.intake,
        intakeEvaluation: data(project, "intake"),
      });
    case "market":
      return MarketResearchEngine.generate({
        projectId: project.id,
        businessConcept: required(concept, "business concept"),
        idea,
        manualResearchEntries: [],
      });
    case "customers":
      return CustomerAnalysisEngine.generate({
        businessConcept: required(concept, "business concept"),
        idea,
        marketResearchReport: market,
      });
    case "competitors":
      return CompetitorAnalysisEngine.analyze({
        knownCompetitors: idea.knownCompetitors,
        location: {
          city: idea.city,
          county: idea.county,
          stateCode: idea.state,
          zipCode: idea.zipCode,
        },
        industry: idea.industry,
        targetCustomer:
          customers?.primaryCustomerPersona.segment ?? idea.targetCustomer,
        pricingIdea: idea.pricingIdea,
        manualCompetitorRecords: [],
      });
    case "feasibility":
      return FeasibilityEngine.evaluate({
        businessConcept: required(concept, "business concept"),
        founder,
        idea,
        marketResearchReport: market ? toFeasibilityMarket(market) : undefined,
        competitorAnalysis: competitors
          ? toFeasibilityCompetitors(competitors)
          : undefined,
        financialAssumptions: toFeasibilityFinancials(project),
        regulatoryNotes: {
          complexity: idea.licensingConcerns.length > 2 ? "high" : "unknown",
          permits: idea.licensingConcerns,
          unresolvedItems: idea.licensingConcerns,
          highRiskRequirements: [],
          notes: [],
        },
        proofOfConcept: project.proofOfConcept,
      });
    case "strategy":
      return StrategicAnalysisEngine.generate({
        businessConcept: required(concept, "business concept"),
        feasibilityReport: feasibility,
        marketResearchReport: market,
        customerAnalysis: customers,
        competitorAnalysis: competitors,
        founder,
        serviceBusiness: ["service", "mobile", "home_based"].includes(
          idea.businessModel,
        ),
      });
    case "execution":
      return StrategyExecutionEngine.buildExecutionPlan({
        businessConcept: required(concept, "business concept"),
        feasibilityReport: feasibility,
        marketResearchReport: market,
        customerAnalysis: customers,
        competitorAnalysis: competitors,
        strategicAnalysis: strategy,
        founder,
        businessModel: idea.businessModel,
        location: {
          city: idea.city,
          county: idea.county,
          stateCode: idea.state,
          zipCode: idea.zipCode,
        },
        regulatoryConcerns: idea.licensingConcerns,
        websiteNeeded: true,
      });
    case "financials":
      return FinancialEngine.generate({
        startupCosts: idea.expectedStartupCosts || undefined,
        availableOwnerCapital: founder.availableStartupCapital || undefined,
        ...project.financialInput,
      });
    case "funding":
      return FundingEngine.match({
        founder,
        idea,
        businessConcept: concept,
        feasibilityReport: feasibility,
        financialProjection: financials,
        marketResearchReport: market,
        businessPlanCompleteness: data<{ overallConfidence: number }>(
          project,
          "plan",
        )?.overallConfidence,
      });
    case "state":
      return StateProgramEngine.generateChecklist({ founder, idea });
    case "launch":
      return LaunchRoadmapEngine.generate({
        executionPlan: required(execution, "execution plan"),
        businessModel: idea.businessModel,
      });
    case "risk":
      return RiskEngine.generate({
        founder,
        idea,
        feasibilityReport: feasibility,
        financialProjection: financials,
        strategicAnalysis: strategy,
        websiteOrMarketingCritical: ["online", "hybrid"].includes(
          idea.businessModel,
        ),
      });
    case "plan":
      return BusinessPlanEngine.generate(
        {
          founder,
          idea,
          businessConcept: required(concept, "business concept"),
          feasibilityReport: feasibility,
          marketResearchReport: market,
          customerAnalysis: customers,
          competitorAnalysis: competitors,
          strategicAnalysis: strategy,
          executionPlan: execution,
          financialProjection: financials,
          fundingMatchResult: funding,
          stateLaunchChecklist: state,
          launchRoadmap: launch,
          riskRegister: risk,
        },
        "traditional_plan",
      );
    case "website":
      return WebsiteEngine.generate({
        businessName: idea.businessName,
        brandStyle: "Clear, credible, founder-friendly",
        targetCustomer: idea.targetCustomer,
        productsServices: idea.productOrService
          ? [idea.productOrService]
          : [],
        location: {
          city: idea.city,
          state: idea.state,
          zipCode: idea.zipCode,
        },
        contactInfo: {},
        hours: [],
        tone: project.websiteTone,
        callToAction: "Contact us to get started",
        valueProposition: required(concept, "business concept").coreCustomerBenefit,
        customerPainPoints: customers?.customerPainPoints ?? [],
        differentiators: [required(concept, "business concept").differentiator],
        seoKeywords: [idea.industry, idea.productOrService].filter(Boolean),
        localServiceArea: [idea.city, idea.state].filter(Boolean),
        businessConcept: required(concept, "business concept"),
        customerAnalysis: customers,
        marketingStrategy: strategy?.strategicRecommendations.marketingStrategy,
        positioningStrategy:
          strategy?.strategicRecommendations.positioningStrategy,
      });
  }
}

function data<T = any>(
  project: WorkspaceProject,
  key: WorkspaceModuleKey,
): T | undefined {
  return project.outputs[key]?.data as T | undefined;
}

function required<T>(value: T | undefined, title: string): T {
  if (value === undefined) {
    throw new Error(`Missing required ${title}.`);
  }
  return value;
}

function toFeasibilityMarket(report: any) {
  return {
    demandScore: report.demandSignals.length ? 35 : 15,
    marketSizeScore: report.marketSizeEstimate.includes("unavailable") ? 20 : 35,
    localOpportunityScore: report.containsMockData ? 25 : 55,
    confidence: report.confidenceLevel.score,
    demandSignals: report.demandSignals,
    missingData: report.missingData,
    sources: report.sourcesUsed,
  };
}

function toFeasibilityCompetitors(report: any) {
  const competitors =
    report.directCompetitors.length + report.indirectCompetitors.length;
  const saturationLevel: "high" | "moderate" | "unknown" =
    competitors >= 5 ? "high" : competitors >= 2 ? "moderate" : "unknown";
  return {
    saturationLevel,
    differentiationScore: report.whiteSpaceOpportunities.length ? 45 : 25,
    competitorsIdentified: competitors,
    barriersToEntry: report.barriersToEntry,
    notes: report.differentiationRecommendations,
  };
}

function toFeasibilityFinancials(project: WorkspaceProject) {
  const { founder, idea } = project.intake;
  return {
    startupCosts:
      project.financialInput.startupCosts ?? idea.expectedStartupCosts,
    notes: [
      `Founder-entered available capital: $${founder.availableStartupCapital}.`,
      "Detailed financial projection should be generated and reviewed.",
    ],
  };
}
