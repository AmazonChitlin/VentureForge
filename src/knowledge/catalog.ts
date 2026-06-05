export interface KnowledgePackDescriptor {
  id: string;
  title: string;
  filename: string;
}

export const knowledgePackCatalog = [
  pack("business-plan", "Business plan framework", "business-plan-framework.json"),
  pack("feasibility", "Opportunity feasibility framework", "opportunity-feasibility-framework.json"),
  pack("market-research", "Market research methods", "market-research-methods.json"),
  pack("customer-analysis", "Customer analysis framework", "customer-analysis-framework.json"),
  pack("competitor-analysis", "Competitor analysis framework", "competitor-analysis-framework.json"),
  pack("strategy-analysis", "Strategy analysis framework", "strategy-analysis-framework.json"),
  pack("strategy-execution", "Strategy execution framework", "strategy-execution-framework.json"),
  pack("financial-planning", "Financial planning framework", "financial-planning-framework.json"),
  pack("funding-readiness", "Funding readiness framework", "funding-readiness-framework.json"),
  pack("state-launch", "State launch framework", "state-launch-framework.json"),
  pack("website-generation", "Website generation framework", "website-generation-framework.json"),
  pack("risk-contingency", "Risk and contingency framework", "risk-contingency-framework.json"),
] satisfies KnowledgePackDescriptor[];

function pack(id: string, title: string, filename: string): KnowledgePackDescriptor {
  return { id, title, filename };
}

export function getKnowledgeDescriptor(
  id: string,
): KnowledgePackDescriptor | undefined {
  return knowledgePackCatalog.find((descriptor) => descriptor.id === id);
}
