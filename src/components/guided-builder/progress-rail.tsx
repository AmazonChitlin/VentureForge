import { guidedSteps } from "@/engine/guided-builder/stage-catalog";
import type {
  GuidedJourneySection,
  GuidedStepId,
} from "@/engine/guided-builder/schema";

const journeySections: GuidedJourneySection[] = [
  "Idea",
  "Customers",
  "Market",
  "Money",
  "Funding",
  "Launch",
  "Plan",
  "Website",
];

export function ProgressRail({
  activeStepId,
  completedStepIds,
  onSelectStep,
  variant = "both",
}: {
  activeStepId: GuidedStepId;
  completedStepIds: GuidedStepId[];
  onSelectStep?: (id: GuidedStepId) => void;
  variant?: "top" | "sidebar" | "both";
}) {
  const activeStep = guidedSteps.find((step) => step.id === activeStepId);
  const activeSectionIndex = Math.max(
    0,
    journeySections.indexOf(activeStep?.journeySection ?? "Idea"),
  );

  return (
    <>
      {variant !== "sidebar" ? (
        <div className="vf-progress-rail" aria-label="Business Builder progress">
          {journeySections.map((section, index) => (
            <div
              className={`vf-progress-stage ${
                index === activeSectionIndex
                  ? "is-active"
                  : index < activeSectionIndex
                    ? "is-complete"
                    : ""
              }`}
              key={section}
            >
              <span className="vf-progress-dot">{index + 1}</span>
              <span>{section}</span>
            </div>
          ))}
        </div>
      ) : null}
      {variant !== "top" ? (
        <nav className="vf-stage-nav" aria-label="Walkthrough steps">
          <p>Your Business Builder</p>
          <ol>
            {guidedSteps.map((step, index) => (
              <li key={step.id}>
                <button
                  className={step.id === activeStepId ? "is-active" : ""}
                  onClick={() => onSelectStep?.(step.id)}
                  type="button"
                >
                  <span
                    className={
                      completedStepIds.includes(step.id) ? "is-complete" : ""
                    }
                  >
                    {index + 1}
                  </span>
                  {shortTitle(step.title)}
                </button>
              </li>
            ))}
          </ol>
        </nav>
      ) : null}
    </>
  );
}

function shortTitle(title: string): string {
  return title
    .replace("Let’s build your business step by step", "Welcome")
    .replace("Picture your first customer", "Customers")
    .replace("Choose where the business happens", "Location")
    .replace("Describe what you will sell", "What you sell")
    .replace("Find your practical edge", "Your edge")
    .replace("Estimate what you need to open", "Startup costs")
    .replace("Make a simple money estimate", "Money estimate")
    .replace("Flag rules that may apply", "Setup questions")
    .replace("Review your business profile", "Review")
    .replace("Check the idea before spending money", "Idea check")
    .replace("Build your launch roadmap", "Launch roadmap")
    .replace("Build your business plan", "Plan builder")
    .replace("Create a starter website", "Website");
}
