import type { ReactNode } from "react";

import { BuilderIcon } from "@/components/guided-builder/icons";
import type { GuidedStep } from "@/engine/guided-builder/schema";

export function GuidedStepLayout({
  step,
  children,
  canGoBack,
  canContinue,
  canSkip,
  saveStatus,
  onBack,
  onNext,
  onSkip,
}: {
  step: GuidedStep;
  children: ReactNode;
  canGoBack: boolean;
  canContinue: boolean;
  canSkip: boolean;
  saveStatus: string;
  onBack: () => void;
  onNext: () => void;
  onSkip: () => void;
}) {
  return (
    <section className="vf-step-shell">
      <div className="vf-step-scroll">
        {step.kind !== "welcome" ? (
          <div className="vf-step-heading">
            <h1>{step.title}</h1>
            <p>{step.subtitle}</p>
          </div>
        ) : null}
        {children}
      </div>
      <footer className="vf-step-actions">
        <div>
          <button
            className="vf-button vf-button-secondary"
            disabled={!canGoBack}
            onClick={onBack}
            type="button"
          >
            <BuilderIcon name="arrow-left" size={17} />
            Back
          </button>
          <span className="vf-save-status">
            <BuilderIcon name="check" size={16} />
            {saveStatus}
          </span>
        </div>
        <div>
          {canSkip ? (
            <button className="vf-text-button" onClick={onSkip} type="button">
              Skip for now
            </button>
          ) : null}
          <button
            className="vf-button vf-button-primary"
            disabled={!canContinue}
            onClick={onNext}
            type="button"
          >
            Next
            <BuilderIcon name="arrow-right" size={17} />
          </button>
        </div>
      </footer>
    </section>
  );
}
