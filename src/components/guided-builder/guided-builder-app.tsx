"use client";

import { useEffect, useMemo, useState } from "react";

import { GlobalGuardrailNotice } from "@/components/global-guardrail-notice";
import { BusinessCoachMessage } from "@/components/guided-builder/business-coach-message";
import { ExampleAnswerButton } from "@/components/guided-builder/example-answer-button";
import { FriendlyWarning } from "@/components/guided-builder/friendly-warning";
import { GuidedStepLayout } from "@/components/guided-builder/guided-step-layout";
import { HelpBubble } from "@/components/guided-builder/help-bubble";
import { ModeSwitcher } from "@/components/guided-builder/mode-switcher";
import { PlainLanguageQuestion } from "@/components/guided-builder/plain-language-question";
import { ProfileReview } from "@/components/guided-builder/profile-review";
import { ProgressRail } from "@/components/guided-builder/progress-rail";
import {
  FeasibilityResultsPanel,
  FinancialGuidedPanel,
  LaunchRoadmapPanel,
  PlanBuilderPanel,
  StateChecklistPanel,
  WebsiteStarterPanel,
} from "@/components/guided-builder/result-panels";
import { SmartChoiceCards } from "@/components/guided-builder/smart-choice-cards";
import { UnsureOption } from "@/components/guided-builder/unsure-option";
import { PrivacySafetyNotice } from "@/components/privacy/privacy-safety-notice";
import { BusinessConceptEngine } from "@/engine/concept";
import { FeasibilityEngine } from "@/engine/feasibility";
import { FinancialEngine } from "@/engine/financials";
import {
  GuidedAnswerMapper,
  GuidedBuilderStateSchema,
  GuidedProgressService,
  guidedSteps,
  type GuidedAnswerValue,
  type GuidedBuilderMode,
  type GuidedBuilderState,
  type GuidedStep,
  type GuidedStepId,
} from "@/engine/guided-builder";
import { IntakeEngine } from "@/engine/intake";
import { StateProgramEngine } from "@/engine/state-programs";
import { scanSensitiveInput } from "@/lib/security/sensitiveInputScanner";

const DEMO_PROJECT_ID = "demo";

export function GuidedBuilderApp({ projectId }: { projectId: string }) {
  const storageKey = `ventureforge.builder.${projectId}`;
  const [state, setState] = useState<GuidedBuilderState>(() =>
    GuidedProgressService.createInitialState(projectId),
  );
  const [hydrated, setHydrated] = useState(false);
  const [hasSavedDraft, setHasSavedDraft] = useState(false);
  const [privacyMessage, setPrivacyMessage] = useState("");
  const [saveStatus, setSaveStatus] = useState("Loading your draft");

  useEffect(() => {
    let cancelled = false;
    async function hydrate() {
      const localState = readLocalDraft(storageKey);
      try {
        const response = await fetch(`/api/projects/${projectId}/guided-builder`);
        const payload = await response.json();
        const serverState = response.ok && payload.state
          ? GuidedBuilderStateSchema.parse(payload.state)
          : undefined;
        const draft = newestDraft(localState, serverState);
        if (!cancelled && draft) {
          setState(draft);
          setHasSavedDraft(true);
        }
        if (!cancelled) {
          setSaveStatus(response.ok ? "Saved to your project" : "Saved on this device");
        }
      } catch {
        if (!cancelled && localState) {
          setState(localState);
          setHasSavedDraft(true);
        }
        if (!cancelled) {
          setSaveStatus("Saved on this device");
        }
      } finally {
        if (!cancelled) setHydrated(true);
      }
    }
    hydrate();
    return () => { cancelled = true; };
  }, [projectId, storageKey]);

  useEffect(() => {
    if (!hydrated) return;
    const privacyScan = scanSensitiveInput(state);
    if (privacyScan.shouldBlock) {
      setPrivacyMessage(privacyScan.summary);
      setSaveStatus("Sensitive information blocked");
      window.localStorage.removeItem(storageKey);
      return;
    }
    window.localStorage.setItem(storageKey, JSON.stringify(state));
    setSaveStatus("Saving...");
    const timeout = window.setTimeout(async () => {
      try {
        const response = await fetch(`/api/projects/${projectId}/guided-builder`, {
          body: JSON.stringify(state),
          headers: { "Content-Type": "application/json" },
          method: "PUT",
        });
        setSaveStatus(response.ok ? "Saved to your project" : "Saved on this device");
      } catch {
        setSaveStatus("Saved on this device");
      }
    }, 350);
    return () => window.clearTimeout(timeout);
  }, [hydrated, projectId, state, storageKey]);

  const mapping = useMemo(
    () => GuidedAnswerMapper.mapAnswers(state.answers),
    [state.answers],
  );
  const intakeResult = useMemo(
    () => IntakeEngine.evaluate(mapping.intake),
    [mapping.intake],
  );
  const conceptResult = useMemo(
    () =>
      BusinessConceptEngine.generate({
        ...mapping.intake,
        intakeEvaluation: intakeResult.data,
      }),
    [intakeResult.data, mapping.intake],
  );
  const financialResult = useMemo(
    () => FinancialEngine.generate(mapping.financialAssumptions),
    [mapping.financialAssumptions],
  );
  const stateResult = useMemo(
    () => StateProgramEngine.generateChecklist(mapping.stateProgramInput),
    [mapping.stateProgramInput],
  );
  const feasibilityResult = useMemo(
    () =>
      FeasibilityEngine.evaluate({
        businessConcept: conceptResult.data,
        founder: mapping.intake.founder,
        idea: mapping.intake.idea,
        financialAssumptions: {
          startupCosts: mapping.intake.idea.expectedStartupCosts || undefined,
          monthlyRevenue:
            numberAnswer(state, "pricePerSale") *
              numberAnswer(state, "weeklySales") *
              4 || undefined,
          monthlyFixedCosts:
            numberAnswer(state, "monthlyRent") || undefined,
          notes: [],
        },
        regulatoryNotes: {
          complexity:
            mapping.intake.idea.licensingConcerns.length > 0
              ? "moderate"
              : "unknown",
          permits: mapping.intake.idea.licensingConcerns,
          unresolvedItems: [],
          highRiskRequirements: [],
          notes: [],
        },
        proofOfConcept: { stage: "idea_only" },
      }),
    [conceptResult.data, mapping.intake, state],
  );
  const progress = GuidedProgressService.getProgress(state);
  const step = progress.currentStep;
  const locationZipMessage = step.id === "location_model"
    ? getLocationZipValidationMessage(state)
    : "";

  function updateAnswer(
    field: string,
    value: GuidedAnswerValue,
    stepId: GuidedStepId = step.id,
    isUnsure = false,
  ) {
    const candidate = GuidedAnswerMapper.createAnswer(field, stepId, value, {
      isUnsure,
    });
    const privacyScan = scanSensitiveInput(candidate);
    if (privacyScan.shouldBlock) {
      setPrivacyMessage(privacyScan.summary);
      setSaveStatus("Sensitive information blocked");
      return;
    }
    setPrivacyMessage(privacyScan.cautionFindings.length ? privacyScan.summary : "");
    setState((current) => ({
      ...current,
      answers: {
        ...current.answers,
        [field]: candidate,
      },
      updatedAt: new Date().toISOString(),
    }));
  }

  function goTo(stepId: GuidedStepId) {
    setState((current) => GuidedProgressService.goTo(current, stepId));
  }

  function setMode(mode: GuidedBuilderMode) {
    setState((current) => ({
      ...current,
      mode,
      updatedAt: new Date().toISOString(),
    }));
  }

  function startScratch() {
    setState({
      ...GuidedProgressService.createInitialState(projectId),
      currentStepIndex: 1,
    });
  }

  function useDemo() {
    setState(createDemoState(projectId));
  }

  function continueDraft() {
    setState((current) => ({
      ...current,
      currentStepIndex: Math.max(1, current.currentStepIndex),
    }));
  }

  const modeContent =
    state.mode === "review" ? (
      <ModePanel title="Review your business profile" subtitle="Your answers are translated into a clear, editable business profile.">
        <ProfileReview
          concept={conceptResult.data}
          evaluation={intakeResult.data}
          mapping={mapping}
          onEdit={(id) => {
            setMode("guided");
            goTo(id);
          }}
        />
      </ModePanel>
    ) : state.mode === "pro" ? (
      <ProModePanel
        mapping={mapping}
        intakeScore={intakeResult.data.completenessScore}
        feasibilityScore={feasibilityResult.data.totalFeasibilityScore}
      />
    ) : (
      <GuidedStepLayout
        canContinue={progress.canContinue && !locationZipMessage}
        canGoBack={state.currentStepIndex > 0}
        canSkip={Boolean(step.question?.canSkip)}
        onBack={() => setState((current) => GuidedProgressService.back(current))}
        onNext={() => setState((current) => GuidedProgressService.next(current))}
        onSkip={() => {
          if (step.question) {
            updateAnswer(step.question.field, null, step.id, true);
          }
          setState((current) => GuidedProgressService.next(current));
        }}
        saveStatus={saveStatus}
        step={step}
      >
        {renderGuidedStep({
          step,
          state,
          hasSavedDraft,
          mapping,
          intakeScore: intakeResult.data.completenessScore,
          concept: conceptResult.data,
          intakeEvaluation: intakeResult.data,
          feasibilityResult: feasibilityResult.data,
          feasibilityConfidence: feasibilityResult.confidence,
          financialProjection: financialResult.data,
          stateChecklist: stateResult.data,
          updateAnswer,
          goTo,
          startScratch,
          useDemo,
          continueDraft,
        })}
      </GuidedStepLayout>
    );

  return (
    <main className="vf-app-shell">
      <header className="vf-app-header">
        <a href="/" className="vf-wordmark">VentureForge</a>
        <ModeSwitcher onChange={setMode} value={state.mode} />
      </header>
      <aside className="vf-app-sidebar">
        <ProgressRail
          activeStepId={step.id}
          completedStepIds={state.completedStepIds}
          onSelectStep={goTo}
          variant="sidebar"
        />
      </aside>
      <div className="vf-top-progress">
        <ProgressRail activeStepId={step.id} completedStepIds={state.completedStepIds} variant="top" />
      </div>
      <div className="vf-main-content">
        <GlobalGuardrailNotice />
        {privacyMessage ? (
          <FriendlyWarning title="Please remove private information">
            {privacyMessage}
          </FriendlyWarning>
        ) : null}
        {modeContent}
      </div>
    </main>
  );
}

function renderGuidedStep({
  step,
  state,
  hasSavedDraft,
  mapping,
  concept,
  intakeScore,
  intakeEvaluation,
  feasibilityResult,
  feasibilityConfidence,
  financialProjection,
  stateChecklist,
  updateAnswer,
  goTo,
  startScratch,
  useDemo,
  continueDraft,
}: {
  step: GuidedStep;
  state: GuidedBuilderState;
  hasSavedDraft: boolean;
  mapping: ReturnType<typeof GuidedAnswerMapper.mapAnswers>;
  concept: ReturnType<typeof BusinessConceptEngine.generate>["data"];
  intakeScore: number;
  intakeEvaluation: ReturnType<typeof IntakeEngine.evaluate>["data"];
  feasibilityResult: ReturnType<typeof FeasibilityEngine.evaluate>["data"];
  feasibilityConfidence: number;
  financialProjection: ReturnType<typeof FinancialEngine.generate>["data"];
  stateChecklist: ReturnType<typeof StateProgramEngine.generateChecklist>["data"];
  updateAnswer: (
    field: string,
    value: GuidedAnswerValue,
    stepId?: GuidedStepId,
    isUnsure?: boolean,
  ) => void;
  goTo: (id: GuidedStepId) => void;
  startScratch: () => void;
  useDemo: () => void;
  continueDraft: () => void;
}) {
  if (step.id === "welcome") {
    return (
      <WelcomeScreen
        hasSavedDraft={hasSavedDraft}
        onContinue={continueDraft}
        onDemo={useDemo}
        onStart={startScratch}
      />
    );
  }
  if (step.id === "profile_review") {
    return (
      <ProfileReview
        concept={concept}
        evaluation={intakeEvaluation}
        mapping={mapping}
        onEdit={goTo}
      />
    );
  }
  if (step.id === "feasibility") {
    return (
      <>
        <FeasibilityResultsPanel confidence={feasibilityConfidence} result={feasibilityResult} />
        <BusinessCoachMessage>{step.learnedMessage}</BusinessCoachMessage>
      </>
    );
  }
  if (step.id === "launch_plan") {
    return (
      <>
        <StateChecklistPanel checklist={stateChecklist} />
        <LaunchRoadmapPanel checklist={stateChecklist} mapping={mapping} />
        <BusinessCoachMessage>{step.learnedMessage}</BusinessCoachMessage>
      </>
    );
  }
  if (step.id === "business_plan") {
    return (
      <>
        <PlanBuilderPanel mapping={mapping} />
        <BusinessCoachMessage>{step.learnedMessage}</BusinessCoachMessage>
      </>
    );
  }
  if (step.id === "website") {
    return (
      <>
        <WebsiteStarterPanel
          concept={concept}
          mapping={mapping}
          onToneChange={(value) => updateAnswer("websiteTone", value, "website")}
          tone={stringAnswer(state, "websiteTone") || "friendly"}
        />
        <BusinessCoachMessage>{step.learnedMessage}</BusinessCoachMessage>
      </>
    );
  }
  return (
    <>
      <QuestionScreen state={state} step={step} updateAnswer={updateAnswer} />
      {step.id === "money_funding" ? (
        <FinancialGuidedPanel projection={financialProjection} />
      ) : null}
      {step.id === "state_legal" ? (
        <StateChecklistPanel checklist={stateChecklist} />
      ) : null}
      <BusinessCoachMessage>{step.learnedMessage}</BusinessCoachMessage>
      {intakeScore < 40 && step.id === "idea_basics" ? (
        <FriendlyWarning>
          A rough idea is completely fine. We will ask a few simple follow-up questions before treating anything as reliable.
        </FriendlyWarning>
      ) : null}
    </>
  );
}

function QuestionScreen({
  step,
  state,
  updateAnswer,
}: {
  step: GuidedStep;
  state: GuidedBuilderState;
  updateAnswer: (
    field: string,
    value: GuidedAnswerValue,
    stepId?: GuidedStepId,
    isUnsure?: boolean,
  ) => void;
}) {
  const question = step.question;
  if (!question) return null;
  return (
    <PlainLanguageQuestion
      examples={question.examples}
      helperText={question.helperText}
      question={question.question}
      whyItMatters={question.whyItMatters}
    >
      {step.id === "idea_basics" || step.id === "customer_basics" || step.id === "differentiation" ? (
        <TextQuestion
          field={question.field}
          onChange={(field, value) => updateAnswer(field, value)}
          onExample={() => updateAnswer(question.field, question.examples[0] ?? "")}
          placeholder={question.examples[0] ?? ""}
          state={state}
        />
      ) : null}
      {step.id === "location_model" ? <LocationQuestion state={state} updateAnswer={updateAnswer} step={step} /> : null}
      {step.id === "products_services" ? <ProductsQuestion state={state} updateAnswer={updateAnswer} /> : null}
      {step.id === "startup_costs" ? <StartupCostQuestion state={state} updateAnswer={updateAnswer} /> : null}
      {step.id === "money_funding" ? <MoneyQuestion state={state} updateAnswer={updateAnswer} /> : null}
      {step.id === "state_legal" ? <LegalFlagsQuestion state={state} updateAnswer={updateAnswer} /> : null}
      {question.allowUnsure ? (
        <UnsureOption
          onSelect={() => updateAnswer(question.field, null, step.id, true)}
          selected={Boolean(state.answers[question.field]?.isUnsure)}
        />
      ) : null}
    </PlainLanguageQuestion>
  );
}

function WelcomeScreen({
  hasSavedDraft,
  onContinue,
  onDemo,
  onStart,
}: {
  hasSavedDraft: boolean;
  onContinue: () => void;
  onDemo: () => void;
  onStart: () => void;
}) {
  return (
    <section className="vf-welcome">
      <div>
        <p className="vf-section-label">Business Builder Walkthrough</p>
        <h2>Let’s build your business step by step.</h2>
        <p>
          You do not need to know business terms. Answer simple questions, and VentureForge will turn them into a business plan, funding checklist, launch roadmap, and starter website.
        </p>
      </div>
      <div className="vf-welcome-actions">
        <PrivacySafetyNotice />
        <button className="vf-button vf-button-primary" onClick={onStart} type="button">Start from scratch</button>
        <button className="vf-button vf-button-secondary" onClick={onDemo} type="button">Use an example business</button>
        {hasSavedDraft ? <button className="vf-text-button" onClick={onContinue} type="button">Continue existing project</button> : null}
      </div>
    </section>
  );
}

function TextQuestion({
  field,
  placeholder,
  state,
  onChange,
  onExample,
}: {
  field: string;
  placeholder: string;
  state: GuidedBuilderState;
  onChange: (field: string, value: string) => void;
  onExample: () => void;
}) {
  return (
    <>
      <textarea
        className="vf-textarea"
        onChange={(event) => onChange(field, event.target.value)}
        placeholder={placeholder}
        value={stringAnswer(state, field)}
      />
      <ExampleAnswerButton onClick={onExample} />
    </>
  );
}

function LocationQuestion({
  state,
  step,
  updateAnswer,
}: {
  state: GuidedBuilderState;
  step: GuidedStep;
  updateAnswer: (field: string, value: GuidedAnswerValue) => void;
}) {
  const zipMessage = getLocationZipValidationMessage(state);
  return (
    <>
      <SmartChoiceCards
        choices={step.question?.choices ?? []}
        onChange={(value) => updateAnswer("businessModel", value)}
        value={stringAnswer(state, "businessModel")}
      />
      <div className="vf-form-grid vf-form-grid-location">
        <Input helpText="Helps narrow local research." label="City" value={stringAnswer(state, "city")} onChange={(value) => updateAnswer("city", value)} placeholder="Tempe" />
        <Input helpText="Some setup rules change by county." label="County" value={stringAnswer(state, "county")} onChange={(value) => updateAnswer("county", value)} placeholder="Maricopa" />
        <Input helpText="Use a two-letter code, such as AZ." label="State" value={stringAnswer(state, "state")} onChange={(value) => updateAnswer("state", value.toUpperCase().slice(0, 2))} placeholder="AZ" />
        <Input helpText="Numbers only. Enter five digits when you know them." label="ZIP code" value={stringAnswer(state, "zipCode")} onChange={(value) => updateAnswer("zipCode", value.replace(/\D/g, "").slice(0, 5))} placeholder="85281" />
      </div>
      {zipMessage ? (
        <FriendlyWarning title="ZIP code needed">
          {zipMessage}
        </FriendlyWarning>
      ) : null}
    </>
  );
}

function ProductsQuestion({
  state,
  updateAnswer,
}: {
  state: GuidedBuilderState;
  updateAnswer: (field: string, value: GuidedAnswerValue) => void;
}) {
  return (
    <div className="vf-form-stack">
      <TextArea helpText="This becomes the main offer in your plan and website." label="What will you sell?" value={stringAnswer(state, "productOrService")} onChange={(value) => updateAnswer("productOrService", value)} placeholder="Records, shirts, and local art" />
      <TextArea helpText="This helps test whether people have a reason to buy." label="What problem does this solve for customers?" value={stringAnswer(state, "customerProblem")} onChange={(value) => updateAnswer("customerProblem", value)} placeholder="They want a local place to discover music and community events." />
    </div>
  );
}

function StartupCostQuestion({
  state,
  updateAnswer,
}: {
  state: GuidedBuilderState;
  updateAnswer: (field: string, value: GuidedAnswerValue) => void;
}) {
  return (
    <div className="vf-form-grid">
      <MoneyInput helpText="Estimate only. Do not enter bank account details." label="Space deposit or setup" value={numberAnswer(state, "startupSpaceCost")} onChange={(value) => updateAnswer("startupSpaceCost", value)} />
      <MoneyInput helpText="Estimate only. Do not enter bank account details." label="Equipment" value={numberAnswer(state, "equipmentCost")} onChange={(value) => updateAnswer("equipmentCost", value)} />
      <MoneyInput helpText="Estimate only. Do not enter bank account details." label="Starting inventory" value={numberAnswer(state, "inventoryCost")} onChange={(value) => updateAnswer("inventoryCost", value)} />
      <MoneyInput helpText="Estimate only. Do not enter bank account details." label="Other opening costs" value={numberAnswer(state, "otherStartupCost")} onChange={(value) => updateAnswer("otherStartupCost", value)} />
      <MoneyInput helpText="Estimate only. Do not enter bank account details." label="Monthly rent, if any" value={numberAnswer(state, "monthlyRent")} onChange={(value) => updateAnswer("monthlyRent", value)} />
    </div>
  );
}

function MoneyQuestion({
  state,
  updateAnswer,
}: {
  state: GuidedBuilderState;
  updateAnswer: (field: string, value: GuidedAnswerValue) => void;
}) {
  return (
    <div className="vf-form-stack">
      <div className="vf-form-grid">
        <MoneyInput helpText="Estimate only. Do not enter bank account details." label="Price for one normal sale" value={numberAnswer(state, "pricePerSale")} onChange={(value) => updateAnswer("pricePerSale", value)} />
        <NumberInput helpText="Start with a careful guess. You can change it later." label="Normal sales each week" value={numberAnswer(state, "weeklySales")} onChange={(value) => updateAnswer("weeklySales", value)} />
        <MoneyInput helpText="Estimate only. Do not enter bank account details." label="Money you can safely put in" value={numberAnswer(state, "availableStartupCapital")} onChange={(value) => updateAnswer("availableStartupCapital", value)} />
        <MoneyInput helpText="Estimate only. Do not enter bank account details." label="Outside money you may need" value={numberAnswer(state, "desiredFundingAmount")} onChange={(value) => updateAnswer("desiredFundingAmount", value)} />
      </div>
      <ChoiceChecklist
        helpText="These are preferences, not promises that a program will approve you."
        label="Which funding paths sound comfortable?"
        values={listAnswer(state, "fundingPreference")}
        options={[
          ["bootstrap", "Start small with my own money"],
          ["loan", "Repay a loan"],
          ["grant", "Look for grant programs"],
          ["investor", "Consider an investor"],
        ]}
        onChange={(value) => updateAnswer("fundingPreference", value)}
      />
    </div>
  );
}

function LegalFlagsQuestion({
  state,
  updateAnswer,
}: {
  state: GuidedBuilderState;
  updateAnswer: (field: string, value: GuidedAnswerValue) => void;
}) {
  return (
    <div className="vf-form-stack">
      <ChoiceChecklist
        helpText="These choices help prepare questions to verify with official agencies."
        label="Choose anything that might apply"
        values={listAnswer(state, "regulatedActivities")}
        options={[
          ["food", "Food or drinks"],
          ["alcohol", "Alcohol"],
          ["childcare", "Childcare"],
          ["construction", "Construction"],
          ["health", "Health services"],
          ["transportation", "Transportation"],
          ["professional services", "Licensed professional services"],
        ]}
        onChange={(value) => updateAnswer("regulatedActivities", value)}
      />
      <div className="vf-boolean-grid">
        <BooleanChoice helpText="Hiring can add employer setup steps." label="Will you have employees?" value={booleanAnswer(state, "hasEmployees")} onChange={(value) => updateAnswer("hasEmployees", value)} />
        <BooleanChoice helpText="A customer-facing location may need zoning or local checks." label="Will customers visit your location?" value={booleanAnswer(state, "customersVisitLocation")} onChange={(value) => updateAnswer("customersVisitLocation", value)} />
        <BooleanChoice helpText="Selling products may add state tax questions." label="Will you sell products?" value={booleanAnswer(state, "sellsTaxableGoodsOrServices")} onChange={(value) => updateAnswer("sellsTaxableGoodsOrServices", value)} />
      </div>
    </div>
  );
}

function ModePanel({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <section className="vf-mode-panel">
      <div className="vf-step-heading">
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>
      {children}
    </section>
  );
}

function ProModePanel({
  mapping,
  intakeScore,
  feasibilityScore,
}: {
  mapping: ReturnType<typeof GuidedAnswerMapper.mapAnswers>;
  intakeScore: number;
  feasibilityScore: number;
}) {
  return (
    <ModePanel title="Detailed Mode" subtitle="Open the answers used behind the scenes when you want a closer look. You can stay in Guided Mode for the simple path.">
      <div className="vf-pro-summary">
        <div><span>Profile complete</span><strong>{intakeScore}%</strong></div>
        <div><span>First idea check</span><strong>{feasibilityScore}</strong></div>
        <div><span>Answers saved</span><strong>{Object.keys(mapping.rawAnswers).length}</strong></div>
      </div>
      <details className="vf-details-panel" open>
        <summary>Structured answers</summary>
        <pre>{JSON.stringify(mapping.intake, null, 2)}</pre>
      </details>
      <details className="vf-details-panel">
        <summary>Numbers behind the money estimate</summary>
        <pre>{JSON.stringify(mapping.financialAssumptions, null, 2)}</pre>
      </details>
    </ModePanel>
  );
}

function Input({ label, value, onChange, placeholder, helpText }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string; helpText: string }) {
  return <label className="vf-input-label"><span>{label}</span><small>{helpText}</small><input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} /></label>;
}

function TextArea({ label, value, onChange, placeholder, helpText }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string; helpText: string }) {
  return <label className="vf-input-label"><span>{label}</span><small>{helpText}</small><textarea value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} /></label>;
}

function MoneyInput({ label, value, onChange, helpText }: { label: string; value: number; onChange: (value: number) => void; helpText: string }) {
  return <label className="vf-input-label"><span>{label}</span><small>{helpText}</small><div className="vf-money-input"><b>$</b><input min="0" onChange={(event) => onChange(Number(event.target.value))} type="number" value={value || ""} /></div></label>;
}

function NumberInput({ label, value, onChange, helpText }: { label: string; value: number; onChange: (value: number) => void; helpText: string }) {
  return <label className="vf-input-label"><span>{label}</span><small>{helpText}</small><input min="0" onChange={(event) => onChange(Number(event.target.value))} type="number" value={value || ""} /></label>;
}

function ChoiceChecklist({ label, values, options, onChange, helpText }: { label: string; values: string[]; options: [string, string][]; onChange: (values: string[]) => void; helpText: string }) {
  return <fieldset className="vf-check-options"><legend>{label}</legend><small>{helpText}</small>{options.map(([value, title]) => <label key={value}><input checked={values.includes(value)} onChange={(event) => onChange(event.target.checked ? [...values, value] : values.filter((entry) => entry !== value))} type="checkbox" /> <span>{title}</span></label>)}</fieldset>;
}

function BooleanChoice({ label, value, onChange, helpText }: { label: string; value: boolean | null; onChange: (value: boolean | null) => void; helpText: string }) {
  return <fieldset className="vf-boolean-choice"><legend>{label}</legend><small>{helpText}</small><div><button className={value === true ? "is-selected" : ""} onClick={() => onChange(true)} type="button">Yes</button><button className={value === false ? "is-selected" : ""} onClick={() => onChange(false)} type="button">No</button><button className={value === null ? "is-selected" : ""} onClick={() => onChange(null)} type="button">Not sure yet</button></div></fieldset>;
}

function stringAnswer(state: GuidedBuilderState, field: string): string {
  const value = state.answers[field]?.structuredValue;
  return typeof value === "string" ? value : "";
}

function getLocationZipValidationMessage(state: GuidedBuilderState): string {
  const zipCode = stringAnswer(state, "zipCode");
  const hasStartedLocation =
    Boolean(stringAnswer(state, "businessModel")) ||
    Boolean(stringAnswer(state, "city")) ||
    Boolean(stringAnswer(state, "county")) ||
    Boolean(stringAnswer(state, "state")) ||
    Boolean(zipCode);
  if (!hasStartedLocation) return "";
  if (/^\d{5}$/.test(zipCode)) return "";
  if (zipCode.length === 0) {
    return "Add a 5-digit ZIP code before continuing. This helps VentureForge use the right local planning details.";
  }
  return "Keep typing until the ZIP code has exactly 5 digits.";
}

function numberAnswer(state: GuidedBuilderState, field: string): number {
  const value = state.answers[field]?.structuredValue;
  return typeof value === "number" ? value : 0;
}

function booleanAnswer(state: GuidedBuilderState, field: string): boolean | null {
  const value = state.answers[field]?.structuredValue;
  return typeof value === "boolean" ? value : null;
}

function listAnswer(state: GuidedBuilderState, field: string): string[] {
  const value = state.answers[field]?.structuredValue;
  return Array.isArray(value) ? value : [];
}

function createDemoState(projectId: string): GuidedBuilderState {
  const state = GuidedProgressService.createInitialState(projectId || DEMO_PROJECT_ID);
  const now = new Date().toISOString();
  const answers = [
    ["businessIdea", "idea_basics", "I want to open a punk record store near ASU that also sells shirts and local art."],
    ["targetCustomer", "customer_basics", "College students near ASU and local punk and metal fans"],
    ["businessModel", "location_model", "physical_location"],
    ["city", "location_model", "Tempe"],
    ["county", "location_model", "Maricopa"],
    ["state", "location_model", "AZ"],
    ["zipCode", "location_model", "85281"],
    ["productOrService", "products_services", "New and used records, band shirts, local art, and small in-store events"],
    ["customerProblem", "products_services", "Local music fans want a place to discover records, meet people, and support artists."],
    ["differentiator", "differentiation", "A carefully curated punk and metal selection with local artists featured in the store."],
    ["startupSpaceCost", "startup_costs", 5000],
    ["equipmentCost", "startup_costs", 3500],
    ["inventoryCost", "startup_costs", 12000],
    ["otherStartupCost", "startup_costs", 2500],
    ["monthlyRent", "startup_costs", 2400],
    ["pricePerSale", "money_funding", 28],
    ["weeklySales", "money_funding", 90],
    ["availableStartupCapital", "money_funding", 10000],
    ["desiredFundingAmount", "money_funding", 15000],
    ["fundingPreference", "money_funding", ["bootstrap", "loan"]],
    ["regulatedActivities", "state_legal", ["retail"]],
    ["hasEmployees", "state_legal", true],
    ["sellsTaxableGoodsOrServices", "state_legal", true],
    ["customersVisitLocation", "state_legal", true],
    ["websiteTone", "website", "punk_edgy"],
  ] as const;
  return {
    ...state,
    currentStepIndex: 1,
    answers: Object.fromEntries(answers.map(([field, stepId, value]) => [
      field,
      GuidedAnswerMapper.createAnswer(
        field,
        stepId,
        normalizeDemoAnswerValue(value),
        { updatedAt: now },
      ),
    ])),
    completedStepIds: ["welcome"],
    updatedAt: now,
  };
}

function normalizeDemoAnswerValue(value: unknown): GuidedAnswerValue {
  if (Array.isArray(value)) {
    return value.map(String);
  }
  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value;
  }
  return null;
}

function readLocalDraft(storageKey: string): GuidedBuilderState | undefined {
  const saved = window.localStorage.getItem(storageKey);
  if (!saved) return undefined;
  try {
    const parsed = GuidedBuilderStateSchema.safeParse(JSON.parse(saved));
    if (parsed.success) return parsed.data;
  } catch {
    // Remove a broken browser cache and continue with the durable draft.
  }
  window.localStorage.removeItem(storageKey);
  return undefined;
}

function newestDraft(
  localState: GuidedBuilderState | undefined,
  serverState: GuidedBuilderState | undefined,
): GuidedBuilderState | undefined {
  if (!localState) return serverState;
  if (!serverState) return localState;
  return localState.updatedAt > serverState.updatedAt ? localState : serverState;
}
