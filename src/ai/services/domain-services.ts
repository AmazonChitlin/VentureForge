import type { PromptTemplateId } from "@/ai/prompts/prompt-template-loader";

import { BaseAIEnhancementService } from "./base-ai-enhancement-service";
import { createOptionalLLMClient } from "./client-factory";
import type { LLMClient } from "./llm-client";

class DomainAIService extends BaseAIEnhancementService {
  constructor(promptId: PromptTemplateId, client?: LLMClient) {
    super(promptId, client ?? createOptionalLLMClient());
  }
}

export class IntakeQuestionService extends DomainAIService {
  constructor(client?: LLMClient) {
    super("intake-questions", client);
  }
}

export class BusinessConceptAIService extends DomainAIService {
  constructor(client?: LLMClient) {
    super("business-concept", client);
  }
}

export class FeasibilityAIService extends DomainAIService {
  constructor(client?: LLMClient) {
    super("feasibility", client);
  }
}

export class MarketResearchAIService extends DomainAIService {
  constructor(client?: LLMClient) {
    super("market-research", client);
  }
}

export class CustomerAnalysisAIService extends DomainAIService {
  constructor(client?: LLMClient) {
    super("customer-analysis", client);
  }
}

export class CompetitorAnalysisAIService extends DomainAIService {
  constructor(client?: LLMClient) {
    super("competitor-analysis", client);
  }
}

export class StrategyAIService extends DomainAIService {
  constructor(client?: LLMClient) {
    super("strategy", client);
  }
}

export class BusinessPlanAIService extends DomainAIService {
  constructor(client?: LLMClient) {
    super("business-plan", client);
  }
}

export class FinancialNarrativeAIService extends DomainAIService {
  constructor(client?: LLMClient) {
    super("financial-narrative", client);
  }
}

export class FundingMatchAIService extends DomainAIService {
  constructor(client?: LLMClient) {
    super("funding-match", client);
  }
}

export class StateChecklistAIService extends DomainAIService {
  constructor(client?: LLMClient) {
    super("state-checklist", client);
  }
}

export class LaunchRoadmapAIService extends DomainAIService {
  constructor(client?: LLMClient) {
    super("launch-roadmap", client);
  }
}

export class WebsiteAIService extends DomainAIService {
  constructor(client?: LLMClient) {
    super("website", client);
  }
}

export class RiskAIService extends DomainAIService {
  constructor(client?: LLMClient) {
    super("risk", client);
  }
}
