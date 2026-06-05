import type { ModuleDescriptor } from "@/engine/shared/module";

export const moduleCatalog = [
  descriptor("intake", "Intake", 1, [], "Capture founder and business-idea inputs."),
  descriptor("concept", "Concept", 2, ["intake"], "Shape a structured business concept."),
  descriptor("feasibility", "Feasibility", 3, ["concept"], "Evaluate whether deeper validation is warranted."),
  descriptor("market-research", "Market research", 4, ["concept"], "Gather sourced market evidence."),
  descriptor("customer-analysis", "Customer analysis", 5, ["concept"], "Clarify customers and discovery work."),
  descriptor("competitor-analysis", "Competitor analysis", 6, ["market-research"], "Map alternatives and positioning."),
  descriptor("strategy", "Strategy", 7, ["feasibility", "customer-analysis", "competitor-analysis"], "Choose an evidence-aware position."),
  descriptor("execution", "Execution", 8, ["strategy"], "Convert strategy into initiatives."),
  descriptor("business-plan", "Business plan", 9, ["execution"], "Assemble editable planning documents."),
  descriptor("financials", "Financials", 10, ["concept"], "Trace editable assumptions into projections."),
  descriptor("funding", "Funding", 11, ["business-plan", "financials"], "Assess readiness and possible pathways."),
  descriptor("state-programs", "State programs", 12, ["intake"], "Point founders to official state and local resources."),
  descriptor("launch-roadmap", "Launch roadmap", 13, ["execution", "state-programs"], "Create staged launch tasks."),
  descriptor("risk", "Risk", 14, ["feasibility", "financials"], "Track risks and contingencies."),
  descriptor("website", "Website", 15, ["concept", "strategy"], "Generate an aligned website package."),
  descriptor("plugins", "Plugins", 16, [], "Register future expansion modules."),
] satisfies ModuleDescriptor[];

function descriptor(
  id: string,
  title: string,
  stage: number,
  dependsOn: string[],
  purpose: string,
): ModuleDescriptor {
  return { id, title, stage, dependsOn, purpose };
}
