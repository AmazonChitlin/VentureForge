import {
  ProofOfConceptEvidenceSchema,
  ProofOfConceptScoreSchema,
  type ProofOfConceptEvidence,
  type ProofOfConceptScore,
  type ProofOfConceptStage,
} from "@/engine/feasibility/schema";

type ProofStageDefinition = {
  title: string;
  score: number;
};

const PROOF_STAGE_DEFINITIONS: Record<
  ProofOfConceptStage,
  ProofStageDefinition
> = {
  idea_only: { title: "Idea only", score: 10 },
  prototype: { title: "Prototype", score: 25 },
  customer_interview_evidence: {
    title: "Customer interview evidence",
    score: 35,
  },
  letter_of_intent: { title: "Letter of intent", score: 45 },
  beta_customer: { title: "Beta customer", score: 55 },
  first_sale: { title: "First sale", score: 65 },
  purchase_order: { title: "Purchase order", score: 78 },
  repeat_sales: { title: "Repeat sales", score: 85 },
  active_revenue: { title: "Active revenue", score: 95 },
};

const PROOF_STAGE_ORDER = Object.keys(
  PROOF_STAGE_DEFINITIONS,
) as ProofOfConceptStage[];

export function scoreProofOfConcept(
  input?: Partial<ProofOfConceptEvidence>,
): ProofOfConceptScore {
  const evidence = ProofOfConceptEvidenceSchema.parse(input ?? {});
  const stage = strongestStage(evidence);
  const definition = PROOF_STAGE_DEFINITIONS[stage];
  const evidenceNotes = describeEvidence(evidence);

  return ProofOfConceptScoreSchema.parse({
    stage,
    title: definition.title,
    score: definition.score,
    evidence: evidenceNotes,
    explanation:
      stage === "idea_only"
        ? "The concept has not advanced beyond an idea. Gather customer evidence before major spending."
        : `${definition.title} is the strongest recorded proof. Stronger customer behavior, especially repeat purchasing or active revenue, improves confidence.`,
  });
}

function strongestStage(evidence: ProofOfConceptEvidence): ProofOfConceptStage {
  const inferredStages: ProofOfConceptStage[] = [
    evidence.prototypeNotes ? "prototype" : "idea_only",
    evidence.customerInterviewCount > 0
      ? "customer_interview_evidence"
      : "idea_only",
    evidence.letterOfIntentCount > 0 ? "letter_of_intent" : "idea_only",
    evidence.betaCustomerCount > 0 ? "beta_customer" : "idea_only",
    evidence.firstSaleCount > 0 ? "first_sale" : "idea_only",
    evidence.purchaseOrderCount > 0 ? "purchase_order" : "idea_only",
    evidence.repeatCustomerCount > 0 ? "repeat_sales" : "idea_only",
    evidence.activeMonthlyRevenue > 0 ? "active_revenue" : "idea_only",
    evidence.stage,
  ];

  return inferredStages.reduce((strongest, current) =>
    stageRank(current) > stageRank(strongest) ? current : strongest,
  );
}

function stageRank(stage: ProofOfConceptStage): number {
  return PROOF_STAGE_ORDER.indexOf(stage);
}

function describeEvidence(evidence: ProofOfConceptEvidence): string[] {
  return compact([
    evidence.prototypeNotes ? `Prototype: ${evidence.prototypeNotes}` : undefined,
    evidence.customerInterviewCount > 0
      ? `${evidence.customerInterviewCount} customer interview(s)`
      : undefined,
    evidence.letterOfIntentCount > 0
      ? `${evidence.letterOfIntentCount} letter(s) of intent`
      : undefined,
    evidence.betaCustomerCount > 0
      ? `${evidence.betaCustomerCount} beta customer(s)`
      : undefined,
    evidence.firstSaleCount > 0
      ? `${evidence.firstSaleCount} recorded first-sale transaction(s)`
      : undefined,
    evidence.repeatCustomerCount > 0
      ? `${evidence.repeatCustomerCount} repeat customer(s)`
      : undefined,
    evidence.purchaseOrderCount > 0
      ? `${evidence.purchaseOrderCount} purchase order(s)`
      : undefined,
    evidence.activeMonthlyRevenue > 0
      ? `$${evidence.activeMonthlyRevenue.toLocaleString("en-US")} in active monthly revenue`
      : undefined,
    ...evidence.notes,
  ]);
}

function compact<T>(values: (T | undefined)[]): T[] {
  return values.filter((value): value is T => value !== undefined);
}
