import { FinancialTable } from "@/components/project-shell/financial-table";
import { FundingMatchCard } from "@/components/project-shell/funding-match-card";
import { ScoreCard } from "@/components/project-shell/score-card";
import { SectionEditor } from "@/components/project-shell/section-editor";
import { StateChecklistTable } from "@/components/project-shell/state-checklist-table";
import { TaskBoard } from "@/components/project-shell/task-board";
import { WebsitePreview } from "@/components/project-shell/website-preview";
import type { WorkspaceModuleKey } from "@/lib/project-workspace/types";

export function ModuleResultView({
  module,
  data,
}: {
  module: WorkspaceModuleKey;
  data: any;
}) {
  switch (module) {
    case "intake":
      return <IntakeView data={data} />;
    case "concept":
      return <ConceptView data={data} />;
    case "feasibility":
      return <FeasibilityView data={data} />;
    case "market":
      return <MarketView data={data} />;
    case "customers":
      return <CustomerView data={data} />;
    case "competitors":
      return <CompetitorView data={data} />;
    case "strategy":
      return <StrategyView data={data} />;
    case "execution":
      return <TaskBoard tasks={data.initiatives} title="Execution initiatives" />;
    case "plan":
      return <section className="vf-section-editor-list">{data.sections.map((section: any) => <SectionEditor key={section.key} section={section} />)}</section>;
    case "financials":
      return <FinancialView data={data} />;
    case "funding":
      return <FundingView data={data} />;
    case "state":
      return <StateView data={data} />;
    case "launch":
      return <LaunchView data={data} />;
    case "risk":
      return <RiskView data={data} />;
    case "website":
      return <WebsiteView data={data} />;
  }
}

function IntakeView({ data }: { data: any }) {
  return (
    <div className="vf-score-layout">
      <ScoreCard label="Intake completeness" score={data.completenessScore} description="How ready the current answers are for deeper analysis." />
      <FinancialTable title="Answer coverage" columns={[{ key: "title", label: "Area" }, { key: "score", label: "How complete" }, { key: "missingFields", label: "Answers still needed" }]} rows={data.categoryScores} />
    </div>
  );
}

function ConceptView({ data }: { data: any }) {
  return (
    <div className="vf-output-stack">
      <OutputBlock title="Business concept statement" text={data.businessConceptStatement} />
      <div className="vf-card-grid">
        <OutputBlock title="Customer problem" text={data.customerProblem} />
        <OutputBlock title="Proposed solution" text={data.proposedSolution} />
        <OutputBlock title="Your useful strengths" text={data.founderAdvantage} />
        <OutputBlock title="Why a customer may choose you" text={data.differentiator} />
      </div>
    </div>
  );
}

function FeasibilityView({ data }: { data: any }) {
  return (
    <div className="vf-score-layout">
      <ScoreCard label={data.recommendation} score={data.totalFeasibilityScore} description={data.plainEnglishSummary} />
      <FinancialTable title="Parts of the idea check" columns={[{ key: "title", label: "Area" }, { key: "score", label: "Estimate" }, { key: "explanation", label: "Why it matters" }]} rows={data.categoryScores} />
    </div>
  );
}

function MarketView({ data }: { data: any }) {
  const indicators = [...data.populationIndicators, ...data.incomeIndicators, ...data.employmentIndicators];
  return (
    <div className="vf-output-stack">
      <OutputBlock title="Industry overview" text={data.industryOverview} />
      <FinancialTable title="Local market clues" columns={[{ key: "label", label: "What we checked" }, { key: "value", label: "Current value" }, { key: "dataLabel", label: "Source label" }, { key: "notes", label: "What to know" }]} rows={indicators} />
    </div>
  );
}

function CustomerView({ data }: { data: any }) {
  return (
    <div className="vf-output-stack">
      <OutputBlock title={data.primaryCustomerPersona.name} text={data.primaryCustomerPersona.summary} />
      <ListBlock title="Problems customers may want solved" items={data.customerPainPoints} />
      <ListBlock title="Questions to test with real customers" items={data.customerValidationQuestions} />
    </div>
  );
}

function CompetitorView({ data }: { data: any }) {
  return (
    <div className="vf-output-stack">
      <FinancialTable title="Compare other customer options" columns={[{ key: "competitorName", label: "Other option" }, { key: "relationship", label: "How it compares" }, { key: "pricePosition", label: "Pricing notes" }, { key: "threatLevel", label: "How closely to watch it" }]} rows={data.competitiveGrid} />
      <ListBlock title="Possible gaps you could serve" items={data.whiteSpaceOpportunities} />
    </div>
  );
}

function StrategyView({ data }: { data: any }) {
  const recommendations = Object.entries(data.strategicRecommendations).map(([key, value]: [string, any]) => ({
    title: key.replaceAll(/([A-Z])/g, " $1"),
    description: value.recommendation,
    KPI: value.reasoning,
  }));
  return (
    <div className="vf-output-stack">
      <div className="vf-card-grid">
        <ListBlock title="Strengths" items={data.swot.strengths} />
        <ListBlock title="Weaknesses" items={data.swot.weaknesses} />
        <ListBlock title="Opportunities" items={data.swot.opportunities} />
        <ListBlock title="Outside risks" items={data.swot.threats} />
      </div>
      <TaskBoard tasks={recommendations} title="Suggested business direction" />
    </div>
  );
}

function FinancialView({ data }: { data: any }) {
  const placeholders = data.editableAssumptions.filter((assumption: any) => assumption.isPlaceholder);
  return (
    <div className="vf-output-stack">
      <aside className="vf-output-warning">
        <strong>Financial estimates only</strong>
        <p>These editable numbers are a starting estimate, not a promise of revenue or profit.</p>
        <p>Review the numbers, cash-flow estimate, and tax placeholders with a CPA or bookkeeper before making financial commitments.</p>
        <small>{placeholders.length} placeholder assumption(s) still need researched values.</small>
        <details>
          <summary>Show calculation notes</summary>
          <p>{data.assumptionsNarrative}</p>
        </details>
      </aside>
      <div className="vf-card-grid">
        <OutputBlock title="Estimated outside money still needed" text={money(data.fundingGap.value)} />
        <OutputBlock title="Estimated sales needed to cover costs" text={data.breakEvenAnalysis.breakEvenUnits === null ? "We need more information before this estimate is useful." : `${Math.ceil(data.breakEvenAnalysis.breakEvenUnits)} sales or services each month.`} />
      </div>
      <FinancialTable title="12-month sales and costs estimate" columns={[{ key: "month", label: "Month" }, { key: "revenue", label: "Estimated sales", format: "money" }, { key: "fixedOperatingCosts", label: "Monthly bills", format: "money" }, { key: "netIncome", label: "Estimated amount after costs", format: "money" }]} rows={data.monthlyProfitLoss12Months} />
    </div>
  );
}

function FundingView({ data }: { data: any }) {
  return (
    <div className="vf-output-stack">
      <ScoreCard label={`How prepared your funding research may be: ${data.fundingReadinessScore.level}`} score={data.fundingReadinessScore.score} description={data.fundingReadinessScore.explanation} />
      <div className="vf-funding-grid">{data.priorityMatches.map((match: any) => <FundingMatchCard key={match.id} match={match} />)}</div>
    </div>
  );
}

function StateView({ data }: { data: any }) {
  return (
    <div className="vf-output-stack">
      <ScoreCard label={`${data.stateName} checklist estimate`} score={data.coverageScore} description="Verify every item with the listed official agency before filing." />
      <StateChecklistTable tasks={data.checklist} />
    </div>
  );
}

function LaunchView({ data }: { data: any }) {
  const groups = [
    ["Today", data.today],
    ["This week", data.thisWeek],
    ["30 days", data.thirtyDays],
    ["60 days", data.sixtyDays],
    ["90 days", data.ninetyDays],
    ["6 months", data.sixMonths],
    ["12 months", data.twelveMonths],
  ];
  return <div className="vf-output-stack">{groups.map(([title, tasks]) => <TaskBoard key={title as string} title={title as string} tasks={tasks as any[]} />)}</div>;
}

function RiskView({ data }: { data: any }) {
  return (
    <div className="vf-output-stack">
      <ScoreCard label={`${data.overallRiskLevel} estimated risk level`} score={data.overallExposureScore} description={data.summary} />
      <TaskBoard tasks={data.priorityRisks.length ? data.priorityRisks : data.risks.slice(0, 5)} title="Things to watch first" />
    </div>
  );
}

function WebsiteView({ data }: { data: any }) {
  return (
    <div className="vf-output-stack">
      <WebsitePreview website={data} />
      <details className="vf-result-details">
        <summary>Static HTML export</summary>
        <pre>{data.staticExport.html}</pre>
      </details>
    </div>
  );
}

function OutputBlock({ title, text }: { title: string; text: string }) {
  return <article className="vf-output-block"><h3>{title}</h3><p>{text}</p></article>;
}

function ListBlock({ title, items }: { title: string; items: string[] }) {
  return <article className="vf-output-block"><h3>{title}</h3><ul>{items.map((item) => <li key={item}>{item}</li>)}</ul></article>;
}

function money(value: number | null) {
  return typeof value === "number"
    ? value.toLocaleString("en-US", { style: "currency", currency: "USD" })
    : "Not enough information yet";
}
