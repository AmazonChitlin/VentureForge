import { BuilderIcon } from "@/components/guided-builder/icons";
import { FriendlyEmptyState } from "@/components/guided-builder/empty-state";
import { NextBestQuestionCard } from "@/components/guided-builder/next-best-question-card";
import type { BusinessConcept } from "@/engine/concept/schema";
import type { GuidedAnswerMapping } from "@/engine/guided-builder/guided-answer-mapper";
import type { IntakeEvaluation } from "@/engine/intake/schema";

interface ProfileReviewProps {
  mapping: GuidedAnswerMapping;
  concept: BusinessConcept;
  evaluation: IntakeEvaluation;
  onEdit: (stepId: "idea_basics" | "customer_basics" | "location_model" | "products_services" | "differentiation" | "money_funding") => void;
}

export function ProfileReview({
  mapping,
  concept,
  evaluation,
  onEdit,
}: ProfileReviewProps) {
  const { idea } = mapping.intake;
  const sections = [
    {
      title: "Your business idea",
      value: idea.businessIdea,
      stepId: "idea_basics" as const,
    },
    {
      title: "Your first customers",
      value: idea.targetCustomer,
      stepId: "customer_basics" as const,
    },
    {
      title: "What you sell",
      value: idea.productOrService,
      stepId: "products_services" as const,
    },
    {
      title: "Where it will operate",
      value:
        [idea.city, idea.state].filter(Boolean).join(", ") ||
        "We still need your starting location.",
      stepId: "location_model" as const,
    },
    {
      title: "How you will make money",
      value: concept.revenueModel,
      stepId: "money_funding" as const,
    },
    {
      title: "What makes it different",
      value: concept.differentiator,
      stepId: "differentiation" as const,
    },
  ];

  return (
    <div className="vf-review-wrap">
      <div className="vf-review-grid">
        {sections.map((section) => (
          <article className="vf-profile-card" key={section.title}>
            <div>
              <h3>{section.title}</h3>
              <p>{cleanDisplayText(section.value) || "We still need an answer here."}</p>
            </div>
            <button onClick={() => onEdit(section.stepId)} type="button">
              <BuilderIcon name="pencil" size={15} />
              Edit
            </button>
          </article>
        ))}
      </div>
      <div className="vf-confidence-line">
        <strong>{evaluation.completenessScore}% profile complete</strong>
        <span>
          This measures how much we know so far, not whether the idea is good or bad.
        </span>
      </div>
      {evaluation.missingFields.length > 0 ? (
        <FriendlyEmptyState
          title="We still have a few blanks"
          description="That is normal. Missing details become follow-up questions so you can keep moving without guessing."
        />
      ) : null}
      <NextBestQuestionCard questions={evaluation.nextBestQuestions} />
    </div>
  );
}

function cleanDisplayText(value: string): string {
  return value.replaceAll("..", ".");
}
